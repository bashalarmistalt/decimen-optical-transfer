import assert from "node:assert/strict";
import test from "node:test";
import {
  estimateTransferProgress,
  expectedFountainOverhead,
  formatDuration,
  markRecoveredRange,
  recoveredFraction,
} from "../shared/progress.ts";

// k=100 is a ~300 KB file at 2953 bytes/frame — a very ordinary transfer.
// v2 overhead(100) = 1.02, so 102 expected frames and 2 of expected redundancy.
const K = 100;
const EXPECTED_FRAMES = 102;

test("the carousel needs almost no fountain overhead, and the model says so", () => {
  // v2 measurement: p50 AND p90 over 100 zero-loss trials are exactly 1.00
  // for every k in {5, 25, 100, 400, 1600} — one caught sweep is the whole
  // file. The model quotes a hair above so the bar never finishes early.
  for (const k of [2, 5, 25, 100, 500, 5000, 65535]) {
    const value = expectedFountainOverhead(k);
    assert.ok(value >= 1 && value <= 1.05, `k=${k}: ${value}`);
  }
  assert.equal(expectedFountainOverhead(1), 1, "a single block needs exactly one frame");
  assert.equal(expectedFountainOverhead(0), 1, "guards against a zero-block stream");
});

test("progress and ETA follow the observed unique-frame rate", () => {
  const progress = estimateTransferProgress(K, 50, 10);
  assert.equal(progress.expectedFrames, EXPECTED_FRAMES);
  assert.equal(progress.fraction, 0.43);
  assert.equal(progress.phase, "collecting");
  // 52 frames still wanted at the observed 5 frames/s.
  assert.equal(progress.etaSeconds, 10.4);
});

test("progress keeps moving through redundant frames", () => {
  const at = (frames: number) => estimateTransferProgress(K, frames, 20).fraction;

  assert.equal(estimateTransferProgress(K, 2, 4).etaSeconds, undefined, "too early to guess");
  assert.equal(at(K), 0.86, "the theoretical minimum is 86% of the bar");
  assert.equal(at(K + 1), 0.91, "half the expected redundancy is 91%");
  assert.ok(Math.abs(at(EXPECTED_FRAMES) - 0.96) < 1e-9, "expected frames lands on 96%");
  assert.ok(at(EXPECTED_FRAMES + 18) > 0.96, "running long still creeps forward");
  assert.ok(at(EXPECTED_FRAMES + 30) < 0.99, "and never reaches 100% on frame count alone");
  assert.ok(at(EXPECTED_FRAMES * 4) <= 0.99);
});

test("the ETA keeps quoting a time once a stream runs long", () => {
  // Past the expected count the target steps up one redundancy block at a time
  // rather than going silent — which is exactly when someone is wondering
  // whether the transfer has stalled.
  const overrun = estimateTransferProgress(K, EXPECTED_FRAMES + 5, 30);
  assert.ok(overrun.etaSeconds !== undefined && overrun.etaSeconds > 0);
  assert.equal(overrun.phase, "decoding");
});

test("decoded blocks can advance progress and completion caps at 99%", () => {
  assert.equal(estimateTransferProgress(K, 101, 20, 95).fraction, 0.9405);
  assert.equal(estimateTransferProgress(K, 101, 20, 100).fraction, 0.99);
});

test("the bar cannot run far ahead of solved blocks", () => {
  // The 22%-catch 4-code field run: a frames-only bar said 96% while under
  // half the blocks were solved, then the transfer "finished early". Once
  // blocks are flowing, the frame baseline may lead them by at most 12% of
  // the stream.
  const capped = estimateTransferProgress(K, 98, 20, 30);
  assert.ok(Math.abs(capped.fraction - 0.86 * 0.42) < 1e-9, `got ${capped.fraction}`);
  // The cap only restrains the frame PROMISE — blocks still lift the bar on
  // their own, so a block-rich stream is never pushed backwards.
  assert.equal(estimateTransferProgress(K, 101, 20, 95).fraction, 0.9405);
  // With nothing solved yet the baseline stays uncapped: the stream has not
  // started delivering, and early sweep frames solve on arrival anyway.
  assert.equal(estimateTransferProgress(K, 50, 10).fraction, 0.43);
});

test("durations stay compact and readable", () => {
  assert.equal(formatDuration(12.1), "13s");
  assert.equal(formatDuration(75.1), "1m 16s");
  assert.equal(formatDuration(3_661), "1h 1m");
});

test("recovered ranges mark their true file positions", () => {
  const bins = new Float32Array(10);
  markRecoveredRange(bins, 1000, 400, 100);
  markRecoveredRange(bins, 1000, 900, 100);
  assert.deepEqual(
    [...bins].map((value) => Number(value.toFixed(2))),
    [0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
  );
  assert.equal(recoveredFraction(1000, 200), 0.2);
});
