// Sender: user-selected image → endless fountain-coded QR stream.
// The fountain encoder, frame protocol and per-restart session id are the
// original optical transport architecture; this module only owns sender UI.

import QRCode from "qrcode";
import { LTEncoder } from "../shared/fountain";
import { HEADER_LEN, fnv1a, packFrame, type FrameHeader } from "../shared/protocol";

const MARGIN = 4;
const LOOKAHEAD = 3;

const el = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;

export interface SenderController {
  setActive(active: boolean): void;
}

export function createSenderController(): SenderController {
  const canvas = el<HTMLCanvasElement>("qr");
  const stage = el<HTMLElement>("qr-stage");
  const sendHint = el<HTMLElement>("send-hint");
  const specs = el<HTMLElement>("specs");
  const input = el<HTMLInputElement>("file-input");
  const previewWrap = el<HTMLElement>("file-preview-wrap");
  const preview = el<HTMLImageElement>("file-preview");
  const fileName = el<HTMLElement>("file-name");
  const fileSize = el<HTMLElement>("file-size");
  const error = el<HTMLElement>("file-error");
  const resizeBtn = el<HTMLButtonElement>("resize-file");
  const startBtn = el<HTMLButtonElement>("start-broadcast");
  const cfgLimit = el<HTMLSelectElement>("cfg-limit");
  const cfgFps = el<HTMLSelectElement>("cfg-fps");
  const cfgBytes = el<HTMLSelectElement>("cfg-bytes");
  const cfgEcc = el<HTMLSelectElement>("cfg-ecc");
  const cfgSize = el<HTMLInputElement>("cfg-size");

  let selectedFile: File | null = null;
  let selectedPayload: Uint8Array | null = null;
  let originalOversizeFile: File | null = null;
  let previewUrl: string | null = null;
  let generation = 0;
  let streaming = false;
  let active = false;

  const maxBytes = () => Number(cfgLimit.value);
  const limitLabel = () => `${Math.round(maxBytes() / 1024)} KB`;
  const isGif = (file: File) => file.type === "image/gif" || /\.gif$/i.test(file.name);

  function stopStream(message?: string): void {
    generation++;
    streaming = false;
    stage.hidden = true;
    sendHint.hidden = true;
    startBtn.textContent = "Işınlamayı başlat";
    if (message) specs.textContent = message;
  }

  function showError(message: string, canResize: boolean): void {
    error.textContent = message;
    error.hidden = false;
    resizeBtn.hidden = !canResize;
    startBtn.disabled = true;
  }

  function clearError(): void {
    error.hidden = true;
    error.textContent = "";
    resizeBtn.hidden = true;
  }

  function showPreview(file: File): void {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    previewUrl = URL.createObjectURL(file);
    preview.src = previewUrl;
    fileName.textContent = file.name;
    fileSize.textContent = `${(file.size / 1024).toFixed(file.size < 1024 * 100 ? 1 : 0)} KB`;
    previewWrap.hidden = false;
  }

  async function acceptFile(file: File, restartIfStreaming = false): Promise<void> {
    const wasStreaming = streaming || restartIfStreaming;
    stopStream("Görsel yayına hazırlanıyor…");
    selectedFile = null;
    selectedPayload = null;
    originalOversizeFile = null;
    showPreview(file);
    clearError();

    if (!file.type.startsWith("image/") && !/\.(png|jpe?g|gif)$/i.test(file.name)) {
      showError("Yalnızca PNG, JPG veya GIF görselleri seçebilirsin.", false);
      specs.textContent = "Geçersiz dosya türü.";
      return;
    }
    if (file.size > maxBytes()) {
      originalOversizeFile = file;
      const gifNote = isGif(file)
        ? " Animasyonu bozmamak için GIF otomatik küçültülemez."
        : " İstersen otomatik küçültebilirsin.";
      showError(`Dosya çok büyük, ${limitLabel()}'ı aşamaz.${gifNote}`, !isGif(file));
      specs.textContent = "Daha küçük bir dosya seç veya payload limitini değiştir.";
      return;
    }

    selectedFile = file;
    selectedPayload = new Uint8Array(await file.arrayBuffer());
    startBtn.disabled = false;
    specs.textContent = `${file.name} · ${Math.round(file.size / 1024)} KB · yayına hazır`;
    if (wasStreaming && active) await startStream();
  }

  async function loadImage(file: File): Promise<HTMLImageElement> {
    const url = URL.createObjectURL(file);
    try {
      const image = new Image();
      image.src = url;
      await image.decode();
      return image;
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  async function resizeToLimit(file: File): Promise<File> {
    const image = await loadImage(file);
    const limit = maxBytes();
    const mime = file.type === "image/jpeg" || file.type === "image/webp" ? file.type : "image/png";
    let scale = Math.min(0.92, Math.sqrt(limit / file.size) * 0.9);
    let quality = 0.88;
    let latest: Blob | null = null;

    for (let attempt = 0; attempt < 9; attempt++) {
      const canvasEl = document.createElement("canvas");
      canvasEl.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvasEl.height = Math.max(1, Math.round(image.naturalHeight * scale));
      const ctx = canvasEl.getContext("2d")!;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(image, 0, 0, canvasEl.width, canvasEl.height);
      latest = await new Promise<Blob | null>((resolve) => canvasEl.toBlob(resolve, mime, quality));
      if (latest && latest.size <= limit) break;
      scale *= 0.8;
      quality = Math.max(0.62, quality - 0.05);
    }
    if (!latest || latest.size > limit) throw new Error("Görsel hedef boyuta indirilemedi.");
    return new File([latest], file.name, { type: latest.type, lastModified: Date.now() });
  }

  async function startStream(): Promise<void> {
    if (!selectedPayload || !selectedFile || !active) return;
    const gen = ++generation;
    streaming = true;
    stage.hidden = false;
    sendHint.hidden = false;
    startBtn.textContent = "Yayını durdur";

    const payload = selectedPayload;
    const txFps = Number(cfgFps.value);
    const frameBytes = Number(cfgBytes.value);
    const ecc = cfgEcc.value as "L" | "M" | "Q" | "H";
    const displayPx = Number(cfgSize.value);

    // A fresh id on every file, setting change or manual restart makes the
    // existing receiver discard the old stream without a handshake.
    const sessionId = (Math.floor(Math.random() * 0xffff) + 1) & 0xffff;
    const blockLen = frameBytes - HEADER_LEN;
    const encoder = new LTEncoder(payload, blockLen, sessionId);
    const header: FrameHeader = {
      sessionId,
      seq: 0,
      k: encoder.k,
      blockLen,
      totalLen: payload.length,
      payloadFnv: fnv1a(payload),
    };

    let version: number | undefined;
    let modules = 0;
    let scale = 1;
    const staging = document.createElement("canvas");
    const queue: ImageData[] = [];
    let nextSeq = 0;

    const sizeCanvas = () => {
      const dpr = window.devicePixelRatio || 1;
      const total = modules + 2 * MARGIN;
      const cssBudget = Math.min(0.82 * Math.min(window.innerWidth, window.innerHeight), displayPx);
      scale = Math.max(1, Math.floor((cssBudget * dpr) / total));
      staging.width = total;
      staging.height = total;
      canvas.width = total * scale;
      canvas.height = total * scale;
      canvas.style.width = `${(total * scale) / dpr}px`;
      canvas.style.height = `${(total * scale) / dpr}px`;
    };

    const makeFrame = (): ImageData => {
      const bytes = packFrame({ ...header, seq: nextSeq }, encoder.encode(nextSeq));
      nextSeq++;
      const qr = QRCode.create(
        [{ data: bytes, mode: "byte" } as unknown as QRCode.QRCodeSegment],
        { errorCorrectionLevel: ecc, version, maskPattern: 4 },
      );
      if (version === undefined) {
        version = qr.version;
        modules = qr.modules.size;
        sizeCanvas();
        specs.textContent =
          `${txFps} FPS · ${frameBytes} bytes/kare · V${version} · ECC ${ecc} · ` +
          `${Math.round(payload.length / 1024)} KB · K=${encoder.k} · session ${sessionId}`;
      }
      const size = qr.modules.size;
      const data = qr.modules.data;
      const total = size + 2 * MARGIN;
      const img = new ImageData(total, total);
      const px = new Uint32Array(img.data.buffer);
      px.fill(0xffffffff);
      for (let y = 0; y < size; y++) {
        const row = (y + MARGIN) * total + MARGIN;
        const src = y * size;
        for (let x = 0; x < size; x++) {
          if (data[src + x]) px[row + x] = 0xff000000;
        }
      }
      return img;
    };

    const pump = () => {
      if (gen !== generation || !active) return;
      try {
        while (queue.length < LOOKAHEAD) queue.push(makeFrame());
      } catch (reason) {
        specs.textContent = `✗ ${reason instanceof Error ? reason.message : String(reason)}`;
        stopStream();
        return;
      }
      window.setTimeout(pump, 0);
    };
    pump();

    const interval = 1000 / txFps;
    let nextAt = performance.now();
    const tick = (now: number) => {
      if (gen !== generation || !active) return;
      requestAnimationFrame(tick);
      if (now < nextAt) return;
      const img = queue.shift();
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

    try {
      await (navigator as Navigator & { wakeLock?: { request(t: "screen"): Promise<unknown> } })
        .wakeLock?.request("screen");
    } catch {
      // Wake lock is an enhancement; transfer remains functional without it.
    }
  }

  input.addEventListener("change", () => {
    const file = input.files?.[0];
    if (file) void acceptFile(file, streaming);
    input.value = "";
  });

  resizeBtn.addEventListener("click", async () => {
    if (!originalOversizeFile || isGif(originalOversizeFile)) return;
    resizeBtn.disabled = true;
    resizeBtn.textContent = "Küçültülüyor…";
    try {
      const resized = await resizeToLimit(originalOversizeFile);
      await acceptFile(resized);
      specs.textContent = `${Math.round(resized.size / 1024)} KB'a küçültüldü · yayına hazır`;
    } catch (reason) {
      showError(reason instanceof Error ? reason.message : String(reason), true);
    } finally {
      resizeBtn.disabled = false;
      resizeBtn.textContent = "Otomatik küçült";
    }
  });

  startBtn.addEventListener("click", () => {
    if (streaming) stopStream("Yayın durduruldu. Görsel yeniden başlatılmaya hazır.");
    else void startStream();
  });

  for (const setting of [cfgFps, cfgBytes, cfgEcc, cfgSize]) {
    setting.addEventListener("change", () => {
      if (streaming) void startStream();
    });
  }
  cfgLimit.addEventListener("change", () => {
    if (selectedFile || originalOversizeFile) void acceptFile(originalOversizeFile ?? selectedFile!, streaming);
  });

  return {
    setActive(next: boolean) {
      active = next;
      if (!next && streaming) stopStream("Mod değişti; yayın durduruldu.");
    },
  };
}
