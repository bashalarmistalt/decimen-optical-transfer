// Receiver: camera → WASM QR decode in workers → fountain decoder → file.
//
// Field lessons baked in:
// - iOS treats `frameRate: {ideal: 60}` as a suggestion and delivers 30.
//   Demand `exact` first (it works at 1280-wide), fall back to `ideal`.
// - requestVideoFrameCallback chains survive a stopped stream and resume on
//   the next one — a generation counter prevents zombie capture loops.
// - Progress must track frames COLLECTED: LT peeling back-loads its solve
//   cascade, so blocks-solved looks stalled and then teleports to done.
// - Android Chrome exposes torch / focusMode / frameRate.max through
//   getCapabilities; iOS Safari exposes none of them. shared/platform.ts owns
//   the probing, so everything here is capability-gated rather than UA-gated.

import { LTDecoder } from "../shared/fountain";
import {
  estimateTransferProgress,
  expectedFountainOverhead,
  formatDuration,
} from "../shared/progress";
import { createDecodeWorker } from "./worker-factory";
import { NoSignalHintTimer } from "../shared/no-signal";
import {
  DecodeWorkerPool,
  type SymbolBox,
  type SymbolInfo,
  type SymbolQuad,
} from "../shared/worker-pool";
import { isSnippet, snippetText } from "../shared/snippet";
import {
  fnv1a,
  parseFrame,
  streamIdentity,
  unpackFile,
  verifyFile,
  type OpticalFile,
} from "../shared/protocol";
import { NO_SIGNAL_HINT_FRAME_BYTES, NO_SIGNAL_HINT_TX_FPS } from "../shared/send-settings";
import { statusLine } from "../shared/status-line";
import { requestScreenWakeLock } from "../shared/wake-lock";
import { applyAdvancedConstraint, probeCameraCapabilities } from "../shared/platform";
import { closeOnBackdropClick } from "../shared/dialog";
import { supportLink } from "./support";

const startBtn = document.getElementById("start") as HTMLButtonElement;
const video = document.getElementById("video") as HTMLVideoElement;
const preview = document.getElementById("preview")!;
const cameraBox = document.querySelector<HTMLDivElement>(".preview")!;
const overlay = document.getElementById("detect-overlay") as HTMLCanvasElement;
const stats = document.getElementById("stats")!;
const progressEl = document.getElementById("progress")!;
const bar = document.getElementById("bar")!;
const progressStatus = document.getElementById("progress-status")!;
const progressLabel = document.getElementById("progress-label")!;
const etaLabel = document.getElementById("eta-label")!;
const result = document.getElementById("result")!;
const metricsEl = document.getElementById("metrics")!;
const diagnosticsEl = document.getElementById("diagnostics") as HTMLDetailsElement | null;
const settingsEl = document.getElementById("settings")!;
const cfgWidth = document.getElementById("cfg-width") as HTMLSelectElement;
const cfgCapFps = document.getElementById("cfg-capfps") as HTMLSelectElement;
const cfgWorkers = document.getElementById("cfg-workers") as HTMLSelectElement;
const cameraActual = document.getElementById("camera-actual")!;
const noSignalToast = document.getElementById("no-signal")!;
const noSignalDialog = document.getElementById("no-signal-dialog") as HTMLDialogElement;
const noSignalTips = document.getElementById("no-signal-tips")!;
const metric = (id: string) => document.getElementById(id)!;

// Nothing has decoded in this long → the sender is almost certainly too dense
// for this camera. The first nudge comes quickly (a dead link is dead within
// seconds); a dismissed one comes back on a longer leash, because dismissing
// it doesn't make the transfer start working but the advice has been seen.
const NO_SIGNAL_FIRST_MS = 8_000;
const NO_SIGNAL_DISMISSED_MS = 15_000;

// Sliding window for the capture/decode fps metrics — the per-second rates in
// updateStats() are derived from this, so the window and the divisor can't
// drift apart.
const STATS_WINDOW_MS = 2000;

let stream: MediaStream | null = null;
let decoder: LTDecoder | null = null;
let streamKey = "";
let reportSessionId = 0; // pairs this run with the sender's diagnostics post
let startTs = 0;
let captureGen = 0;
let done = false;
let settingsWired = false;
let statsTimer: ReturnType<typeof setInterval> | undefined;

const noSignal = new NoSignalHintTimer(NO_SIGNAL_FIRST_MS, NO_SIGNAL_DISMISSED_MS);
const pool = new DecodeWorkerPool(
  createDecodeWorker,
  (bytes, box, info) => onDecoded(bytes, box, info),
  // A sighting is a detected-but-undecoded code: no bytes, but a position.
  // Heavily gated in noteRegion (refresh-only on matches, size-checked on
  // creation) because failed quads are often junk — but a plausible one lets
  // the crop path go decode what the full frame could not.
  (box) => noteRegion(box, performance.now(), false),
  () => trackedAttempts++,
);
const captureTimes: number[] = [];
const decodeTimes: number[] = [];

// Run-level totals for the diagnostics report (npm run diagnostics). The
// captureTimes/decodeTimes windows above are pruned for the live fps metrics
// and cannot answer "how much, in total, did this run do".
let totalCaptures = 0;
let totalDecodes = 0;
let fullScans = 0;
let peakRegions = 0;
let capturesDropped = 0; // pool full — frame never even submitted
let cropsSubmitted = 0;
let trackedDecodes = 0; // decodes via the fork's detection-skipping fast path
let trackedAttempts = 0; // crops that TRIED the fast path — hits/attempts is
// the fork's real hit rate; zero attempts means the quad/dim plumbing broke
let cameraStartedTs = 0; // acquisition latency = first decode − camera start
let zeroRegionMs = 0; // transfer time spent with tracking fully collapsed
let degradedMs = 0; // transfer time spent below the expected code count
let minSeq = Infinity; // seq span ≈ what the sender emitted while we watched;
let maxSeq = -1; //        framesNew / span is the fraction we actually caught
// One sample per stats tick (500 ms): elapsed s, framesNew, solved blocks,
// live regions, capture fps, decode fps. The shape of a bad run — where it
// stalled, when tracking collapsed — is invisible in run totals.
const timeline: number[][] = [];
const TIMELINE_MAX_SAMPLES = 1200; // 10 min — past that the tail tells nothing new

