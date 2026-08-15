import assert from "node:assert/strict";
import test from "node:test";
import { colorAuxSequence } from "../shared/color-sequence.ts";
import { LTDecoder, LTEncoder } from "../shared/fountain.ts";

function payloadOf(length: number): Uint8Array {
  return Uint8Array.from({ length }, (_, i) => (i * 43 + 11) & 0xff);
}

test("the primary plane remains a complete consecutive fountain stream", () => {
  for (const k of [1, 5, 64, 179]) {
    const payload = payloadOf(k * 8 - 3);
    const encoder = new LTEncoder(payload, 8, 37);
    const decoder = new LTDecoder(encoder.k, 8, 37, payload.length);
    for (let seq = 0; seq < encoder.k; seq++) decoder.addFrame(seq, encoder.encode(seq));
    assert.deepEqual(decoder.assemble(), payload, `primary-only k=${k}`);
  }
});

test("both planes cover a systematic sweep in half as many images", () => {
  for (const k of [2, 5, 64, 179, 716]) {
    const payload = payloadOf(k * 8 - 3);
    const encoder = new LTEncoder(payload, 8, 91);
    const decoder = new LTDecoder(encoder.k, 8, 91, payload.length);
    const images = Math.ceil(encoder.k / 2);
    const auxiliaryIds = new Set<number>();
    for (let primarySeq = 0; primarySeq < images; primarySeq++) {
      const auxiliarySeq = colorAuxSequence(primarySeq, encoder.k);
      assert.ok(auxiliarySeq >= 0x7fff0000, "auxiliary IDs stay outside real transfer lengths");
      assert.equal(auxiliaryIds.has(auxiliarySeq), false);
      auxiliaryIds.add(auxiliarySeq);
      decoder.addFrame(primarySeq, encoder.encode(primarySeq));
      decoder.addFrame(auxiliarySeq, encoder.encode(auxiliarySeq));
    }
    assert.deepEqual(decoder.assemble(), payload, `layered k=${k}`);
  }
});

test("invalid color sequence inputs fail closed", () => {
  assert.throws(() => colorAuxSequence(-1, 4));
  assert.throws(() => colorAuxSequence(0, 0));
  assert.throws(() => colorAuxSequence(0.5, 4));
});
