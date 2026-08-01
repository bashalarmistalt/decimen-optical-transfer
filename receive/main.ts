import { installErrorGuard } from "../shared/errorguard";
import { LTDecoder } from "../shared/fountain";
import { fnv1a, parseFrame, unpackFile, verifyFile } from "../shared/protocol";
import { estimateTransferProgress, formatDuration } from "../shared/progress";
import { LOGO_SVG, icon } from "../shared/icons";
import { addEntry, kindFor, loadEntries, makeThumb, textSnippet, type GalleryEntry } from "../shared/gallery";
import { fsReader, makeOpen, renderCards } from "../shared/gallery-ui";
import { putPayload } from "../shared/payloadstore";
import { boxWidth, boxHeight, cellCropBoxes, dedupeBoxes, inflateClamp, newGridTrack, offsetBox, updateGridTrack, type Box } from "./roi";
import { meanAbsDelta } from "./planes";

const OVERHEAD_EST = 1.18;

const MIME: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  bmp: "image/bmp",
  svg: "image/svg+xml",
  pdf: "application/pdf",
  json: "application/json",
  zip: "application/zip",
  txt: "text/plain",
  md: "text/plain",
  csv: "text/csv",
  mp4: "video/mp4",
  webm: "video/webm",
  mp3: "audio/mpeg",
  wav: "audio/wav",
};

function mimeFor(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  return MIME[ext] ?? "application/octet-stream";
}

const startBtn = document.getElementById("start") as HTMLButtonElement;
const video = document.getElementById("video") as HTMLVideoElement;
const preview = document.getElementById("preview")!;
const stats = document.getElementById("stats")!;
const progressEl = document.getElementById("progress")!;
const bar = document.getElementById("bar")!;
const result = document.getElementById("result")!;
installErrorGuard();
const settings = document.getElementById("settings") as HTMLDetailsElement;
const metricsEl = document.getElementById("metrics")!;
const metric = (id: string) => document.getElementById(id)!;

let stream: MediaStream | null = null;
let decoder: LTDecoder | null = null;
let sessionId = 0;
let startTs = 0;
let captureGen = 0;
let done = false;

const workers: Worker[] = [];
const busy: boolean[] = [];
const captureTimes: number[] = [];
const decodeTimes: number[] = [];

startBtn.onclick = () => void start();

async function start() {
  if (!navigator.mediaDevices?.getUserMedia) {
    stats.textContent =
      "camera needs a secure context — open this page over https " +
      "(npm run dev serves https; use the Network URL Vite prints).";
    return;
  }
  const captureWidth = Number((document.getElementById("cfg-width") as HTMLSelectElement).value);
  const captureFps = Number((document.getElementById("cfg-capfps") as HTMLSelectElement).value);
  const workerCount = Number((document.getElementById("cfg-workers") as HTMLSelectElement).value);
  colorMode = (document.getElementById("cfg-color") as HTMLSelectElement).value === "rgb";
  settings.style.display = "none";
  startBtn.style.display = "none";
  preview.style.display = "block";
  metricsEl.style.display = "grid";
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
    stats.textContent = `camera: ${err instanceof Error ? err.message : String(err)}`;
    return;
  }
  video.srcObject = stream;
  await video.play().catch(() => undefined);
  stats.textContent = `camera ${stream.getVideoTracks()[0]?.getSettings().width}×${stream.getVideoTracks()[0]?.getSettings().height}@${stream.getVideoTracks()[0]?.getSettings().frameRate} — searching for a stream…`;

  for (let i = 0; i < workerCount; i++) {
    const w = new Worker(new URL("./worker.ts", import.meta.url), { type: "module" });
    const slot = i;
    w.onmessage = (e: MessageEvent) => {
      const { id, list, boxes } = e.data as { id: number; list: Uint8Array[]; boxes: Box[] };
      if (id === -1) return;
      busy[slot] = false;
      onScanResult(id, boxes, video.videoWidth, video.videoHeight);
      for (const b of list) onDecoded(b);
    };
    workers.push(w);
    busy.push(false);
  }

  captureGen++;
  scheduleFrame(captureGen);
  setInterval(updateStats, 500);
  try {
    await (navigator as Navigator & { wakeLock?: { request(t: "screen"): Promise<unknown> } })
      .wakeLock?.request("screen");
  } catch {}
}

type VideoRVFC = HTMLVideoElement & { requestVideoFrameCallback?: (cb: () => void) => number };

function scheduleFrame(gen: number) {
  if (done || gen !== captureGen) return;
  const v = video as VideoRVFC;
  const next = () => {
    if (done || gen !== captureGen) return;
    captureFrame();
    scheduleFrame(gen);
  };
  if (v.requestVideoFrameCallback) v.requestVideoFrameCallback(next);
  else requestAnimationFrame(next);
}

