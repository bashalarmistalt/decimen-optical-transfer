import assert from "node:assert/strict";
import test from "node:test";
import { packFile, packFrame, parseFrame, unpackFile, verifyFile } from "../shared/protocol";

test("arbitrary file metadata and bytes survive the optical container", async () => {
  const source = new Uint8Array([0, 1, 2, 127, 128, 254, 255]);
  const packed = await packFile("résumé.bin", "application/octet-stream", source);
  const recovered = await unpackFile(packed.container);
  assert.equal(packed.compression, "none");
  assert.equal(recovered.name, "résumé.bin");
  assert.equal(recovered.type, "application/octet-stream");
  assert.deepEqual(recovered.bytes, source);
  assert.equal(await verifyFile(recovered), true);
});

test("SHA-256 verification rejects changed file bytes", async () => {
  const packed = await packFile("message.txt", "text/plain", new TextEncoder().encode("hello"));
  const recovered = await unpackFile(packed.container);
  recovered.bytes[0]! ^= 0xff;
  assert.equal(await verifyFile(recovered), false);
});

test("compressible files use gzip and recover exactly", async () => {
  const source = new TextEncoder().encode("decimen optical transfer\n".repeat(4_000));
  const packed = await packFile("notes.txt", "text/plain", source);
  const recovered = await unpackFile(packed.container);
  assert.equal(packed.compression, "gzip");
  assert.ok(packed.transmittedSize < source.length / 10);
  assert.deepEqual(recovered.bytes, source);
  assert.equal(await verifyFile(recovered), true);
});

test("incompressible files stay uncompressed", async () => {
  const source = new Uint8Array(64 * 1024);
  crypto.getRandomValues(source);
  const packed = await packFile("noise.bin", "", source);
  assert.equal(packed.compression, "none");
  assert.equal(packed.transmittedSize, source.length);
  const recovered = await unpackFile(packed.container);
  assert.deepEqual(recovered.bytes, source);
});

test("empty files pack and unpack", async () => {
  const packed = await packFile("empty.bin", "", new Uint8Array(0));
  const recovered = await unpackFile(packed.container);
  assert.equal(recovered.bytes.length, 0);
  assert.equal(recovered.name, "empty.bin");
  assert.equal(await verifyFile(recovered), true);
});

test("gzip output length is bounded by the declared original size", async () => {
  const source = new TextEncoder().encode("bounded output\n".repeat(1_000));
  const packed = await packFile("bounded.txt", "text/plain", source);
  const malformed = packed.container.slice();
  new DataView(malformed.buffer).setUint32(9, source.length + 1, true);
  await assert.rejects(unpackFile(malformed), /gzip payload length/);
});

test("malformed optical containers are rejected", async () => {
  await assert.rejects(unpackFile(new Uint8Array(49)), /header is invalid/);
});

test("issue #1: parseFrame rejects the one-frame-declares-gigabytes DoS header", () => {
  const blockLen = 1000;
  const block = new Uint8Array(blockLen);
  const frame = packFrame(
    { sessionId: 1, seq: 0, k: 1, blockLen, totalLen: 0xffffffff, payloadFnv: 0 },
    block,
  );
  assert.equal(parseFrame(frame), null);
});

test("issue #1: parseFrame rejects totalLen above the k*blockLen cap", () => {
  const blockLen = 500;
  const block = new Uint8Array(blockLen);
  const frame = packFrame(
    { sessionId: 1, seq: 0, k: 2, blockLen, totalLen: 2 * blockLen + 1, payloadFnv: 0 },
    block,
  );
  assert.equal(parseFrame(frame), null);
});

test("issue #1: parseFrame rejects totalLen too small for its block count", () => {
  const blockLen = 500;
  const block = new Uint8Array(blockLen);
  const frame = packFrame(
    { sessionId: 1, seq: 0, k: 3, blockLen, totalLen: blockLen, payloadFnv: 0 },
    block,
  );
  assert.equal(parseFrame(frame), null);
});

test("issue #1: parseFrame rejects totalLen over the absolute file cap", () => {
  const blockLen = 2000;
  const k = 40000;
  const block = new Uint8Array(blockLen);
  const frame = packFrame(
    { sessionId: 1, seq: 0, k, blockLen, totalLen: k * blockLen, payloadFnv: 0 },
    block,
  );
  assert.equal(parseFrame(frame), null);
});

test("issue #1: legitimate boundary headers still parse", () => {
  const blockLen = 1465;
  const block = new Uint8Array(blockLen);
  const exact = packFrame(
    { sessionId: 1, seq: 5, k: 3, blockLen, totalLen: 3 * blockLen, payloadFnv: 7 },
    block,
  );
  assert.ok(parseFrame(exact));
  const lastBlockPartial = packFrame(
    { sessionId: 1, seq: 6, k: 3, blockLen, totalLen: 2 * blockLen + 1, payloadFnv: 7 },
    block,
  );
  assert.ok(parseFrame(lastBlockPartial));
  const singleBlock = packFrame(
    { sessionId: 1, seq: 0, k: 1, blockLen, totalLen: 300, payloadFnv: 7 },
    block,
  );
  assert.ok(parseFrame(singleBlock));
});
