import assert from "node:assert/strict";
import test from "node:test";
import {
  homographyMatrix,
  rasterizeLayeredQr,
  sampleLayeredQr,
  type Quad,
} from "../shared/color-layer.ts";

function bits(dim: number, seed: number): Uint8Array {
  let state = seed >>> 0;
  const out = new Uint8Array(dim * dim);
  for (let i = 0; i < out.length; i++) {
    state = (state * 1664525 + 1013904223) >>> 0;
    out[i] = state >>> 31;
  }
  return out;
}

function rgbaOf(raster: ReturnType<typeof rasterizeLayeredQr>): Uint8ClampedArray {
  return new Uint8ClampedArray(raster.pixels.buffer.slice(0));
}

test("the four-color palette preserves the primary QR in luminance", () => {
  const dim = 21;
  const primary = bits(dim, 1);
  const auxiliary = bits(dim, 2);
  const raster = rasterizeLayeredQr(dim, primary, auxiliary, 0);
  const rgba = rgbaOf(raster);
  for (let i = 0; i < primary.length; i++) {
    const r = rgba[i * 4]!;
    const g = rgba[i * 4 + 1]!;
    const b = rgba[i * 4 + 2]!;
    const dark = 0.2126 * r + 0.7152 * g + 0.0722 * b < 128;
    assert.equal(Number(dark), primary[i], `module ${i}`);
  }
});

test("layered matrices round-trip through a skewed synthetic capture", () => {
  const dim = 21;
  const primary = bits(dim, 0xdec1);
  const auxiliary = bits(dim, 0xdec2);
  const raster = rasterizeLayeredQr(dim, primary, auxiliary, 0);
  const source = rgbaOf(raster);
  const width = 180;
  const height = 175;
  const quad: Quad = {
    topLeft: { x: 13, y: 18 },
    topRight: { x: 160, y: 8 },
    bottomRight: { x: 170, y: 158 },
    bottomLeft: { x: 9, y: 166 },
  };
  const forward = homographyMatrix(quad, dim)!;
  const inverse = invert3(forward);
  const capture = new Uint8ClampedArray(width * height * 4).fill(255);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const [u, v] = apply(inverse, x + 0.5, y + 0.5);
      if (u < 0 || v < 0 || u >= dim || v >= dim) continue;
      const src = (Math.floor(v) * dim + Math.floor(u)) * 4;
      const dst = (y * width + x) * 4;
      capture.set(source.subarray(src, src + 4), dst);
    }
  }
  const sampled = sampleLayeredQr(capture, width, height, quad, dim);
  assert.ok(sampled);
  assert.deepEqual(sampled.primary, primary);
  assert.deepEqual(sampled.auxiliary, auxiliary);
  assert.ok(sampled.confidence > 0.5);
});

test("ordinary black-and-white QR colors do not fake an auxiliary layer", () => {
  const dim = 21;
  const primary = bits(dim, 3);
  const raster = rasterizeLayeredQr(dim, primary, new Uint8Array(dim * dim), 0);
  const quad: Quad = {
    topLeft: { x: 0, y: 0 },
    topRight: { x: dim, y: 0 },
    bottomRight: { x: dim, y: dim },
    bottomLeft: { x: 0, y: dim },
  };
  assert.equal(sampleLayeredQr(rgbaOf(raster), dim, dim, quad, dim), null);
});

test("degenerate geometry and mismatched matrices fail closed", () => {
  assert.throws(() => rasterizeLayeredQr(21, new Uint8Array(2), new Uint8Array(2), 0));
  const point = { x: 2, y: 2 };
  const quad = { topLeft: point, topRight: point, bottomRight: point, bottomLeft: point };
  assert.equal(sampleLayeredQr(new Uint8Array(21 * 21 * 4), 21, 21, quad, 21), null);
});

function invert3(m: number[]): number[] {
  const [a, b, c, d, e, f, g, h, i] = m;
  const det = a! * (e! * i! - f! * h!) - b! * (d! * i! - f! * g!) + c! * (d! * h! - e! * g!);
  return [
    (e! * i! - f! * h!) / det,
    (c! * h! - b! * i!) / det,
    (b! * f! - c! * e!) / det,
    (f! * g! - d! * i!) / det,
    (a! * i! - c! * g!) / det,
    (c! * d! - a! * f!) / det,
    (d! * h! - e! * g!) / det,
    (b! * g! - a! * h!) / det,
    (a! * e! - b! * d!) / det,
  ];
}

function apply(m: number[], x: number, y: number): [number, number] {
  const w = m[6]! * x + m[7]! * y + m[8]!;
  return [
    (m[0]! * x + m[1]! * y + m[2]!) / w,
    (m[3]! * x + m[4]! * y + m[5]!) / w,
  ];
}
