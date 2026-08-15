// The sender's transmit tuning, in one place. The dropdowns in send/index.html
// are rendered from these lists via the %TX_FPS_OPTIONS% / %FRAME_BYTES_OPTIONS%
// tokens (see htmlTokens() in vite.config.ts), and the receiver's no-signal
// hint names its fallback values from here too — so the advice can never point
// at a setting the sender doesn't offer.

/** What the no-signal hint tells the user to turn the sender down to. */
export const NO_SIGNAL_HINT_FRAME_BYTES = 1465;
export const NO_SIGNAL_HINT_TX_FPS = 24;

// The HTML fallback is deliberately safe for a common 60 Hz display. At
// runtime the sender measures requestAnimationFrame and selects the fastest
// offered rate that still leaves about two display refreshes per QR. Benchmark
// mode remains pinned separately so historical records stay comparable.
export const DEFAULT_TX_FPS = 30;
export const BENCHMARK_TX_FPS = 60;
export const DEFAULT_GRID_CODES = 2;
export const BENCHMARK_GRID_CODES = 4;
export const DEFAULT_FRAME_BYTES = 2953;

// The hint values appear in these lists by construction, not by coincidence.
// 55 sits just under the 60 Hz ceiling: on 120 Hz displays it gets a clean
// ≥2 refresh cycles per frame, and on 60 Hz screens the deliberate 5 fps slip
// against the refresh clock means frame boundaries drift through the scanout
// instead of riding it, so the same frames don't get torn twice in a row.
export const TX_FPS_OPTIONS: readonly number[] = [
  10,
  15,
  20,
  NO_SIGNAL_HINT_TX_FPS,
  30,
  55,
  BENCHMARK_TX_FPS,
];
export const FRAME_BYTES_OPTIONS: readonly number[] = [
  500,
  1000,
  NO_SIGNAL_HINT_FRAME_BYTES,
  1850,
  2331,
  DEFAULT_FRAME_BYTES,
];

export interface SenderDisplayProfile {
  refreshHz?: number;
  shortSideCssPx: number;
}

/** Infer display refresh from requestAnimationFrame timestamps. */
export function refreshRateFromTimestamps(timestamps: readonly number[]): number | undefined {
  if (timestamps.length < 6) return undefined;
  const intervals = timestamps
    .slice(1)
    .map((time, index) => time - timestamps[index]!)
    .filter((interval) => Number.isFinite(interval) && interval > 0)
    .sort((a, b) => a - b);
  if (intervals.length < 5) return undefined;
  const interval = intervals[Math.floor(intervals.length / 2)]!;
  const refreshHz = 1000 / interval;
  return refreshHz >= 30 && refreshHz <= 240 ? refreshHz : undefined;
}

/** Initial settings only; once visible, the controls remain user-owned. */
export function recommendedSenderProfile({
  refreshHz,
  shortSideCssPx,
}: SenderDisplayProfile): { txFps: number; gridCodes: number } {
  const stableRates = refreshHz
    ? TX_FPS_OPTIONS.filter((fps) => fps <= refreshHz / 1.95)
    : [];
  return {
    txFps: stableRates.at(-1) ?? DEFAULT_TX_FPS,
    gridCodes: shortSideCssPx >= 700 ? 4 : DEFAULT_GRID_CODES,
  };
}
