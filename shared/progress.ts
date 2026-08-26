/**
 * Distinct frames per source block a stream needs.
 *
 * The v1 soliton fountain needed 1.15–1.6 depending on k (see git history for
 * the measured curve). The v2 systematic carousel (fountain.ts) needs exactly
 * 1.00 at zero loss — measured p50 AND p90 over 100 trials each at
 * k ∈ {5, 25, 100, 400, 1600} — because one caught sweep is the whole file.
 * The 2% margin keeps the bar and the goodput figure from over-promising on
 * the odd dropped frame; under real loss the ETA's overshoot handling extends
 * the target instead of this model pretending to know the loss rate.
 */
export function expectedFountainOverhead(sourceBlocks: number): number {
  return sourceBlocks <= 1 ? 1 : 1.02;
}

export interface TransferProgressEstimate {
  fraction: number;
  expectedFrames: number;
  etaSeconds?: number;
  phase: "collecting" | "decoding";
}

export function recoveredFraction(totalBytes: number, recoveredBytes: number): number {
  if (totalBytes <= 0 || recoveredBytes <= 0) return 0;
  return Math.min(1, recoveredBytes / totalBytes);
}

export function markRecoveredRange(
  bins: Float32Array,
  totalBytes: number,
  start: number,
  length: number,
): void {
  if (bins.length === 0 || totalBytes <= 0 || length <= 0) return;
  const from = Math.max(0, start);
  const to = Math.min(totalBytes, start + length);
  if (to <= from) return;
  const first = Math.max(0, Math.floor((from / totalBytes) * bins.length));
  const last = Math.min(bins.length - 1, Math.ceil((to / totalBytes) * bins.length) - 1);
  for (let i = first; i <= last; i++) {
    const binStart = (i / bins.length) * totalBytes;
    const binEnd = ((i + 1) / bins.length) * totalBytes;
    const overlap = Math.max(0, Math.min(to, binEnd) - Math.max(from, binStart));
    if (overlap <= 0) continue;
    bins[i] = Math.min(1, bins[i]! + overlap / (binEnd - binStart));
  }
}

export function estimateTransferProgress(
  sourceBlocks: number,
  uniqueFrames: number,
  elapsedSeconds: number,
  solvedBlocks = 0,
): TransferProgressEstimate {
  const minimumFrames = Math.max(1, sourceBlocks);
  const expectedFrames = Math.max(
    minimumFrames + 1,
    Math.ceil(minimumFrames * expectedFountainOverhead(minimumFrames)),
  );
  const expectedRedundancy = expectedFrames - minimumFrames;

  // Frames drive a continuously moving baseline: 0–86% while collecting the
  // theoretical minimum, 86–96% through the expected redundancy, then an
  // asymptotic 96–99% if this particular stream needs more. Actual decoded
  // blocks can move the bar further ahead at any time.
  let frameFraction: number;
  if (uniqueFrames < minimumFrames) {
    frameFraction = 0.86 * (uniqueFrames / minimumFrames);
  } else if (uniqueFrames <= expectedFrames) {
    frameFraction =
      0.86 + 0.1 * ((uniqueFrames - minimumFrames) / expectedRedundancy);
  } else {
    const extra = (uniqueFrames - expectedFrames) / expectedRedundancy;
    frameFraction = 0.96 + 0.03 * (1 - Math.exp(-extra));
  }
  // Frames PROMISE; blocks DELIVER. Under loss the carousel's repair half
  // parks arriving frames as pending without solving anything, so a frames-
  // only bar runs to "almost done" with half the blocks outstanding (a
  // 22%-catch 4-code field run showed 96% at 45% solved, then "finished
  // early"). Once blocks are being solved, the frame baseline may lead them
  // by at most 12% of the stream — enough to keep the bar moving through a
  // repair half, never enough to lie. Solved blocks can always advance the
  // bar on their own (below), and the final peeling cascade closes the gap
  // at completion. With solvedBlocks still 0 the baseline stays uncapped:
  // the stream simply hasn't started delivering, and early sweep frames
  // solve on arrival anyway.
  if (solvedBlocks > 0) {
    const lead = 0.12 * minimumFrames;
    frameFraction = Math.min(
      frameFraction,
      0.86 * Math.min(1, (solvedBlocks + lead) / minimumFrames),
    );
  }
  const decodedFraction = 0.99 * Math.min(1, solvedBlocks / minimumFrames);
  const fraction = Math.min(0.99, Math.max(frameFraction, decodedFraction));
  const phase = uniqueFrames < minimumFrames ? "collecting" : "decoding";
  const rate = elapsedSeconds > 0 ? uniqueFrames / elapsedSeconds : 0;

  // Past the expected frame count the stream is running long — poor light,
  // motion blur, a camera that won't hold focus. That is exactly when someone
  // is staring at the bar wondering whether it has stalled, so keep quoting a
  // time instead of going silent: extend the target a tenth of the stream at
  // a time. (The v2 carousel's nominal redundancy is only 2%, which as a step
  // size would quote a perpetual "about 1s" — a floor keeps the steps honest.)
  const overshoot = uniqueFrames - expectedFrames;
  const step = Math.max(expectedRedundancy, Math.ceil(minimumFrames / 10));
  const target =
    overshoot < 0
      ? expectedFrames
      : expectedFrames + step * (Math.floor(overshoot / step) + 1);
  const etaSeconds =
    uniqueFrames >= 3 && elapsedSeconds >= 1 && rate > 0
      ? (target - uniqueFrames) / rate
      : undefined;
  return { fraction, expectedFrames, etaSeconds, phase };
}

export function formatDuration(seconds: number): string {
  const rounded = Math.max(1, Math.ceil(seconds));
  if (rounded < 60) return `${rounded}s`;
  const minutes = Math.floor(rounded / 60);
  const remainder = rounded % 60;
  if (minutes < 60) return remainder === 0 ? `${minutes}m` : `${minutes}m ${remainder}s`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes === 0 ? `${hours}h` : `${hours}h ${remainingMinutes}m`;
}
