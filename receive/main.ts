// Receiver: camera → zxing-wasm workers → fountain decoder → image Blob.
// Progress deliberately follows unique frames collected, not solved blocks:
// LT peeling resolves blocks late and would make block progress look frozen.

import { LTDecoder } from "../shared/fountain";
import { fnv1a, parseFrame } from "../shared/protocol";

const OVERHEAD_EST = 1.18;
const RATE_WINDOW_MS = 2000;

export type ReceiveMode = "receive" | "duel";

export interface ReceiverController {
  setMode(mode: ReceiveMode | null): void;
}

const el = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;

export function createReceiverController(): ReceiverController {
  const startBtn = el<HTMLButtonElement>("start-camera");
  const video = el<HTMLVideoElement>("video");
  const preview = el<HTMLElement>("preview");
  const stats = el<HTMLElement>("stats");
  const progressWrap = el<HTMLElement>("progress");
  const progressText = el<HTMLElement>("progress-text");
  const bar = el<HTMLElement>("bar");
  const result = el<HTMLElement>("result");
  const settings = el<HTMLDetailsElement>("receive-settings");
  const metricsEl = el<HTMLElement>("metrics");
  const duelScore = el<HTMLElement>("duel-score");
  const receiveEyebrow = el<HTMLElement>("receive-eyebrow");
  const receiveTitle = el<HTMLElement>("receive-title");
  const receiveCopy = el<HTMLElement>("receive-copy");
  const confetti = el<HTMLElement>("confetti");
  const metric = (id: string) => el<HTMLElement>(id);

  let mode: ReceiveMode | null = null;
  let stream: MediaStream | null = null;
  let decoder: LTDecoder | null = null;
  let sessionId = 0;
  let payloadFnv = 0;
  let startTs = 0;
  let captureGen = 0;
  let done = false;
  let statsTimer = 0;
  let resultUrl: string | null = null;
  let audioContext: AudioContext | null = null;

  const workers: Worker[] = [];
  const busy: boolean[] = [];
  const captureTimes: number[] = [];
  const decodeTimes: number[] = [];
  const uniqueFrameTimes: number[] = [];

  function stopMedia(): void {
    captureGen++;
    stream?.getTracks().forEach((track) => track.stop());
    stream = null;
    video.srcObject = null;
    for (const worker of workers) worker.terminate();
    workers.length = 0;
    busy.length = 0;
    if (statsTimer) window.clearInterval(statsTimer);
    statsTimer = 0;
  }

  function resetTransfer(clearResult: boolean): void {
    stopMedia();
    decoder = null;
    sessionId = 0;
    payloadFnv = 0;
    startTs = 0;
    done = false;
    captureTimes.length = 0;
    decodeTimes.length = 0;
    uniqueFrameTimes.length = 0;
    preview.hidden = true;
    metricsEl.hidden = true;
    progressWrap.hidden = true;
    bar.style.width = "0%";
    progressText.textContent = "0 / ~0 · %0";
    settings.hidden = false;
    startBtn.hidden = false;
    startBtn.disabled = false;
    startBtn.textContent = "Kamerayı başlat";
    if (clearResult) {
      result.replaceChildren();
      if (resultUrl) URL.revokeObjectURL(resultUrl);
      resultUrl = null;
    }
  }

  function updateModeCopy(): void {
    const duel = mode === "duel";
    receiveEyebrow.textContent = duel ? "HIZ DÜELLOSU" : "IŞINI YAKALA";
    receiveTitle.textContent = duel ? "En hızlı kim yakalayacak?" : "Kameranı koda doğrult.";
    receiveCopy.textContent = duel
      ? "Aynı vericiye doğrulun; her cihaz kendi süresini ve hızını ölçer."
      : "Kareler eksik gelse bile fountain code görseli yeniden kurar.";
    duelScore.hidden = !duel;
    stats.textContent = duel ? "Düelloya hazır. Kamerayı başlat!" : "Kamerayı başlatmaya hazır.";
    document.body.classList.toggle("duel-mode", duel);
  }

  function setControlsStarted(): void {
    settings.hidden = true;
    startBtn.hidden = true;
    preview.hidden = false;
    metricsEl.hidden = false;
    duelScore.hidden = mode !== "duel";
  }

  async function start(): Promise<void> {
    if (!mode) return;
    if (!navigator.mediaDevices?.getUserMedia) {
      stats.textContent =
        "✗ Kamera güvenli bağlam ister. Bu sayfayı başka bir cihazda açarken HTTPS kullanmalısın.";
      return;
    }

    resetTransfer(true);
    startBtn.disabled = true;
    startBtn.textContent = "Kamera açılıyor…";
    const captureWidth = Number(el<HTMLSelectElement>("cfg-width").value);
    const captureFps = Number(el<HTMLSelectElement>("cfg-capfps").value);
    const workerCount = Number(el<HTMLSelectElement>("cfg-workers").value);
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
    } catch (reason) {
      stats.textContent = `✗ Kamera: ${reason instanceof Error ? reason.message : String(reason)}`;
      startBtn.disabled = false;
      startBtn.textContent = "Kamerayı başlat";
      return;
    }

    setControlsStarted();
    video.srcObject = stream;
    await video.play().catch(() => undefined);
    const camera = stream.getVideoTracks()[0]?.getSettings();
    stats.textContent =
      `Kamera ${camera?.width ?? "?"}×${camera?.height ?? "?"}@${camera?.frameRate ?? "?"} · ` +
      "optik yayın aranıyor…";

    for (let i = 0; i < workerCount; i++) {
      const worker = new Worker(new URL("./worker.ts", import.meta.url), { type: "module" });
      const slot = i;
      worker.onmessage = (event: MessageEvent) => {
        const { id, bytes } = event.data as { id: number; bytes: Uint8Array | null };
        if (id === -1) return;
        busy[slot] = false;
        if (bytes) onDecoded(bytes);
      };
      workers.push(worker);
      busy.push(false);
    }

    const gen = ++captureGen;
    scheduleFrame(gen);
    statsTimer = window.setInterval(updateStats, 250);
    try {
      audioContext ??= new AudioContext();
      await audioContext.resume();
    } catch {
      // Sound is celebratory only; camera/decoder behavior is unaffected.
    }
    try {
      await (navigator as Navigator & { wakeLock?: { request(t: "screen"): Promise<unknown> } })
        .wakeLock?.request("screen");
    } catch {
      // Fine without a wake lock.
    }
  }

  type VideoRVFC = HTMLVideoElement & {
    requestVideoFrameCallback?: (callback: () => void) => number;
  };

  function scheduleFrame(gen: number): void {
    if (done || gen !== captureGen || !mode) return;
    const next = () => {
      if (done || gen !== captureGen || !mode) return;
      captureFrame();
      scheduleFrame(gen);
    };
    const cameraVideo = video as VideoRVFC;
    if (cameraVideo.requestVideoFrameCallback) cameraVideo.requestVideoFrameCallback(next);
    else requestAnimationFrame(next);
  }

  const grab = document.createElement("canvas");
  let frameId = 0;

  function captureFrame(): void {
    const width = video.videoWidth;
    const height = video.videoHeight;
    if (!width || !height) return;
    captureTimes.push(performance.now());
    const slot = busy.indexOf(false);
    if (slot === -1) return;
    if (grab.width !== width || grab.height !== height) {
      grab.width = width;
      grab.height = height;
    }
    const ctx = grab.getContext("2d", { willReadFrequently: true })!;
    ctx.drawImage(video, 0, 0);
    const image = ctx.getImageData(0, 0, width, height);
    busy[slot] = true;
    workers[slot]!.postMessage(
      { id: frameId++, buf: image.data.buffer, w: width, h: height },
      [image.data.buffer],
    );
  }

  function onDecoded(bytes: Uint8Array): void {
    decodeTimes.push(performance.now());
    const parsed = parseFrame(bytes);
    if (!parsed || done) return;
    const { header, block } = parsed;

    if (!decoder || sessionId !== header.sessionId) {
      decoder = new LTDecoder(header.k, header.blockLen, header.sessionId, header.totalLen);
      sessionId = header.sessionId;
      payloadFnv = header.payloadFnv;
      startTs = performance.now();
      uniqueFrameTimes.length = 0;
      progressWrap.hidden = false;
      result.replaceChildren();
      stats.textContent = `Session ${sessionId} yakalandı · kareler toplanıyor…`;
    }

    const before = decoder.framesNew;
    decoder.addFrame(header.seq, block);
    if (decoder.framesNew > before) uniqueFrameTimes.push(performance.now());
    updateProgress();

    if (decoder.isComplete) {
      const payload = decoder.assemble()!;
      const seconds = (performance.now() - startTs) / 1000;
      finish(payload, fnv1a(payload) === payloadFnv, seconds, header.totalLen);
    }
  }

  function progressRatio(): number {
    if (!decoder) return 0;
    return Math.min(decoder.isComplete ? 1 : 0.99, decoder.framesNew / (decoder.k * OVERHEAD_EST));
  }

  function updateProgress(): void {
    if (!decoder) return;
    const ratio = progressRatio();
    const estimated = Math.ceil(decoder.k * OVERHEAD_EST);
    const percent = ratio * 100;
    bar.style.width = `${percent.toFixed(1)}%`;
    progressText.textContent = `${decoder.framesNew} / ~${estimated} · %${percent.toFixed(1)}`;
    metric("duel-frames").textContent = String(decoder.framesNew);
    metric("duel-percent").innerHTML = `${percent.toFixed(1)}<small>%</small>`;
  }

  function detectMime(payload: Uint8Array): string {
    if (payload[0] === 0x47 && payload[1] === 0x49 && payload[2] === 0x46) return "image/gif";
    if (payload[0] === 0x89 && payload[1] === 0x50 && payload[2] === 0x4e && payload[3] === 0x47) {
      return "image/png";
    }
    if (payload[0] === 0xff && payload[1] === 0xd8 && payload[2] === 0xff) return "image/jpeg";
    if (
      payload[0] === 0x52 && payload[1] === 0x49 && payload[2] === 0x46 && payload[3] === 0x46 &&
      payload[8] === 0x57 && payload[9] === 0x45 && payload[10] === 0x42 && payload[11] === 0x50
    ) return "image/webp";
    return "application/octet-stream";
  }

  function playCaughtSound(): void {
    if (!audioContext) return;
    const now = audioContext.currentTime;
    for (const [index, frequency] of [523.25, 659.25, 783.99].entries()) {
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      oscillator.type = "sine";
      oscillator.frequency.value = frequency;
      const at = now + index * 0.09;
      gain.gain.setValueAtTime(0.0001, at);
      gain.gain.exponentialRampToValueAtTime(0.16, at + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.18);
      oscillator.connect(gain).connect(audioContext.destination);
      oscillator.start(at);
      oscillator.stop(at + 0.2);
    }
  }

  function launchConfetti(): void {
    confetti.replaceChildren();
    const colors = ["#ffb000", "#ff5b35", "#ffe66d", "#f7f0dd", "#44d19d"];
    for (let i = 0; i < 70; i++) {
      const piece = document.createElement("i");
      piece.style.setProperty("--x", `${Math.random() * 100}vw`);
      piece.style.setProperty("--drift", `${(Math.random() - 0.5) * 220}px`);
      piece.style.setProperty("--delay", `${Math.random() * 0.35}s`);
      piece.style.setProperty("--duration", `${1.8 + Math.random() * 1.8}s`);
      piece.style.setProperty("--color", colors[i % colors.length]!);
      confetti.append(piece);
    }
    window.setTimeout(() => confetti.replaceChildren(), 4000);
  }

  function finish(payload: Uint8Array, hashOk: boolean, seconds: number, totalLen: number): void {
    done = true;
    stopMedia();
    preview.hidden = true;
    bar.style.width = "100%";
    const kb = totalLen / 1024;
    const averageRate = kb / Math.max(seconds, 0.001);
    progressText.textContent = `${decoder?.framesNew ?? 0} kare · %100`;
    metric("duel-percent").innerHTML = "100<small>%</small>";
    stats.textContent =
      `${Math.round(kb)} KB · ${seconds.toFixed(2)} sn · ort. ${averageRate.toFixed(1)} KB/s · ` +
      `hash ${hashOk ? "doğrulandı ✓" : "UYUŞMUYOR ✗"}`;

    const completion = document.createElement("div");
    completion.className = mode === "duel" ? "completion duel-completion" : "completion";
    const heading = document.createElement("div");
    heading.className = "done";
    heading.textContent = mode === "duel" ? "TAMAMLANDI" : "YAKALANDI!";
    const summary = document.createElement("p");
    summary.textContent = mode === "duel"
      ? `${seconds.toFixed(2)} saniye · ortalama ${averageRate.toFixed(1)} KB/s`
      : `Görsel ${decoder?.framesNew ?? 0} benzersiz kareden yeniden kuruldu.`;
    const verification = document.createElement("span");
    verification.className = hashOk ? "hash-ok" : "hash-error";
    verification.textContent = hashOk ? "HASH DOĞRULANDI" : "HASH UYUŞMUYOR";
    completion.append(heading, summary, verification);

    const image = document.createElement("img");
    image.className = "received";
    image.alt = "Optik aktarım ile alınan görsel";
    resultUrl = URL.createObjectURL(new Blob([payload as BlobPart], { type: detectMime(payload) }));
    image.src = resultUrl;
    result.replaceChildren(completion, image);
    launchConfetti();
    playCaughtSound();
  }

  function updateStats(): void {
    if (done) return;
    const now = performance.now();
    const prune = (times: number[], age: number) => {
      while (times.length > 0 && times[0]! < now - age) times.shift();
    };
    prune(captureTimes, RATE_WINDOW_MS);
    prune(decodeTimes, RATE_WINDOW_MS);
    prune(uniqueFrameTimes, RATE_WINDOW_MS);
    metric("m-cap").textContent = (captureTimes.length / 2).toFixed(0);
    metric("m-dec").textContent = (decodeTimes.length / 2).toFixed(1);
    if (!decoder) return;

    const elapsed = (now - startTs) / 1000;
    const rateWindow = Math.max(0.25, Math.min(RATE_WINDOW_MS / 1000, elapsed));
    const instantRate = (uniqueFrameTimes.length * decoder.blockLen) / 1024 / rateWindow;
    metric("m-rate").textContent = `${instantRate.toFixed(1)} KB/s`;
    metric("m-time").textContent = `${elapsed.toFixed(1)} sn`;
    metric("m-frames").textContent = `${decoder.framesNew}/${decoder.framesDup}`;
    metric("m-k").textContent = String(decoder.k);
    metric("m-block").textContent = `${decoder.blockLen} B`;
    metric("m-payload").textContent = `${Math.round(decoder.totalLen / 1024)} KB`;
    metric("duel-rate").innerHTML = `${instantRate.toFixed(1)} <small>KB/s</small>`;
    updateProgress();
  }

  startBtn.addEventListener("click", () => void start());

  return {
    setMode(next: ReceiveMode | null): void {
      if (mode !== next) resetTransfer(true);
      mode = next;
      if (next) updateModeCopy();
      else document.body.classList.remove("duel-mode");
    },
  };
}
