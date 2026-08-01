import assert from "node:assert/strict";
import test from "node:test";
import { cellCropBoxes, newGridTrack, updateGridTrack, unionBoxes, PARTIAL_SHRINK_LIMIT, type Box } from "../receive/roi";

const q = (x: number, y: number): Box => ({ x0: x, y0: y, x1: x + 100, y1: y + 100 });
const FULL: Box[] = [q(0, 0), q(120, 0), q(0, 120), q(120, 120)];

test("full grid establishes the tracked box", () => {
  const t = newGridTrack();
  const box = updateGridTrack(t, FULL)!;
  assert.deepEqual(box, unionBoxes(FULL));
  assert.equal(t.maxSymbols, 4);
});

test("a partial single-code decode does not collapse the tracked box", () => {
  const t = newGridTrack();
  updateGridTrack(t, FULL);
  const before = { ...t.box! };
  for (let i = 0; i < PARTIAL_SHRINK_LIMIT - 1; i++) {
    const box = updateGridTrack(t, [q(120, 120)])!;
    assert.ok(box.x0 <= before.x0 && box.y0 <= before.y0 && box.x1 >= before.x1 && box.y1 >= before.y1);
  }
});

test("a sustained smaller region eventually re-anchors the box", () => {
  const t = newGridTrack();
  updateGridTrack(t, FULL);
  for (let i = 0; i < PARTIAL_SHRINK_LIMIT; i++) updateGridTrack(t, [q(500, 500)]);
  const box = t.box!;
  assert.ok(box.x0 >= 500 && box.x1 <= 600 + 0.01);
  assert.equal(t.maxSymbols, 1);
});

test("recovering the full grid after re-anchor tracks it again", () => {
  const t = newGridTrack();
  updateGridTrack(t, FULL);
  for (let i = 0; i < PARTIAL_SHRINK_LIMIT; i++) updateGridTrack(t, [q(500, 500)]);
  const box = updateGridTrack(t, FULL)!;
  assert.deepEqual(box, unionBoxes(FULL));
  assert.equal(t.maxSymbols, 4);
});

test("a full sighting captures per-cell boxes and partials do not disturb them", () => {
  const t = newGridTrack();
  updateGridTrack(t, FULL);
  assert.equal(t.cells.length, 4);
  updateGridTrack(t, [q(120, 120)]);
  assert.equal(t.cells.length, 4);
  assert.deepEqual(t.cells[0], FULL[0]);
});

test("a sustained-shrink re-anchor clears the per-cell boxes", () => {
  const t = newGridTrack();
  updateGridTrack(t, FULL);
  for (let i = 0; i < PARTIAL_SHRINK_LIMIT; i++) updateGridTrack(t, [q(500, 500)]);
  assert.equal(t.cells.length, 0);
});

test("cellCropBoxes pads and clamps each cell inside the frame", () => {
  const crops = cellCropBoxes(FULL, 0.1, 16, 56, 200, 200)!;
  assert.equal(crops.length, 4);
  assert.ok(crops[0]!.x0 === 0 && crops[0]!.y0 === 0);
  assert.ok(crops[3]!.x1 <= 200 && crops[3]!.y1 <= 200);
  assert.equal(crops[1]!.x0, 104);
  assert.equal(crops[1]!.x1, 200);
});

test("cellCropBoxes refuses solo cells and under-size cells", () => {
  assert.equal(cellCropBoxes([q(0, 0)], 0.1, 16, 56, 2000, 2000), null);
  const tiny: Box = { x0: 0, y0: 0, x1: 10, y1: 10 };
  assert.equal(cellCropBoxes([tiny, q(120, 0)], 0.05, 2, 56, 2000, 2000), null);
});