const RX_KEY = "decimen.rx.v1";
const rxCards = document.getElementById("rx-cards")!;
const rxEmpty = document.getElementById("rx-empty")!;

function renderRx(entries = loadEntries(localStorage, RX_KEY)): void {
  renderCards(rxCards, rxEmpty, localStorage, RX_KEY, entries, true, renderRx, makeOpen(fsReader()));
}

function switchTab(tab: string): void {
  for (const btn of document.querySelectorAll<HTMLButtonElement>(".tab-btn")) {
    btn.classList.toggle("active", btn.dataset.tab === tab);
  }
  document.getElementById("tab-receiver")!.hidden = tab !== "receiver";
  document.getElementById("tab-gallery")!.hidden = tab !== "gallery";
}

document.getElementById("rx-logo")!.innerHTML = LOGO_SVG;
for (const el of document.querySelectorAll<HTMLElement>("[data-icon]")) {
  el.innerHTML = icon(el.dataset.icon!);
}
for (const btn of document.querySelectorAll<HTMLButtonElement>(".tab-btn")) {
  btn.addEventListener("click", () => switchTab(btn.dataset.tab!));
}
renderRx();

const grab = document.createElement("canvas");
let frameId = 0;
let roi: Box | null = null;
let roiMisses = 0;
let gridTrack = newGridTrack();
let sinceFull = 0;
const pendingCrops = new Map<number, { x: number; y: number; full: boolean; round: number }>();
const pendingRounds = new Map<number, { need: number; got: number; boxes: Box[] }>();
let roundId = 0;
const ROI_PAD = 0.08;
const ROI_PAD_MIN = 24;
const ROI_MISS_LIMIT = 10;
const FULL_EVERY = 24;
const ROI_MIN = 96;
const CELL_PAD = 0.12;
const CELL_PAD_MIN = 16;
const CELL_MIN = 56;
const SKIP_DELTA = 3.5;
const SKIP_MAX = 5;
let colorMode = false;
let useBitmap = typeof createImageBitmap === "function" && typeof OffscreenCanvas === "function";
const skim = document.createElement("canvas");
skim.width = 24;
skim.height = 24;
let lastSkim: Uint8ClampedArray | null = null;
let skipStreak = 0;

function frameUnchanged(sx: number, sy: number, sw: number, sh: number): boolean {
  const c = skim.getContext("2d", { willReadFrequently: true })!;
  c.drawImage(video, sx, sy, sw, sh, 0, 0, 24, 24);
  const cur = c.getImageData(0, 0, 24, 24).data;
  const prev = lastSkim;
  lastSkim = cur;
  if (!prev || skipStreak >= SKIP_MAX) {
    skipStreak = 0;
    return false;
  }
  if (meanAbsDelta(prev, cur) < SKIP_DELTA) {
    skipStreak++;
    return true;
  }
  skipStreak = 0;
  return false;
}

function dispatchCanvas(slot: number, id: number, sx: number, sy: number, sw: number, sh: number, fast: boolean) {
  if (grab.width !== sw || grab.height !== sh) {
    grab.width = sw;
    grab.height = sh;
  }
  const ctx = grab.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(video, sx, sy, sw, sh, 0, 0, sw, sh);
  const img = ctx.getImageData(0, 0, sw, sh);
  workers[slot]!.postMessage({ id, buf: img.data.buffer, w: sw, h: sh, fast, color: colorMode }, [
    img.data.buffer,
  ]);
}

function dispatchCrop(slot: number, sx: number, sy: number, sw: number, sh: number, fast: boolean, round: number) {
  const id = frameId++;
  busy[slot] = true;
  pendingCrops.set(id, { x: sx, y: sy, full: !fast, round });
  if (useBitmap) {
    createImageBitmap(video, sx, sy, sw, sh)
      .then((bitmap) => {
        workers[slot]!.postMessage({ id, bitmap, fast, color: colorMode }, [bitmap]);
      })
      .catch(() => {
        useBitmap = false;
        dispatchCanvas(slot, id, sx, sy, sw, sh, fast);
      });
    return;
  }
  dispatchCanvas(slot, id, sx, sy, sw, sh, fast);
}

function freeSlots(): number[] {
  const out: number[] = [];
  for (let i = 0; i < busy.length; i++) if (!busy[i]) out.push(i);
  return out;
}

