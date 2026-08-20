// End-to-end conformance for the animation exporter: the frames inside an
// exported APNG (or PNG-sequence ZIP) must be pixel-identical to what the
// frame pipeline produces for the same seqs, and the seq stream itself must
// complete a fountain decode. Together with transfer.test.ts (which proves
// those rasters' wire bytes decode end to end), that pins the exporter to the
// live stream without needing a QR reader in Node.

import assert from "node:assert/strict";
import test from "node:test";
import {
  ZIP_MAX_FRAMES,
  estimateExportBytes,
  exportAnimation,
  planExport,
} from "../send/export.ts";
import { QUIET_ZONE_MODULES, createFrameQr } from "../send/qr-frame.ts";
import { LTDecoder, LTEncoder } from "../shared/fountain.ts";
import { blockLength } from "../shared/frame-capacity.ts";
import { fnv1a, packFrame, splitmix32, type FrameHeader } from "../shared/protocol.ts";
import { rasterizeQrGrid } from "../shared/qr-raster.ts";
import { PNG_SIGNATURE, concatBytes, packBilevelScanlines } from "../shared/png.ts";

const FRAME_BYTES = 500;
const SESSION_ID = 7;
const ECC = "L";

/** Incompressible bytes, deterministic across runs. */
function noise(length: number, seed: number): Uint8Array {
  const rnd = splitmix32(seed);
  const out = new Uint8Array(length);
  for (let i = 0; i < length; i++) out[i] = rnd() & 0xff;
  return out;
}

