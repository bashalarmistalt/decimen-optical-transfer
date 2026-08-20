// Turn the armed payload into a downloadable animation: the same wire frames
// the live stream would show, rendered through the same rasterizer, packed as
// an APNG or as a numbered PNG sequence in a store-mode ZIP. A camera pointed
// at the animation playing anywhere — a web page, a video, a stream — receives
// the file exactly as if it were watching the live sender.
//
// Deliberately DOM-free (bytes in, Blob parts out) so the whole pipeline
// golden-tests in Node beside the rest of the stack; the page supplies the
// progress/cancel hooks and does the Blob-and-download dance.
//
// Where this mirrors the live sender, and where it deliberately does not:
//  - Frames come from the same LTEncoder → packFrame → createFrameQr path.
//    The exporter is a second consumer of the frame pipeline, not a variant.
//  - The carousel is endless but deterministic, so a finite export is well
//    defined: `cycles` full carousel cycles (one systematic sweep plus k
//    repair frames each — cycleLength in fountain.ts). One cycle decodes at
//    low loss; extra cycles add repair diversity a looping player would
//    otherwise replay verbatim.
//  - Grid layouts render all cells into one frame. The live stream staggers
//    cell flips to survive camera exposures mid-flip; an export flips whole
//    frames instead — a video pipeline resamples sub-frame timing
//    unpredictably, and a lost frame is exactly what the fountain absorbs.
//  - The seq stream is continuous, cells filled round-robin, so the last
//    frame of a cycle simply carries the next repair frames rather than
//    leaving grid cells empty.

import { LTEncoder, cycleLength } from "../shared/fountain";
import { blockLength, sourceBlockCount } from "../shared/frame-capacity";
import { fnv1a, packFrame, type FrameHeader } from "../shared/protocol";
import { rasterizeQrGrid, type QrGridRaster } from "../shared/qr-raster";
import { ApngEncoder } from "../shared/apng";
import { deflate, encodeBilevelPng, packBilevelScanlines } from "../shared/png";
import { zipStore, type ZipEntry } from "../shared/zip";
import { QUIET_ZONE_MODULES, createFrameQr, type EccLevel } from "./qr-frame";

export type ExportFormat = "apng" | "zip";

/** The classic ZIP format caps entries at 65535; one is the frame-rate note.
 *  The page checks this before rendering so the refusal can be worded. */
export const ZIP_MAX_FRAMES = 0xffff - 1;

export interface ExportPlan {
  k: number;
  /** Animation frames in the file. */
  animationFrames: number;
  /** Fountain frames rendered: animationFrames × gridCodes ≥ cycles × 2k. */
  seqCount: number;
}

export function planExport(
  payloadBytes: number,
  frameBytes: number,
  gridCodes: number,
  cycles: number,
): ExportPlan {
  const k = sourceBlockCount(payloadBytes, frameBytes);
  const animationFrames = Math.ceil((cycles * cycleLength(k)) / gridCodes);
  return { k, animationFrames, seqCount: animationFrames * gridCodes };
}

/**
 * Renders successive animation frames: gridCodes wire frames each, seqs
 * assigned round-robin, version locked by the first code. One implementation
 * serves the export loop and the size sampler, so an estimate can never
 * measure a different pipeline than the one that ships the file.
 */
function frameSource(
  payload: Uint8Array,
  frameBytes: number,
  ecc: EccLevel,
  gridCodes: number,
  sessionId: number,
): { next(): QrGridRaster } {
  const blockLen = blockLength(frameBytes);
  const encoder = new LTEncoder(payload, blockLen, sessionId);
  const header: FrameHeader = {
    sessionId,
    seq: 0,
    k: encoder.k,
    blockLen,
    totalLen: payload.length,
    payloadFnv: fnv1a(payload),
    // Plain v3 frames, same as the live stream — see the note in startStream().
    flags: 0,
  };
  let version: number | undefined; // locked by the first code, like the live stream
  let nextSeq = 0;
  return {
    next(): QrGridRaster {
      const matrices: ArrayLike<number>[] = [];
      let modules = 0;
      for (let cell = 0; cell < gridCodes; cell++) {
        const bytes = packFrame({ ...header, seq: nextSeq }, encoder.encode(nextSeq));
        nextSeq++;
        const qr = createFrameQr(bytes, ecc, version);
        version ??= qr.version;
        modules = qr.modules.size;
        matrices.push(qr.modules.data);
      }
      return rasterizeQrGrid(modules, matrices, QUIET_ZONE_MODULES);
    },
  };
}

// Per-frame container overhead beyond the compressed pixel stream: APNG pays
// an fcTL chunk plus fdAT framing; the ZIP pays a PNG wrapper (signature,
// IHDR, PLTE, IEND), IDAT framing, a local header and a central-directory
// record. Both forecasts run a little high, which is the safe direction.
// Close enough for a forecast.
const APNG_FRAME_OVERHEAD = 54;
const ZIP_FRAME_OVERHEAD = 175;

/** Frame content is payload-and-settings-determined, so the sample session id
 *  is arbitrary; a fixed one keeps the estimate deterministic. */
const SAMPLE_SESSION_ID = 1;

// One-slot memo for the sampled frame size. The payload is held through a
// WeakRef so a 64 MB pick does not stay pinned after the user drops it.
let sampleCache: {
  payload: WeakRef<Uint8Array>;
  frameBytes: number;
  ecc: EccLevel;
  gridCodes: number;
  scale: number;
  bytes: number;
} | null = null;

export interface ExportEstimateOptions {
  payload: Uint8Array;
  frameBytes: number;
  ecc: EccLevel;
  gridCodes: number;
  scale: number;
  cycles: number;
  format: ExportFormat;
}