function captureFrame() {
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  if (!vw || !vh) return;
  captureTimes.push(performance.now());
  const slots = freeSlots();
  if (slots.length === 0) return;
  sinceFull++;
  if (roi && sinceFull < FULL_EVERY && boxWidth(roi) >= ROI_MIN && boxHeight(roi) >= ROI_MIN) {
    if (frameUnchanged(roi.x0, roi.y0, boxWidth(roi), boxHeight(roi))) return;
    const cells = cellCropBoxes(gridTrack.cells, CELL_PAD, CELL_PAD_MIN, CELL_MIN, vw, vh);
    if (cells && slots.length >= cells.length) {
      const round = roundId++;
      pendingRounds.set(round, { need: cells.length, got: 0, boxes: [] });
      for (let i = 0; i < cells.length; i++) {
        const c = cells[i]!;
        dispatchCrop(slots[i]!, c.x0, c.y0, boxWidth(c), boxHeight(c), true, round);
      }
      return;
    }
    dispatchCrop(slots[0]!, roi.x0, roi.y0, boxWidth(roi), boxHeight(roi), true, roundId++);
    return;
  }
  sinceFull = 0;
  dispatchCrop(slots[0]!, 0, 0, vw, vh, false, roundId++);
}

function onScanResult(id: number, boxes: Box[], vw: number, vh: number) {
  const crop = pendingCrops.get(id);
  pendingCrops.delete(id);
  if (!crop) return;
  const abs = boxes.map((b) => offsetBox(b, crop.x, crop.y));
  const round = pendingRounds.get(crop.round);
  if (round) {
    round.got++;
    round.boxes.push(...abs);
    if (round.got < round.need) return;
    pendingRounds.delete(crop.round);
    if (round.boxes.length > 0) {
      const tracked = updateGridTrack(gridTrack, dedupeBoxes(round.boxes))!;
      roi = inflateClamp(tracked, ROI_PAD, ROI_PAD_MIN, vw, vh);
      roiMisses = 0;
      return;
    }
    roiMisses++;
    if (roiMisses >= ROI_MISS_LIMIT) {
      roi = null;
      roiMisses = 0;
      gridTrack = newGridTrack();
    }
    return;
  }
  if (abs.length > 0) {
    const tracked = updateGridTrack(gridTrack, dedupeBoxes(abs))!;
    roi = inflateClamp(tracked, ROI_PAD, ROI_PAD_MIN, vw, vh);
    roiMisses = 0;
    return;
  }
  if (!crop.full) {
    roiMisses++;
    if (roiMisses >= ROI_MISS_LIMIT) {
      roi = null;
      roiMisses = 0;
      gridTrack = newGridTrack();
    }
  }
}

function onDecoded(bytes: Uint8Array) {
  decodeTimes.push(performance.now());
  const parsed = parseFrame(bytes);
  if (!parsed || done) return;
  const { header, block } = parsed;
  if (!decoder || sessionId !== header.sessionId) {
    decoder = new LTDecoder(header.k, header.blockLen, header.sessionId, header.totalLen);
    sessionId = header.sessionId;
    startTs = performance.now();
    progressEl.style.display = "block";
  }
  decoder.addFrame(header.seq, block);
  const est = estimateTransferProgress(
    decoder.k,
    decoder.framesNew,
    (performance.now() - startTs) / 1000,
    OVERHEAD_EST,
  );
  bar.style.width = `${(est.fraction * 100).toFixed(1)}%`;

  if (decoder.isComplete) {
    const payload = decoder.assemble()!;
    const seconds = (performance.now() - startTs) / 1000;
    const ok = fnv1a(payload) === header.payloadFnv;
    void finish(payload, ok, seconds);
  }
}

interface TauriFs {
  writeFile(path: string, data: Uint8Array, opts: { baseDir: number }): Promise<void>;
  readFile(path: string, opts: { baseDir: number }): Promise<Uint8Array>;
  BaseDirectory: { Download: number; Document: number };
}

function tauriFs(): TauriFs | null {
  const t = (window as unknown as { __TAURI__?: { fs?: TauriFs } }).__TAURI__;
  return t?.fs ?? null;
}