async function inflate(bytes: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([bytes as BlobPart])
    .stream()
    .pipeThrough(new DecompressionStream("deflate"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

function chunksOf(bytes: Uint8Array): { type: string; data: Uint8Array }[] {
  assert.deepEqual([...bytes.subarray(0, 8)], [...PNG_SIGNATURE]);
  const chunks: { type: string; data: Uint8Array }[] = [];
  let at = 8;
  while (at < bytes.length) {
    const dv = new DataView(bytes.buffer, bytes.byteOffset + at);
    const length = dv.getUint32(0);
    chunks.push({
      type: String.fromCharCode(...bytes.subarray(at + 4, at + 8)),
      data: bytes.subarray(at + 8, at + 8 + length),
    });
    at += 12 + length;
  }
  return chunks;
}

/** What the exporter should render for each animation frame: the same seqs
 *  through the same pipeline, grouped gridCodes at a time. */
function expectedScanlines(
  payload: Uint8Array,
  gridCodes: number,
  animationFrames: number,
  scale: number,
): Uint8Array[] {
  const blockLen = blockLength(FRAME_BYTES);
  const encoder = new LTEncoder(payload, blockLen, SESSION_ID);
  const header: FrameHeader = {
    sessionId: SESSION_ID,
    seq: 0,
    k: encoder.k,
    blockLen,
    totalLen: payload.length,
    payloadFnv: fnv1a(payload),
    flags: 0,
  };
  let version: number | undefined;
  let modules = 0;
  let seq = 0;
  const frames: Uint8Array[] = [];
  for (let f = 0; f < animationFrames; f++) {
    const matrices: ArrayLike<number>[] = [];
    for (let cell = 0; cell < gridCodes; cell++) {
      const qr = createFrameQr(packFrame({ ...header, seq }, encoder.encode(seq)), ECC, version);
      seq++;
      version ??= qr.version;
      modules = qr.modules.size;
      matrices.push(qr.modules.data);
    }
    const raster = rasterizeQrGrid(modules, matrices, QUIET_ZONE_MODULES);
    frames.push(packBilevelScanlines(raster.width, raster.height, raster.pixels, scale));
  }
  return frames;
}

test("planExport: cycles of 2k fountain frames, grid cells always filled", () => {
  // 1200 bytes at 500 bytes/frame → blockLen 478 → k = 3 → cycle length 6.
  assert.deepEqual(planExport(1200, FRAME_BYTES, 1, 1), { k: 3, animationFrames: 6, seqCount: 6 });
  assert.deepEqual(planExport(1200, FRAME_BYTES, 2, 1), { k: 3, animationFrames: 3, seqCount: 6 });
  // A grid that does not divide the cycle rounds up and renders extra seqs.
  assert.deepEqual(planExport(1200, FRAME_BYTES, 4, 1), { k: 3, animationFrames: 2, seqCount: 8 });
  assert.deepEqual(planExport(1200, FRAME_BYTES, 2, 3), { k: 3, animationFrames: 9, seqCount: 18 });
});

test("the size estimate tracks the real file within 15%", async () => {
  // The forecast samples one real frame, so it must land near the actual file
  // for both formats and across scales — a codeword-entropy model shipped
  // first and measured ~2× short at scale 4, which this test now forbids.
  const payload = noise(1200, 42);
  for (const format of ["apng", "zip"] as const) {
    for (const scale of [1, 4]) {
      const result = await exportAnimation({
        payload,
        frameBytes: FRAME_BYTES,
        ecc: ECC,
        gridCodes: 2,
        format,
        fps: 10,
        scale,
        cycles: 2,
        sessionId: SESSION_ID,
        modified: new Date(2026, 0, 2, 3, 4, 6),
      });
      const actual = concatBytes(result!.parts).length;
      const estimate = await estimateExportBytes({
        payload,
        frameBytes: FRAME_BYTES,
        ecc: ECC,
        gridCodes: 2,
        scale,
        cycles: 2,
        format,
      });
      assert.ok(
        Math.abs(estimate - actual) / actual < 0.15,
        `${format} at scale ${scale}: estimated ${estimate}, actual ${actual}`,
      );
    }
  }
});

test("an exported APNG carries exactly the live pipeline's frames", async () => {
  const payload = noise(1200, 42);
  const progress: [number, number][] = [];
  const result = await exportAnimation({
    payload,
    frameBytes: FRAME_BYTES,
    ecc: ECC,
    gridCodes: 2,
    format: "apng",
    fps: 10,
    scale: 2,
    cycles: 1,
    sessionId: SESSION_ID,
    onProgress: (done, total) => progress.push([done, total]),
  });
  assert.ok(result);
  assert.equal(result.frameCount, 3);
  assert.equal(result.mimeType, "image/png");
  assert.equal(result.extension, "png");
  assert.deepEqual(progress, [[1, 3], [2, 3], [3, 3]]);

  const chunks = chunksOf(concatBytes(result.parts));
  const actl = chunks.find((c) => c.type === "acTL")!.data;
  assert.equal(new DataView(actl.buffer, actl.byteOffset).getUint32(0), 3);
  const streams = [
    chunks.find((c) => c.type === "IDAT")!.data,
    ...chunks.filter((c) => c.type === "fdAT").map((c) => c.data.subarray(4)),
  ];
  const expected = expectedScanlines(payload, 2, 3, 2);
  assert.equal(streams.length, expected.length);
  for (const [i, stream] of streams.entries()) {
    assert.deepEqual([...(await inflate(stream))], [...expected[i]!], `frame ${i}`);
  }
  // The IHDR dimensions match what the frames inflate to.
  const ihdr = chunks[0]!.data;
  const dv = new DataView(ihdr.buffer, ihdr.byteOffset);
  assert.equal(dv.getUint32(0), result.width);
  assert.equal(dv.getUint32(4), result.height);
});

test("the exported seq stream completes a fountain decode", () => {
  const payload = noise(1200, 42);
  const blockLen = blockLength(FRAME_BYTES);
  const { seqCount, k } = planExport(payload.length, FRAME_BYTES, 2, 1);
  const encoder = new LTEncoder(payload, blockLen, SESSION_ID);
  const decoder = new LTDecoder(k, blockLen, SESSION_ID, payload.length);
  for (let seq = 0; seq < seqCount; seq++) decoder.addFrame(seq, encoder.encode(seq));
  assert.ok(decoder.isComplete);
  assert.deepEqual([...decoder.assemble()!], [...payload]);
});

test("cancellation abandons the run and returns null", async () => {
  let frames = 0;
  const result = await exportAnimation({
    payload: noise(1200, 42),
    frameBytes: FRAME_BYTES,
    ecc: ECC,
    gridCodes: 1,
    format: "apng",
    fps: 10,
    scale: 1,
    cycles: 1,
    sessionId: SESSION_ID,
    onProgress: () => frames++,
    isCancelled: () => frames >= 2,
  });
  assert.equal(result, null);
  assert.equal(frames, 2);
});

test("a PNG-sequence ZIP: numbered frames plus the frame-rate note", async () => {
  const payload = noise(1200, 42);
  const result = await exportAnimation({
    payload,
    frameBytes: FRAME_BYTES,
    ecc: ECC,
    gridCodes: 2,
    format: "zip",
    fps: 10,
    scale: 1,
    cycles: 1,
    sessionId: SESSION_ID,
    modified: new Date(2026, 0, 2, 3, 4, 6),
  });
  assert.ok(result);
  assert.equal(result.mimeType, "application/zip");
  assert.equal(result.extension, "zip");
  const bytes = concatBytes(result.parts);
  const eocd = new DataView(bytes.buffer, bytes.byteLength - 22);
  assert.equal(eocd.getUint32(0, true), 0x06054b50);
  assert.equal(eocd.getUint16(8, true), result.frameCount + 1);

  // Walk the central directory for names, then check one entry's content.
  let at = eocd.getUint32(16, true);
  const names: string[] = [];
  const offsets = new Map<string, { offset: number; size: number; nameLength: number }>();
  for (let i = 0; i < result.frameCount + 1; i++) {
    const record = new DataView(bytes.buffer, at);
    const nameLength = record.getUint16(28, true);
    const name = new TextDecoder().decode(bytes.subarray(at + 46, at + 46 + nameLength));
    names.push(name);
    offsets.set(name, {
      offset: record.getUint32(42, true),
      size: record.getUint32(24, true),
      nameLength,
    });
    at += 46 + nameLength;
  }
  assert.deepEqual(names, ["frame-0001.png", "frame-0002.png", "frame-0003.png", "frames-per-second.txt"]);

  const entryBytes = (name: string): Uint8Array => {
    const { offset, size, nameLength } = offsets.get(name)!;
    const start = offset + 30 + nameLength;
    return bytes.subarray(start, start + size);
  };
  assert.equal(new TextDecoder().decode(entryBytes("frames-per-second.txt")), "10\n");
  const frame = entryBytes("frame-0001.png");
  const idat = chunksOf(frame).find((c) => c.type === "IDAT")!.data;
  assert.deepEqual([...(await inflate(idat))], [...expectedScanlines(payload, 2, 3, 1)[0]!]);
});

test("a PNG sequence past the ZIP entry ceiling is refused before rendering", async () => {
  // k = 6554 → 5 cycles at grid 1 = 65540 frames, over the 65534 ceiling.
  const payload = new Uint8Array(6554 * blockLength(FRAME_BYTES));
  await assert.rejects(
    exportAnimation({
      payload,
      frameBytes: FRAME_BYTES,
      ecc: ECC,
      gridCodes: 1,
      format: "zip",
      fps: 10,
      scale: 1,
      cycles: 5,
      sessionId: SESSION_ID,
    }),
    new RegExp(`at most ${ZIP_MAX_FRAMES} frames`),
  );
});