// Per-code crop tracking. The scene is static (both devices propped), so once
// a code has been seen its next frames are decoded from a padded crop around
// its last position: one code per crop means no finder-pattern confusion
// between neighbors, far fewer pixels per decode, and the crops parallelize
// across the worker pool. A periodic full-frame scan (re)acquires anything
// the crops lose — nothing here can get permanently stuck.
interface Region extends SymbolBox {
  seen: number;
  /** True once bytes have actually decoded here. Sighting-only regions are
   *  probationary: they get crops, but they are not drawn, not counted
   *  toward the expected code total, and evicted first. */
  decoded: boolean;
  /** How far the code moved between its last two decodes, in capture px —
   *  a handheld receiver's crops must lead the target, not chase it. */
  drift?: number;
  /** Corner quad + module count of the last decode here — the tracked fast
   *  path in the worker rebuilds its sampling transform from these and skips
   *  detection entirely. Only ever set from real decodes. */
  quad?: SymbolQuad;
  dim?: number;
}
const regions: Region[] = [];
// Tried and reverted: a longer TTL for regions with a decode track record
// (6 s after 5 hits). It measured WORSE — a stale region squats on crop
// slots at a dead position, and by keeping regions.length looking healthy it
// suppresses the degraded rescan cadence exactly when reacquisition is
// needed. Expiring fast and rescanning hard wins.
const REGION_TTL_MS = 1500;
const FULL_SCAN_INTERVAL_MS = 1500;
// A grid sender shows several codes; when fewer regions are live than the
// stream has shown simultaneously, one of them is MISSING — glare, focus, a
// borderline density. Crops can't find it (they only look where codes were),
// so rescan the whole frame hard until it's back. The relaxed cadence would
// leave a missing code dark for 1.5 s at a time, which on a 2-code stream
// halves throughput and single-threads the fountain's systematic sweep.
const FULL_SCAN_DEGRADED_MS = 250;
// With no lock at all the receiver used to full-scan EVERY capture — sixty
// 1.2 MP tryHarder decodes per second for the whole aiming phase, the app's
// hottest loop (fullScans regularly passed 100 before the first timeline
// sample). Ten per second keeps acquisition feeling instant — ≤100 ms added
// to first lock — and cuts the aiming burn ~85%.
const ACQUISITION_SCAN_MS = 100;
// The high-water mark ages out: a sender restarted with a smaller layout
// would otherwise keep this receiver rescanning for codes that no longer
// exist until the transfer ends.
const EXPECTED_REGIONS_DECAY_MS = 10_000;
const REGION_PAD = 0.35;
const MAX_REGIONS = 9;
let lastFullScan = 0;
let cropRotate = 0;
let expectedRegions = 0;
let expectedRegionsAt = 0;

function decodedCount(): number {
  let n = 0;
  for (const r of regions) if (r.decoded) n++;
  return n;
}

function findMatchingRegion(box: SymbolBox): Region | undefined {
  return regions.find((r) => {
    const dx = Math.abs(box.x + box.w / 2 - (r.x + r.w / 2));
    const dy = Math.abs(box.y + box.h / 2 - (r.y + r.h / 2));
    return dx < Math.max(box.w, r.w) / 2 && dy < Math.max(box.h, r.h) / 2;
  });
}

function updateMatchedRegion(r: Region, box: SymbolBox, now: number, decoded: boolean, info?: SymbolInfo): void {
  if (!decoded) {
    // A sighting is an eyewitness report, not a measurement: enough to
    // keep the region alive, never enough to move or resize it. zxing's
    // failed quads are routinely clipped or wildly mis-sized, and one
    // overwriting a decode-proven box aims every following crop at
    // garbage — a measured 6× throughput collapse on a 4-code grid.
    r.seen = now;
    return;
  }
  const dx = Math.abs(box.x + box.w / 2 - (r.x + r.w / 2));
  const dy = Math.abs(box.y + box.h / 2 - (r.y + r.h / 2));
  // Half-life blend of per-decode displacement: steady hands decay it to
  // zero, a moving hand keeps the crop padding wide (see captureFrame).
  r.drift = 0.5 * (r.drift ?? 0) + 0.5 * Math.hypot(dx, dy);
  Object.assign(r, box, { seen: now });
  r.decoded = true;
  if (info?.quad) r.quad = info.quad;
  if (info?.modules) r.dim = info.modules;
}

/** A sighting may only FOUND a region when it looks like the codes this
 *  stream already decodes: grid codes are same-version and same-size on
 *  screen, so a quad far off a decode-proven code's size is detector noise.
 *  With nothing decoded yet there is no yardstick — full scans own
 *  acquisition then, and phantom regions would only starve them. */
function isPlausibleSighting(box: SymbolBox): boolean {
  const reference = regions.find((r) => r.decoded);
  if (!reference) return false;
  const ratio = Math.max(box.w, box.h) / Math.max(reference.w, reference.h);
  return ratio >= 0.5 && ratio <= 2;
}

function noteRegion(box: SymbolBox, now: number, decoded = true, info?: SymbolInfo): void {
  const match = findMatchingRegion(box);
  if (match) {
    updateMatchedRegion(match, box, now, decoded, info);
    return;
  }
  if (!decoded && !isPlausibleSighting(box)) return;
  regions.push({ ...box, seen: now, decoded, quad: info?.quad, dim: info?.modules });
  if (regions.length > MAX_REGIONS) {
    regions.sort((a, b) => Number(b.decoded) - Number(a.decoded) || b.seen - a.seen);
    regions.length = MAX_REGIONS;
  }
}

/** The stylesheet guesses 4:3 for the camera box, but cameras rarely negotiate
 *  exactly that, and any mismatch used to be swallowed by object-fit: cover
 *  silently cropping — codes the decoder could see sat outside the visible
 *  preview. Sync the box to the stream's real shape instead; with the aspect
 *  matched, contain shows every pixel the decoder gets, edge to edge. */
function syncPreviewAspect() {
  if (video.videoWidth && video.videoHeight) {
    cameraBox.style.aspectRatio = `${video.videoWidth} / ${video.videoHeight}`;
  }
}
// Fires whenever the intrinsic size changes — device rotation, or a live
// capture-width change the camera accepted.
video.addEventListener("resize", syncPreviewAspect);

// Viewfinder corner brackets around each code the decoder is tracking, fading
// out once a region stops producing decodes. Long before REGION_TTL_MS: the
// brackets answer "is it reading THIS code right now", so they should die as
// soon as the answer stops being yes, while the crop tracker keeps trying.
const INDICATOR_FADE_MS = 700;
const overlayCtx = overlay.getContext("2d")!;
// One vivid color per code so a multi-code stream reads at a glance — "the
// amber one isn't decoding" beats counting brackets. Assigned by layout order
// (top-to-bottom, left-to-right), so a code keeps its color across dropouts
// and reacquisitions instead of shuffling on every region churn.
const INDICATOR_COLORS = [
  "#42e8ff", // cyan
  "#54ff7e", // green
  "#ffd94a", // amber
  "#ff6ad5", // pink
  "#c08bff", // violet
  "#ff9a4d", // orange
  "#8dff4a", // lime
  "#ff5f5f", // coral
  "#ffffff", // white
];

