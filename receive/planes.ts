export function splitPlanes(
  rgba: Uint8ClampedArray,
): [Uint8ClampedArray<ArrayBuffer>, Uint8ClampedArray<ArrayBuffer>, Uint8ClampedArray<ArrayBuffer>] {
  const n = rgba.length / 4;
  const r = new Uint8ClampedArray(new ArrayBuffer(n * 4));
  const g = new Uint8ClampedArray(new ArrayBuffer(n * 4));
  const b = new Uint8ClampedArray(new ArrayBuffer(n * 4));
  for (let i = 0; i < n; i++) {
    const s = i * 4;
    const rv = rgba[s]!;
    const gv = rgba[s + 1]!;
    const bv = rgba[s + 2]!;
    r[s] = r[s + 1] = r[s + 2] = rv;
    g[s] = g[s + 1] = g[s + 2] = gv;
    b[s] = b[s + 1] = b[s + 2] = bv;
    r[s + 3] = g[s + 3] = b[s + 3] = 255;
  }
  return [r, g, b];
}

export function meanAbsDelta(a: Uint8ClampedArray, b: Uint8ClampedArray): number {
  if (a.length !== b.length || a.length === 0) return 255;
  let sum = 0;
  let n = 0;
  for (let i = 0; i < a.length; i += 4) {
    sum += Math.abs(a[i]! - b[i]!) + Math.abs(a[i + 1]! - b[i + 1]!) + Math.abs(a[i + 2]! - b[i + 2]!);
    n += 3;
  }
  return sum / n;
}
