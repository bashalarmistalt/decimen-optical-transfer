// Sender: turn a file into an endless fountain-coded QR stream.
//
// Tuning notes from the experiments this PoC is distilled from:
// - Frame payload sets the QR version; denser wins on goodput as long as the
//   receiver can still decode it. 1465 bytes ≈ V27 is a safe middle ground
//   for arbitrary monitors; 2953 (V40) is the ceiling and works phone-to-
//   phone at close range.
// - The mask pattern is pinned (any declared mask is valid to a decoder);
//   this skips the spec's 8-way mask evaluation and speeds generation ~4×.
// - Displays need each frame shown for ≥2 refresh cycles or captures catch
//   the transition; 24 fps on a 60 Hz screen is comfortable.
// - Error correction stays at L by default: the fountain layer already
//   handles erasures, and a frame is either decoded whole or discarded.

import { fitQrDisplaySize } from "../shared/display";
import { gridDims, rasterizeQr } from "../shared/qr-raster";
import {
  fillRuntimeTokens,
  fmtInt,
  fmtNumber,
  formatBytesL,
  formatDurationL,
  initI18n,
  localizeError,
  msg,
} from "../shared/i18n";
import { QUIET_ZONE_MODULES as MARGIN, createFrameQr, type EccLevel, type FrameQr } from "./qr-frame";
import {
  ZIP_MAX_FRAMES,
  estimateExportBytes,
  exportAnimation,
  planExport,
  type ExportFormat,
} from "./export";
import {
  MAX_SOURCE_BLOCKS,
  blockLength,
  fitsInOneStream,
  minimumFrameBytes,
  smallestSufficientFrameSize,
  sourceBlockCount,
} from "../shared/frame-capacity";
import { LTEncoder } from "../shared/fountain";
import { MAX_SNIPPET_BYTES, packSnippet } from "../shared/snippet";
import {
  MAX_FILE_BYTES,
  MAX_FILE_LABEL,
  fnv1a,
  packFile,
  packFrame,
  type FrameHeader,
  type PackedOpticalFile,
} from "../shared/protocol";
import { statusLine } from "../shared/status-line";
import { requestScreenWakeLock } from "../shared/wake-lock";
import { wireShareDialog } from "../shared/share-dialog";

await initI18n();

const LOOKAHEAD = 3;

// `npm run demo` (vite --mode demo). Locks the sender to the two bundled
// payloads so the app can be left running in front of strangers without
// handing them a file picker into the host machine.
const DEMO = import.meta.env.VITE_DEMO === "1";
// `npm run benchmark` (vite --mode benchmark). Same shape as demo mode but
// locked to the canonical 1 MB benchmark payload, so every record run
// transfers the exact bytes the promotion gate pins (build/benchmarks.ts).
const BENCHMARK = import.meta.env.VITE_BENCHMARK === "1";

const canvas = document.getElementById("qr") as HTMLCanvasElement;
const stage = document.getElementById("stage") as HTMLDivElement;
const specs = document.getElementById("specs")!;
const cfgFile = document.getElementById("cfg-file") as HTMLInputElement;
const filePickerLabel = document.getElementById("file-picker-label")!;
const filePickerButton = document.getElementById("file-picker-button")!;
const toolTitle = document.getElementById("tool-title")!;
const snippetText = document.getElementById("snippet-text") as HTMLTextAreaElement;
const snippetLabel = document.getElementById("snippet-label")!;
const sendSnippetBtn = document.getElementById("send-snippet") as HTMLButtonElement;
const paneFile = document.getElementById("pane-file")!;
const paneSnippet = document.getElementById("pane-snippet")!;
const paneDemo = document.getElementById("pane-demo")!;
const modePicker = document.getElementById("mode-picker")!;
const modeInputs = [...document.querySelectorAll<HTMLInputElement>('input[name="send-mode"]')];
const streamSpecs = document.getElementById("stream-specs")!;
const footerHint = document.getElementById("footer-hint")!;
const exportPanel = document.getElementById("export-panel") as HTMLDetailsElement;
const cfgExportFormat = document.getElementById("cfg-export-format") as HTMLSelectElement;
const cfgExportFps = document.getElementById("cfg-export-fps") as HTMLSelectElement;
const cfgExportScale = document.getElementById("cfg-export-scale") as HTMLSelectElement;
const cfgExportCycles = document.getElementById("cfg-export-cycles") as HTMLSelectElement;
const exportEstimate = document.getElementById("export-estimate")!;
const exportButton = document.getElementById("export-start") as HTMLButtonElement;
const spec = (id: string) => document.getElementById(id)!;