/** Grid-layout reading order: rows first, columns within a row. Two boxes are
 *  the same row when their vertical centers are within half a code of each
 *  other — grid codes are same-size and aligned, so this is unambiguous. */
function layoutOrder(a: Region, b: Region): number {
  const dy = a.y + a.h / 2 - (b.y + b.h / 2);
  if (Math.abs(dy) > Math.max(a.h, b.h) / 2) return dy;
  return a.x + a.w / 2 - (b.x + b.w / 2);
}

function drawOverlay(now: number) {
  const cw = overlay.clientWidth;
  const ch = overlay.clientHeight;
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  if (!cw || !ch || !vw || !vh) return;
  const dpr = window.devicePixelRatio || 1;
  const pw = Math.round(cw * dpr);
  const ph = Math.round(ch * dpr);
  if (overlay.width !== pw || overlay.height !== ph) {
    overlay.width = pw;
    overlay.height = ph;
  }
  overlayCtx.clearRect(0, 0, pw, ph);
  // Regions live in capture pixels; the video sits object-fit: contain inside
  // the same box as the overlay, so one letterbox mapping places everything.
  const scale = Math.min(pw / vw, ph / vh);
  const offX = (pw - vw * scale) / 2;
  const offY = (ph - vh * scale) / 2;
  overlayCtx.lineWidth = Math.max(2, 2 * dpr);
  overlayCtx.lineCap = "round";
  overlayCtx.lineJoin = "round";
  // Brackets are for codes this stream has actually read — probationary
  // sighting regions stay invisible, or every stray failed quad would paint
  // a phantom box.
  const ordered = regions.filter((r) => r.decoded).sort(layoutOrder);
  for (const [slot, r] of ordered.entries()) {
    const age = now - r.seen;
    if (age > INDICATOR_FADE_MS) continue;
    const color = INDICATOR_COLORS[slot % INDICATOR_COLORS.length]!;
    overlayCtx.strokeStyle = color;
    overlayCtx.shadowColor = color;
    overlayCtx.shadowBlur = 4 * dpr;
    // Brackets sit just outside the code so they never cover its modules.
    const pad = 0.06 * Math.max(r.w, r.h) * scale;
    const x = offX + r.x * scale - pad;
    const y = offY + r.y * scale - pad;
    const w = r.w * scale + 2 * pad;
    const h = r.h * scale + 2 * pad;
    const len = 0.24 * Math.min(w, h);
    overlayCtx.globalAlpha = 1 - age / INDICATOR_FADE_MS;
    overlayCtx.beginPath();
    overlayCtx.moveTo(x, y + len);
    overlayCtx.lineTo(x, y);
    overlayCtx.lineTo(x + len, y);
    overlayCtx.moveTo(x + w - len, y);
    overlayCtx.lineTo(x + w, y);
    overlayCtx.lineTo(x + w, y + len);
    overlayCtx.moveTo(x + w, y + h - len);
    overlayCtx.lineTo(x + w, y + h);
    overlayCtx.lineTo(x + w - len, y + h);
    overlayCtx.moveTo(x + len, y + h);
    overlayCtx.lineTo(x, y + h);
    overlayCtx.lineTo(x, y + h - len);
    overlayCtx.stroke();
  }
  overlayCtx.globalAlpha = 1;
  overlayCtx.shadowBlur = 0;
}
startBtn.onclick = () => void start();

// The header nav markup is shared verbatim between both tool pages; each page
// marks its own link. Optional because the standalone build swaps the nav for
// a badge. Same story on the sender.
document.querySelector('.mode-nav a[href="../receive/"]')?.setAttribute("aria-current", "page");

// More decode workers than the device has cores just adds contention —
// counts the device can't use are removed outright rather than grayed out:
// a dead option is noise here, not information.
if (navigator.hardwareConcurrency) {
  for (const option of Array.from(cfgWorkers.options)) {
    if (Number(option.value) > navigator.hardwareConcurrency) option.remove();
  }
}
// Default to everything the device offers. Workers got cheap (the Decimen
// zxing build is 258 KB per instance, and tracked decoding cut per-decode
// CPU), and controlled runs showed the pool as the safety margin, not the
// risk — a 60 fps stream now decodes at capture rate when the pool is ahead
// of it. An explicit selection (change event) sticks for the session.
cfgWorkers.value = String(
  Math.max(...Array.from(cfgWorkers.options, (option) => Number(option.value))),
);

const { setStatus, showError } = statusLine(stats);

// The toast asks one question; the answers live in the dialog. The tip list is
// built here rather than in the HTML so its numbers stay tied to the shared
// send-settings constants the sender's controls are rendered from.
for (const line of [
  `On the sender, open Transfer settings and drop bytes / frame to ${NO_SIGNAL_HINT_FRAME_BYTES}.`,
  `Still nothing? Drop the sender's tx fps to ${NO_SIGNAL_HINT_TX_FPS} as well.`,
  "Fill this camera's view with the code, and prop the phone against something — autofocus hunting from hand tremor is the usual culprit.",
  "Turn the sending screen's brightness all the way up.",
]) {
  const item = document.createElement("li");
  item.textContent = line;
  noSignalTips.append(item);
}

document.getElementById("no-signal-help")!.addEventListener("click", () => {
  noSignalDialog.showModal();
});
document.getElementById("no-signal-dismiss")!.addEventListener("click", dismissNoSignal);
document.getElementById("no-signal-close")!.addEventListener("click", () => noSignalDialog.close());
// A tap on the backdrop closes too — geometry-tested, see shared/dialog.ts.
closeOnBackdropClick(noSignalDialog);
// close fires on the button, Esc, the backdrop, and the programmatic close
// when a frame finally decodes — all of them mean the advice has been seen.
noSignalDialog.addEventListener("close", dismissNoSignal);

function dismissNoSignal() {
  noSignalToast.hidden = true;
  noSignal.dismiss(performance.now());
}

/** By the time a transfer ends the camera, worker pool and stats timer are all
 *  torn down and `done` is latched, so a reload is the honest way back to a
 *  live receiver — and it drops the recovered bytes from memory on the way. */
function restartButton(label: string): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "secondary-button";
  button.textContent = label;
  button.addEventListener("click", () => window.location.reload());
  return button;
}

