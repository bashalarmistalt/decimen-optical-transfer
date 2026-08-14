// QR decode worker: the decimen-codec engine (a custom zxing-cpp build)
// compiled to WASM. (Safari has
// never shipped BarcodeDetector — WebKit bug 281848 — so WASM is the only
// portable way.) One frame in flight per worker; the main thread drops frames
// when all workers are busy. Frames are disposable — the fountain doesn't care.
//
// Two decode paths (see ../../decimen-codec/wrapper/decimen_codec.cpp):
//  - readFull: stock acquisition. QR-only, invert/rotate sweeps compiled off,
//    error results carry positions (the receiver's crop-seeding sightings).
//  - readTracked: crops that arrive with a cached quad + module count skip
//    detection entirely — the transform is rebuilt from the quad and the grid
//    is sampled directly. Bench-measured 2.0–2.6× per decode at V40, which is
//    CPU the phone doesn't burn: the custom build exists for throughput AND
//    thermals.
//    Any tracked miss falls back to readFull on the same buffer, which also
//    re-anchors the quad. Tracked is opportunistic, never load-bearing.

import wasmUrl from "./wasm-url";
import { sampleLayeredQr } from "../shared/color-layer";
import { FLAG_COLOR_LAYERS, parseFrame } from "../shared/protocol";
import DecimenCodec, {
  type DecimenModule,
  type DecimenQuad,
  type DecimenResult,
} from "../vendor/decimen-codec/decimen_codec.js";

const ready: Promise<DecimenModule> = DecimenCodec({
  locateFile: (path: string, prefix: string) => (path.endsWith(".wasm") ? wasmUrl : prefix + path),
});

const ctx = self as unknown as {
  onmessage: ((e: MessageEvent) => void) | null;
  postMessage(msg: unknown, transfer?: Transferable[]): void;
};

/** Axis-aligned bounds of a symbol quad, shifted into capture coordinates by
 *  the crop offset and the decode downscale — the receiver uses these to crop
 *  the next frames. The decoder reports in buffer pixels; each buffer pixel is
 *  `scale` capture pixels wide, so the mapping is ox + x*scale. */
function boundsOf(p: DecimenQuad, ox: number, oy: number, scale: number) {
  const xs = [p.topLeft.x, p.topRight.x, p.bottomRight.x, p.bottomLeft.x];
  const ys = [p.topLeft.y, p.topRight.y, p.bottomRight.y, p.bottomLeft.y];
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return {
    x: ox + x * scale,
    y: oy + y * scale,
    w: (Math.max(...xs) - x) * scale,
    h: (Math.max(...ys) - y) * scale,
  };
}

/** The full quad in capture coordinates — the tracked path's anchor. */
function shifted(p: DecimenQuad, ox: number, oy: number, scale: number): DecimenQuad {
  const s = (pt: { x: number; y: number }) => ({ x: ox + pt.x * scale, y: oy + pt.y * scale });
  return {
    topLeft: s(p.topLeft),
    topRight: s(p.topRight),
    bottomRight: s(p.bottomRight),
    bottomLeft: s(p.bottomLeft),
  };
}

// Reused for bitmap captures: the GPU-cropped ImageBitmap is drawn here and
// read back on THIS thread — the whole point of the bitmap path is that the
// main thread never touches pixels.
let offscreen: OffscreenCanvas | undefined;

function decodeColorAux(
  zx: DecimenModule,
  pixels: Uint8Array | Uint8ClampedArray,
  width: number,
  height: number,
  primary: DecimenResult,
): Uint8Array | null {
  try {
    const sample = sampleLayeredQr(pixels, width, height, primary.position, primary.modules);
    if (!sample) return null;
    const matrixPtr = zx._malloc(sample.auxiliary.length);
    try {
      zx.HEAPU8.set(sample.auxiliary, matrixPtr);
      const auxiliary = zx.readMatrix(matrixPtr, primary.modules);
      return auxiliary.valid && auxiliary.bytes.length > 0
        ? Uint8Array.from(auxiliary.bytes)
        : null;
    } finally {
      zx._free(matrixPtr);
    }
  } catch {
    // The auxiliary plane is opportunistic. A sampling or matrix-decode
    // failure must never discard the already-valid primary frame.
    return null;
  }
}

function usesColorLayer(bytes: Uint8Array): boolean {
  return Boolean((parseFrame(bytes)?.header.flags ?? 0) & FLAG_COLOR_LAYERS);
}

/** Pixels from either capture mode: a transferred ArrayBuffer (readback
 *  fallback) or an ImageBitmap (GPU-side crop, Safari 17+/modern engines). */
function pixelsOf(buf: ArrayBuffer | undefined, bitmap: ImageBitmap | undefined, w: number, h: number) {
  if (bitmap) {
    const bw = bitmap.width;
    const bh = bitmap.height;
    if (!offscreen || offscreen.width !== bw || offscreen.height !== bh) {
      offscreen = new OffscreenCanvas(bw, bh);
    }
    const octx = offscreen.getContext("2d", { willReadFrequently: true })!;
    octx.drawImage(bitmap, 0, 0);
    bitmap.close();
    const img = octx.getImageData(0, 0, bw, bh);
    return { data: img.data, w: bw, h: bh };
  }
  return { data: new Uint8Array(buf!), w, h };
}