/** Panels that only mean something while a stream is up: inside Transfer
 *  settings, the spec grid and the animation-export subsection under it; and
 *  the receiver hint under the status line. */
function showStreamPanels(visible: boolean): void {
  streamSpecs.hidden = !visible;
  footerHint.hidden = !visible;
  exportPanel.hidden = !visible;
  if (visible) void updateExportEstimate();
}

const openShareDialog = wireShareDialog();
const cfgFps = document.getElementById("cfg-fps") as HTMLSelectElement;
const cfgBytes = document.getElementById("cfg-bytes") as HTMLSelectElement;
const cfgEcc = document.getElementById("cfg-ecc") as HTMLSelectElement;
const cfgGrid = document.getElementById("cfg-grid") as HTMLSelectElement;
const cfgSize = document.getElementById("cfg-size") as HTMLInputElement;

let selectedFile: {
  name: string;
  size: number;
  payload: Uint8Array;
  compression: "none" | "gzip";
  transmittedSize: number;
} | null = null;
let generation = 0; // bumped on every restart; stale loops see it and die
let resizeDisplay: (() => void) | null = null;
// The animation export in flight, if any. It snapshots payload and settings at
// click time, so knob changes let it finish; only losing the payload it
// describes (new pick, stop) cancels it. The button doubles as Cancel.
let activeExport: { cancelled: boolean } | null = null;
// The last export's blob URL. Kept alive so the download outlives this
// function; reclaimed when the next export replaces it.
let lastExportUrl: string | null = null;

const specsLine = statusLine(specs);
const setStatus = specsLine.setStatus;

/**
 * Errors also hide the stage — a stale QR stream pulsing away under a
 * rejection message reads as "still working".
 *
 * Callers decide whether the pick survives. A file rejected on size is gone;
 * a stream that can't start at the current bytes/frame is not, because turning
 * that setting back up is the fix.
 */
function showError(message: string): void {
  setStageFullscreen(false);
  stage.hidden = true;
  showStreamPanels(false);
  specsLine.showError(message);
}

function currentMode(): "file" | "snippet" {
  return modeInputs.find((input) => input.checked)?.value === "snippet" ? "snippet" : "file";
}

/** The picker reads as state — which file is armed — and the button offers
 *  the next action: pick when idle, stop when streaming. A rejected pick
 *  keeps the idle wording: the status line already names what went wrong,
 *  and nothing is streaming. */
function updateFilePicker(): void {
  const armed = currentMode() === "file" && selectedFile !== null;
  paneFile.classList.toggle("has-file", armed);
  filePickerButton.textContent = armed ? msg.send.stopTransfer : msg.send.selectFile;
  filePickerLabel.textContent =
    armed && selectedFile
      ? msg.send.selectedFile(selectedFile.name)
      : fillRuntimeTokens(msg.send.anyFileUpTo);
}

function currentExportFormat(): ExportFormat {
  return cfgExportFormat.value === "zip" ? "zip" : "apng";
}

/** The export panel's forecast line: frames, size, loop length. The size is
 *  measured, not modeled — estimateExportBytes samples one real frame — so
 *  this is async; the run counter drops a stale sample if the knobs moved (or
 *  an export started) while it rendered. Skipped mid-export, where progress
 *  reporting owns the line. */
let estimateRun = 0;
async function updateExportEstimate(): Promise<void> {
  if (activeExport || !selectedFile) return;
  const run = ++estimateRun;
  const frameBytes = Number(cfgBytes.value);
  const gridCodes = Number(cfgGrid.value) || 1;
  const cycles = Number(cfgExportCycles.value);
  const plan = planExport(selectedFile.payload.length, frameBytes, gridCodes, cycles);
  // The classic ZIP format cannot hold more entries; APNG can. Refuse with the
  // fix named rather than failing at the end of a long render.
  const overZipLimit = currentExportFormat() === "zip" && plan.animationFrames > ZIP_MAX_FRAMES;
  exportButton.disabled = overZipLimit;
  if (overZipLimit) {
    exportEstimate.textContent = msg.send.exportZipLimit(
      fmtInt(plan.animationFrames),
      fmtInt(ZIP_MAX_FRAMES),
    );
    return;
  }
  const size = await estimateExportBytes({
    payload: selectedFile.payload,
    frameBytes,
    ecc: cfgEcc.value as EccLevel,
    gridCodes,
    scale: Number(cfgExportScale.value),
    cycles,
    format: currentExportFormat(),
  });
  if (run !== estimateRun || activeExport || !selectedFile) return;
  exportEstimate.textContent = msg.send.exportEstimate(
    fmtInt(plan.animationFrames),
    formatBytesL(size),
    formatDurationL(plan.animationFrames / Number(cfgExportFps.value)),
  );
}