/** Put the page back the way it was so a refused camera can be retried without
 *  a reload. Tapping "Block" by accident on the permission prompt is easy, and
 *  a dead page with no button is a bad answer to it. */
function offerRetry(message: string) {
  startBtn.disabled = false;
  startBtn.style.display = "";
  startBtn.textContent = "Start camera";
  preview.style.display = "none";
  metricsEl.style.display = "none";
  if (diagnosticsEl) diagnosticsEl.style.display = "none";
  showError(message);
}

async function start() {
  if (!navigator.mediaDevices?.getUserMedia) {
    // On insecure origins the API doesn't exist AT ALL — this is the plain-
    // http-over-LAN case. localhost is exempt; other hosts need https.
    showError(
      "camera needs a secure context — this page must be served over https to " +
        "use the camera from another device. `npm run dev` already is.",
    );
    return;
  }
  const captureWidth = Number(cfgWidth.value);
  const captureFps = Number(cfgCapFps.value);
  // Nothing on the page changes until the camera is actually running: the
  // error paths below all have to leave a usable Start button behind.
  startBtn.disabled = true;
  startBtn.textContent = "Starting…";
  const base: MediaTrackConstraints = {
    facingMode: "environment",
    width: { ideal: captureWidth },
    height: { ideal: Math.round((captureWidth * 3) / 4) },
  };
  try {
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { ...base, frameRate: { exact: captureFps } },
      });
    } catch {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { ...base, frameRate: { ideal: captureFps } },
      });
    }
  } catch (err) {
    const denied = err instanceof DOMException && err.name === "NotAllowedError";
    const errMessage = err instanceof Error ? err.message : String(err);
    offerRetry(
      denied ? "camera permission denied — allow it, then tap Start camera again." : `camera: ${errMessage}`,
    );
    return;
  }

  startBtn.style.display = "none";
  // "": back to the stylesheet's flex — the zone centers the camera box.
  preview.style.display = "";
  metricsEl.style.display = "grid";
  if (diagnosticsEl) diagnosticsEl.style.display = "block";
  video.srcObject = stream;
  await video.play().catch(() => undefined);
  syncPreviewAspect();
  const settings = stream.getVideoTracks()[0]?.getSettings();
  setStatus(
    `camera ${settings?.width}×${settings?.height}@${settings?.frameRate} — searching for a stream…`,
  );

  pool.resize(Number(cfgWorkers.value));
  reportCameraSettings();
  void applyCameraExtras();
  if (!settingsWired) {
    settingsWired = true;
    for (const el of [cfgWidth, cfgCapFps, cfgWorkers]) {
      el.addEventListener("change", () => void applyReceiveSettings());
    }
  }

  noSignal.cameraStarted(performance.now());
  cameraStartedTs = performance.now();
  captureGen++;
  scheduleFrame(captureGen);
  statsTimer = setInterval(updateStats, 500);
  await requestScreenWakeLock();
}

/** Report what the camera actually negotiated — iOS in particular will happily
 *  hand back 30 fps after accepting a request for 60. */
function reportCameraSettings() {
  const track = stream?.getVideoTracks()[0];
  if (!track) return;
  const s = track.getSettings();
  const askedFps = Number(cfgCapFps.value);
  const gotFps = Math.round(s.frameRate ?? 0);
  const fpsNote = gotFps && gotFps !== askedFps ? ` (asked ${askedFps})` : "";
  cameraActual.textContent =
    `camera ${s.width}×${s.height} @ ${gotFps} fps${fpsNote} · ${pool.size} decode ` +
    `worker${pool.size === 1 ? "" : "s"} · changes apply live`;
}

/** Use what this camera can actually do, probed rather than UA-sniffed.
 *  Continuous autofocus is applied silently — a lens hunting between frames is
 *  the top decode killer, and a camera that refuses is left as it was. Frame
 *  rates the current mode can't reach are grayed out. */
async function applyCameraExtras() {
  const track = stream?.getVideoTracks()[0];
  if (!track) return;
  const caps = probeCameraCapabilities(track);
  if (caps.continuousFocus) {
    await applyAdvancedConstraint(track, { focusMode: "continuous" });
  }
  if (caps.maxFrameRate) {
    for (const option of Array.from(cfgCapFps.options)) {
      option.disabled = Number(option.value) > caps.maxFrameRate;
    }
  }
  if (caps.maxWidth) {
    for (const option of Array.from(cfgWidth.options)) {
      option.disabled = Number(option.value) > caps.maxWidth;
    }
  }
}

async function applyReceiveSettings() {
  // finish() has already torn the pool down — don't resurrect it.
  if (done) return;
  pool.resize(Number(cfgWorkers.value));
  const track = stream?.getVideoTracks()[0];
  if (!track) return;
  const width = Number(cfgWidth.value);
  try {
    await track.applyConstraints({
      width: { ideal: width },
      height: { ideal: Math.round((width * 3) / 4) },
      frameRate: { ideal: Number(cfgCapFps.value) },
    });
  } catch {
    // Some devices (notably iOS) refuse a live reconfigure. Keep the stream we
    // have rather than tearing down a transfer in progress.
    cameraActual.textContent = "this camera refused a live change — restart to apply";
    return;
  }
  reportCameraSettings();
}

type VideoRVFC = HTMLVideoElement & { requestVideoFrameCallback?: (cb: () => void) => number };

function scheduleFrame(gen: number) {
  if (done || gen !== captureGen) return;
  const v = video as VideoRVFC;
  const next = () => {
    if (done || gen !== captureGen) return;
    captureFrame();
    drawOverlay(performance.now());
    scheduleFrame(gen);
  };
  if (v.requestVideoFrameCallback) v.requestVideoFrameCallback(next);
  else requestAnimationFrame(next);
}

const grab = document.createElement("canvas");
let frameId = 0;

// GPU-side capture: createImageBitmap(video, crop) hands each worker a
// transferable bitmap with NO main-thread pixel readback — the worker draws
// it onto an OffscreenCanvas and reads pixels on its own thread. On paper
// this moves ~60 MB/s of GPU→CPU copies off the main thread and
// parallelizes them across the pool.
//
// MEASURED 4× SLOWER on iOS (iPhone, Safari 26): 38% of captures dropped
// pool-busy (vs ~0.5%) and the tracked hit rate halved — Safari's worker-
// side OffscreenCanvas readback is far slower than the main-thread one, and
// its video→bitmap conversion yields subtly different pixels. Opt-in only
// (?capture=bitmap), kept because other engines may genuinely benefit.
const BITMAP_CAPTURE =
  new URLSearchParams(window.location.search).get("capture") === "bitmap" &&
  typeof createImageBitmap === "function" &&
  typeof OffscreenCanvas !== "undefined";