/**
 * Forecast the file size by measuring, not modeling: render the first
 * animation frame through the real pipeline at the real settings, deflate it,
 * and multiply by the frame count.
 *
 * A model was tried and measured ~2× short at the default 4× scale: QR
 * modules are effectively random bits, so deflate's output tracks the packed
 * raster and the upscale, not the payload's codeword entropy. One sampled
 * frame sits within a few percent of the per-frame average (the tests pin
 * this) and costs milliseconds, cached across knob changes that don't affect
 * frame geometry.
 */
export async function estimateExportBytes(o: ExportEstimateOptions): Promise<number> {
  const plan = planExport(o.payload.length, o.frameBytes, o.gridCodes, o.cycles);
  const cacheHit =
    sampleCache !== null &&
    sampleCache.payload.deref() === o.payload &&
    sampleCache.frameBytes === o.frameBytes &&
    sampleCache.ecc === o.ecc &&
    sampleCache.gridCodes === o.gridCodes &&
    sampleCache.scale === o.scale;
  let frameBytes: number;
  if (cacheHit) {
    frameBytes = sampleCache!.bytes;
  } else {
    const raster = frameSource(o.payload, o.frameBytes, o.ecc, o.gridCodes, SAMPLE_SESSION_ID).next();
    frameBytes = (
      await deflate(packBilevelScanlines(raster.width, raster.height, raster.pixels, o.scale))
    ).length;
    sampleCache = {
      payload: new WeakRef(o.payload),
      frameBytes: o.frameBytes,
      ecc: o.ecc,
      gridCodes: o.gridCodes,
      scale: o.scale,
      bytes: frameBytes,
    };
  }
  const overhead = o.format === "zip" ? ZIP_FRAME_OVERHEAD : APNG_FRAME_OVERHEAD;
  return plan.animationFrames * (frameBytes + overhead);
}

export interface AnimationExportOptions {
  /** The packed container, exactly what the live stream would transmit. */
  payload: Uint8Array;
  frameBytes: number;
  ecc: EccLevel;
  gridCodes: number;
  format: ExportFormat;
  /** Animation frames per second. The low defaults are video-friendly — 10
   *  divides evenly into 30 and 60 fps timelines, so a re-encode drops
   *  nothing. 60 is full rate for direct browser playback: the live sender's
   *  display caveat applies unchanged (a 60 Hz screen gives each frame one
   *  refresh — see send-settings.ts), and a 30 fps re-encode halves it. */
  fps: number;
  /** Integer module upscale baked into the pixels. */
  scale: number;
  /** Carousel cycles to bake in (≥1). */
  cycles: number;
  sessionId: number;
  /** ZIP timestamps; tests pass a fixed date for reproducible output. */
  modified?: Date;
  onProgress?: (framesDone: number, framesTotal: number) => void;
  /** Polled between frames; return true to abandon the run. */
  isCancelled?: () => boolean;
}

export interface AnimationExportResult {
  /** Blob parts of the finished file. */
  parts: Uint8Array[];
  mimeType: string;
  extension: "png" | "zip";
  frameCount: number;
  /** Output pixel dimensions, scale included. */
  width: number;
  height: number;
}

/** Render the export, or null when isCancelled() ended the run early. */
export async function exportAnimation(
  o: AnimationExportOptions,
): Promise<AnimationExportResult | null> {
  const plan = planExport(o.payload.length, o.frameBytes, o.gridCodes, o.cycles);
  if (o.format === "zip" && plan.animationFrames > ZIP_MAX_FRAMES) {
    throw new Error(`a PNG sequence holds at most ${ZIP_MAX_FRAMES} frames, got ${plan.animationFrames}`);
  }
  const frames = frameSource(o.payload, o.frameBytes, o.ecc, o.gridCodes, o.sessionId);

  let apng: ApngEncoder | null = null;
  const zipEntries: ZipEntry[] = [];
  const digits = Math.max(4, String(plan.animationFrames).length);
  let width = 0;
  let height = 0;
  for (let frame = 0; frame < plan.animationFrames; frame++) {
    if (o.isCancelled?.()) return null;
    const raster = frames.next();
    width = raster.width * o.scale;
    height = raster.height * o.scale;
    if (o.format === "apng") {
      apng ??= new ApngEncoder({
        width: raster.width,
        height: raster.height,
        scale: o.scale,
        fps: o.fps,
        frameCount: plan.animationFrames,
      });
      await apng.addFrame(raster.pixels);
    } else {
      zipEntries.push({
        name: `frame-${String(frame + 1).padStart(digits, "0")}.png`,
        data: await encodeBilevelPng(raster.width, raster.height, raster.pixels, o.scale),
      });
    }
    o.onProgress?.(frame + 1, plan.animationFrames);
    // Yield to the event loop between batches so a long export cannot starve
    // the page — the compression awaits alone are not guaranteed to.
    if ((frame & 7) === 7) await new Promise((resolve) => setTimeout(resolve, 0));
  }

  if (o.format === "apng") {
    return {
      parts: apng!.finish(),
      mimeType: "image/png",
      extension: "png",
      frameCount: plan.animationFrames,
      width,
      height,
    };
  }
  // Video editors import a numbered sequence but ask for its frame rate —
  // which the ZIP, unlike the APNG, has nowhere to carry. Say it in a note.
  zipEntries.push({
    name: "frames-per-second.txt",
    data: new TextEncoder().encode(`${o.fps}\n`),
  });
  return {
    parts: zipStore(zipEntries, o.modified ?? new Date()),
    mimeType: "application/zip",
    extension: "zip",
    frameCount: plan.animationFrames,
    width,
    height,
  };
}
