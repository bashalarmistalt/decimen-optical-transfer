// fountain.ts IS the wire format. Sender and receiver derive every frame's
// block subset independently and never compare notes, so a change to
// frameComposition(), frameSeed() or splitmix32() breaks compatibility
// silently — the transfer just never completes. (dlog, solitonCdf and
// frameIndices are the v1 soliton stream, no longer emitted since the v2
// carousel, but still pinned below: the vectors were expensive to derive
// and a future format may want the machinery back.) That matters
// more here than in most projects: standalone sender/receiver HTML files are
// attached to releases, and people keep them and re-use them months later.
//
// So these are golden vectors, not behavioural tests. If one fails you have
// changed the wire format. That may be fine — but it is a breaking change and
// needs a version bump on the frame header, not a re-recorded constant.

import assert from "node:assert/strict";
import test from "node:test";
import {
  LTDecoder,
  LTEncoder,
  cycleLength,
  dlog,
  frameComposition,
  frameIndices,
  solitonCdf,
} from "../shared/fountain.ts";
import { fnv1a, splitmix32 } from "../shared/protocol.ts";

// ---------------------------------------------------------------- dlog

test("dlog is bit-exact against its recorded values", () => {
  const golden: [number, number][] = [
    [1, 0],
    [1.5, 0.4054651081081644],
    [2, 0.6931471805599453],
    [2.718281828459045, 1],
    [10, 2.3025850929940455],
    [20, 2.995732273553991],
    [200, 5.298317366548036],
    [2000, 7.600902459542082],
    [2986, 8.001689978099137],
    [44000, 10.691944912900398],
    [131070, 11.78348681061359],
  ];
  for (const [x, expected] of golden) {
    assert.equal(dlog(x), expected, `dlog(${x}) drifted`);
  }
});

test("dlog is bit-exact across every input the degree distribution can reach", () => {
  // The eleven spot values above are readable but sparse: shortening dlog's
  // series from 21 terms to 19 changes only 0.2% of its outputs, which a
  // handful of samples will miss. solitonCdf() only ever calls dlog(k/DELTA)
  // and dlog(R/DELTA), so sweep both domains exhaustively — k is a u16 on the
  // wire, and R stays under a few dozen.
  const values = new Float64Array(65535 + 64 * 4096);
  let n = 0;
  for (let k = 1; k <= 65535; k++) values[n++] = dlog(2 * k);
  for (let i = 64; i < 64 * 4096; i++) values[n++] = dlog(i / 64);
  const digest = fnv1a(new Uint8Array(values.buffer, 0, n * 8));
  assert.equal(`0x${digest.toString(16).padStart(8, "0")}`, "0x27b0f3cc", "dlog changed");
});

test("dlog is accurate to within an ulp of Math.log but is NOT interchangeable with it", () => {
  // The whole reason dlog() exists: Math.log is implementation-approximated, so
  // V8 (a laptop sender) and JavaScriptCore (an iPhone receiver) may disagree
  // by an ulp. That is enough to move a CDF entry and flip a sampled degree.
  // This test fails if someone "simplifies" dlog() into Math.log.
  let differing = 0;
  let worstUlp = 0;
  let samples = 0;
  for (let k = 2; k <= 20000; k++) {
    for (const x of [k, k / 0.5]) {
      samples++;
      const ours = dlog(x);
      const native = Math.log(x);
      if (ours !== native) differing++;
      worstUlp = Math.max(worstUlp, Math.abs(ours - native) / (Math.abs(native) * Number.EPSILON));
    }
  }
  assert.ok(worstUlp <= 2, `dlog drifted ${worstUlp.toFixed(2)} ulp from Math.log`);
  assert.ok(differing > 0, "dlog now matches Math.log bit-for-bit — did it become Math.log?");
});

// ------------------------------------------------------- degree sampling

