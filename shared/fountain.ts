// Systematic-carousel fountain code (wire format v2) — the trick that makes
// a one-way optical channel practical.
//
// The sender emits an endless carousel: a systematic sweep of all K blocks,
// then K mid-degree repair frames (XORs of pseudorandom block subsets derived
// deterministically from `seq`), then the next cycle. A receiver locking on
// anywhere rebuilds the file from ~K distinct frames at low loss — zero
// fountain overhead — and repair frames patch what loss takes, in any order:
// a dropped frame costs a little time, never correctness. No back-channel,
// no retransmission, and sender and receiver frame rates don't need to match.
//
// Determinism warning that cost a debugging session: sender and receiver
// must build bit-identical degree distributions, but JavaScript's Math.log
// is implementation-approximated — V8 (sender) and JavaScriptCore (iPhone
// receiver) may differ by an ulp and silently desynchronize the streams.
// dlog() below uses only exactly-specified IEEE-754 ops.

import { splitmix32 } from "./protocol";

const LN2 = 0.6931471805599453;

/**
 * Deterministic natural log: exact-ops range reduction + atanh series.
 *
 * Exported only so tests can pin it. This is wire format, not a utility: it
 * differs from `Math.log` by up to 1 ulp on roughly a quarter of the inputs
 * solitonCdf() feeds it, which is enough to shift a CDF entry and flip a
 * sampled degree. Swapping it for `Math.log` would desync any sender and
 * receiver that don't share a JS engine. See tests/fountain.test.ts.
 */
export function dlog(x: number): number {
  let e = 0;
  let m = x;
  while (m >= 1.5) {
    m /= 2;
    e++;
  }
  while (m < 0.75) {
    m *= 2;
    e--;
  }
  const z = (m - 1) / (m + 1);
  const z2 = z * z;
  let term = z;
  let sum = 0;
  for (let n = 1; n <= 21; n += 2) {
    sum += term / n;
    term *= z2;
  }
  return e * LN2 + 2 * sum;
}

const SOLITON_C = 0.1;
const SOLITON_DELTA = 0.5;

/** Robust-soliton degree CDF for k source blocks. Exported for the same
 *  wire-format pinning reason as dlog() and frameIndices(). */
export function solitonCdf(k: number): Float64Array {
  const cdf = new Float64Array(k);
  if (k === 1) {
    cdf[0] = 1;
    return cdf;
  }
  const R = Math.max(1, SOLITON_C * dlog(k / SOLITON_DELTA) * Math.sqrt(k));
  const spike = Math.min(k, Math.ceil(k / R));
  let total = 0;
  for (let d = 1; d <= k; d++) {
    const rho = d === 1 ? 1 / k : 1 / (d * (d - 1));
    let tau = 0;
    if (d < spike) tau = R / (d * k);
    else if (d === spike) tau = (R * Math.max(0, dlog(R / SOLITON_DELTA))) / k;
    total += rho + tau;
    cdf[d - 1] = total;
  }
  for (let i = 0; i < k; i++) cdf[i] = cdf[i]! / total;
  cdf[k - 1] = 1;
  return cdf;
}

function frameSeed(sessionId: number, seq: number): number {
  let h = (Math.imul(sessionId + 1, 0x9e3779b1) ^ (seq + 0x85ebca6b)) | 0;
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return (h ^ (h >>> 16)) | 0;
}

/**
 * The block indices XORed into frame `seq` — identical on both ends.
 *
 * Exported for the golden-vector tests. Sender and receiver derive this
 * independently and never compare notes, so any change here is a breaking
 * wire-format change: a `decimen-sender.html` someone saved months ago has to
 * keep agreeing with a current receiver.
 */
