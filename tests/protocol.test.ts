import assert from "node:assert/strict";
import test from "node:test";
import {
  HEADER_LEN,
  type FrameHeader,
  isPrecompressedType,
  packFile,
  packFrame,
  parseFrame,
  streamIdentity,
  unpackFile,
  verifyFile,
} from "../shared/protocol.ts";

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
  recovered.bytes[0] ^= 0xff;

  assert.equal(await verifyFile(recovered), false);
});

test("compressible files use gzip and recover exactly", async () => {
  const source = new TextEncoder().encode("decimen optical transfer\n".repeat(4_000));
  const packed = await packFile("notes.txt", "text/plain", source);
  const recovered = await unpackFile(packed.container);

  assert.equal(packed.compression, "gzip");
  assert.ok(packed.transmittedSize < source.length / 10);
  assert.equal(recovered.compression, "gzip");
  assert.deepEqual(recovered.bytes, source);
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

test("the receiver sanitises the filename rather than trusting the sender", async () => {
  // The name arrives over the optical channel, so unpackFile() has to reduce it
  // itself — a sender that skipped packFile()'s basename strip is not a
  // hypothetical, it is just a different implementation on the other screen.
  const cases: [string, string][] = [
    ["../../etc/passwd", "passwd"],
    ["C:\\Windows\\System32\\drivers\\etc\\hosts", "hosts"],
    ["évidence.pdf", "évidence.pdf"],
    ["report v2 (final).tar.gz", "report v2 (final).tar.gz"],
  ];
  for (const [sent, expected] of cases) {
    const packed = await packFile(sent, "application/octet-stream", new Uint8Array([1, 2, 3]));
    assert.equal((await unpackFile(packed.container)).name, expected, `for ${JSON.stringify(sent)}`);
  }
});

test("filenames that sanitise away fall back to a safe default", async () => {
  for (const sent of ["..", ".", "/", "   ", "\u0000\u0007"]) {
    const packed = await packFile(sent, "application/octet-stream", new Uint8Array([1]));
    assert.equal((await unpackFile(packed.container)).name, "transfer.bin");
  }
});

test("the frame header is byte-for-byte what the wire expects", () => {
  // 20-byte little-endian header, then the block. Both ends parse this without
  // negotiating, and standalone builds from older releases stay in circulation.
  // totalLen must be consistent with k×blockLen (parseFrame rejects otherwise).
  const frame = packFrame(
    {
      sessionId: 0xbeef,
      seq: 0x01020304,
      k: 0x0111,
      blockLen: 6,
      totalLen: 1638, // 0x0111 * 6 — full last block
      payloadFnv: 0x89abcdef,
    },
    new Uint8Array([1, 2, 3, 4, 5, 6]),
  );
  assert.equal(
    [...frame].map((b) => b.toString(16).padStart(2, "0")).join(" "),
    "d1 0c ef be 04 03 02 01 11 01 06 00 66 06 00 00 ef cd ab 89 01 02 03 04 05 06",
  );
  assert.equal(frame.length, HEADER_LEN + 6);

  const parsed = parseFrame(frame);
  assert.ok(parsed);
  assert.deepEqual(parsed.header, {
    sessionId: 0xbeef,
    seq: 0x01020304,
    k: 0x0111,
    blockLen: 6,
    totalLen: 1638,
    payloadFnv: 0x89abcdef,
  });
  assert.deepEqual(parsed.block, new Uint8Array([1, 2, 3, 4, 5, 6]));
});

test("gzip is skipped for formats it cannot help", () => {
  // Trying costs a full-size allocation and a pass over every byte. These are
  // the files people actually send, and none of them ever win the trade.
  for (const type of [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/avif",
    "image/heic",
    "video/mp4",
    "video/quicktime",
    "audio/mpeg",
    "audio/mp4",
    "audio/flac",
    "application/zip",
    "application/gzip",
    "application/x-7z-compressed",
    "application/vnd.rar",
    "application/epub+zip",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.oasis.opendocument.spreadsheet",
    "IMAGE/JPEG",
    "image/jpeg; charset=binary",
  ]) {
    assert.equal(isPrecompressedType(type), true, `${type} should skip gzip`);
  }
});

test("gzip is still attempted for anything that might compress", () => {
  // A wrong skip silently costs transfer size, so the exceptions matter.
  for (const type of [
    "text/plain",
    "text/csv",
    "application/json",
    "application/pdf",
    "application/wasm",
    "application/octet-stream",
    "application/vnd.decimen.snippet",
    "image/svg+xml",
    "image/bmp",
    "image/tiff",
    "image/x-icon",
    "audio/wav",
    "audio/x-aiff",
    "",
  ]) {
    assert.equal(isPrecompressedType(type), false, `${type} should still try gzip`);
  }
});

test("a precompressed file is transmitted verbatim and still round-trips", async () => {
  // Random bytes stand in for an already-compressed format: declaring it a
  // JPEG must skip the attempt without changing what comes out the far end.
  const source = new Uint8Array(4096);
  for (let i = 0; i < source.length; i++) source[i] = (i * 2654435761) >>> 24;
  const packed = await packFile("photo.jpg", "image/jpeg", source);

  assert.equal(packed.compression, "none");
  assert.equal(packed.transmittedSize, source.length);
  const recovered = await unpackFile(packed.container);
  assert.deepEqual(recovered.bytes, source);
  assert.equal(await verifyFile(recovered), true);
});

test("declaring a compressible type still gets gzip", async () => {
  const source = new TextEncoder().encode("the same line over and over\n".repeat(2000));
  assert.equal((await packFile("log.txt", "text/plain", source)).compression, "gzip");
  assert.equal((await packFile("log.txt", "image/jpeg", source)).compression, "none");
});

test("streamIdentity changes with every field that must not drift mid-stream", () => {
  const base: FrameHeader = {
    sessionId: 7,
    seq: 0,
    k: 100,
    blockLen: 2933,
    totalLen: 293_300,
    payloadFnv: 0xdeadbeef,
  };
  const identity = streamIdentity(base);

  // seq is the one field that varies within a stream.
  assert.equal(streamIdentity({ ...base, seq: 9999 }), identity);

  for (const field of ["sessionId", "k", "blockLen", "totalLen", "payloadFnv"] as const) {
    assert.notEqual(
      streamIdentity({ ...base, [field]: base[field] + 1 }),
      identity,
      `${field} must force the receiver to start a new decoder`,
    );
  }
});

test("streamIdentity fields cannot be confused by the separator", () => {
  // A naive join would make {k: 1, blockLen: 23} and {k: 12, blockLen: 3}
  // collide, and the receiver would feed one stream's frames into the other.
  const a: FrameHeader = { sessionId: 1, seq: 0, k: 1, blockLen: 23, totalLen: 4, payloadFnv: 5 };
  const b: FrameHeader = { sessionId: 1, seq: 0, k: 12, blockLen: 3, totalLen: 4, payloadFnv: 5 };
  assert.notEqual(streamIdentity(a), streamIdentity(b));
});

test("frames that are not ours, or not self-consistent, are rejected", () => {
  const good = packFrame(
    { sessionId: 1, seq: 2, k: 3, blockLen: 4, totalLen: 10, payloadFnv: 0 },
    new Uint8Array([9, 9, 9, 9]),
  );
  assert.ok(parseFrame(good));

  const wrongMagic = good.slice();
  wrongMagic[0] = 0xd2;
  assert.equal(parseFrame(wrongMagic), null, "a QR code from somewhere else");

  assert.equal(parseFrame(good.subarray(0, HEADER_LEN)), null, "header with no block");
  assert.equal(parseFrame(good.subarray(0, good.length - 1)), null, "truncated block");

  const zeroK = good.slice();
  new DataView(zeroK.buffer).setUint16(8, 0, true);
  assert.equal(parseFrame(zeroK), null, "k=0 would divide by zero downstream");
});