test("the soliton CDF is a well-formed distribution", () => {
  for (const k of [1, 2, 17, 179, 716, 22000]) {
    const cdf = solitonCdf(k);
    assert.equal(cdf.length, k);
    assert.equal(cdf[k - 1], 1, `k=${k} CDF must terminate at exactly 1`);
    for (let i = 1; i < k; i++) {
      assert.ok(cdf[i]! >= cdf[i - 1]!, `k=${k} CDF is not monotonic at ${i}`);
    }
    assert.ok(cdf[0]! > 0, `k=${k} degree 1 must have non-zero mass or peeling never starts`);
  }
});

test("the soliton CDF is bit-identical to its recorded fingerprint", () => {
  // Sampling cannot guard this. A one-ulp shift in SOLITON_C, SOLITON_DELTA or
  // dlog() moves a CDF boundary by ~1e-16, so the odds of any finite number of
  // sampled degrees landing in the gap are nil — yet a sender and receiver that
  // disagree there WILL eventually hit it and desync mid-transfer. The only
  // honest check is to hash the distribution itself.
  //
  // (Hashes the Float64Array's raw bytes, so it is little-endian-specific.
  // Every target this runs on is little-endian; a big-endian CI box would need
  // its own vectors, which is a problem worth having.)
  const golden: [number, string][] = [
    [1, "0x8c6a9878"],
    [2, "0x2417b297"],
    [17, "0x2ba41e3c"],
    [179, "0xe8b6340a"],
    [716, "0x28d31438"],
    [5000, "0x357a4c9a"],
    [22000, "0xfc512a92"],
  ];
  for (const [k, expected] of golden) {
    const cdf = solitonCdf(k);
    const digest = fnv1a(new Uint8Array(cdf.buffer, cdf.byteOffset, cdf.byteLength));
    assert.equal(
      `0x${digest.toString(16).padStart(8, "0")}`,
      expected,
      `k=${k} degree distribution changed — senders and receivers will desync`,
    );
  }
});

test("frameIndices matches its recorded subsets", () => {
  const golden: Record<number, number[][]> = {
    1: [[0], [0], [0], [0], [0]],
    2: [[1], [1], [1], [0], [1]],
    17: [[3, 14], [12, 0], [6, 8], [15, 16, 13], [11, 2, 16]],
    179: [[27, 39], [30, 55], [155, 125], [28, 132, 88], [39, 75, 24]],
    716: [[27, 397], [567, 592], [155, 304], [386, 311, 625], [39, 433, 382]],
  };
  const seqs = [0, 1, 2, 41, 1000];
  for (const [rawK, expected] of Object.entries(golden)) {
    const k = Number(rawK);
    const cdf = solitonCdf(k);
    seqs.forEach((seq, i) => {
      assert.deepEqual(
        frameIndices(k, cdf, 4242, seq),
        expected[i],
        `k=${k} seq=${seq} subset changed — this is a breaking wire-format change`,
      );
    });
  }
});

test("frameIndices always yields distinct in-range blocks", () => {
  for (const k of [1, 2, 17, 179, 4096]) {
    const cdf = solitonCdf(k);
    for (let seq = 0; seq < 3000; seq++) {
      const idx = frameIndices(k, cdf, 9, seq);
      assert.ok(idx.length >= 1 && idx.length <= k, `k=${k} seq=${seq} degree ${idx.length}`);
      assert.equal(new Set(idx).size, idx.length, `k=${k} seq=${seq} repeated a block index`);
      for (const b of idx) {
        assert.ok(Number.isInteger(b) && b >= 0 && b < k, `k=${k} seq=${seq} index ${b}`);
      }
    }
  }
});

test("the same seq on a different session picks a different subset", () => {
  // frameSeed() mixes both, so restarting the sender genuinely reshuffles the
  // stream rather than replaying the previous session's frames.
  const cdf = solitonCdf(179);
  const a = frameIndices(179, cdf, 1, 0);
  const b = frameIndices(179, cdf, 2, 0);
  assert.notDeepEqual(a, b);
});

// --------------------------------------------------- full encoder stream

