import { installErrorGuard } from "../shared/errorguard";
import { effectiveParams, measureDisplayHz } from "./params";
import { HEADER_LEN, MAX_FILE_BYTES } from "../shared/protocol";
import { LOGO_SVG, icon } from "../shared/icons";
import { addEntry, kindFor, makeThumb, textSnippet, type GalleryEntry } from "../shared/gallery";
import { putPayload } from "../shared/payloadstore";
import { ACCENTS, applyAccent, initAccent, loadAccent, saveAccent } from "../shared/theme";

const MARGIN = 4;
const LOOKAHEAD = 3;

const canvas = document.getElementById("qr") as HTMLCanvasElement;
const specs = document.getElementById("specs")!;
const cfgPayload = document.getElementById("cfg-payload") as HTMLSelectElement;
const cfgFps = document.getElementById("cfg-fps") as HTMLSelectElement;
const cfgBytes = document.getElementById("cfg-bytes") as HTMLSelectElement;
const cfgEcc = document.getElementById("cfg-ecc") as HTMLSelectElement;
const cfgColorCh = document.getElementById("cfg-colorch") as HTMLSelectElement;
const cfgSize = document.getElementById("cfg-size") as HTMLInputElement;
const cfgFile = document.getElementById("cfg-file") as HTMLInputElement;
const cfgGrid = document.getElementById("cfg-grid") as HTMLSelectElement;
const stage = document.getElementById("stage")!;
const stageIdle = document.getElementById("stage-idle")!;
const stageActions = document.getElementById("stage-actions")!;
const viewTransmit = document.getElementById("view-transmit")!;
const viewSettings = document.getElementById("view-settings")!;
const settingsToggle = document.getElementById("settings-toggle") as HTMLButtonElement;
const transmitBtn = document.querySelector<HTMLButtonElement>('[data-view="transmit"]')!;
const panel = document.getElementById("panel") as HTMLElement;
const panelToggle = document.getElementById("panel-toggle") as HTMLButtonElement;
const confirmBtn = document.getElementById("confirm-btn") as HTMLButtonElement;
const doneBtn = document.getElementById("done-btn") as HTMLButtonElement;
const TX_KEY = "decimen.tx.v1";
declare const __PAGES_DEMO__: boolean;
const DEMO = typeof __PAGES_DEMO__ !== "undefined" && __PAGES_DEMO__;
const DEMO_ASSETS = [
  { value: "../demo/demo-image.png", label: "Demo image (PNG)", type: "image/png" },
  { value: "../demo/demo-video.mp4", label: "Demo video (MP4)", type: "video/mp4" },
  { value: "../demo/demo-audio.wav", label: "Demo audio (WAV)", type: "audio/wav" },
];

interface Preset { label: string; fps: string; bytes: string; grid: string; ecc: string; color: string; }
let displayHz: number | null = null;
void measureDisplayHz().then((hz) => {
  displayHz = hz;
  updateEffLine();
});

function updateEffLine(): void {
  const el = document.getElementById("effline");
  if (!el) return;
  const [c, r] = cfgGrid.value.split("x").map(Number) as [number, number];
  const ch = cfgColorCh.value === "rgb" ? 3 : 1;
  const p = effectiveParams(Number(cfgBytes.value), cfgEcc.value, Number(cfgFps.value), c, r, displayHz, ch);
  const bits = [`effective ${p.bytes} B/code`];
  if (p.clamped) bits[0] = `clamped to ${p.bytes} B/code (v40-${cfgEcc.value} capacity)`;
  bits.push(`${p.fps} fps${p.fpsClamped ? ` (display ${displayHz} Hz safe rate)` : ""}`);
  if (ch === 3) bits.push("rgb x3");
  bits.push(`ceiling ~${p.ceilingKBs.toFixed(0)} KB/s`);
  el.textContent = bits.join(" · ");
}

