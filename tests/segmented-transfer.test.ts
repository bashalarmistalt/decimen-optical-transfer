import assert from "node:assert/strict";
import test from "node:test";
import {
  MAX_SEGMENT_SOURCE_BLOCKS,
  SEGMENT_PROTOCOL_VERSION,
  createTransferId,
  maxSegmentBytes,
  packSegmentContainer,
  parseSegmentContainer,
  planSegments,
  segmentContainerOverhead,
} from "../shared/segmented-transfer.ts";
import { blockLength } from "../shared/frame-capacity.ts";
import { bytesToHex, digestBytes, equalBytes } from "../shared/sha256.ts";

const FRAME_BYTES = 2953;

function synthetic(size: number): Uint8Array {
  const out = new Uint8Array(size);
  for (let i = 0; i < size; i++) out[i] = (i * 37 + (i >>> 5) * 11) & 0xff;
  return out;
}

function checkPlan(totalBytes: number): void {
  const overhead = segmentContainerOverhead("big.bin", "application/octet-stream");
  const plan = planSegments(totalBytes, FRAME_BYTES, overhead);
  let sum = 0;
  for (const segment of plan) {
    assert.ok(segment.length > 0);
    assert.equal(segment.offset, sum);
    assert.equal(segment.index < segment.count, true);
    assert.ok(segment.length + overhead <= maxSegmentBytes(FRAME_BYTES));
    sum += segment.length;
  }
  assert.equal(sum, totalBytes);
}

test("segment planning covers requested byte sizes", () => {
  for (const size of [1024, 1024 * 1024, 64 * 1024 * 1024, 64 * 1024 * 1024 + 1, 100 * 1024 * 1024, 256 * 1024 * 1024]) {
    checkPlan(size);
  }
});

test("segment planning handles theoretical 1 GB without allocating it", () => {
  checkPlan(1024 * 1024 * 1024);
});

test("segment planning leaves last segment shorter when needed", () => {
  const overhead = segmentContainerOverhead("big.bin", "application/octet-stream");
  const cap = maxSegmentBytes(FRAME_BYTES) - overhead;
  const plan = planSegments(cap * 2 + 1234, FRAME_BYTES, overhead);
  assert.equal(plan.length, 3);
  assert.equal(plan[0]!.length, cap);
  assert.equal(plan[1]!.length, cap);
  assert.equal(plan[2]!.length, 1234);
});

test("segment capacity uses conservative source-block margin", () => {
  const perFrame = blockLength(FRAME_BYTES);
  assert.equal(maxSegmentBytes(FRAME_BYTES), perFrame * MAX_SEGMENT_SOURCE_BLOCKS);
});

test("segment container round-trips with metadata and payload", () => {
  const payload = synthetic(32 * 1024);
  const meta = {
    version: SEGMENT_PROTOCOL_VERSION,
    transferId: createTransferId(),
    fileName: "archive.tar",
    mimeType: "application/x-tar",
    totalSize: 90_000,
    fileSha256: synthetic(32),
    segmentIndex: 1,
    segmentCount: 3,
    segmentOffset: 30_000,
    segmentLength: payload.length,
    segmentSha256: digestBytes(payload),
  };
  const packed = packSegmentContainer(meta, payload);
  const parsed = parseSegmentContainer(packed);
  assert.equal(parsed.meta.version, SEGMENT_PROTOCOL_VERSION);
  assert.equal(parsed.meta.fileName, meta.fileName);
  assert.equal(parsed.meta.mimeType, meta.mimeType);
  assert.equal(parsed.meta.segmentIndex, meta.segmentIndex);
  assert.equal(parsed.meta.segmentCount, meta.segmentCount);
  assert.equal(parsed.meta.segmentOffset, meta.segmentOffset);
  assert.equal(parsed.meta.segmentLength, payload.length);
  assert.equal(equalBytes(parsed.meta.transferId, meta.transferId), true);
  assert.equal(equalBytes(parsed.meta.fileSha256, meta.fileSha256), true);
  assert.equal(equalBytes(parsed.payload, payload), true);
});

