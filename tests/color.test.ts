import assert from "node:assert/strict";
import test from "node:test";
import { composeGroupColor, type CodeMatrix } from "../send/compose";
import { meanAbsDelta, splitPlanes } from "../receive/planes";
import { dedupeBoxes, type Box } from "../receive/roi";

class FakeImageData {
  data: Uint8ClampedArray;
  width: number;
  height: number;
  constructor(w: number, h: number) {
    this.data = new Uint8ClampedArray(w * h * 4);
    this.width = w;
    this.height = h;
  }
}
(globalThis as { ImageData?: unknown }).ImageData = FakeImageData;

const dot = (bit: number): CodeMatrix => ({ size: 1, data: new Uint8Array([bit]) });

test("composeGroupColor packs each channel's dark modules into its own byte", () => {
  const img = composeGroupColor([[dot(1)], [dot(0)], [dot(1)]], 1, 1, 1);
  assert.equal(img.width, 3);
  const c = (img.data[(1 * 3 + 1) * 4] ?? -1);
  assert.equal(c, 0);
  assert.equal(img.data[(1 * 3 + 1) * 4 + 1], 255);
  assert.equal(img.data[(1 * 3 + 1) * 4 + 2], 0);
  assert.equal(img.data[0], 255);
  assert.equal(img.data[3], 255);
});

test("splitPlanes reproduces each channel as a gray plane", () => {
  const rgba = new Uint8ClampedArray([10, 20, 30, 255, 200, 150, 100, 255]);
  const [r, g, b] = splitPlanes(rgba);
  assert.deepEqual([...r.slice(0, 3)], [10, 10, 10]);
  assert.deepEqual([...g.slice(4, 7)], [150, 150, 150]);
  assert.deepEqual([...b.slice(0, 3)], [30, 30, 30]);
  assert.equal(r[7], 255);
});

test("meanAbsDelta is zero for identical frames and large for a flip", () => {
  const a = new Uint8ClampedArray([100, 100, 100, 255, 0, 0, 0, 255]);
  const same = new Uint8ClampedArray(a);
  const flip = new Uint8ClampedArray([0, 0, 0, 255, 100, 100, 100, 255]);
  assert.equal(meanAbsDelta(a, same), 0);
  assert.ok(meanAbsDelta(a, flip) > 50);
  assert.equal(meanAbsDelta(a, new Uint8ClampedArray(4)), 255);
});

test("dedupeBoxes collapses coincident plane sightings and keeps distinct cells", () => {
  const at = (x: number, y: number): Box => ({ x0: x, y0: y, x1: x + 100, y1: y + 100 });
  const boxes = [at(0, 0), at(2, 1), at(1, 3), at(120, 0), at(122, 2), at(0, 120)];
  const out = dedupeBoxes(boxes);
  assert.equal(out.length, 3);
  assert.deepEqual(out[0], at(0, 0));
  assert.deepEqual(out[1], at(120, 0));
});