async function finish(payload: Uint8Array, frameHashOk: boolean, seconds: number) {
  done = true;
  captureGen++;
  stream?.getTracks().forEach((t) => t.stop());
  preview.style.display = "none";
  bar.style.width = "100%";
  let file;
  try {
    file = await unpackFile(payload);
  } catch (err) {
    stats.textContent = `error · ${err instanceof Error ? err.message : String(err)}`;
    return;
  }
  const contentOk = await verifyFile(file);
  const hashOk = frameHashOk && contentOk;
  const fileName = file.name;
  const data = file.bytes;
  const mime =
    file.type && file.type !== "application/octet-stream" ? file.type : mimeFor(fileName);
  const size = data.length < 1024 ? `${data.length} B` : `${Math.round(data.length / 1024)} KB`;
  const rate = (data.length / 1024 / seconds).toFixed(1);
  const gz =
    file.compression === "gzip"
      ? ` · gzip ${Math.round(file.transmittedSize / 1024)} KB over the air`
      : "";
  stats.textContent = `${fileName} · ${size} in ${seconds.toFixed(1)} s · ${rate} KB/s${gz} · sha-256 ${hashOk ? "verified" : "MISMATCH"}`;
  document.getElementById("m-time")!.textContent = `${seconds.toFixed(0)} s`;
  const fsEarly = tauriFs();
  const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
  let autoSaved = false;
  if (fsEarly && hashOk) {
    try {
      await fsEarly.writeFile(fileName, data, {
        baseDir: isIOS ? fsEarly.BaseDirectory.Document : fsEarly.BaseDirectory.Download,
      });
      autoSaved = true;
    } catch {}
  }
  if (hashOk) {
    const kind = kindFor(fileName, mime);
    const entry: GalleryEntry = {
      id: crypto.randomUUID(),
      name: fileName,
      mime,
      kind,
      size: data.length,
      transmittedSize: file.transmittedSize,
      seconds,
      kbps: data.length / 1024 / Math.max(0.1, seconds),
      at: Date.now(),
    };
    if (kind === "text" || kind === "code") entry.snippet = textSnippet(data);
    if (autoSaved) entry.path = fileName;
    try {
      await putPayload(entry.id, data, entry.at);
      entry.stored = true;
    } catch {}
    const thumb = await makeThumb(data, mime);
    if (thumb) entry.thumb = thumb;
    renderRx(addEntry(localStorage, RX_KEY, entry));
  }
  const url = URL.createObjectURL(new Blob([data as BlobPart], { type: mime }));
  const heading = document.createElement("div");
  heading.className = "done";
  heading.textContent = "Transfer Complete!";
  const nodes: HTMLElement[] = [heading];
  if (mime.startsWith("image/")) {
    const img = document.createElement("img");
    img.className = "received";
    img.src = url;
    nodes.push(img);
    if (isIOS) {
      const hint = document.createElement("p");
      hint.className = "hint photos-hint";
      hint.textContent = "hold the picture to add it to Photos";
      nodes.push(hint);
    }
  }
  const fs = tauriFs();
  let save: HTMLElement;
  if (fs) {
    const btn = document.createElement("button");
    btn.className = "download";
    const savedLabel = isIOS ? "Saved · Files app" : "Saved to Downloads";
    btn.textContent = autoSaved ? savedLabel : `Save ${fileName}`;
    btn.onclick = () => {
      btn.disabled = true;
      const baseDir = isIOS ? fs.BaseDirectory.Document : fs.BaseDirectory.Download;
      fs.writeFile(fileName, data, { baseDir })
        .then(() => {
          btn.disabled = false;
          btn.textContent = savedLabel;
        })
        .catch((err: unknown) => {
          btn.disabled = false;
          btn.textContent = `Save failed: ${err instanceof Error ? err.message : String(err)}`;
        });
    };
    if (!autoSaved) {
      const warn = document.createElement("p");
      warn.className = "hint photos-hint";
      warn.textContent = "heads up: writing to the Files app failed; the file is kept inside the app gallery";
      nodes.push(warn);
    }
    save = btn;
  } else {
    const a = document.createElement("a");
    a.className = "download";
    a.href = url;
    a.download = fileName;
    a.textContent = `Save ${fileName}`;
    save = a;
  }
  const again = document.createElement("button");
  again.className = "again";
  again.textContent = "Receive another";
  again.onclick = () => location.reload();
  const actions = document.createElement("div");
  actions.className = "actions";
  actions.append(save, again);
  nodes.push(actions);
  result.append(...nodes);
}

function updateStats() {
  if (done) return;
  const now = performance.now();
  const prune = (a: number[]) => {
    while (a.length > 0 && a[0]! < now - 2000) a.shift();
  };
  prune(captureTimes);
  prune(decodeTimes);
  metric("m-cap").textContent = (captureTimes.length / 2).toFixed(0);
  metric("m-dec").textContent = (decodeTimes.length / 2).toFixed(1);
  if (!decoder) return;
  const elapsed = (now - startTs) / 1000;
  const kbs = (decoder.framesNew * decoder.blockLen) / OVERHEAD_EST / 1024 / Math.max(0.1, elapsed);
  metric("m-rate").textContent = `${kbs.toFixed(1)} KB/s`;
  const est = estimateTransferProgress(decoder.k, decoder.framesNew, elapsed, OVERHEAD_EST);
  const eta = est.finishing ? "finishing" : est.etaSeconds !== undefined ? `~${formatDuration(est.etaSeconds)} left` : "";
  metric("m-time").textContent = eta ? `${elapsed.toFixed(0)} s · ${eta}` : `${elapsed.toFixed(0)} s`;
  metric("m-frames").textContent = `${decoder.framesNew}/${decoder.framesDup}`;
  metric("m-k").textContent = String(decoder.k);
  metric("m-block").textContent = `${decoder.blockLen} B`;
  metric("m-payload").textContent = `${Math.round(decoder.totalLen / 1024)} KB`;
}