/**
 * Render the armed payload into a downloadable animation file.
 *
 * Everything is snapshotted at click time, so the export stays internally
 * consistent whatever the knobs do afterwards. Runs on the main thread with
 * cooperative yields — the standalone build's CSP has no room for a worker —
 * and reports progress through the estimate line.
 */
async function runExport(): Promise<void> {
  if (activeExport) {
    activeExport.cancelled = true;
    return;
  }
  if (!selectedFile) return;
  const run = { cancelled: false };
  activeExport = run;
  exportButton.textContent = msg.send.exportCancel;
  const format = currentExportFormat();
  const baseName = currentMode() === "snippet" ? "text" : selectedFile.name;
  let failed = false;
  try {
    let shownPercent = -1;
    const result = await exportAnimation({
      payload: selectedFile.payload,
      frameBytes: Number(cfgBytes.value),
      ecc: cfgEcc.value as EccLevel,
      gridCodes: Number(cfgGrid.value) || 1,
      format,
      fps: Number(cfgExportFps.value),
      scale: Number(cfgExportScale.value),
      cycles: Number(cfgExportCycles.value),
      sessionId: (Math.floor(Math.random() * 0xffff) + 1) & 0xffff,
      onProgress: (done, total) => {
        const percent = Math.floor((done * 100) / total);
        if (percent === shownPercent || run.cancelled) return;
        shownPercent = percent;
        exportEstimate.textContent = msg.send.exportProgress(fmtInt(percent));
      },
      isCancelled: () => run.cancelled,
    });
    if (result !== null) {
      if (lastExportUrl) URL.revokeObjectURL(lastExportUrl);
      const url = URL.createObjectURL(new Blob(result.parts as BlobPart[], { type: result.mimeType }));
      lastExportUrl = url;
      const link = document.createElement("a");
      link.href = url;
      link.download = `${baseName}.decimen.${result.extension}`;
      link.click();
    }
  } catch (error) {
    failed = true;
    exportEstimate.textContent = msg.send.exportFailed(localizeError(error));
  } finally {
    activeExport = null;
    exportButton.textContent = msg.send.exportStart;
  }
  // Cancelled or done: hand the line back to the forecast. A failure keeps its
  // message up — repainting the estimate would erase the only explanation.
  if (!failed) void updateExportEstimate();
}

/** Tear the stream down and disarm the picker. The input is cleared so the
 *  same file can be picked again (change would not fire otherwise) and so a
 *  mode switch does not silently resurrect the stopped stream. */
function stopTransfer(): void {
  generation++;
  if (activeExport) activeExport.cancelled = true;
  selectedFile = null;
  setStageFullscreen(false);
  stage.hidden = true;
  showStreamPanels(false);
  cfgFile.value = "";
  updateFilePicker();
  setStatus(msg.send.statusChooseFile);
}

/** Tap the code to fill the screen with it — a bigger physical code lets the
 *  receiver sit farther back or decode denser frames.
 *
 *  Fullscreen is a page STATE (body.qr-full — see style.css), never a fixed
 *  overlay and never a separate element: Safari 26 latches its chrome tint
 *  onto fixed layers, and an overlay element that merely loses a class is
 *  still there for the heuristic to track. A flow layout that reflows on
 *  exit leaves nothing behind. Tap again (or Esc) to shrink back. */
let scrollBeforeFullscreen = 0;
function setStageFullscreen(on: boolean): void {
  if (on === document.body.classList.contains("qr-full")) return;
  if (on) scrollBeforeFullscreen = window.scrollY;
  document.body.classList.toggle("qr-full", on);
  resizeDisplay?.();
  // Entering: the stage IS the page now, start at its top. Leaving: put the
  // user back on the exact spot they expanded from.
  window.scrollTo(0, on ? 0 : scrollBeforeFullscreen);
}

