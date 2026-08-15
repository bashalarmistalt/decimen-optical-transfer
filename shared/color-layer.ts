// Experimental layered QR channel. The primary binary QR stays readable in
// luminance; a second same-geometry QR is encoded in chroma.

const BLACK = 0xff000000;
const BLUE = 0xffff0000;
const YELLOW = 0xff00ffff;
const WHITE = 0xffffffff;

export const MIN_COLOR_CONFIDENCE = 0.12;

export interface Point {
  x: number;
  y: number;
}

export interface Quad {
  topLeft: Point;
  topRight: Point;
  bottomRight: Point;
  bottomLeft: Point;
}

export interface LayeredQrSample {
  /** Row-major binary matrices, 1 = dark module. */
  primary: Uint8Array;
  auxiliary: Uint8Array;
  /** Weakest normalized separation among luminance and both chroma splits. */
  confidence: number;
}

export interface LayeredQrRaster {
  size: number;
  pixels: Uint32Array<ArrayBuffer>;
}

/**
 * Palette mapping:
 *
 * primary dark + aux light = black   primary dark + aux dark = blue
 * primary light + aux light = white  primary light + aux dark = yellow
 *
 * Blue remains dark and yellow remains light under weighted luminance, so an
 * ordinary QR receiver sees the primary plane and safely ignores the second.
 */
export function rasterizeLayeredQr(
  moduleCount: number,
  primary: ArrayLike<number>,
  auxiliary: ArrayLike<number>,
  margin: number,
): LayeredQrRaster {
  if (primary.length !== moduleCount * moduleCount || auxiliary.length !== primary.length) {
    throw new Error("layered QR matrices must have matching dimensions");
  }
  const size = moduleCount + 2 * margin;
  const pixels = new Uint32Array(size * size);
  pixels.fill(WHITE);
  for (let y = 0; y < moduleCount; y++) {
    const dst = (y + margin) * size + margin;
    const src = y * moduleCount;
    for (let x = 0; x < moduleCount; x++) {
      const p = !!primary[src + x];
      const a = !!auxiliary[src + x];
      pixels[dst + x] = p ? (a ? BLUE : BLACK) : a ? YELLOW : WHITE;
    }
  }
  return { size, pixels };
}

/** Sample both binary planes from an RGBA crop and a codec-reported quad. */
export function sampleLayeredQr(
  rgba: Uint8Array | Uint8ClampedArray,
  width: number,
  height: number,
  quad: Quad,
  dim: number,
): LayeredQrSample | null {
  if (
    rgba.length < width * height * 4 ||
    dim < 21 ||
    dim > 177 ||
    (dim - 17) % 4 !== 0 ||
    !isFiniteQuad(quad) ||
    quadArea(quad) <= 1
  )
    return null;
  const matrix = homographyMatrix(quad, dim);
  if (!matrix) return null;
  const ppm = averageEdge(quad) / dim;
  const halfWindow = ppm >= 4 ? 1 : 0;
  const sampleCount = dim * dim;
  const red = new Uint8ClampedArray(sampleCount);
  const green = new Uint8ClampedArray(sampleCount);
  const blue = new Uint8ClampedArray(sampleCount);
  const luminanceHistogram = new Uint32Array(256);
  const [a, b, c, d, e, f, g, h] = matrix;
  let index = 0;
  for (let y = 0; y < dim; y++) {
    for (let x = 0; x < dim; x++) {
      const mx = x + 0.5;
      const my = y + 0.5;
      const divisor = g! * mx + h! * my + 1;
      const px = Math.floor((a! * mx + b! * my + c!) / divisor);
      const py = Math.floor((d! * mx + e! * my + f!) / divisor);
      let r = 0;
      let gr = 0;
      let bl = 0;
      let pixels = 0;
      for (let dy = -halfWindow; dy <= halfWindow; dy++) {
        for (let dx = -halfWindow; dx <= halfWindow; dx++) {
          const sx = px + dx;
          const sy = py + dy;
          if (sx < 0 || sy < 0 || sx >= width || sy >= height) continue;
          const offset = (sy * width + sx) * 4;
          r += rgba[offset]!;
          gr += rgba[offset + 1]!;
          bl += rgba[offset + 2]!;
          pixels++;
        }
      }
      if (!pixels) return null;
      r /= pixels;
      gr /= pixels;
      bl /= pixels;
      red[index] = r;
      green[index] = gr;
      blue[index] = bl;
      const luma = Math.round(0.2126 * r + 0.7152 * gr + 0.0722 * bl);
      luminanceHistogram[luma] = luminanceHistogram[luma]! + 1;
      index++;
    }
  }

  const luminance = splitHistogram(luminanceHistogram, sampleCount, 0);
  if (!luminance) return null;
  const primary = new Uint8Array(sampleCount);
  const darkHistogram = new Uint32Array(511);
  const lightHistogram = new Uint32Array(511);
  let darkCount = 0;
  let lightCount = 0;
  for (let i = 0; i < sampleCount; i++) {
    const r = red[i]!;
    const gr = green[i]!;
    const bl = blue[i]!;
    const isDark = 0.2126 * r + 0.7152 * gr + 0.0722 * bl <= luminance.threshold;
    primary[i] = isDark ? 1 : 0;
    const score = isDark ? bl - (r + gr) / 2 : (r + gr) / 2 - bl;
    const bin = Math.max(0, Math.min(510, Math.round(score + 255)));
    const histogram = isDark ? darkHistogram : lightHistogram;
    histogram[bin] = histogram[bin]! + 1;
    if (isDark) darkCount++;
    else lightCount++;
  }
  const dark = splitHistogram(darkHistogram, darkCount, -255);
  const light = splitHistogram(lightHistogram, lightCount, -255);
  if (!dark || !light) return null;

  const auxiliary = new Uint8Array(sampleCount);
  for (let i = 0; i < sampleCount; i++) {
    const r = red[i]!;
    const gr = green[i]!;
    const bl = blue[i]!;
    const score = primary[i] ? bl - (r + gr) / 2 : (r + gr) / 2 - bl;
    auxiliary[i] = score > (primary[i] ? dark.threshold : light.threshold) ? 1 : 0;
  }
  const confidence = Math.min(luminance.separation, dark.separation, light.separation) / 255;
  return confidence >= MIN_COLOR_CONFIDENCE ? { primary, auxiliary, confidence } : null;
}

