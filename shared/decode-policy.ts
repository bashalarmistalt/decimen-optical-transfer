// Decode-side tuning policy: how much to shrink each decode, and when to pay
// for tryHarder.
//
// Decode cost scales with pixel area — binarization and the detector both walk
// the whole buffer — but the decoder only needs ~3–5 px per QR module to
// sample the grid. A code that fills half a 1280×960 capture yields a
// ~1200×1200 crop being binarized and (on a tracked miss) full-detected for a
// symbol that reads fine at a third of that. Scaling the buffer down before
// handing it to the worker trades a cheap bilinear pass for a ~scale² cut in
// the expensive one.
//
// Pure and DOM-free so it can be golden-tested in Node.
//
// The downscale is applied at decode time to the buffer the worker receives,
// NOT by renegotiating the camera. Renegotiating would change the capture
// resolution mid-stream — invalidating region coordinates, forcing
// re-acquisition, and in many cases dropping the sensor's full quality for
// the whole stream. This is per-frame, reversible, and keeps the preview and
// overlay at full resolution.

/** Modules the decoder can work with after downscaling. zxing's tracked path
 *  samples a grid and its full path re-detects, so ~5 px/module is comfortable
 *  for both. Keep it a hair above the minimum for motion-blur and focus
 *  softness margins. */
export const TARGET_PX_PER_MODULE = 5;
/** Never downscale past this factor — a 4× shrink of a small code turns into
 *  sub-pixel module widths and the decode fails for no reason. */
export const MAX_DOWNSCALE = 4;

/** The largest scale that keeps a code readable: target px/module divided into
 *  the observed density, floored to an integer and clamped to [1, MAX]. */
export function downscaleForPxPerModule(pxPerModule: number): number {
  if (!Number.isFinite(pxPerModule) || pxPerModule <= 0) return 1;
  return Math.min(MAX_DOWNSCALE, Math.max(1, Math.floor(pxPerModule / TARGET_PX_PER_MODULE)));
}

/** Scale for a single-code crop. `dim` is the QR dimension in modules; the
 *  observed density is the region's average px/module. */
export function cropDownscale(regionPxPerModule: number): number {
  return downscaleForPxPerModule(regionPxPerModule);
}

/** Scale for a full-frame scan, driven by the smallest live code — the
 *  scan has to keep the densest target on screen readable. With nothing
 *  decoded yet there is no density yardstick, so acquisition scans stay
 *  full-res: the receiver can't risk missing a small far-away code. */
export function fullScanDownscale(minLivePxPerModule: number): number {
  return downscaleForPxPerModule(minLivePxPerModule);
}

/** Whether a full scan should pay for the slower detector. Full scans are the
 *  reacquisition path: cold (nothing live) and degraded (a code went missing)
 *  both NEED the extra passes, so tryHarder stays on there. When every code is
 *  live the scans are background re-verification — crops hold the lock, so a
 *  relaxed miss costs nothing. */
export function tryHarderForFullScan(liveDecodedRegions: number, expectedRegions: number): boolean {
  return liveDecodedRegions === 0 || liveDecodedRegions < expectedRegions;
}

/** A downscaled buffer is only worth decoding if it is still large enough to
 *  carry the symbol. Guards the crop path's "w/scale ≥ 32" rule so the
 *  arithmetic lives next to the policy that produced it. */
export function downsizedDimension(dimension: number, scale: number): number {
  return Math.max(1, Math.floor(dimension / scale));
}