/** Fire-and-forget submit of a GPU-cropped frame. The bitmap resolves async;
 *  by then the pool may have filled or the transfer ended — close it rather
 *  than leak GPU memory. */
function submitBitmap(
  pending: Promise<ImageBitmap>,
  meta: { ox: number; oy: number; full: boolean; quad?: SymbolQuad; dim?: number },
): void {
  void pending
    .then((bitmap) => {
      const taken =
        !done && pool.submit({ id: frameId++, bitmap, ...meta }, [bitmap]);
      if (!taken) bitmap.close();
      else if (!meta.full) cropsSubmitted++;
    })
    .catch(() => undefined);
}

// The stripe-signature dup-skip that used to live here is gone: field runs
// showed screen captures defeat it (sensor noise plus refresh-phase shimmer
// shift the stripe between two captures of the SAME displayed frame — 452
// duplicate decodes leaked through in one 30 fps run), and it was the last
// thing requiring main-thread pixel access. Duplicates now cost one cheap
// tracked decode each, which the pool absorbs without noticing.

function pruneStaleRegions(now: number): void {
  for (let i = regions.length - 1; i >= 0; i--) {
    if (now - regions[i]!.seen > REGION_TTL_MS) regions.splice(i, 1);
  }
}

function updateExpectedRegions(live: number, now: number): void {
  if (live >= expectedRegions || now - expectedRegionsAt > EXPECTED_REGIONS_DECAY_MS) {
    expectedRegions = live;
    expectedRegionsAt = now;
  }
}

function computeScanInterval(live: number): number {
  if (live === 0) return ACQUISITION_SCAN_MS;
  if (live < expectedRegions) return FULL_SCAN_DEGRADED_MS;
  return FULL_SCAN_INTERVAL_MS;
}

/** GPU-side capture path: one crop per known code, rotated so a short worker
 *  pool doesn't starve the same tail region every frame. The bitmaps resolve
 *  async, so "stop when the pool refuses" becomes "create no more than the
 *  free slots seen now" — submitBitmap closes any bitmap that loses the race
 *  anyway. */
function captureFrameBitmap(vw: number, vh: number, now: number, fullScanDue: boolean): void {
  if (fullScanDue) {
    lastFullScan = now;
    fullScans++;
    submitBitmap(createImageBitmap(video), { ox: 0, oy: 0, full: true });
    return;
  }
  let free = pool.size - pool.busyCount;
  for (let i = 0; i < regions.length && free > 0; i++) {
    const r = regions[(i + cropRotate) % regions.length]!;
    // The pad leads a moving target: base margin plus twice the displacement
    // observed between the region's last decodes, so a handheld receiver's
    // crops keep containing the code instead of chasing where it was. Capped
    // at one code size — past that the crop approaches frame-sized anyway.
    const size = Math.max(r.w, r.h);
    const pad = Math.round(size * REGION_PAD + Math.min(size, 2 * (r.drift ?? 0)));
    const x = Math.max(0, Math.floor(r.x - pad));
    const y = Math.max(0, Math.floor(r.y - pad));
    const w = Math.min(vw - x, Math.ceil(r.w + 2 * pad));
    const h = Math.min(vh - y, Math.ceil(r.h + 2 * pad));
    if (w < 32 || h < 32) continue;
    free--;
    submitBitmap(createImageBitmap(video, x, y, w, h), {
      ox: x,
      oy: y,
      full: false,
      quad: r.quad,
      dim: r.dim,
    });
  }
  cropRotate++;
}

/** Readback fallback for browsers without createImageBitmap/OffscreenCanvas. */
function captureFrameReadback(vw: number, vh: number, now: number, fullScanDue: boolean): void {
  if (grab.width !== vw || grab.height !== vh) {
    grab.width = vw;
    grab.height = vh;
  }
  const ctx = grab.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(video, 0, 0);
  if (fullScanDue) {
    lastFullScan = now;
    fullScans++;
    const img = ctx.getImageData(0, 0, vw, vh);
    pool.submit(
      { id: frameId++, buf: img.data.buffer, w: vw, h: vh, ox: 0, oy: 0, full: true },
      [img.data.buffer],
    );
    return;
  }
  // One crop per known code, rotated so a short worker pool doesn't starve
  // the same tail region every frame. Submitting stops when the pool is full;
  // the fountain absorbs whatever gets dropped.
  for (let i = 0; i < regions.length; i++) {
    const r = regions[(i + cropRotate) % regions.length]!;
    const size = Math.max(r.w, r.h);
    const pad = Math.round(size * REGION_PAD + Math.min(size, 2 * (r.drift ?? 0)));
    const x = Math.max(0, Math.floor(r.x - pad));
    const y = Math.max(0, Math.floor(r.y - pad));
    const w = Math.min(vw - x, Math.ceil(r.w + 2 * pad));
    const h = Math.min(vh - y, Math.ceil(r.h + 2 * pad));
    if (w < 32 || h < 32) continue;
    const img = ctx.getImageData(x, y, w, h);
    // The quad + dimension arm the worker's tracked fast path (detection
    // skipped entirely, 2× at V40); absent — or stale after a miss — the
    // worker falls back to the stock decoder on the same buffer.
    const taken = pool.submit(
      { id: frameId++, buf: img.data.buffer, w, h, ox: x, oy: y, full: false, quad: r.quad, dim: r.dim },
      [img.data.buffer],
    );
    if (!taken) break;
    cropsSubmitted++;
  }
  cropRotate++;
}

function captureFrame() {
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  if (!vw || !vh) return;
  const now = performance.now();
  captureTimes.push(now);
  totalCaptures++;
  if (pool.busyCount === pool.size) {
    capturesDropped++;
    return; // all busy — drop it, no harm done
  }

  pruneStaleRegions(now);
  // Only decode-proven regions count toward "how many codes does this stream
  // show" — phantom sighting regions once inflated the total and locked the
  // receiver into a permanent 250 ms rescan storm. peakRegions is reported as
  // the stream's code count, so it counts proven regions for the same reason.
  const live = decodedCount();
  peakRegions = Math.max(peakRegions, live);
  updateExpectedRegions(live, now);
  // A due full scan takes priority over crops, deliberately. The crop loop
  // below fills every free worker slot each frame, so any "only scan when a
  // slot is spare" politeness starves the rescan that reacquires a missing
  // code — tried, and it measurably worsened multi-code lock-on. Scans are
  // rare (1.5 s healthy, 250 ms degraded, 100 ms cold); crops keep the slot
  // next frame — including crops of probationary sighting regions, which now
  // run between cold scans instead of being crowded out by them.
  const fullScanDue = now - lastFullScan > computeScanInterval(live);

  if (BITMAP_CAPTURE) {
    captureFrameBitmap(vw, vh, now, fullScanDue);
  } else {
    captureFrameReadback(vw, vh, now, fullScanDue);
  }
}

