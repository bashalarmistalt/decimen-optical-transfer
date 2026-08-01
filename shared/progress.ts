export interface TransferProgressEstimate {
  fraction: number;
  etaSeconds?: number;
  finishing: boolean;
}

export function estimateTransferProgress(
  sourceBlocks: number,
  uniqueFrames: number,
  elapsedSeconds: number,
  overhead: number,
): TransferProgressEstimate {
  const targetFrames = Math.max(sourceBlocks, Math.ceil(sourceBlocks * overhead));
  const finishing = uniqueFrames >= targetFrames;
  const fraction = finishing ? 0.99 : Math.min(0.99, uniqueFrames / targetFrames);
  const rate = elapsedSeconds > 0 ? uniqueFrames / elapsedSeconds : 0;
  const etaSeconds =
    uniqueFrames >= 3 && elapsedSeconds >= 1 && rate > 0 && !finishing
      ? (targetFrames - uniqueFrames) / rate
      : undefined;
  return { fraction, etaSeconds, finishing };
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
