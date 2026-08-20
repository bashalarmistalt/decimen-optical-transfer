import assert from "node:assert/strict";
import test from "node:test";
import {
  MAX_DOWNSCALE,
  TARGET_PX_PER_MODULE,
  cropDownscale,
  downscaleForPxPerModule,
  downsizedDimension,
  fullScanDownscale,
  tryHarderForFullScan,
} from "../shared/decode-policy.ts";

test("the target keeps about 5 px per module at scale 1", () => {
  assert.equal(TARGET_PX_PER_MODULE, 5);
  // Just under the target, no downscale at all.
  assert.equal(downscaleForPxPerModule(1), 1);
  assert.equal(downscaleForPxPerModule(4.9), 1);
  assert.equal(downscaleForPxPerModule(5), 1);
  // 10 px/module: the code is twice as dense as it needs to be — halve it.
  assert.equal(downscaleForPxPerModule(9.9), 1);
  assert.equal(downscaleForPxPerModule(10), 2);
  assert.equal(downscaleForPxPerModule(14), 2);
  // 15 px/module: a third of the pixels.
  assert.equal(downscaleForPxPerModule(15), 3);
  assert.equal(downscaleForPxPerModule(19.99), 3);
  // 20+ px/module: capped at the safety ceiling.
  assert.equal(downscaleForPxPerModule(20), 4);
  assert.equal(downscaleForPxPerModule(100), MAX_DOWNSCALE);
  // A non-finite density is a broken measurement, not a license to shrink —
  // the safe answer is "leave it alone".
  assert.equal(downscaleForPxPerModule(Infinity), 1);
});

test("unmeasurable densities never downscale", () => {
  // No yardstick, no risk: a sighting region without a measured px/module must
  // always decode at full resolution.
  assert.equal(cropDownscale(0), 1);
  assert.equal(cropDownscale(-5), 1);
  assert.equal(cropDownscale(NaN), 1);
  assert.equal(fullScanDownscale(0), 1);
});

test("a full scan only shrinks when every live code can afford it", () => {
  // The densest code sets the floor: 10 px/module on a 2-code grid means the
  // smallest live code is still 2× denser than needed, so the scan halves.
  assert.equal(fullScanDownscale(10), 2);
  assert.equal(fullScanDownscale(4), 1, "a dense code must never be shrunk away");
});

test("tryHarder is reserved for acquisition and degraded rescans", () => {
  // Cold: nothing decoded yet — every extra detector pass helps find the code.
  assert.equal(tryHarderForFullScan(0, 0), true);
  assert.equal(tryHarderForFullScan(0, 4), true);
  // Degraded: a code went missing — the scan must reacquire it hard.
  assert.equal(tryHarderForFullScan(1, 4), true);
  assert.equal(tryHarderForFullScan(3, 4), true);
  // Healthy: every expected code is live — the scan is background
  // re-verification, and crops hold the lock, so it can relax.
  assert.equal(tryHarderForFullScan(4, 4), false);
  assert.equal(tryHarderForFullScan(5, 4), false);
});

test("a downscaled dimension never goes below 1", () => {
  assert.equal(downsizedDimension(100, 4), 25);
  assert.equal(downsizedDimension(32, 4), 8);
  assert.equal(downsizedDimension(31, 4), 7);
  assert.equal(downsizedDimension(100, 1), 100);
  assert.equal(downsizedDimension(4, 4), 1);
});