function onDecoded(bytes: Uint8Array, box?: SymbolBox, info?: SymbolInfo) {
  decodeTimes.push(performance.now());
  totalDecodes++;
  if (info?.tracked) trackedDecodes++;
  if (box) noteRegion(box, performance.now(), true, info);
  const parsed = parseFrame(bytes);
  if (!parsed || done) return;
  const { header, block } = parsed;
  if (noSignal.frameDecoded()) {
    noSignalToast.hidden = true;
    // The dialog's premise ("nothing decoded") just became false mid-read.
    if (noSignalDialog.open) noSignalDialog.close();
  }
  // streamIdentity() covers every header field that has to hold constant, not
  // just the session id — see the note on it in protocol.ts.
  const identity = streamIdentity(header);
  if (!decoder || streamKey !== identity) {
    decoder = new LTDecoder(header.k, header.blockLen, header.sessionId, header.totalLen);
    streamKey = identity;
    reportSessionId = header.sessionId;
    startTs = performance.now();
    progressEl.style.display = "block";
    progressStatus.style.display = "flex";
  }
  minSeq = Math.min(minSeq, header.seq);
  maxSeq = Math.max(maxSeq, header.seq);
  decoder.addFrame(header.seq, block);
  updateProgressEstimate();

  if (decoder.isComplete) {
    const payload = decoder.assemble()!;
    const seconds = (performance.now() - startTs) / 1000;
    const ok = fnv1a(payload) === header.payloadFnv;
    void finish(payload, ok, seconds);
  }
}

function updateProgressEstimate() {
  if (!decoder) return;
  const elapsed = Math.max(0, (performance.now() - startTs) / 1000);
  // Progress runs on frames that carried INFORMATION, not raw arrivals. On a
  // lossy multi-code run the carousel re-sweeps blocks this receiver already
  // solved; each re-sweep frame has a fresh seq, so framesNew inflates by the
  // loss rate — a 30%-catch 4-code run showed 96% on the bar with half the
  // blocks outstanding, then "finished early". framesRedundant subtracts
  // exactly those empty arrivals.
  const usefulFrames = decoder.framesNew - decoder.framesRedundant;
  const estimate = estimateTransferProgress(
    decoder.k,
    usefulFrames,
    elapsed,
    decoder.solvedCount,
  );
  const percent = estimate.fraction * 100;
  const shownPercent = percent < 10 ? percent.toFixed(1) : percent.toFixed(0);
  bar.style.width = `${percent.toFixed(1)}%`;
  progressEl.setAttribute("aria-valuenow", String(Math.floor(percent)));
  progressLabel.textContent =
    `${shownPercent}% · ${decoder.solvedCount}/${decoder.k} blocks`;
  // Held back for the first few frames — a two-frame sample reads wildly wrong.
  const rate = decoder.framesNew >= 4 ? ` · ${goodputKbs(elapsed).toFixed(1)} KB/s` : "";
  let etaText: string;
  if (estimate.etaSeconds === undefined) {
    etaText =
      estimate.phase === "decoding" ? `${decoder.framesNew} frames · decoding` : "Estimating time…";
  } else {
    etaText = `About ${formatDuration(estimate.etaSeconds)} · ${decoder.framesNew} frames`;
  }
  etaLabel.textContent = etaText + rate;
}

/** Payload KB/s, discounting the frames the fountain spends on overhead. That
 *  discount is k-dependent — assuming a flat 1.18 over-reported small transfers
 *  by up to 2×, because a short stream needs far more redundancy per block.
 *  Redundant re-sweep arrivals are excluded outright: they move no payload. */
function goodputKbs(elapsed: number): number {
  if (!decoder) return 0;
  return (
    ((decoder.framesNew - decoder.framesRedundant) * decoder.blockLen) /
    expectedFountainOverhead(decoder.k) /
    1024 /
    Math.max(0.1, elapsed)
  );
}

// What the sender emitted while we watched, by seq range — against the
// frames we actually parsed, that is the receiver's catch rate. A low catch
// rate means the receiver missed displayed frames (capacity or tracking);
// overhead high with a high catch rate blames the fountain.
function reportDiagnostics(container: Uint8Array, hashOk: boolean, seconds: number): void {
  const track = stream?.getVideoTracks()[0];
  const camera = track?.getSettings();
  const seqSpan = maxSeq >= minSeq ? maxSeq - minSeq + 1 : 0;
  const parsed = (decoder?.framesNew ?? 0) + (decoder?.framesDup ?? 0);
  void fetch("/__diagnostics", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      role: "receiver",
      when: new Date().toISOString(),
      sessionId: reportSessionId,
      ok: hashOk,
      seconds: Number(seconds.toFixed(2)),
      acquisitionSeconds: cameraStartedTs
        ? Number(((startTs - cameraStartedTs) / 1000).toFixed(2))
        : null,
      payloadBytes: container.length,
      // The container's embedded file digest (packFile writes it at byte
      // 17) — benchmark promotion pins the canonical payload against this.
      // subarray is a view (no copy); Array.from's mapfn avoids a second pass.
      payloadSha256: Array.from(container.subarray(17, 49), (b) =>
        b.toString(16).padStart(2, "0"),
      ).join(""),
      goodputKBs: Number((container.length / 1024 / Math.max(0.01, seconds)).toFixed(1)),
      fountain: {
        k: decoder?.k,
        blockLen: decoder?.blockLen,
        framesNew: decoder?.framesNew,
        framesDup: decoder?.framesDup,
        framesRedundant: decoder?.framesRedundant,
        overhead: decoder ? Number((decoder.framesNew / decoder.k).toFixed(2)) : null,
        usefulOverhead: decoder
          ? Number(((decoder.framesNew - decoder.framesRedundant) / decoder.k).toFixed(2))
          : null,
        seqSpan,
        catchRate: seqSpan ? Number((parsed / seqSpan).toFixed(3)) : null,
      },
      codes: peakRegions,
      pipeline: {
        captureMode: BITMAP_CAPTURE ? "bitmap" : "readback",
        captures: totalCaptures,
        capturesDroppedPoolBusy: capturesDropped,
        cropsSubmitted,
        fullScans,
        decodes: totalDecodes,
        trackedAttempts,
        trackedDecodes,
        zeroRegionMs,
        degradedMs,
      },
      workers: pool.size,
      requested: {
        width: Number(cfgWidth.value),
        fps: Number(cfgCapFps.value),
        workers: Number(cfgWorkers.value),
      },
      camera: camera
        ? {
            width: camera.width,
            height: camera.height,
            fps: camera.frameRate,
            facingMode: camera.facingMode ?? null,
          }
        : null,
      cameraCapabilities: track ? probeCameraCapabilities(track) : null,
      device: { cores: navigator.hardwareConcurrency ?? null, ua: navigator.userAgent },
      timelineKey:
        "seconds, framesNew, solvedBlocks, decodedRegions, trackedRegions, captureFps, decodeFps, fullScansCumulative",
      timeline,
    }),
  }).catch(() => undefined);
}