const PRESETS: Preset[] = [
  { label: "Prime · ~130 KB/s", fps: "60", bytes: "2953", grid: "1x1", ecc: "L", color: "mono" },
  { label: "Balanced · ~29 KB/s", fps: "24", bytes: "1465", grid: "1x1", ecc: "L", color: "mono" },
  { label: "Fast · ~116 KB/s", fps: "30", bytes: "1465", grid: "2x2", ecc: "L", color: "mono" },
  { label: "RGB fast · ~345 KB/s", fps: "30", bytes: "1465", grid: "2x2", ecc: "L", color: "rgb" },
  { label: "Max speed · ~290 KB/s", fps: "60", bytes: "2953", grid: "2x2", ecc: "L", color: "mono" },
  { label: "Robust · ~29 KB/s", fps: "24", bytes: "1465", grid: "1x1", ecc: "M", color: "mono" },
  { label: "Long range · ~10 KB/s", fps: "24", bytes: "500", grid: "1x1", ecc: "Q", color: "mono" },
];

async function recordSent(name: string, type: string, bytes: Uint8Array, sessionId: number, transmittedSize: number): Promise<void> {
  const kind = kindFor(name, type);
  const entry: GalleryEntry = {
    id: `tx-${sessionId}-${name}`,
    name,
    mime: type,
    kind,
    size: bytes.length,
    transmittedSize,
    at: Date.now(),
  };
  if (kind === "text" || kind === "code") entry.snippet = textSnippet(bytes);
  try {
    await putPayload(entry.id, bytes, entry.at);
    entry.stored = true;
  } catch {}
  const thumb = await makeThumb(bytes, type || (name.toLowerCase().endsWith(".png") ? "image/png" : ""));
  if (thumb) entry.thumb = thumb;
  addEntry(localStorage, TX_KEY, entry);
}

const payloadCache = new Map<string, Uint8Array>();
let customFile: { name: string; type: string; bytes: Uint8Array } | null = null;
let generation = 0;
let onViewportResize: (() => void) | null = null;
let genWorker: Worker | null = null;
let streaming = false;
let activeLoaded: { name: string; type: string; bytes: Uint8Array } | null = null;
let activeSession = 0;
let activeTransmitted = 0;

function setPanelOpen(open: boolean): void {
  panel.hidden = !open;
  panelToggle.classList.toggle("active", open);
  requestAnimationFrame(() => onViewportResize?.());
}

function showView(view: "transmit" | "settings"): void {
  viewTransmit.hidden = view !== "transmit";
  viewSettings.hidden = view !== "settings";
  transmitBtn.classList.toggle("active", view === "transmit");
  settingsToggle.classList.toggle("active", view === "settings");
  if (view === "transmit") requestAnimationFrame(() => onViewportResize?.());
}

function showError(message: string): void {
  specs.textContent = message;
  specs.hidden = false;
}

function buildSwatches(): void {
  const wrap = document.getElementById("swatches")!;
  const current = loadAccent();
  for (const a of ACCENTS) {
    const b = document.createElement("button");
    b.className = "swatch";
    b.style.setProperty("--sw", a.accent);
    b.title = a.label;
    b.classList.toggle("active", current === a.id);
    b.onclick = () => {
      applyAccent(a.accent, a.accent2, a.contrast);
      saveAccent(a.id);
      markActiveSwatch(a.id);
    };
    wrap.append(b);
  }
  const picker = document.createElement("label");
  picker.className = "swatch picker";
  picker.title = "Custom color";
  const input = document.createElement("input");
  input.type = "color";
  input.value = current.startsWith("#") ? current : ACCENTS[0]!.accent;
  if (current.startsWith("#")) {
    picker.style.setProperty("--sw", current);
    picker.classList.add("active");
  }
  input.oninput = () => {
    picker.style.setProperty("--sw", input.value);
    applyAccent(input.value);
    saveAccent(input.value);
    markActiveSwatch("__picker__");
  };
  picker.append(input);
  wrap.append(picker);
}