test("incompatible segment protocol versions are rejected", () => {
  const payload = synthetic(512);
  const packed = packSegmentContainer(
    {
      version: SEGMENT_PROTOCOL_VERSION,
      transferId: createTransferId(),
      fileName: "x.bin",
      mimeType: "application/octet-stream",
      totalSize: payload.length,
      fileSha256: synthetic(32),
      segmentIndex: 0,
      segmentCount: 1,
      segmentOffset: 0,
      segmentLength: payload.length,
      segmentSha256: digestBytes(payload),
    },
    payload,
  );
  packed[4] = 99;
  assert.throws(() => parseSegmentContainer(packed), /Unsupported segment protocol version/);
});

test("corrupted segment metadata lengths are rejected", () => {
  const payload = synthetic(1024);
  const packed = packSegmentContainer(
    {
      version: SEGMENT_PROTOCOL_VERSION,
      transferId: createTransferId(),
      fileName: "x.bin",
      mimeType: "application/octet-stream",
      totalSize: payload.length,
      fileSha256: synthetic(32),
      segmentIndex: 0,
      segmentCount: 1,
      segmentOffset: 0,
      segmentLength: payload.length,
      segmentSha256: digestBytes(payload),
    },
    payload,
  );
  new DataView(packed.buffer).setUint32(37, payload.length + 1, true);
  assert.throws(() => parseSegmentContainer(packed), /Segment range exceeds total file size|payload length does not match/);
});

test("segments from different transfers stay distinguishable", () => {
  const payload = synthetic(2048);
  const shared = {
    version: SEGMENT_PROTOCOL_VERSION,
    fileName: "x.bin",
    mimeType: "application/octet-stream",
    totalSize: payload.length,
    fileSha256: synthetic(32),
    segmentIndex: 0,
    segmentCount: 1,
    segmentOffset: 0,
    segmentLength: payload.length,
    segmentSha256: digestBytes(payload),
  } as const;
  const a = parseSegmentContainer(packSegmentContainer({ ...shared, transferId: createTransferId() }, payload));
  const b = parseSegmentContainer(packSegmentContainer({ ...shared, transferId: createTransferId() }, payload));
  assert.notEqual(bytesToHex(a.meta.transferId), bytesToHex(b.meta.transferId));
});

test("segments can be reassembled out of order and with duplicates", () => {
  const chunks = [synthetic(4096), synthetic(3000), synthetic(777)];
  const fileBytes = chunks.reduce((n, c) => n + c.length, 0);
  const transferId = createTransferId();
  const fileSha = synthetic(32);
  const packed = chunks.map((chunk, index) =>
    packSegmentContainer(
      {
        version: SEGMENT_PROTOCOL_VERSION,
        transferId,
        fileName: "big.bin",
        mimeType: "application/octet-stream",
        totalSize: fileBytes,
        fileSha256: fileSha,
        segmentIndex: index,
        segmentCount: chunks.length,
        segmentOffset: chunks.slice(0, index).reduce((n, c) => n + c.length, 0),
        segmentLength: chunk.length,
        segmentSha256: digestBytes(chunk),
      },
      chunk,
    ),
  );

  const received: (Uint8Array | null)[] = new Array(chunks.length).fill(null);
  for (const idx of [2, 0, 1, 1]) {
    const parsed = parseSegmentContainer(packed[idx]!);
    if (!received[parsed.meta.segmentIndex]) received[parsed.meta.segmentIndex] = parsed.payload;
  }

  assert.equal(received.every(Boolean), true);
  const rebuilt = new Uint8Array(fileBytes);
  let off = 0;
  for (const part of received) {
    rebuilt.set(part!, off);
    off += part!.length;
  }
  assert.equal(off, fileBytes);
});