/** Tear the whole capture pipeline down: the camera, the stats timer, and the
 *  decode pool. Each worker holds its own ~940 KB zxing WASM instance, which
 *  is worth reclaiming on a phone the moment the last frame is in. */
function teardownCapturePipeline(seconds: number): void {
  stream?.getTracks().forEach((t) => t.stop());
  clearInterval(statsTimer);
  statsTimer = undefined;
  pool.resize(0);
  preview.style.display = "none";
  // The transfer is over and the pipeline is gone: settings for a camera that
  // no longer exists would just be a dead control panel.
  settingsEl.style.display = "none";
  // The metrics stay, frozen at their last tick — but "Live" is no longer
  // true, so the panel relabels itself as the record of the run it now is.
  const diagnosticsLabel = diagnosticsEl?.querySelector("summary");
  if (diagnosticsLabel) diagnosticsLabel.textContent = "Transfer summary";
  bar.style.width = "100%";
  progressEl.setAttribute("aria-valuenow", "100");
  etaLabel.textContent = `${formatDuration(seconds)} total`;
}

/** Renders the finished page for a successfully unpacked+verified file. Reading
 *  order of the finished page: heading, the run's numbers, the thing that
 *  arrived, Save under it, "Receive another file", and the Transfer summary
 *  panel last in its natural spot after #result. */
async function renderReceivedFile(file: OpticalFile, container: Uint8Array, seconds: number): Promise<void> {
  // The container carries its own media type, so the receiver never has to be
  // told in advance whether a file or a text snippet is coming.
  const rate = (container.length / 1024 / seconds).toFixed(1);
  const gzipNote = file.compression === "gzip" ? "gzip decompressed · " : "";
  if (isSnippet(file)) {
    progressLabel.textContent = "100% · text recovered";
    setStatus("");
    showSnippet(
      snippetText(file),
      `text in ${seconds.toFixed(1)} s · ${rate} KB/s · ${gzipNote}SHA-256 verified ✓`,
    );
    return;
  }

  progressLabel.textContent = "100% · file recovered";
  const kb = Math.round(file.bytes.length / 1024);
  // The run's numbers belong under the heading, not up in the camera status
  // line — which is done for good and goes quiet.
  setStatus("");
  const summary = document.createElement("p");
  summary.className = "hint";
  summary.textContent =
    `${kb} KB in ${seconds.toFixed(1)} s · ${rate} KB/s · ${gzipNote}SHA-256 verified ✓`;
  const heading = document.createElement("div");
  heading.className = "done";
  heading.textContent = "Transfer Complete!";
  const url = URL.createObjectURL(new Blob([file.bytes as BlobPart], { type: file.type }));
  const download = document.createElement("a");
  download.className = "download";
  download.href = url;
  download.download = file.name;
  download.textContent = `Save ${file.name}`;
  result.replaceChildren(heading, summary);
  if (file.type.startsWith("image/")) {
    const image = document.createElement("img");
    image.className = "received";
    image.alt = `Received file preview: ${file.name}`;
    image.src = url;
    result.append(image);
  } else if (file.type.startsWith("video/") || file.type.startsWith("audio/")) {
    const player = document.createElement(file.type.startsWith("video/") ? "video" : "audio");
    player.className = "received";
    player.controls = true;
    player.preload = "metadata";
    player.setAttribute("aria-label", `Received file: ${file.name}`);
    // Inline, and never autoplay — the user taps play (which is also the
    // gesture that lets it start with sound).
    if (player instanceof HTMLVideoElement) player.playsInline = true;
    const src = await servableMediaUrl(file, url);
    if (src !== url) {
      // AVFoundation has been seen bypassing service workers for media
      // loads; if the cache path 404s, fall back to the blob rather than
      // leaving a dead player.
      player.addEventListener("error", () => { player.src = url; }, { once: true });
    }
    player.src = src;
    result.append(player);
  }
  const actions = document.createElement("div");
  actions.className = "note-actions";
  actions.append(download);
  const endActions = document.createElement("div");
  endActions.className = "note-actions pair";
  endActions.append(restartButton("Receive another file"));
  // The received bytes sit in the Cache API so the media player can range
  // over them (see servableMediaUrl) — which means they outlive the page.
  // Offer the scrub right where the transfer ends.
  if ("caches" in window) endActions.append(clearCacheButton());
  result.append(actions, endActions);
  const support = supportLink();
  if (support) result.append(support);
}

/** Everything is already torn down by this point, so the only way back to a
 *  live receiver is a reload. Offer it: a failed checksum used to leave the
 *  page dead with nothing but an error string on it. */
function renderTransferFailure(error: unknown): void {
  bar.classList.add("error");
  etaLabel.textContent = "Transfer failed";
  showError(error instanceof Error ? error.message : String(error));
  const heading = document.createElement("div");
  heading.className = "failed";
  heading.textContent = "Transfer failed";
  const detail = document.createElement("p");
  detail.className = "received-note";
  detail.textContent =
    "Nothing usable came out of that stream. Restart the sender, then scan it again — " +
    "a partial transfer costs nothing but the time.";
  result.replaceChildren(heading, detail, restartButton("Try again"));
}

async function finish(container: Uint8Array, hashOk: boolean, seconds: number) {
  done = true;
  captureGen++;
  // npm run diagnostics: one JSON report per completed run, POSTed to the dev
  // server so it lands in the terminal (build/diagnostics-endpoint.ts). Sent
  // before teardown, while the camera settings and pool size are still real.
  // The DEV guard is load-bearing: import.meta.env.DEV is statically false in
  // every build, so this whole branch is compiled out of the static site, the
  // GitHub Pages deploy, and the standalone files.
  if (import.meta.env.DEV && import.meta.env.VITE_DIAGNOSTICS === "1") {
    reportDiagnostics(container, hashOk, seconds);
  }
  teardownCapturePipeline(seconds);
  try {
    if (!hashOk) throw new Error("The optical stream checksum did not match.");
    const file = await unpackFile(container);
    if (!(await verifyFile(file))) throw new Error("The recovered file failed SHA-256 verification.");
    await renderReceivedFile(file, container, seconds);
  } catch (error) {
    renderTransferFailure(error);
  }
}

