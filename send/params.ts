export const V40_CAPACITY: Record<string, number> = { L: 2953, M: 2331, Q: 1663, H: 1273 };
export const HEADER_BYTES = 20;

export interface EffectiveParams {
  bytes: number;
  clamped: boolean;
  fps: number;
  fpsClamped: boolean;
  ceilingKBs: number;
}

export function effectiveParams(
  requestedBytes: number,
  ecc: string,
  requestedFps: number,
  cols: number,
  rows: number,
  displayHz: number | null,
  channels = 1,
): EffectiveParams {
  const cap = V40_CAPACITY[ecc] ?? V40_CAPACITY.L!;
  const bytes = Math.min(requestedBytes, cap);
  const safeFps = displayHz ? Math.max(10, Math.floor(displayHz / 2)) : requestedFps;
  const fps = Math.min(requestedFps, safeFps);
  const block = bytes - HEADER_BYTES;
  return {
    bytes,
    clamped: bytes < requestedBytes,
    fps,
    fpsClamped: fps < requestedFps,
    ceilingKBs: (fps * cols * rows * channels * block) / 1024,
  };
}

export function measureDisplayHz(): Promise<number> {
  return new Promise((resolve) => {
    let count = 0;
    let start = 0;
    const tick = (t: number): void => {
      if (!start) start = t;
      count++;
      if (t - start >= 500) {
        resolve(Math.round((count * 1000) / (t - start)));
        return;
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}