stage.addEventListener("click", () => {
  setStageFullscreen(!document.body.classList.contains("qr-full"));
});
window.addEventListener("keydown", (event) => {
  if (event.key === "Escape") setStageFullscreen(false);
});

/** Switching what we're sending kills any stream in flight and clears the stage. */
function applyMode(): void {
  generation++;
  if (activeExport) activeExport.cancelled = true;
  selectedFile = null;
  setStageFullscreen(false);
  stage.hidden = true;
  showStreamPanels(false);

  if (DEMO || BENCHMARK) {
    modePicker.hidden = true;
    paneFile.hidden = true;
    paneSnippet.hidden = true;
    paneDemo.hidden = false;
    setStatus(BENCHMARK ? msg.send.statusBenchmark : msg.send.statusChooseDemo);
    return;
  }

  const mode = currentMode();
  paneDemo.hidden = true;
  paneFile.hidden = mode !== "file";
  paneSnippet.hidden = mode !== "snippet";
  // The heading used to say "Send a file" even with Text snippet selected.
  toolTitle.textContent = mode === "snippet" ? msg.send.titleSnippet : msg.send.titleFile;
  setStatus(mode === "snippet" ? msg.send.statusPasteText : msg.send.statusChooseFile);
  updateFilePicker();
  // A file left in the picker survives the switch, so re-arm it rather than
  // leaving a filename on screen next to "choose a file to begin".
  if (mode === "file" && cfgFile.files?.[0]) void selectFile();
}

/**
 * The one path from "user picked something" to a running stream.
 *
 * Kills any stream in flight, then packs the payload; a selection that lands
 * mid-pack (the generation guard) or fails to pack (throw → showError) leaves
 * the page idle rather than streaming something stale. Every way of choosing a
 * payload goes through here so the guard can't be subtly wrong in one copy.
 */
async function startSelection(
  status: string,
  prepare: () => Promise<{ name: string; size: number; packed: PackedOpticalFile }>,
): Promise<void> {
  const selectionGeneration = ++generation;
  // The payload a running export describes is being replaced — abandon it.
  if (activeExport) activeExport.cancelled = true;
  selectedFile = null;
  stage.hidden = true;
  setStatus(status);
  try {
    const { name, size, packed } = await prepare();
    if (selectionGeneration !== generation) return;
    selectedFile = {
      name,
      size,
      payload: packed.container,
      compression: packed.compression,
      transmittedSize: packed.transmittedSize,
    };
    await startStream(true);
  } catch (error) {
    showError(localizeError(error));
  }
}

/** Demo payloads ship in public/, so they sit at the site root beside /send/. */
async function selectDemo(fileName: string): Promise<void> {
  await startSelection(msg.send.loadingDemo(fileName), async () => {
    const response = await fetch(`../${fileName}`);
    if (!response.ok) throw new Error(msg.send.demoLoadFailed(fileName, response.status));
    const bytes = new Uint8Array(await response.arrayBuffer());
    return { name: fileName, size: bytes.length, packed: await packFile(fileName, "image/png", bytes) };
  });
}

async function selectFile(): Promise<void> {
  const file = cfgFile.files?.[0];
  if (!file) return;
  await startSelection(msg.send.preparingFile(file.name), async () => {
    // Checked here, off File.size, rather than after reading the bytes: a file
    // well past the limit should be refused instantly instead of after the
    // browser has spent time and memory materialising it. Name the actual size —
    // "too large" without a number leaves you guessing by how much.
    if (file.size === 0) {
      throw new Error(msg.send.fileEmpty(file.name));
    }
    if (file.size > MAX_FILE_BYTES) {
      throw new Error(msg.send.fileOverLimit(file.name, formatBytesL(file.size), MAX_FILE_LABEL));
    }
    const bytes = new Uint8Array(await file.arrayBuffer());
    return { name: file.name, size: file.size, packed: await packFile(file.name, file.type, bytes) };
  });
  updateFilePicker();
}

async function selectSnippet(): Promise<void> {
  await startSelection(msg.send.preparingSnippet, async () => {
    const packed = await packSnippet(snippetText.value);
    return { name: msg.send.modeSnippet, size: packed.originalSize, packed };
  });
}