/** Deterministic filler — the fingerprints below are recorded against it. */
function testPayload(byteLength: number): Uint8Array {
  const payload = new Uint8Array(byteLength);
  for (let i = 0; i < byteLength; i++) payload[i] = (i * 37 + (i >> 8) * 11) & 0xff;
  return payload;
}

test("the encoded stream is byte-identical to its recorded fingerprint", () => {
  // The end-to-end pin: covers dlog, solitonCdf, frameSeed, splitmix32,
  // frameIndices, the block padding and the XOR order in one hash.
  // Re-recorded for wire format v2 (systematic carousel, header magic 0x0D).
  // The k=179 and k=716 hashes cover only the sweep (64 frames < k); k=23
  // covers a full sweep plus repair frames.
  const golden: [number, number, number, string][] = [
    [1, 64, 1, "k=1 fnv=0xf6a115c5"],
    [23, 64, 7, "k=23 fnv=0x4a5d3eaa"],
    [179, 2933, 4242, "k=179 fnv=0x54f78d05"],
    [716, 1445, 65535, "k=716 fnv=0x75b73b85"],
  ];
  for (const [k, blockLen, sessionId, expected] of golden) {
    const encoder = new LTEncoder(testPayload(k * blockLen - 7), blockLen, sessionId);
    const stream = new Uint8Array(64 * blockLen);
    for (let seq = 0; seq < 64; seq++) stream.set(encoder.encode(seq), seq * blockLen);
    const actual = `k=${encoder.k} fnv=0x${fnv1a(stream).toString(16).padStart(8, "0")}`;
    assert.equal(actual, expected, `stream for k=${k}/${blockLen}/${sessionId} changed`);
  }
});

test("every frame is exactly blockLen bytes", () => {
  // The sender pins the QR version off the first frame, so a short tail frame
  // would silently produce an undecodable code for the rest of the transfer.
  const blockLen = 1445;
  const encoder = new LTEncoder(testPayload(blockLen * 5 + 1), blockLen, 3);
  assert.equal(encoder.k, 6);
  for (let seq = 0; seq < 200; seq++) assert.equal(encoder.encode(seq).length, blockLen);
});

// ------------------------------------------------------------ round trip

interface RoundTrip {
  frames: number;
  overhead: number;
  /** Seqs the sender had to emit per source block, loss included. */
  wallClock: number;
  recovered: Uint8Array | null;
}

/** Feed frames until the decoder completes, dropping `dropRate` of them. */
function roundTrip(byteLength: number, blockLen: number, sessionId: number, dropRate = 0): RoundTrip {
  const payload = testPayload(byteLength);
  const encoder = new LTEncoder(payload, blockLen, sessionId);
  const decoder = new LTDecoder(encoder.k, blockLen, sessionId, byteLength);
  const rnd = splitmix32(sessionId);
  let seq = 0;
  const ceiling = encoder.k * 80 + 5000;
  while (!decoder.isComplete && seq < ceiling) {
    if (rnd() * 2 ** -32 >= dropRate) decoder.addFrame(seq, encoder.encode(seq));
    seq++;
  }
  return {
    frames: decoder.framesNew,
    overhead: decoder.framesNew / encoder.k,
    wallClock: seq / encoder.k,
    recovered: decoder.assemble(),
  };
}

test("a re-swept block the receiver already solved counts as redundant, not progress", () => {
  // The progress bar runs on framesNew − framesRedundant: on a lossy stream
  // the carousel re-sweeps solved blocks under fresh seqs, and counting those
  // as progress showed 96% with half the blocks outstanding.
  const blockLen = 64;
  const payload = testPayload(23 * blockLen - 7);
  const encoder = new LTEncoder(payload, blockLen, 77);
  const decoder = new LTDecoder(encoder.k, blockLen, 77, payload.length);

  decoder.addFrame(0, encoder.encode(0));
  assert.equal(decoder.solvedCount, 1);
  assert.equal(decoder.framesRedundant, 0);

  // Same block, next cycle: a NEW seq carrying nothing the receiver lacks.
  const nextCycle = cycleLength(encoder.k);
  decoder.addFrame(nextCycle, encoder.encode(nextCycle));
  assert.equal(decoder.framesNew, 2, "a fresh seq is still a new frame");
  assert.equal(decoder.framesDup, 0);
  assert.equal(decoder.framesRedundant, 1);
  assert.equal(decoder.solvedCount, 1);

  // An unsolved block's sweep frame is information, never redundant.
  decoder.addFrame(1, encoder.encode(1));
  assert.equal(decoder.framesRedundant, 1);
  assert.equal(decoder.solvedCount, 2);
});