/** Deletes the received-media cache — the one thing Decimen persists (see
 *  servableMediaUrl). Handing the phone over shouldn't mean handing over the
 *  last transfer. A player still streaming from the cache falls back to its
 *  blob URL via the error listener wired in finish(). */
function clearCacheButton(): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "secondary-button";
  button.textContent = "Clear Decimen cache";
  button.addEventListener("click", () => {
    button.disabled = true;
    caches.delete("received-media").then(
      () => {
        button.textContent = "Cache cleared";
      },
      () => {
        button.textContent = "Clear failed — try again";
        button.disabled = false;
      },
    );
  });
  return button;
}

/** A playable URL for received media. iOS Safari will not reliably play media
 *  handed to <video>/<audio> as a blob: URL — WebKit's media loader wants real
 *  HTTP semantics, Range requests included (a lesson inherited from the
 *  original demo's range-shim worker). The bytes go into the Cache API and
 *  come back out through the service worker's range-aware route at a real URL
 *  (see runtimeCaching in vite.config.ts). The blob URL stands in when no
 *  worker controls the page: first ever visit, or the standalone file. */
async function servableMediaUrl(file: OpticalFile, blobUrl: string): Promise<string> {
  try {
    if (!navigator.serviceWorker?.controller) return blobUrl;
    // Resolved against the page (one directory deep), landing on the site
    // root — where the worker's route matches under any deploy subpath.
    const target = new URL("../received-media/current", window.location.href).href;
    const cache = await caches.open("received-media");
    await cache.put(
      target,
      new Response(new Blob([file.bytes as BlobPart]), {
        headers: {
          "Content-Type": file.type,
          "Content-Length": String(file.bytes.length),
          // file.type is whatever the sender declared over the optical
          // channel — the "video/"/"audio/" prefix check above the call site
          // doesn't stop a value like "video/html". This URL is same-origin
          // and workbox's CacheOnly route answers ANY request against it, a
          // direct navigation included, so a spoofed type could otherwise let
          // a browser's MIME sniffer render attacker HTML as this origin.
          // nosniff forces the declared type to be honored as opaque media,
          // never promoted to a document.
          "X-Content-Type-Options": "nosniff",
        },
      }),
    );
    // The query defeats the media element's memory of this URL from an
    // earlier transfer; the worker matches with ignoreSearch.
    return `${target}?v=${Date.now()}`;
  } catch {
    return blobUrl;
  }
}

/**
 * Seconds of camera and not one decoded frame.
 *
 * Both real fixes are on the SENDER, which is the non-obvious part — someone
 * staring at a blank receiver reaches for the phone. The defaults (2953 bytes
 * per frame at 60 fps) are tuned for a close-range phone-to-phone demo and are
 * exactly the combination that fails on an ordinary monitor at arm's length.
 *
 * The toast itself only asks the question; the sender-side advice sits behind
 * its Help button in a modal. It stops for good on the first frame that
 * parses, which is the only thing that actually means it worked.
 */
function showNoSignalHint() {
  noSignalToast.hidden = false;
}

/** Nothing is persisted: the text lives here until the page is closed. The
 *  summary line mirrors the file path — run stats under the heading, not up
 *  in the camera status line. */
function showSnippet(text: string, summaryLine: string) {
  const heading = document.createElement("div");
  heading.className = "done";
  heading.textContent = "Text received";

  const summary = document.createElement("p");
  summary.className = "hint";
  summary.textContent = summaryLine;

  const body = document.createElement("p");
  body.className = "received-note";
  body.textContent = text;

  const actions = document.createElement("div");
  actions.className = "note-actions";
  const copy = document.createElement("button");
  copy.type = "button";
  copy.className = "text-button";
  copy.textContent = "Copy";
  copy.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(text);
      copy.textContent = "Copied";
      setTimeout(() => { copy.textContent = "Copy"; }, 1500);
    } catch {
      copy.textContent = "Copy failed";
    }
  });
  actions.append(copy, restartButton("Receive another file"));

  result.replaceChildren(heading, summary, body, actions);
}

function updateStats() {
  if (done) return;
  const now = performance.now();
  const prune = (a: number[]) => {
    while (a.length > 0 && a[0]! < now - STATS_WINDOW_MS) a.shift();
  };
  prune(captureTimes);
  prune(decodeTimes);
  const perSecond = (a: number[]) => a.length / (STATS_WINDOW_MS / 1000);
  metric("m-cap").textContent = perSecond(captureTimes).toFixed(0);
  metric("m-dec").textContent = perSecond(decodeTimes).toFixed(1);
  if (noSignal.tick(now)) showNoSignalHint();
  if (!decoder) return;
  const elapsed = (now - startTs) / 1000;
  // Diagnostics accounting, gated on a running transfer so camera-pointing
  // time doesn't pollute it. 500 ms granularity matches this timer. Decode-
  // proven regions are the signal, matching the scheduler: a probationary
  // sighting region must not mask a missing code (degradedMs) or hide a full
  // tracking collapse (zeroRegionMs). The timeline carries BOTH counts so
  // phantom churn stays visible next to the real one.
  const liveNow = decodedCount();
  if (liveNow === 0) zeroRegionMs += 500;
  if (liveNow < expectedRegions) degradedMs += 500;
  if (timeline.length < TIMELINE_MAX_SAMPLES) {
    timeline.push([
      Number(elapsed.toFixed(1)),
      decoder.framesNew,
      decoder.solvedCount,
      liveNow,
      regions.length,
      Number(perSecond(captureTimes).toFixed(1)),
      Number(perSecond(decodeTimes).toFixed(1)),
      fullScans,
    ]);
  }
  updateProgressEstimate();
  metric("m-rate").textContent = `${goodputKbs(elapsed).toFixed(1)} KB/s`;
  metric("m-time").textContent = `${elapsed.toFixed(0)} s`;
  metric("m-frames").textContent = `${decoder.framesNew}/${decoder.framesDup}`;
  metric("m-k").textContent = String(decoder.k);
  metric("m-block").textContent = `${decoder.blockLen} B`;
  metric("m-payload").textContent = `${Math.round(decoder.totalLen / 1024)} KB`;
}