async function main() {
  // Both bounds come from MAX_SNIPPET_BYTES so they can't drift apart. maxLength
  // counts UTF-16 units and the real check counts UTF-8 bytes, which are never
  // fewer — so this is a loose guard and packSnippet() remains authoritative.
  snippetText.maxLength = MAX_SNIPPET_BYTES;
  snippetLabel.textContent = fillRuntimeTokens(msg.send.snippetLabelWithMax);

  document.querySelector('.mode-nav a[href="../send/"]')?.setAttribute("aria-current", "page");
  if (DEMO || BENCHMARK) {
    const current = document.querySelector('.mode-nav a[href="../send/"]');
    if (current) current.textContent = BENCHMARK ? msg.send.navBenchmark : msg.send.navDemo;
    const paneLabel = paneDemo.querySelector("span");
    if (BENCHMARK && paneLabel) paneLabel.textContent = msg.send.benchmarkPayload;
    // Benchmark preset: 4 codes (2×2). The announcement records the actual
    // settings either way; this just makes the canonical rig the default.
    if (BENCHMARK) cfgGrid.value = "4";
    for (const button of document.querySelectorAll<HTMLButtonElement>("[data-demo]")) {
      // Benchmark mode shows only the canonical payload; demo mode hides it.
      button.hidden = BENCHMARK ? !button.hasAttribute("data-benchmark") : button.hasAttribute("data-benchmark");
      button.addEventListener("click", () => void selectDemo(button.dataset.demo!));
    }
  } else {
    cfgFile.addEventListener("change", () => void selectFile());
    // While a file is armed the picker label must NOT open the file dialog:
    // preventDefault cancels the label→input forwarding, and only the button
    // (or a keyboard activation of the hidden input, whose click bubbles up
    // through the label) stops the stream.
    paneFile.addEventListener("click", (event) => {
      if (!paneFile.classList.contains("has-file")) return;
      event.preventDefault();
      const target = event.target instanceof Element ? event.target : null;
      if (target && (target.closest(".file-picker-button") || target === cfgFile)) stopTransfer();
    });
    sendSnippetBtn.addEventListener("click", () => void selectSnippet());
    for (const input of modeInputs) input.addEventListener("change", applyMode);
  }
  applyMode();
  window.addEventListener("resize", () => resizeDisplay?.());
  for (const el of [cfgFps, cfgBytes, cfgEcc, cfgGrid, cfgSize]) {
    el.addEventListener("change", () => void startStream());
  }
  for (const el of [cfgExportFormat, cfgExportFps, cfgExportScale, cfgExportCycles]) {
    el.addEventListener("change", () => void updateExportEstimate());
  }
  exportButton.addEventListener("click", () => void runExport());
  await requestScreenWakeLock();
}

/** Only on a fresh pick — a settings change restarts the stream too, and
 *  yanking the page down every time you nudge tx fps is worse than useless. */
function scrollStageIntoView() {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  requestAnimationFrame(() => {
    stage.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
  });
}