test("a payload survives the fountain exactly", () => {
  for (const [byteLength, blockLen] of [
    [7, 2933],
    [2933, 2933],
    [50_000, 1445],
    [512 * 1024, 2933],
    [2 * 1024 * 1024, 2933],
  ] as const) {
    const { recovered } = roundTrip(byteLength, blockLen, 11);
    assert.ok(recovered, `${byteLength}B did not complete`);
    assert.deepEqual(recovered, testPayload(byteLength));
  }
});

test("dropping 30% of frames costs time, never correctness", () => {
  const { recovered, overhead, wallClock } = roundTrip(512 * 1024, 2933, 23, 0.3);
  assert.ok(recovered);
  assert.deepEqual(recovered, testPayload(512 * 1024));
  // Carousel bounds, measured at k=179 over 20 trials (worst wall clock 2.11
  // seqs per block at 30% drop) with margin. Unlike v1, framesNew can include
  // re-swept blocks the receiver already solved, so it is bounded looser.
  assert.ok(wallClock < 2.8, `wall clock ${wallClock.toFixed(2)} seqs/block is too high`);
  assert.ok(overhead < 1.8, `unique-frame overhead ${overhead.toFixed(2)} is too high`);
});

test("a receiver that catches one clean sweep pays zero fountain overhead", () => {
  const byteLength = 200_000;
  const blockLen = 1445;
  const payload = testPayload(byteLength);
  const encoder = new LTEncoder(payload, blockLen, 55);
  const decoder = new LTDecoder(encoder.k, blockLen, 55, byteLength);
  for (let seq = 0; seq < encoder.k; seq++) decoder.addFrame(seq, encoder.encode(seq));
  assert.ok(decoder.isComplete, "one full sweep must complete the transfer");
  assert.equal(decoder.framesNew, encoder.k);
  assert.deepEqual(decoder.assemble(), payload);
});

test("the carousel composition is systematic in the sweep, mid-degree after", () => {
  for (const k of [1, 17, 179, 4096]) {
    assert.equal(cycleLength(k), 2 * k);
    for (const pos of new Set([0, k >> 1, k - 1])) {
      assert.deepEqual(frameComposition(k, 9, pos), [pos], `k=${k} sweep pos=${pos}`);
      // The sweep restarts every cycle, at any cycle number.
      assert.deepEqual(frameComposition(k, 9, pos + 6 * cycleLength(k)), [pos]);
    }
    for (const seq of [k, k + 1, 2 * k - 1]) {
      const idx = frameComposition(k, 9, seq);
      assert.ok(idx.length >= Math.min(k, 4) && idx.length <= Math.min(k, 24), `k=${k} seq=${seq} degree ${idx.length}`);
      assert.equal(new Set(idx).size, idx.length);
      for (const b of idx) assert.ok(Number.isInteger(b) && b >= 0 && b < k);
    }
  }
});

test("a receiver joining mid-cycle completes without a handshake", () => {
  // The sender has been looping for a while; the receiver starts cold at an
  // arbitrary seq. Measured worst over 20 trials: 1.34 seqs per block.
  const byteLength = 512 * 1024;
  const blockLen = 2933;
  const payload = testPayload(byteLength);
  const encoder = new LTEncoder(payload, blockLen, 91);
  const decoder = new LTDecoder(encoder.k, blockLen, 91, byteLength);
  const start = Math.floor(encoder.k / 3);
  let seq = start;
  while (!decoder.isComplete && seq < start + encoder.k * 4) {
    decoder.addFrame(seq, encoder.encode(seq));
    seq++;
  }
  assert.ok(decoder.isComplete);
  assert.deepEqual(decoder.assemble(), payload);
  const wallClock = (seq - start) / encoder.k;
  assert.ok(wallClock < 1.7, `mid-join took ${wallClock.toFixed(2)} seqs/block`);
});