interface Split {
  threshold: number;
  separation: number;
}

/** Otsu split over an existing histogram, avoiding per-module object arrays. */
function splitHistogram(histogram: Uint32Array, total: number, min: number): Split | null {
  if (total < 8) return null;
  let sum = 0;
  for (let bin = 0; bin < histogram.length; bin++) sum += bin * histogram[bin]!;
  let belowCount = 0;
  let belowSum = 0;
  let bestVariance = -1;
  let best: Split | null = null;
  for (let bin = 0; bin < histogram.length - 1; bin++) {
    belowCount += histogram[bin]!;
    belowSum += bin * histogram[bin]!;
    const aboveCount = total - belowCount;
    if (belowCount === 0 || aboveCount === 0) continue;
    const belowMean = belowSum / belowCount;
    const aboveMean = (sum - belowSum) / aboveCount;
    const variance = belowCount * aboveCount * (aboveMean - belowMean) ** 2;
    if (variance > bestVariance) {
      bestVariance = variance;
      best = {
        threshold: min + (belowMean + aboveMean) / 2,
        separation: aboveMean - belowMean,
      };
    }
  }
  return best;
}

export function homographyMatrix(quad: Quad, dim: number): number[] | null {
  const corners: [number, number, Point][] = [
    [0, 0, quad.topLeft],
    [dim, 0, quad.topRight],
    [dim, dim, quad.bottomRight],
    [0, dim, quad.bottomLeft],
  ];
  const equations: number[][] = [];
  for (const [u, v, point] of corners) {
    equations.push([u, v, 1, 0, 0, 0, -u * point.x, -v * point.x, point.x]);
    equations.push([0, 0, 0, u, v, 1, -u * point.y, -v * point.y, point.y]);
  }
  const solved = gaussJordan(equations);
  return solved ? [...solved, 1] : null;
}

function gaussJordan(matrix: number[][]): number[] | null {
  const n = matrix.length;
  for (let col = 0; col < n; col++) {
    let pivot = col;
    for (let row = col + 1; row < n; row++)
      if (Math.abs(matrix[row]![col]!) > Math.abs(matrix[pivot]![col]!)) pivot = row;
    if (Math.abs(matrix[pivot]![col]!) < 1e-12) return null;
    [matrix[col], matrix[pivot]] = [matrix[pivot]!, matrix[col]!];
    const divisor = matrix[col]![col]!;
    for (let i = col; i <= n; i++) matrix[col]![i] = matrix[col]![i]! / divisor;
    for (let row = 0; row < n; row++) {
      if (row === col) continue;
      const factor = matrix[row]![col]!;
      for (let i = col; i <= n; i++) matrix[row]![i] = matrix[row]![i]! - factor * matrix[col]![i]!;
    }
  }
  return matrix.map((row) => row[n]!);
}

function isFiniteQuad(quad: Quad): boolean {
  return Object.values(quad).every(({ x, y }) => Number.isFinite(x) && Number.isFinite(y));
}

function quadArea(quad: Quad): number {
  const points = [quad.topLeft, quad.topRight, quad.bottomRight, quad.bottomLeft];
  let area = 0;
  for (let i = 0; i < points.length; i++) {
    const a = points[i]!;
    const b = points[(i + 1) % points.length]!;
    area += a.x * b.y - b.x * a.y;
  }
  return Math.abs(area) / 2;
}

function averageEdge(quad: Quad): number {
  const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
  return (
    (distance(quad.topLeft, quad.topRight) +
      distance(quad.topRight, quad.bottomRight) +
      distance(quad.bottomRight, quad.bottomLeft) +
      distance(quad.bottomLeft, quad.topLeft)) /
    4
  );
}