function markActiveSwatch(id: string): void {
  const swatches = document.querySelectorAll<HTMLElement>("#swatches .swatch");
  swatches.forEach((el, i) => {
    const isPicker = el.classList.contains("picker");
    el.classList.toggle("active", isPicker ? id === "__picker__" : ACCENTS[i]?.id === id);
  });
}

function buildPresets(): void {
  const wrap = document.getElementById("presets")!;
  for (const p of PRESETS) {
    const c = document.createElement("button");
    c.className = "chip";
    c.textContent = p.label;
    c.onclick = () => {
      cfgFps.value = p.fps;
      cfgBytes.value = p.bytes;
      cfgGrid.value = p.grid;
      cfgEcc.value = p.ecc;
      cfgColorCh.value = p.color;
      updateEffLine();
      for (const other of wrap.querySelectorAll(".chip")) other.classList.remove("active");
      c.classList.add("active");
    };
    wrap.append(c);
  }
}

function setSource(src: "demo" | "file"): void {
  for (const b of document.querySelectorAll<HTMLButtonElement>("#src-seg .seg-btn")) {
    b.classList.toggle("active", b.dataset.src === src);
  }
  document.getElementById("field-file")!.hidden = src !== "file";
  document.getElementById("field-payload")!.hidden = src !== "demo";
}

function applyDemoMode(): void {
  document.getElementById("src-seg")!.hidden = true;
  document.getElementById("field-file")!.hidden = true;
  document.getElementById("field-payload")!.hidden = false;
  for (const a of document.querySelectorAll<HTMLAnchorElement>('a[href*="gallery/"]')) a.hidden = true;
  document.getElementById("rail-logo")?.removeAttribute("href");
  cfgPayload.replaceChildren();
  for (const a of DEMO_ASSETS) {
    const opt = document.createElement("option");
    opt.value = a.value;
    opt.textContent = a.label;
    cfgPayload.append(opt);
  }
  cfgPayload.value = DEMO_ASSETS[0]!.value;
}

async function loadPayload(
  sel: string,
): Promise<{ name: string; type: string; bytes: Uint8Array } | null> {
  if (sel === "custom") return customFile;
  const demo = DEMO_ASSETS.find((a) => a.value === sel);
  const name = sel.split("/").pop() ?? "payload.bin";
  const hit = payloadCache.get(sel);
  if (hit) return { name, type: demo?.type ?? "", bytes: hit };
  const res = await fetch(sel);
  if (!res.ok) return null;
  const bytes = new Uint8Array(await res.arrayBuffer());
  payloadCache.set(sel, bytes);
  return { name, type: demo?.type ?? "", bytes };
}

async function useFile(file: File): Promise<void> {
  customFile = { name: file.name, type: file.type, bytes: new Uint8Array(await file.arrayBuffer()) };
  let opt = cfgPayload.querySelector<HTMLOptionElement>('option[value="custom"]');
  if (!opt) {
    opt = document.createElement("option");
    opt.value = "custom";
    cfgPayload.append(opt);
  }
  opt.textContent = file.name;
  cfgPayload.value = "custom";
  setSource("file");
}

function chosenPayloadSel(): string {
  if (DEMO) return cfgPayload.value;
  const fileSelected = !document.getElementById("field-file")!.hidden;
  return fileSelected && customFile ? "custom" : cfgPayload.value;
}

async function confirmStream(): Promise<void> {
  confirmBtn.disabled = true;
  await startStream();
  confirmBtn.disabled = false;
  if (!streaming) return;
  showView("transmit");
  setPanelOpen(false);
  stageIdle.hidden = true;
  canvas.hidden = false;
  specs.hidden = true;
  stageActions.hidden = false;
  requestAnimationFrame(() => onViewportResize?.());
}

function stopStream(): void {
  generation++;
  genWorker?.terminate();
  genWorker = null;
  streaming = false;
}