test("frames decode in any order", () => {
  const byteLength = 200_000;
  const blockLen = 1445;
  const payload = testPayload(byteLength);
  const encoder = new LTEncoder(payload, blockLen, 77);

  // Collect a comfortably sufficient batch, then feed it back to front.
  const captured: [number, Uint8Array][] = [];
  for (let seq = 0; seq < Math.ceil(encoder.k * 2.5); seq++) {
    captured.push([seq, encoder.encode(seq)]);
  }
  const shuffled = [...captured];
  const rnd = splitmix32(5);
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = rnd() % (i + 1);
    [shuffled[i], shuffled[j]] = [shuffled[j]!, shuffled[i]!];
  }

  const decoder = new LTDecoder(encoder.k, blockLen, 77, byteLength);
  for (const [seq, block] of shuffled) {
    decoder.addFrame(seq, block);
    if (decoder.isComplete) break;
  }
  assert.ok(decoder.isComplete);
  assert.deepEqual(decoder.assemble(), payload);
});

test("repeated frames are counted but never corrupt the decode", () => {
  const byteLength = 60_000;
  const blockLen = 1445;
  const payload = testPayload(byteLength);
  const encoder = new LTEncoder(payload, blockLen, 31);
  const decoder = new LTDecoder(encoder.k, blockLen, 31, byteLength);

  let seq = 0;
  while (!decoder.isComplete) {
    const block = encoder.encode(seq);
    decoder.addFrame(seq, block);
    decoder.addFrame(seq, block); // the camera re-reads the same on-screen frame
    seq++;
  }
  assert.ok(decoder.framesDup >= decoder.framesNew - 1);
  assert.deepEqual(decoder.assemble(), payload);
});

test("a single-block payload completes on its first frame", () => {
  const payload = testPayload(900);
  const encoder = new LTEncoder(payload, 2933, 5);
  assert.equal(encoder.k, 1);
  const decoder = new LTDecoder(1, 2933, 5, 900);
  decoder.addFrame(0, encoder.encode(0));
  assert.ok(decoder.isComplete);
  assert.deepEqual(decoder.assemble(), payload);
});

test("an incomplete decoder assembles nothing", () => {
  const encoder = new LTEncoder(testPayload(50_000), 1445, 13);
  const decoder = new LTDecoder(encoder.k, 1445, 13, 50_000);
  decoder.addFrame(0, encoder.encode(0));
  assert.equal(decoder.isComplete, false);
  assert.equal(decoder.assemble(), null);
});

test("a completed decoder stops solving — the receiver replaces it on resync", () => {
  // Pins the behavior the receiver's failed-verification path depends on:
  // LTDecoder is spent once complete, so the receiver must replace the
  // instance rather than feed it more frames.
  const blockLen = 64;
  const payload = testPayload(5 * blockLen - 7);
  const encoder = new LTEncoder(payload, blockLen, 9);
  const decoder = new LTDecoder(encoder.k, blockLen, 9, payload.length);
  for (let seq = 0; seq < encoder.k; seq++) decoder.addFrame(seq, encoder.encode(seq));
  assert.ok(decoder.isComplete);
  assert.equal(decoder.solvedCount, encoder.k);
  const framesNew = decoder.framesNew;

  // A further frame is counted as an arrival but changes nothing else: the
  // instance is spent. Re-swept blocks would never re-solve it.
  decoder.addFrame(encoder.k * 3 + 7, encoder.encode(encoder.k * 3 + 7));
  assert.equal(decoder.framesNew, framesNew + 1, "still counted as a new arrival");
  assert.equal(decoder.solvedCount, encoder.k, "no new solving");
  assert.deepEqual(decoder.assemble(), payload, "assembly is unaffected");
});
