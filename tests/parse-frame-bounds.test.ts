import assert from "node:assert/strict";
import { test } from "node:test";
import {
  type FrameHeader,
  HEADER_LEN,
  MAX_TOTAL_LEN,
  packFrame,
  parseFrame,
} from "../shared/protocol.ts";

function frame(
  overrides: Partial<FrameHeader> & Pick<FrameHeader, "k" | "blockLen" | "totalLen">,
): Uint8Array {
  const header: FrameHeader = {
    sessionId: 1,
    seq: 0,
    payloadFnv: 0,
    ...overrides,
  };
  return packFrame(header, new Uint8Array(header.blockLen));
}

test("parseFrame accepts a consistent single-block transfer", () => {
  const bytes = frame({ k: 1, blockLen: 1000, totalLen: 800 });
  const parsed = parseFrame(bytes);
  assert.ok(parsed);
  assert.equal(parsed!.header.totalLen, 800);
  assert.equal(parsed!.block.length, 1000);
});

test("parseFrame accepts a full last block (totalLen === k * blockLen)", () => {
  assert.ok(parseFrame(frame({ k: 3, blockLen: 100, totalLen: 300 })));
});

test("parseFrame accepts a short last block", () => {
  assert.ok(parseFrame(frame({ k: 3, blockLen: 100, totalLen: 201 })));
});

test("parseFrame rejects the issue #1 DoS header (k=1, totalLen=0xFFFFFFFF)", () => {
  assert.equal(parseFrame(frame({ k: 1, blockLen: 1000, totalLen: 0xffffffff })), null);
});

test("parseFrame rejects totalLen that would need fewer blocks", () => {
  assert.equal(parseFrame(frame({ k: 3, blockLen: 100, totalLen: 200 })), null);
});

test("parseFrame rejects totalLen above k * blockLen", () => {
  assert.equal(parseFrame(frame({ k: 2, blockLen: 100, totalLen: 201 })), null);
});

test("parseFrame rejects totalLen above MAX_TOTAL_LEN even if consistent", () => {
  const blockLen = 4096;
  const totalLen = MAX_TOTAL_LEN + 1;
  const k = Math.ceil(totalLen / blockLen);
  assert.ok(k <= 0xffff, "test k must fit in u16");
  assert.ok(k * blockLen >= totalLen);
  assert.ok(totalLen > (k - 1) * blockLen);
  assert.equal(parseFrame(frame({ k, blockLen, totalLen })), null);
});

test("parseFrame round-trips a legitimate packed frame", () => {
  const payload = new Uint8Array(64).fill(7);
  const header: FrameHeader = {
    sessionId: 0xabcd,
    seq: 42,
    k: 1,
    blockLen: payload.length,
    totalLen: payload.length,
    payloadFnv: 0x12345678,
  };
  const bytes = packFrame(header, payload);
  assert.equal(bytes.length, HEADER_LEN + payload.length);
  const parsed = parseFrame(bytes);
  assert.ok(parsed);
  assert.deepEqual({ ...parsed!.header }, header);
  assert.deepEqual([...parsed!.block], [...payload]);
});
