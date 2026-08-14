/**
 * Choose an auxiliary fountain sequence without disturbing the primary stream.
 *
 * Primary frames keep 0, 1, 2... exactly: that is the backward-compatibility
 * contract. During each k-frame window, auxiliary frames first cover the
 * complementary half of the systematic sweep, then use repair positions. A
 * high cycle-aligned base keeps the auxiliary IDs distinct while preserving
 * those frameComposition positions modulo 2k.
 */
export function colorAuxSequence(primarySeq: number, k: number): number {
  if (!Number.isSafeInteger(primarySeq) || primarySeq < 0 || !Number.isInteger(k) || k < 1) {
    throw new Error("invalid color sequence input");
  }
  const cycle = 2 * k;
  const highBase = Math.floor(0x80000000 / cycle) * cycle;
  const round = Math.floor(primarySeq / k);
  const local = primarySeq % k;
  const remainingSystematic = Math.floor(k / 2);
  const split = Math.ceil(k / 2);
  const position =
    local < remainingSystematic
      ? split + local
      : k + (local - remainingSystematic);
  return (highBase + round * cycle + position) >>> 0;
}