async function startStream(revealStage = false) {
  const gen = ++generation;
  resizeDisplay = null;
  // Stale until this stream's first frame locks its version and refills them.
  showStreamPanels(false);
  if (!selectedFile) {
    setStatus(currentMode() === "snippet" ? msg.send.statusPasteText : msg.send.statusChooseFile);
    return;
  }
  const { name, size: fileSize, payload, compression, transmittedSize } = selectedFile;
  if (gen !== generation) return; // superseded while fetching
  const txFps = Number(cfgFps.value);
  const frameBytes = Number(cfgBytes.value);
  const ecc = cfgEcc.value as "L" | "M" | "Q" | "H";
  // Grid layouts: 2, 4 or 6 independent fountain frames on screen at once,
  // tiled as same-version QRs. Same header, same capacity math — each code is
  // an ordinary frame, so the receiver's fountain needs no notion of "layout".
  // Cells flip on staggered phases rather than all at once — see tick().
  const gridCodes = Number(cfgGrid.value) || 1;
  const { cols: gridCols, rows: gridRows } = gridDims(gridCodes);
  const displayPx = Number(cfgSize.value);

  const sessionId = (Math.floor(Math.random() * 0xffff) + 1) & 0xffff;
  const blockLen = blockLength(frameBytes);
  // Keep selectedFile on this path — raising bytes/frame back up is the fix,
  // and dropping the pick would hide that.
  if (!fitsInOneStream(payload.length, frameBytes)) {
    // Name a setting that is actually in the dropdown, not the bare minimum.
    const offered = [...cfgBytes.options].map((option) => Number(option.value));
    const suggestion =
      smallestSufficientFrameSize(payload.length, offered) ?? minimumFrameBytes(payload.length);
    showError(
      msg.send.capacityError(
        formatBytesL(payload.length),
        fmtInt(sourceBlockCount(payload.length, frameBytes)),
        String(frameBytes),
        fmtInt(MAX_SOURCE_BLOCKS),
        String(suggestion),
      ),
    );
    return;
  }
  const encoder = new LTEncoder(payload, blockLen, sessionId);
  const header: FrameHeader = {
    sessionId,
    seq: 0,
    k: encoder.k,
    blockLen,
    totalLen: payload.length,
    payloadFnv: fnv1a(payload),
    // No feature bits: this build sends the plain v3 format (see FLAG_* in
    // protocol.ts). Spelled out rather than defaulted so adding a flag is a
    // decision made here, not an omission.
    flags: 0,
  };

  let version: number | undefined; // locked after the first frame
  let modules = 0;
  let scale = 1;
  const staging = document.createElement("canvas");
  const queue: ImageData[] = [];
  // Last painted code per grid position: resizing a canvas clears it (even to
  // the same dimensions), so a mid-stream resize repaints from here instead of
  // leaving blank cells until the stagger rotation reaches them again.
  const cells: (ImageData | null)[] = new Array<ImageData | null>(gridCodes).fill(null);
  let nextSeq = 0;
  stage.hidden = false;

  const sizeCanvas = () => {
    const dpr = window.devicePixelRatio || 1;
    const cell = modules + 2 * MARGIN;
    const totalW = cell * gridCols;
    const totalH = cell * gridRows;
    let budgetW: number;
    let budgetH: number;
    if (document.body.classList.contains("qr-full")) {
      // Tap-to-fullscreen: the whole viewport. The display-size slider and
      // page chrome are deliberately ignored — the point of the mode is "as
      // big as this device goes" — and a non-square grid gets both edges,
      // so a 1×2 stack can run the full height of a portrait phone screen.
      budgetW = window.innerWidth;
      budgetH = window.innerHeight;
    } else {
      const containerWidth =
        stage.parentElement?.getBoundingClientRect().width ?? window.innerWidth;
      const stageStyle = getComputedStyle(stage);
      const horizontalChrome =
        Number.parseFloat(stageStyle.paddingLeft) +
        Number.parseFloat(stageStyle.paddingRight) +
        Number.parseFloat(stageStyle.borderLeftWidth) +
        Number.parseFloat(stageStyle.borderRightWidth);
      budgetW = budgetH = fitQrDisplaySize(
        window.innerWidth,
        window.innerHeight,
        containerWidth,
        displayPx,
        horizontalChrome,
      );
    }
    scale = Math.max(1, Math.floor(Math.min((budgetW * dpr) / totalW, (budgetH * dpr) / totalH)));
    staging.width = totalW;
    staging.height = totalH;
    canvas.width = totalW * scale;
    canvas.height = totalH * scale;
    // Fill the whole budget: the canvas raster stays at an integer module
    // scale and CSS stretches the remainder SMOOTHLY — never `pixelated`.
    // Nearest-neighbor makes adjacent modules differ by a whole device pixel,
    // and at grid densities (scale 2, ~2 camera px/module) that jitter is the
    // difference between 4/4 codes decoding and 0/4, measured with zxing on
    // simulated captures. Uniform slight blur beats jagged module widths.
    // Stretched by one factor on both axes so the modules stay square.
    const cssNativeW = (totalW * scale) / dpr;
    const cssNativeH = (totalH * scale) / dpr;
    const stretch = Math.max(1, Math.min(budgetW / cssNativeW, budgetH / cssNativeH));
    canvas.style.width = `${cssNativeW * stretch}px`;
    canvas.style.height = `${cssNativeH * stretch}px`;
    canvas.style.imageRendering = "auto";
    // Both canvases were just cleared by the dimension writes — repaint every
    // cell the stream has shown so far, so a resize never blanks the grid.
    const stagingCtx = staging.getContext("2d")!;
    cells.forEach((img, i) => {
      if (img) stagingCtx.putImageData(img, (i % gridCols) * cell, Math.floor(i / gridCols) * cell);
    });
    const ctx = canvas.getContext("2d")!;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(staging, 0, 0, canvas.width, canvas.height);
  };

  const makeCode = (): FrameQr => {
    const bytes = packFrame({ ...header, seq: nextSeq }, encoder.encode(nextSeq));
    nextSeq++;
    // Pinned mask and version locking live in qr-frame.ts, shared with the
    // animation exporter so the two paths cannot drift apart.
    return createFrameQr(bytes, ecc, version);
  };

  const makeCell = (): ImageData => {
    const qr = makeCode();
    if (version === undefined) {
      version = qr.version;
      modules = qr.modules.size;
      sizeCanvas();
      resizeDisplay = sizeCanvas;
      // Scroll only now: before sizeCanvas() the canvas is still 16×16, so the
      // scroll target would be the wrong height.
      if (revealStage) scrollStageIntoView();
      // The stream's parameters live at the bottom of Transfer settings, next
      // to the knobs that produced them; the status line stays for prose.
      spec("spec-fps").textContent = msg.send.fpsValue(String(txFps), gridCodes);
      spec("spec-frame").textContent = msg.send.frameBytesValue(String(frameBytes), gridCodes);
      spec("spec-qr").textContent =
        `V${version}${gridCodes > 1 ? ` ×${gridCodes}` : ""} · ECC ${ecc}`;
      spec("spec-payload").textContent = `${name} · ${formatBytesL(fileSize)}`;
      spec("spec-compression").textContent =
        compression === "gzip" ? msg.send.gzipTo(formatBytesL(transmittedSize)) : msg.send.compressionNone;
      spec("spec-k").textContent = `K = ${encoder.k}`;
      showStreamPanels(true);
      // The status line is built by hand: setStatus is textContent-only, and
      // the next setStatus wiping these children out is exactly right.
      //
      // The file name gets its own element so it can be styled apart from the
      // sentence around it, but WHERE it sits is the locale's business —
      // Japanese, Korean and Hindi all put it first. So render the message
      // with a sentinel in the name's place and split on that, rather than
      // assuming the name is preceded by a prefix. NUL cannot occur in a
      // translation, so the split is unambiguous.
      const NAME_SLOT = "\u0000";
      const [before = "", after = ""] = msg.send.streaming(NAME_SLOT).split(NAME_SLOT);
      setStatus(before);
      const streamName = document.createElement("span");
      streamName.className = "stream-file";
      streamName.textContent = name;
      specs.append(streamName, after);
      // The tail of the status line is the door to the share dialog.
      const share = document.createElement("button");
      share.type = "button";
      share.className = "text-button";
      share.textContent = msg.send.shareReceiverLink;
      share.addEventListener("click", openShareDialog);
      specs.append(share);
      // npm run diagnostics: announce this stream's settings so the server
      // log can pair them with the receiver's end-of-run report — the
      // receiver only ever learns k and blockLen from the wire, never the
      // knobs that produced them. Correlate the two by sessionId. The DEV
      // guard is load-bearing: import.meta.env.DEV is statically false in
      // every build, so no static site or standalone file ships this.
      if (import.meta.env.DEV && import.meta.env.VITE_DIAGNOSTICS === "1") {
        void fetch("/__diagnostics", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            role: "sender",
            when: new Date().toISOString(),
            sessionId,
            payload: {
              name,
              fileBytes: fileSize,
              containerBytes: payload.length,
              transmittedBytes: transmittedSize,
              compression,
            },
            settings: {
              txFps,
              frameBytes,
              ecc,
              gridCodes,
              layout: `${gridCols}×${gridRows}`,
              displayPx,
            },
            qr: { version, modules },
            fountain: { k: encoder.k, blockLen },
            ua: navigator.userAgent,
          }),
        }).catch(() => undefined);
      }
    }
    const raster = rasterizeQr(qr.modules.size, qr.modules.data, MARGIN);
    return new ImageData(new Uint8ClampedArray(raster.pixels.buffer), raster.size, raster.size);
  };

  /**
   * Refill the lookahead, generating at most `max` frames per call.
   *
   * Called once up front to fill the queue, then once per tick() — the only
   * thing that drains it. Self-scheduling on `setTimeout(pump, 0)` instead cost
   * ~250 wake-ups a second doing nothing once the queue was full. Capping at
   * one frame per tick keeps the amortisation that gave us: a rAF callback
   * never pays for more than the single frame it just consumed.
   */
  let generatorFailed = false;
  const lookahead = LOOKAHEAD * gridCodes;
  const pump = (max = lookahead) => {
    if (generatorFailed || gen !== generation) return;
    try {
      for (let n = 0; n < max && queue.length < lookahead; n++) queue.push(makeCell());
    } catch (err) {
      // e.g. frame bytes over capacity for the chosen ECC level
      generatorFailed = true;
      showError(err instanceof Error ? err.message : String(err));
    }
  };
  pump();

  // Staggered flips: every cell refreshes at txFps, but cell j flips at phase
  // j/N of the frame interval instead of all N flipping together. A camera
  // exposure that straddles a flip therefore catches at most ONE code mid-
  // transition — the other N−1 sit stable under it. With simultaneous flips
  // that same exposure lost all N at once. Each flip repaints only its own
  // cell rectangle; cells align to cell×scale boundaries, so the partial blit
  // is pixel-exact. (Sub-ticks land on rAF frames, so at high fps × codes
  // several cells can still flip in one refresh — the stagger degrades toward
  // the old behavior, never below it. A grid of one IS the old behavior.)
  const interval = 1000 / txFps;
  const subInterval = interval / gridCodes;
  let cellCursor = 0;
  let nextAt = performance.now();
  let lastTickAt = performance.now();
  const tick = (now: number) => {
    // generatorFailed means no frame will ever be produced again, so stop the
    // rAF loop rather than spinning on an empty queue until a settings change.
    if (gen !== generation || generatorFailed) return;
    requestAnimationFrame(tick);
    // Stall watchdog. Browsers throttle rAF hard in occluded or unfocused
    // windows (Firefox especially) — the stream freezes on whatever frame was
    // up, usually mid-flip and unreadable, and the receiver burns seconds in
    // full-scan reacquisition that LOOKS like a receiver failure. Diagnosed
    // from a field run: 6 s of decodeFps 0 at captureFps 60, then instant
    // recovery when the sender window came back. Nothing can un-throttle the
    // window; what we can do is tell the user exactly what happened.
    const sinceLastTick = now - lastTickAt;
    lastTickAt = now;
    if (sinceLastTick > 1000) {
      setStatus(msg.send.stallWarning(fmtNumber(sinceLastTick / 1000, 1, 1)));
      if (import.meta.env.DEV && import.meta.env.VITE_DIAGNOSTICS === "1") {
        void fetch("/__diagnostics", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            role: "sender",
            event: "stall",
            when: new Date().toISOString(),
            sessionId,
            stallSeconds: Number((sinceLastTick / 1000).toFixed(1)),
          }),
        }).catch(() => undefined);
      }
    }
    if (now < nextAt) return;
    // A long stall (hidden tab, GC pause) leaves a backlog no camera ever saw
    // — restart the cadence instead of bursting it out.
    if (now - nextAt > interval) nextAt = now;
    // Flip EVERY cell that has come due, not one per callback: txFps × codes
    // can exceed the display's refresh rate, so a single vsync may owe
    // several flips. Cells that land on the same vsync paint together — that
    // is the display's floor, not a scheduling choice — but deferring them
    // (one flip per rAF) silently capped per-code fps at refresh ÷ codes and
    // slowed every multi-code grid down. Bounded: the reset above keeps the
    // debt under one frame interval, so this bursts at most gridCodes flips.
    while (now >= nextAt) {
      const img = queue.shift();
      pump(1);
      if (!img) {
        nextAt = now + subInterval;
        break;
      }
      const cell = modules + 2 * MARGIN;
      const cx = (cellCursor % gridCols) * cell;
      const cy = Math.floor(cellCursor / gridCols) * cell;
      cells[cellCursor] = img;
      staging.getContext("2d")!.putImageData(img, cx, cy);
      const ctx = canvas.getContext("2d")!;
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(staging, cx, cy, cell, cell, cx * scale, cy * scale, cell * scale, cell * scale);
      cellCursor = (cellCursor + 1) % gridCodes;
      nextAt += subInterval;
    }
  };
  requestAnimationFrame(tick);
}

void main();