export function frameIndices(
  k: number,
  cdf: Float64Array,
  sessionId: number,
  seq: number,
): number[] {
  const rnd = splitmix32(frameSeed(sessionId, seq));
  // inverse-CDF sample the degree
  const u = rnd() * 2 ** -32;
  let lo = 0;
  let hi = k - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (cdf[mid]! >= u) hi = mid;
    else lo = mid + 1;
  }
  const d = Math.min(k, lo + 1);
  if (d > k >> 3) {
    // large degree: partial Fisher–Yates over an identity array
    const scratch = new Uint32Array(k);
    for (let i = 0; i < k; i++) scratch[i] = i;
    const out: number[] = new Array<number>(d);
    for (let i = 0; i < d; i++) {
      const j = i + (rnd() % (k - i));
      const t = scratch[i]!;
      scratch[i] = scratch[j]!;
      scratch[j] = t;
      out[i] = scratch[i]!;
    }
    return out;
  }
  const set = new Set<number>();
  while (set.size < d) set.add(rnd() % k);
  return [...set];
}

/** Frames per carousel cycle: one systematic sweep of all k blocks, then k
 *  repair frames for whatever the sweep dropped. */
export function cycleLength(k: number): number {
  return 2 * k;
}

const REPAIR_DEGREE_MIN = 4;
const REPAIR_DEGREE_MAX = 24;

/**
 * Repair frames are uniform mid-degree (4–24), NOT robust-soliton. After a
 * sweep the receiver holds most blocks, so a repair frame's effective degree
 * is what remains after XORing the solved ones out — soliton's heavy degree-
 * 1/2 mass just re-sends blocks the sweep already delivered. Measured worst
 * wall-clock (seqs/k, k=179, 20 trials) against sweep + k/2 soliton:
 *
 *     drop            0%    5%    10%   30%   50%
 *     k/2 soliton    1.00  2.31  2.60  3.71  5.40
 *     k uniform4-24  1.00  1.37  1.59  2.11  3.06   ← plain LT: 1.14 at 0%
 */
function repairIndices(k: number, sessionId: number, seq: number): number[] {
  const rnd = splitmix32(frameSeed(sessionId, seq));
  const d = Math.min(k, REPAIR_DEGREE_MIN + (rnd() % (REPAIR_DEGREE_MAX - REPAIR_DEGREE_MIN + 1)));
  const set = new Set<number>();
  while (set.size < d) set.add(rnd() % k);
  return [...set];
}

/**
 * Block subset for frame `seq`: systematic during the sweep, mid-degree
 * repair after. There is no handshake, and none is needed — the carousel
 * repeats forever, so a receiver locking on anywhere in the cycle takes
 * systematic frames whenever their block is still unsolved, and repair
 * frames from ANY cycle patch the sweep's losses. At low loss a receiver
 * that catches a whole sweep completes in exactly k frames — zero fountain
 * overhead.
 *
 * Repair frames seed from the ABSOLUTE seq, so every cycle's repair frames
 * draw different subsets — re-watching the carousel never replays them.
 *
 * This carousel arrived with wire v2 and is unchanged in v3 — that break
 * moved header bytes, not the fountain (see protocol.ts). The v1 soliton
 * stream (frameIndices, solitonCdf, dlog) is kept above, pinned by its golden
 * vectors, in case a future format wants it back — it is no longer emitted.
 */
export function frameComposition(k: number, sessionId: number, seq: number): number[] {
  const pos = seq % cycleLength(k);
  return pos < k ? [pos] : repairIndices(k, sessionId, seq);
}

function xorInto(dst: Uint32Array, src: Uint32Array): void {
  for (let i = 0; i < dst.length; i++) dst[i] = (dst[i]! ^ src[i]!) >>> 0;
}

export class LTEncoder {
  readonly k: number;
  private readonly words: number;
  private readonly blocks: Uint32Array;

  constructor(
    payload: Uint8Array,
    readonly blockLen: number,
    readonly sessionId: number,
  ) {
    this.k = Math.max(1, Math.ceil(payload.length / blockLen));
    this.words = Math.ceil(blockLen / 4);
    this.blocks = new Uint32Array(this.k * this.words);
    const bytes = new Uint8Array(this.blocks.buffer);
    for (let b = 0; b < this.k; b++) {
      const src = payload.subarray(b * blockLen, Math.min((b + 1) * blockLen, payload.length));
      bytes.set(src, b * this.words * 4);
    }
  }