async function finishTransfer(): Promise<void> {
  doneBtn.disabled = true;
  if (DEMO) {
    stopStream();
    location.reload();
    return;
  }
  if (activeLoaded) {
    await recordSent(activeLoaded.name, activeLoaded.type, activeLoaded.bytes, activeSession, activeTransmitted);
  }
  stopStream();
  location.href = "../gallery/index.html#sent";
}

installErrorGuard();
async function main() {
  initAccent();
  document.getElementById("rail-logo")!.innerHTML = LOGO_SVG;
  document.getElementById("idle-logo")!.innerHTML = LOGO_SVG;
  for (const el of document.querySelectorAll<HTMLElement>("[data-icon]")) {
    el.innerHTML = icon(el.dataset.icon!);
  }
  buildSwatches();
  buildPresets();
  if (DEMO) applyDemoMode();
  for (const b of document.querySelectorAll<HTMLButtonElement>("#src-seg .seg-btn")) {
    b.addEventListener("click", () => setSource(b.dataset.src as "demo" | "file"));
  }
  panelToggle.addEventListener("click", () => setPanelOpen(panel.hidden));
  document.getElementById("panel-close")!.addEventListener("click", () => setPanelOpen(false));
  transmitBtn.addEventListener("click", () => showView("transmit"));
  settingsToggle.addEventListener("click", () => showView("settings"));
  confirmBtn.addEventListener("click", () => void confirmStream());
  doneBtn.addEventListener("click", () => void finishTransfer());
  cfgFile.addEventListener("change", () => {
    const f = cfgFile.files?.[0];
    if (f) void useFile(f);
  });
  for (const sel of [cfgFps, cfgBytes, cfgGrid, cfgEcc, cfgColorCh]) sel.addEventListener("change", updateEffLine);
  updateEffLine();
  if (!DEMO) {
    window.addEventListener("dragover", (e) => e.preventDefault());
    window.addEventListener("drop", (e) => {
      e.preventDefault();
      const f = e.dataTransfer?.files[0];
      if (f) void useFile(f);
    });
  }
  window.addEventListener("resize", () => onViewportResize?.());
  setPanelOpen(true);
  try {
    await (navigator as Navigator & { wakeLock?: { request(t: "screen"): Promise<unknown> } })
      .wakeLock?.request("screen");
  } catch {}
}

