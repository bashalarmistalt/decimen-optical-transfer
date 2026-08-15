import assert from "node:assert/strict";
import test from "node:test";
import {
  recommendedSenderProfile,
  refreshRateFromTimestamps,
} from "../shared/send-settings.ts";

test("display refresh is inferred from animation-frame timestamps", () => {
  const sixtyHz = Array.from({ length: 16 }, (_, index) => index * (1000 / 60));
  assert.ok(Math.abs(refreshRateFromTimestamps(sixtyHz)! - 60) < 0.1);
  assert.equal(refreshRateFromTimestamps([0, 1000, 2000]), undefined);
});

test("common 60 Hz displays get two-refresh QR dwell", () => {
  assert.deepEqual(
    recommendedSenderProfile({ refreshHz: 59.94, shortSideCssPx: 390 }),
    { txFps: 30, gridCodes: 2 },
  );
});

test("high-refresh large displays get the benchmark-capable profile", () => {
  assert.deepEqual(
    recommendedSenderProfile({ refreshHz: 120, shortSideCssPx: 900 }),
    { txFps: 60, gridCodes: 4 },
  );
});

test("unknown refresh falls back safely without hiding layout throughput", () => {
  assert.deepEqual(
    recommendedSenderProfile({ shortSideCssPx: 800 }),
    { txFps: 30, gridCodes: 4 },
  );
});
