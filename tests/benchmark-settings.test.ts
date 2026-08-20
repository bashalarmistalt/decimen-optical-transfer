import assert from "node:assert/strict";
import test from "node:test";
import {
  formatSenderSettings,
  parseSenderSettings,
} from "../build/benchmark-settings.ts";

const valid = {
  txFps: 24,
  frameBytes: 1465,
  ecc: "L",
  gridCodes: 4,
  layout: "2×2",
  displayPx: 900,
} as const;

test("complete sender diagnostics become benchmark provenance", () => {
  assert.deepEqual(parseSenderSettings(valid), valid);
  assert.equal(
    formatSenderSettings(valid),
    "24 fps · 1465 B · ECC-L · 4 codes (2×2) · 900 px",
  );
});

test("legacy and malformed announcements are not promoted as provenance", () => {
  for (const value of [
    undefined,
    {},
    { ...valid, txFps: 0 },
    { ...valid, frameBytes: 1.5 },
    { ...valid, ecc: "Z" },
    { ...valid, gridCodes: 0 },
    { ...valid, layout: "2x2" },
    { ...valid, displayPx: Number.NaN },
  ]) {
    assert.equal(parseSenderSettings(value), undefined, JSON.stringify(value));
  }
});

test("single-code settings use singular provenance wording", () => {
  const parsed = parseSenderSettings({ ...valid, gridCodes: 1, layout: "1×1" });
  assert.ok(parsed);
  assert.equal(
    formatSenderSettings(parsed),
    "24 fps · 1465 B · ECC-L · 1 code (1×1) · 900 px",
  );
});
