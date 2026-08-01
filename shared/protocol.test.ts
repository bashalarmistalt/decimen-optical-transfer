import assert from "node:assert/strict";
import { test } from "node:test";
import {
  HEADER_LEN,
  MAX_TOTAL_LEN,
  packFrame,
  parseFrame,
  type FrameHeader,
} from "./protocol.ts";

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
  assert.equal(parsed.header.totalLen, 800);
  assert.equal(parsed.block.length, 1000);
});

test("parseFrame accepts a full last block (totalLen === k * blockLen)", () => {
  const bytes = frame({ k: 3, blockLen: 100, totalLen: 300 });
  assert.ok(parseFrame(bytes));
});

test("parseFrame accepts a short last block", () => {
  // 2 full blocks + 1 byte → k = 3, totalLen = 201
  const bytes = frame({ k: 3, blockLen: 100, totalLen: 201 });
  assert.ok(parseFrame(bytes));
});

test("parseFrame rejects the issue #1 DoS header (k=1, totalLen=0xFFFFFFFF)", () => {
  const bytes = frame({ k: 1, blockLen: 1000, totalLen: 0xffffffff });
  assert.equal(parseFrame(bytes), null);
});

test("parseFrame rejects totalLen that would need fewer blocks", () => {
  // Claims k=3 but totalLen fits in 2 blocks.
  const bytes = frame({ k: 3, blockLen: 100, totalLen: 200 });
  assert.equal(parseFrame(bytes), null);
});

test("parseFrame rejects totalLen above k * blockLen", () => {
  const bytes = frame({ k: 2, blockLen: 100, totalLen: 201 });
  assert.equal(parseFrame(bytes), null);
});

test("parseFrame rejects totalLen above MAX_TOTAL_LEN even if consistent", () => {
  const blockLen = 1024;
  const k = Math.ceil((MAX_TOTAL_LEN + 1) / blockLen);
  assert.ok(k * blockLen >= MAX_TOTAL_LEN + 1);
  assert.ok(k <= 0xffff, "test k must fit in u16");
  const bytes = frame({ k, blockLen, totalLen: MAX_TOTAL_LEN + 1 });
  assert.equal(parseFrame(bytes), null);
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
  assert.deepEqual({ ...parsed.header }, header);
  assert.deepEqual([...parsed.block], [...payload]);
});
