import assert from "node:assert/strict";
import test from "node:test";
import { effectiveParams, HEADER_BYTES, V40_CAPACITY } from "../send/params";

test("bytes clamp to v40 capacity for the chosen ecc", () => {
  const p = effectiveParams(2953, "M", 30, 1, 1, null);
  assert.equal(p.bytes, V40_CAPACITY.M);
  assert.equal(p.bytes, 2331);
  assert.ok(p.clamped);
});

test("no clamp when the request fits", () => {
  const p = effectiveParams(1465, "L", 24, 1, 1, null);
  assert.equal(p.bytes, 1465);
  assert.ok(!p.clamped);
});

test("fps clamps to half the display refresh", () => {
  const p = effectiveParams(2953, "L", 60, 2, 2, 60);
  assert.equal(p.fps, 30);
  assert.ok(p.fpsClamped);
});

test("120 Hz displays keep 60 fps", () => {
  const p = effectiveParams(2953, "L", 60, 2, 2, 120);
  assert.equal(p.fps, 60);
  assert.ok(!p.fpsClamped);
});

test("ceiling math matches fps x codes x block", () => {
  const p = effectiveParams(1465, "L", 30, 2, 2, 120);
  assert.equal(p.ceilingKBs, (30 * 4 * (1465 - HEADER_BYTES)) / 1024);
});

test("channels multiply the ceiling only", () => {
  const mono = effectiveParams(1465, "L", 30, 2, 2, 120, 1);
  const rgb = effectiveParams(1465, "L", 30, 2, 2, 120, 3);
  assert.equal(rgb.bytes, mono.bytes);
  assert.equal(rgb.fps, mono.fps);
  assert.ok(Math.abs(rgb.ceilingKBs - 3 * mono.ceilingKBs) < 1e-9);
});