async function startStream() {
  const gen = ++generation;
  streaming = false;
  const loaded = await loadPayload(chosenPayloadSel());
  if (!loaded) {
    showError(`couldn't load the selected payload`);
    return;
  }
  if (gen !== generation) return;
  const txChannels = cfgColorCh.value === "rgb" ? 3 : 1;
  const effPre = effectiveParams(Number(cfgBytes.value), cfgEcc.value, Number(cfgFps.value), Number(cfgGrid.value.split("x")[0]), Number(cfgGrid.value.split("x")[1]), displayHz, txChannels);
  const txFps = effPre.fps;
  const frameBytes = Number(cfgBytes.value);
  const ecc = cfgEcc.value as "L" | "M" | "Q" | "H";
  const displayPx = Number(cfgSize.value);
  const [gridCols, gridRows] = cfgGrid.value.split("x").map(Number) as [number, number];
  const group = gridCols * gridRows;

  const blockLen = frameBytes - HEADER_LEN;
  if (loaded.bytes.length > MAX_FILE_BYTES) {
    showError(`error · ${loaded.name} exceeds the 64 MB limit of this build`);
    return;
  }
  const sessionId = (Math.floor(Math.random() * 0xffff) + 1) & 0xffff;
  streaming = true;
  activeLoaded = loaded;
  activeSession = sessionId;
  activeTransmitted = loaded.bytes.length;
  let packedInfo = "";

  let version: number | undefined;
  let modules = 0;
  let scale = 1;
  const staging = document.createElement("canvas");
  const queue: ImageData[] = [];

  const sizeCanvas = () => {
    const dpr = window.devicePixelRatio || 1;
    const cell = modules + 2 * MARGIN;
    const gridW = gridCols * cell;
    const gridH = gridRows * cell;
    const avail = Math.max(240, Math.min(stage.clientWidth, stage.clientHeight) - 16);
    const cssBudget = Math.min(avail, displayPx);
    scale = Math.max(1, Math.floor((cssBudget * dpr) / Math.max(gridW, gridH)));
    canvas.style.borderRadius = `${Math.min(20, Math.max(6, (MARGIN * scale) / dpr - 2))}px`;
    if (staging.width !== gridW || staging.height !== gridH) {
      staging.width = gridW;
      staging.height = gridH;
    }
    canvas.width = gridW * scale;
    canvas.height = gridH * scale;
    canvas.style.width = `${(gridW * scale) / dpr}px`;
    canvas.style.height = `${(gridH * scale) / dpr}px`;
  };

  onViewportResize = () => {
    if (gen !== generation || modules === 0) return;
    sizeCanvas();
    const ctx = canvas.getContext("2d")!;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(staging, 0, 0, canvas.width, canvas.height);
  };

  const makeSpecs = (k: number) => {
    const rawKbs = Math.round((group * frameBytes * txFps) / 1024);
    specs.textContent =
      `${loaded.name} · ${gridCols}x${gridRows} grid · ${txFps} FPS · ${frameBytes} B/code · ` +
      `V${version} · ECC ${ecc} · ~${rawKbs} KB/s raw · ${packedInfo} · K=${k}`;
  };

  genWorker?.terminate();
  const worker = new Worker(new URL("./genworker.ts", import.meta.url), { type: "module" });
  genWorker = worker;
  let inflight = 0;
  const pull = () => {
    while (queue.length + inflight < LOOKAHEAD) {
      worker.postMessage({ type: "pull" });
      inflight++;
    }
  };
  worker.onmessage = (e: MessageEvent) => {
    if (gen !== generation || worker !== genWorker) return;
    const msg = e.data as
      | {
          type: "meta";
          version: number;
          modules: number;
          k: number;
          compression: "none" | "gzip";
          originalSize: number;
          transmittedSize: number;
        }
      | { type: "group"; buf: ArrayBuffer; w: number; h: number }
      | { type: "error"; message: string };
    if (msg.type === "meta") {
      version = msg.version;
      modules = msg.modules;
      const orig = Math.round(msg.originalSize / 1024);
      const sent = Math.round(msg.transmittedSize / 1024);
      packedInfo =
        msg.compression === "gzip" ? `gzip ${orig} KB > ${sent} KB` : `${orig} KB payload`;
      activeTransmitted = msg.transmittedSize;
      sizeCanvas();
      makeSpecs(msg.k);
      return;
    }
    if (msg.type === "error") {
      showError(`error · ${msg.message}`);
      return;
    }
    inflight--;
    queue.push(new ImageData(new Uint8ClampedArray(msg.buf), msg.w, msg.h));
  };
  const bytesCopy = loaded.bytes.slice();
  worker.postMessage(
    {
      type: "init",
      sessionId,
      blockLen,
      ecc,
      cols: gridCols,
      rows: gridRows,
      channels: txChannels,
      name: loaded.name,
      fileType: loaded.type,
      bytes: bytesCopy.buffer,
    },
    [bytesCopy.buffer],
  );
  pull();

  const interval = 1000 / txFps;
  let nextAt = performance.now();
  const tick = (now: number) => {
    if (gen !== generation) return;
    requestAnimationFrame(tick);
    if (now < nextAt) return;
    const img = queue.shift();
    pull();
    if (!img) {
      nextAt = now + interval;
      return;
    }
    staging.getContext("2d")!.putImageData(img, 0, 0);
    const ctx = canvas.getContext("2d")!;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(staging, 0, 0, canvas.width, canvas.height);
    nextAt += interval;
    if (now - nextAt > 3 * interval) nextAt = now + interval;
  };
  requestAnimationFrame(tick);
}

void main();
