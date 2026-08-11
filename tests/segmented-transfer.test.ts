import assert from "node:assert/strict";
import test from "node:test";
import {
  MAX_SEGMENT_PAYLOAD_BYTES,
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
import { gunzipBytes, gzipBytes } from "../shared/compression.ts";

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
  // Below ~277 bytes per frame a stream runs out of block numbers before it
  // reaches the byte cap. No offered setting is that small, so this guards the
  // branch rather than a reachable configuration.
  const perFrame = blockLength(200);
  assert.ok(perFrame * MAX_SEGMENT_SOURCE_BLOCKS < MAX_SEGMENT_PAYLOAD_BYTES);
  assert.equal(maxSegmentBytes(200), perFrame * MAX_SEGMENT_SOURCE_BLOCKS);
});

test("segment capacity is byte-capped so neither end holds a huge segment", () => {
  // At realistic frame sizes the block ceiling is ~190 MB; the byte cap is what
  // actually bounds a segment, and it must hold for every offered frame size.
  assert.equal(maxSegmentBytes(FRAME_BYTES), MAX_SEGMENT_PAYLOAD_BYTES);
  for (const frameBytes of [1273, 1663, 2331, 2953]) {
    assert.equal(maxSegmentBytes(frameBytes), MAX_SEGMENT_PAYLOAD_BYTES);
  }
});

test("a large file plans into segments no bigger than the byte cap", () => {
  const overhead = segmentContainerOverhead("big.bin", "application/octet-stream");
  const plan = planSegments(600 * 1024 * 1024, FRAME_BYTES, overhead);
  for (const segment of plan) {
    assert.ok(segment.length <= MAX_SEGMENT_PAYLOAD_BYTES);
  }
  assert.equal(plan.reduce((n, s) => n + s.length, 0), 600 * 1024 * 1024);
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
    compression: "none" as const,
    transmittedLength: payload.length,
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
      compression: "none" as const,
      transmittedLength: payload.length,
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
      compression: "none" as const,
      transmittedLength: payload.length,
    },
    payload,
  );
  new DataView(packed.buffer).setUint32(37, payload.length + 1, true);
  assert.throws(
    () => parseSegmentContainer(packed),
    /Segment range exceeds total file size|payload length does not match|must carry exactly its own bytes/,
  );
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
    compression: "none",
    transmittedLength: payload.length,
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
        compression: "none" as const,
        transmittedLength: chunk.length,
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

test("a gzipped segment carries the compressed bytes but the plain hash", async () => {
  // Highly compressible on purpose: the point is that the wire form is smaller
  // than the segment while the identity carried in the header is not.
  const payload = new Uint8Array(64 * 1024).fill(0x5a);
  const wire = await gzipBytes(payload);
  assert.ok(wire.length < payload.length);

  const packed = packSegmentContainer(
    {
      version: SEGMENT_PROTOCOL_VERSION,
      transferId: createTransferId(),
      fileName: "zeros.bin",
      mimeType: "application/octet-stream",
      totalSize: payload.length,
      fileSha256: synthetic(32),
      segmentIndex: 0,
      segmentCount: 1,
      segmentOffset: 0,
      segmentLength: payload.length,
      segmentSha256: digestBytes(payload),
      compression: "gzip",
      transmittedLength: wire.length,
    },
    wire,
  );
  assert.ok(packed.length < payload.length);

  const parsed = parseSegmentContainer(packed);
  assert.equal(parsed.meta.compression, "gzip");
  assert.equal(parsed.meta.segmentLength, payload.length);
  assert.equal(parsed.meta.transmittedLength, wire.length);

  const restored = await gunzipBytes(parsed.payload, parsed.meta.segmentLength);
  assert.equal(equalBytes(restored, payload), true);
  assert.equal(equalBytes(digestBytes(restored), parsed.meta.segmentSha256), true);
});

test("a gzip bomb cannot inflate past the declared segment length", async () => {
  const wire = await gzipBytes(new Uint8Array(512 * 1024));
  await assert.rejects(() => gunzipBytes(wire, 4096), /expands past its declared length/);
});

test("an uncompressed segment may not claim a different wire length", () => {
  const payload = synthetic(2048);
  assert.throws(
    () =>
      packSegmentContainer(
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
          segmentLength: payload.length + 16,
          segmentSha256: digestBytes(payload),
          compression: "none",
          transmittedLength: payload.length,
        },
        payload,
      ),
    /must carry exactly its own bytes/,
  );
});

test("unsupported compression bytes are rejected", () => {
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
      compression: "none",
      transmittedLength: payload.length,
    },
    payload,
  );
  packed[117] = 7;
  assert.throws(() => parseSegmentContainer(packed), /unsupported compression/);
});
