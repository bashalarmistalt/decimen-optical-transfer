import assert from "node:assert/strict";
import test from "node:test";
import { ApngEncoder } from "../shared/apng.ts";
import { PNG_SIGNATURE, concatBytes, crc32, packBilevelScanlines } from "../shared/png.ts";

const WHITE = 0xffffffff;
const BLACK = 0xff000000;

async function inflate(bytes: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([bytes as BlobPart])
    .stream()
    .pipeThrough(new DecompressionStream("deflate"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

function walkChunks(bytes: Uint8Array): { type: string; data: Uint8Array }[] {
  assert.deepEqual([...bytes.subarray(0, 8)], [...PNG_SIGNATURE], "PNG signature");
  const chunks: { type: string; data: Uint8Array }[] = [];
  let at = 8;
  while (at < bytes.length) {
    const dv = new DataView(bytes.buffer, bytes.byteOffset + at);
    const length = dv.getUint32(0);
    const type = String.fromCharCode(...bytes.subarray(at + 4, at + 8));
    assert.ok(at + 12 + length <= bytes.length, `${type} chunk overruns the file`);
    const data = bytes.subarray(at + 8, at + 8 + length);
    assert.equal(dv.getUint32(8 + length), crc32(bytes.subarray(at + 4, at + 8 + length)), `${type} CRC`);
    chunks.push({ type, data });
    at += 12 + length;
  }
  return chunks;
}

const FRAMES = [
  [WHITE, BLACK, BLACK, WHITE],
  [BLACK, WHITE, WHITE, BLACK],
  [WHITE, WHITE, WHITE, WHITE],
];

async function encodeSample(): Promise<Uint8Array> {
  const encoder = new ApngEncoder({ width: 2, height: 2, scale: 2, fps: 10, frameCount: 3 });
  for (const frame of FRAMES) await encoder.addFrame(frame);
  return concatBytes(encoder.finish());
}

test("chunk order: IHDR, acTL, then fcTL before every frame, IEND last", async () => {
  const chunks = walkChunks(await encodeSample());
  assert.deepEqual(
    chunks.map((c) => c.type),
    ["IHDR", "PLTE", "acTL", "fcTL", "IDAT", "fcTL", "fdAT", "fcTL", "fdAT", "IEND"],
  );
});

test("IHDR carries the scaled dimensions of a bilevel image", async () => {
  const ihdr = walkChunks(await encodeSample())[0]!.data;
  const dv = new DataView(ihdr.buffer, ihdr.byteOffset);
  assert.equal(dv.getUint32(0), 4); // 2 × scale 2
  assert.equal(dv.getUint32(4), 4);
  assert.equal(ihdr[8], 1); // bit depth
  assert.equal(ihdr[9], 3); // palette — ffmpeg's APNG decoder refuses 1-bit gray
});

test("acTL declares the frame count and loops forever", async () => {
  const actl = walkChunks(await encodeSample()).find((c) => c.type === "acTL")!.data;
  const dv = new DataView(actl.buffer, actl.byteOffset);
  assert.equal(dv.getUint32(0), 3);
  assert.equal(dv.getUint32(4), 0); // num_plays 0 = infinite
});

test("fcTL: full frames at exactly 1/fps, one sequence counter with fdAT", async () => {
  const chunks = walkChunks(await encodeSample());
  const fctls = chunks.filter((c) => c.type === "fcTL").map((c) => c.data);
  const fdats = chunks.filter((c) => c.type === "fdAT").map((c) => c.data);
  const sequenceOf = (data: Uint8Array) => new DataView(data.buffer, data.byteOffset).getUint32(0);
  assert.deepEqual(fctls.map(sequenceOf), [0, 1, 3]);
  assert.deepEqual(fdats.map(sequenceOf), [2, 4]);
  for (const data of fctls) {
    const dv = new DataView(data.buffer, data.byteOffset);
    assert.equal(dv.getUint32(4), 4); // width
    assert.equal(dv.getUint32(8), 4); // height
    assert.equal(dv.getUint32(12), 0); // x offset
    assert.equal(dv.getUint32(16), 0); // y offset
    assert.equal(dv.getUint16(20), 1); // delay numerator
    assert.equal(dv.getUint16(22), 10); // delay denominator = fps
    assert.equal(data[24], 0); // dispose NONE
    assert.equal(data[25], 0); // blend SOURCE
  }
});

test("every frame inflates to its packed scanlines", async () => {
  const chunks = walkChunks(await encodeSample());
  const streams = [
    chunks.find((c) => c.type === "IDAT")!.data,
    ...chunks.filter((c) => c.type === "fdAT").map((c) => c.data.subarray(4)),
  ];
  for (const [i, stream] of streams.entries()) {
    assert.deepEqual(
      [...(await inflate(stream))],
      [...packBilevelScanlines(2, 2, FRAMES[i]!, 2)],
      `frame ${i}`,
    );
  }
});

test("the declared frame count is enforced in both directions", async () => {
  const encoder = new ApngEncoder({ width: 1, height: 1, scale: 1, fps: 1, frameCount: 2 });
  await encoder.addFrame([WHITE]);
  assert.throws(() => encoder.finish(), /declared 2 frames, got 1/);
  await encoder.addFrame([BLACK]);
  await assert.rejects(encoder.addFrame([WHITE]), /more frames than the 2 declared/);
  encoder.finish();
  assert.throws(() => encoder.finish(), /finish\(\) called twice/);
  await assert.rejects(encoder.addFrame([WHITE]), /after finish/);
});

test("an fps outside the u16 delay denominator is refused", () => {
  assert.throws(() => new ApngEncoder({ width: 1, height: 1, scale: 1, fps: 0, frameCount: 1 }), /fps/);
  assert.throws(
    () => new ApngEncoder({ width: 1, height: 1, scale: 1, fps: 65536, frameCount: 1 }),
    /fps/,
  );
});