ctx.onmessage = async (e: MessageEvent) => {
  const { id, buf, bitmap, w = 0, h = 0, ox = 0, oy = 0, scale = 1, full = true, quad, dim, tryHarder = true } = e.data as {
    id: number;
    /** Readback-fallback capture: raw RGBA, already downscaled. */
    buf?: ArrayBuffer;
    /** Bitmap capture: GPU-cropped, pixels read on this thread. */
    bitmap?: ImageBitmap;
    w?: number;
    h?: number;
    /** Crop origin within the capture, for mapping positions back. */
    ox?: number;
    oy?: number;
    /** Decode downscale: each buffer pixel is this many capture pixels.
     *  Positions come back in buffer pixels and are scaled up on the way out. */
    scale?: number;
    /** Full-frame scan (up to a 3×3 grid) vs a single-code crop. */
    full?: boolean;
    /** The region's last decoded quad, capture coordinates — tracked path. */
    quad?: DecimenQuad;
    /** The stream's QR dimension in modules — tracked path. */
    dim?: number;
    /** Whether a full scan may pay for the slower detector (crops always can). */
    tryHarder?: boolean;
  };
  const zx = await ready;
  const pixels = pixelsOf(buf, bitmap, w, h);
  const { w: pw, h: ph } = pixels;
  const ptr = zx._malloc(pw * ph * 4);
  let colorAuxAttempts = 0;
  let colorAuxDecodes = 0;
  try {
    zx.HEAPU8.set(
      pixels.data instanceof Uint8Array ? pixels.data : new Uint8Array(pixels.data.buffer),
      ptr,
    );
    const symbols: {
      bytes: Uint8Array;
      box: object;
      quad: DecimenQuad;
      modules: number;
      tracked: boolean;
      colorAux?: boolean;
    }[] = [];
    const sightings: object[] = [];

    let trackedHit = false;
    let trackedAttempted = false;
    if (!full && quad && dim) {
      trackedAttempted = true;
      // The quad arrives in capture coordinates; the buffer is downscaled.
      const q = (pt: { x: number; y: number }) => ({ x: (pt.x - ox) / scale, y: (pt.y - oy) / scale });
      const r = zx.readTracked(
        ptr, pw, ph, dim,
        q(quad.topLeft).x, q(quad.topLeft).y,
        q(quad.topRight).x, q(quad.topRight).y,
        q(quad.bottomRight).x, q(quad.bottomRight).y,
        q(quad.bottomLeft).x, q(quad.bottomLeft).y,
      );
      if (r.valid && r.bytes.length > 0) {
        symbols.push({
          bytes: r.bytes,
          box: boundsOf(r.position, ox, oy, scale),
          quad: shifted(r.position, ox, oy, scale),
          modules: r.modules,
          tracked: true,
        });
        if (usesColorLayer(r.bytes)) {
          colorAuxAttempts++;
          const auxiliary = decodeColorAux(zx, pixels.data, pw, ph, r);
          if (auxiliary) {
            colorAuxDecodes++;
            symbols.push({
              bytes: auxiliary,
              box: boundsOf(r.position, ox, oy, scale),
              quad: shifted(r.position, ox, oy, scale),
              modules: r.modules,
              tracked: false,
              colorAux: true,
            });
          }
        }
        trackedHit = true;
      }
    }

    if (!trackedHit) {
      // Full scans get returnErrors (sightings live there — error results
      // COUNT against the symbol cap, hence the headroom above 9 codes) and a
      // crop fallback stays in the cheapest configuration. tryHarder is a
      // policy decision made upstream (receive/main.ts): acquisition and
      // degraded rescans need the extra passes; healthy background scans save
      // the time. Crops default to true because their whole job is re-anchoring
      // a tracked miss.
      const vec = zx.readFull(ptr, pw, ph, tryHarder, full ? 12 : 2, full);
      for (let i = 0; i < vec.size(); i++) {
        const r = vec.get(i);
        if (r.valid && r.bytes.length > 0) {
          symbols.push({
            bytes: r.bytes,
            box: boundsOf(r.position, ox, oy, scale),
            quad: shifted(r.position, ox, oy, scale),
            modules: r.modules,
            tracked: false,
          });
          if (usesColorLayer(r.bytes)) {
            colorAuxAttempts++;
            const auxiliary = decodeColorAux(zx, pixels.data, pw, ph, r);
            if (auxiliary) {
              colorAuxDecodes++;
              symbols.push({
                bytes: auxiliary,
                box: boundsOf(r.position, ox, oy, scale),
                quad: shifted(r.position, ox, oy, scale),
                modules: r.modules,
                tracked: false,
                colorAux: true,
              });
            }
          }
        } else if (full) {
          // A symbol zxing DETECTED but could not decode (glare or noise past
          // the ECC budget) is still a fix on where a code sits — the
          // receiver aims a crop there, and crops decode where full frames
          // fail. Positions stay pixel-accurate through a ChecksumError.
          const box = boundsOf(r.position, ox, oy, scale);
          if (box.w > 0 && box.h > 0) sightings.push(box);
        }
      }
      vec.delete();
    }
    ctx.postMessage({
      id,
      symbols,
      sightings,
      trackedAttempted,
      colorAuxAttempts,
      colorAuxDecodes,
    });
  } catch {
    ctx.postMessage({ id, symbols: [], sightings: [], colorAuxAttempts, colorAuxDecodes });
  } finally {
    zx._free(ptr);
  }
};

// Warm the WASM (instantiation + first-call JIT) so the first real frame
// doesn't pay for it; the pool ignores the {id: -1} ping.
void (async () => {
  try {
    const zx = await ready;
    const ptr = zx._malloc(8 * 8 * 4);
    zx.HEAPU8.set(new Uint8Array(8 * 8 * 4).fill(255), ptr);
    zx.readFull(ptr, 8, 8, false, 1, false).delete();
    zx._free(ptr);
  } catch {
    // a failed warm-up is a slow first frame, not an error
  }
  ctx.postMessage({ id: -1, bytes: null });
})();