  encode(seq: number): Uint8Array {
    const idx = frameComposition(this.k, this.sessionId, seq);
    const out = new Uint32Array(this.words);
    for (const b of idx) {
      const off = b * this.words;
      for (let w = 0; w < this.words; w++) out[w] = (out[w]! ^ this.blocks[off + w]!) >>> 0;
    }
    return new Uint8Array(out.buffer, 0, this.blockLen);
  }
}

interface PendingFrame {
  idx: Set<number>;
  words: Uint32Array;
}

export type SolvedBlockHandler = (index: number, bytes: Uint8Array) => void;

export class LTDecoder {
  private readonly words: number;
  private readonly solved: (Uint32Array | null)[];
  private readonly byBlock = new Map<number, Set<PendingFrame>>();
  private readonly seen = new Set<number>();
  solvedCount = 0;
  framesNew = 0;
  framesDup = 0;
  /** Frames with a NEW seq that carried no new information — every block
   *  they cover was already solved. Rare at high catch rates, but a lossy
   *  multi-code receiver sees the carousel re-sweep blocks it has, and a
   *  progress bar fed raw framesNew inflates by exactly that fraction
   *  (measured 96% shown vs ~50% real on a 30%-catch 4-code run). */
  framesRedundant = 0;

  constructor(
    readonly k: number,
    readonly blockLen: number,
    readonly sessionId: number,
    readonly totalLen: number,
    private readonly onSolvedBlock?: SolvedBlockHandler,
  ) {
    this.words = Math.ceil(blockLen / 4);
    this.solved = new Array<Uint32Array | null>(k).fill(null);
  }

  get isComplete(): boolean {
    return this.solvedCount >= this.k;
  }

  addFrame(seq: number, block: Uint8Array): void {
    if (this.seen.has(seq)) {
      this.framesDup++;
      return;
    }
    this.seen.add(seq);
    this.framesNew++;
    if (this.isComplete) return;

    const idx = new Set(frameComposition(this.k, this.sessionId, seq));
    const words = new Uint32Array(this.words);
    new Uint8Array(words.buffer).set(block.subarray(0, this.blockLen));
    for (const b of [...idx]) {
      const solved = this.solved[b];
      if (solved) {
        xorInto(words, solved);
        idx.delete(b);
      }
    }
    if (idx.size === 0) {
      this.framesRedundant++;
      return;
    }
    if (idx.size === 1) {
      this.resolve(idx.values().next().value!, words);
      return;
    }
    const pf: PendingFrame = { idx, words };
    for (const b of idx) {
      let set = this.byBlock.get(b);
      if (!set) {
        set = new Set();
        this.byBlock.set(b, set);
      }
      set.add(pf);
    }
  }

  /** Peeling cascade: solve a block, reduce every frame waiting on it, repeat.
   * Note for progress UX: this cascade back-loads — blocks solved hockey-
   * sticks near the end while frame ARRIVAL is linear. Show frames collected,
   * not blocks solved, or your progress bar will look stalled then teleport. */
  private resolve(b0: number, w0: Uint32Array): void {
    const queue: [number, Uint32Array][] = [[b0, w0]];
    while (queue.length > 0) {
      const [b, w] = queue.pop()!;
      if (this.solved[b]) continue;
      this.solved[b] = w;
      this.solvedCount++;
      const len = Math.min(this.blockLen, this.totalLen - b * this.blockLen);
      this.onSolvedBlock?.(b, new Uint8Array(w.buffer, 0, len));
      const waiting = this.byBlock.get(b);
      if (!waiting) continue;
      this.byBlock.delete(b);
      for (const pf of waiting) {
        xorInto(pf.words, w);
        pf.idx.delete(b);
        if (pf.idx.size === 1) {
          const r = pf.idx.values().next().value!;
          this.byBlock.get(r)?.delete(pf);
          if (!this.solved[r]) queue.push([r, pf.words]);
        }
      }
    }
  }

  assemble(): Uint8Array | null {
    if (!this.isComplete) return null;
    const out = new Uint8Array(this.totalLen);
    for (let b = 0; b < this.k; b++) {
      const start = b * this.blockLen;
      const len = Math.min(this.blockLen, this.totalLen - start);
      if (len > 0) out.set(new Uint8Array(this.solved[b]!.buffer, 0, len), start);
    }
    return out;
  }
}
