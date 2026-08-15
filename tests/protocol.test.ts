import assert from "node:assert/strict";
import test from "node:test";
import {
  classifyFrame,
  CRITICAL_FLAGS,
  FLAG_COLOR_LAYERS,
  FLAG_ENCRYPTED,
  HEADER_LEN,
  type FrameHeader,
  frameVerdictMessage,
  isPrecompressedType,
  packFile,
  packFrame,
  parseFrame,
  streamIdentity,
  unpackFile,
  verifyFile,
  WIRE_VERSION,
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
  // 22-byte little-endian header, then the block. Both ends parse this without
  // negotiating, and standalone builds from older releases stay in circulation.
  // This vector IS the format: a diff here is a wire change and gets reviewed
  // as one (docs/technical/golden-vectors.md).
  const frame = packFrame(
    {
      sessionId: 0xbeef,
      seq: 0x01020304,
      k: 0x0111,
      blockLen: 6,
      totalLen: 0x00fedcba,
      payloadFnv: 0x89abcdef,
      flags: 0,
    },
    new Uint8Array([1, 2, 3, 4, 5, 6]),
  );
  assert.equal(
    [...frame].map((b) => b.toString(16).padStart(2, "0")).join(" "),
    "d1 c3 03 00 ef be 04 03 02 01 11 01 06 00 ba dc fe 00 ef cd ab 89 01 02 03 04 05 06",
  );
  assert.equal(frame.length, HEADER_LEN + 6);

  const parsed = parseFrame(frame);
  assert.ok(parsed);
  assert.deepEqual(parsed.header, {
    sessionId: 0xbeef,
    seq: 0x01020304,
    k: 0x0111,
    blockLen: 6,
    totalLen: 0x00fedcba,
    payloadFnv: 0x89abcdef,
    flags: 0,
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
    flags: 0,
  };
  const identity = streamIdentity(base);

  // seq is the one field that varies within a stream.
  assert.equal(streamIdentity({ ...base, seq: 9999 }), identity);

  for (const field of [
    "sessionId",
    "k",
    "blockLen",
    "totalLen",
    "payloadFnv",
  ] as const) {
    assert.notEqual(
      streamIdentity({ ...base, [field]: base[field] + 1 }),
      identity,
      `${field} must force the receiver to start a new decoder`,
    );
  }

  // Critical flags are in here ahead of any being supported: the day one is, a
  // mid-stream change must start a new decoder, not poison the old one.
  for (let bit = 1; bit <= 0xff; bit <<= 1) {
    if ((bit & CRITICAL_FLAGS) === 0) continue;
    assert.notEqual(
      streamIdentity({ ...base, flags: bit }),
      identity,
      `critical flag 0x${bit.toString(16)} must force a new decoder`,
    );
  }
});

test("streamIdentity ignores the flag bits that are safe to ignore", () => {
  // The other half of what CRITICAL_FLAGS means. A sender that flips an
  // ignorable bit mid-stream is describing something we decode correctly
  // either way — resetting on it would discard every block recovered so far,
  // which is strictly worse than rejecting the frame, and would make the
  // ignorable half of the byte a lie.
  const base: FrameHeader = {
    sessionId: 7,
    seq: 0,
    k: 100,
    blockLen: 2933,
    totalLen: 293_300,
    payloadFnv: 0xdeadbeef,
    flags: 0,
  };
  const identity = streamIdentity(base);
  for (let bit = 1; bit <= 0xff; bit <<= 1) {
    if (bit & CRITICAL_FLAGS) continue;
    assert.equal(
      streamIdentity({ ...base, flags: bit }),
      identity,
      `ignorable flag 0x${bit.toString(16)} must not restart the transfer`,
    );
  }
});

test("streamIdentity fields cannot be confused by the separator", () => {
  // A naive join would make {k: 1, blockLen: 23} and {k: 12, blockLen: 3}
  // collide, and the receiver would feed one stream's frames into the other.
  const a: FrameHeader = { sessionId: 1, seq: 0, k: 1, blockLen: 23, totalLen: 4, payloadFnv: 5, flags: 0 };
  const b: FrameHeader = { sessionId: 1, seq: 0, k: 12, blockLen: 3, totalLen: 4, payloadFnv: 5, flags: 0 };
  assert.notEqual(streamIdentity(a), streamIdentity(b));
});

test("frames that are not ours, or not self-consistent, are rejected", () => {
  const good = packFrame(
    { sessionId: 1, seq: 2, k: 3, blockLen: 4, totalLen: 10, payloadFnv: 0, flags: 0 },
    new Uint8Array([9, 9, 9, 9]),
  );
  assert.ok(parseFrame(good));

  const wrongMagic = good.slice();
  wrongMagic[0] = 0xd2;
  assert.equal(parseFrame(wrongMagic), null, "a QR code from somewhere else");

  assert.equal(parseFrame(good.subarray(0, HEADER_LEN)), null, "header with no block");
  assert.equal(parseFrame(good.subarray(0, good.length - 1)), null, "truncated block");

  const zeroK = good.slice();
  new DataView(zeroK.buffer).setUint16(10, 0, true);
  assert.equal(parseFrame(zeroK), null, "k=0 would divide by zero downstream");
});

// ---------------------------------------------------------------------------
// Cross-version rejection. These are the negative vectors that make the version
// field worth having: a receiver must be able to tell an old sender, a new
// sender, and an unreadable feature apart from ordinary camera noise — and say
// which. See docs/technical/versioning.md.

/** A well-formed v3 frame, ready to be tampered with. */
function goodFrame(): Uint8Array {
  return packFrame(
    { sessionId: 1, seq: 2, k: 3, blockLen: 4, totalLen: 10, payloadFnv: 0, flags: 0 },
    new Uint8Array([9, 9, 9, 9]),
  );
}

function withByte(offset: number, value: number): Uint8Array {
  const frame = goodFrame();
  frame[offset] = value;
  return frame;
}

test("the magic pair cannot be confused with a pre-versioning format", () => {
  // Deployed v2 receivers accept a frame only when byte 1 is exactly 0x0d, and
  // every field moved in v3. If magic1 ever collided with a legacy marker,
  // those receivers would misparse v3 frames into silent garbage instead of
  // rejecting them.
  const [magic1] = goodFrame().subarray(1, 2);
  assert.notEqual(magic1, 0x0c);
  assert.notEqual(magic1, 0x0d);
  assert.equal(goodFrame()[2], WIRE_VERSION, "the version rides in byte 2, not the magic");
});

test("a v3 receiver names a pre-versioning sender instead of going quiet", () => {
  // v1 and v2 had no version field — their format marker sat where magic1 is
  // now, which is exactly why those two byte values stay reserved forever.
  for (const [marker, version] of [
    [0x0c, 1],
    [0x0d, 2],
  ] as const) {
    const verdict = classifyFrame(withByte(1, marker));
    assert.deepEqual(verdict, { kind: "older-sender", version });
    assert.match(frameVerdictMessage(verdict)!, /older Decimen format/);
  }
});

test("a v3 receiver names a newer sender instead of going quiet", () => {
  const verdict = classifyFrame(withByte(2, WIRE_VERSION + 1));
  assert.deepEqual(verdict, { kind: "newer-sender", version: WIRE_VERSION + 1 });
  assert.match(frameVerdictMessage(verdict)!, /newer Decimen format/);
  // The whole point: an install in the field that predates a format can still
  // explain itself, which is what store binaries need and v2 could not do.
  assert.equal(parseFrame(withByte(2, WIRE_VERSION + 1)), null);
});

test("a v3 receiver names an older versioned sender too", () => {
  // Dead branch today — nothing ever shipped magic1 with a version below 3 —
  // but it is the branch that carries the whole scheme once v4 exists and a v4
  // receiver meets a v3 screen. Version 0 is excluded: see below.
  const verdict = classifyFrame(withByte(2, WIRE_VERSION - 1));
  assert.deepEqual(verdict, { kind: "older-sender", version: WIRE_VERSION - 1 });
  assert.match(frameVerdictMessage(verdict)!, /Update the sending device/);
});

test("version 0 is ours but nonsense, and says nothing", () => {
  assert.deepEqual(classifyFrame(withByte(2, 0)), { kind: "malformed" });
  assert.equal(parseFrame(withByte(2, 0)), null);
});

test("an unknown critical flag is refused with a message, not decoded anyway", () => {
  assert.ok(FLAG_ENCRYPTED & CRITICAL_FLAGS, "encryption must be must-understand");
  const verdict = classifyFrame(withByte(3, FLAG_ENCRYPTED));
  assert.deepEqual(verdict, { kind: "unsupported-flags", flags: FLAG_ENCRYPTED });
  assert.match(frameVerdictMessage(verdict)!, /cannot read/);
  assert.equal(
    parseFrame(withByte(3, FLAG_ENCRYPTED)),
    null,
    "never decode a payload we cannot honour",
  );
});

test("an unknown ignorable flag decodes anyway, and rides through to the header", () => {
  // The half of the flags byte that makes flags an extension mechanism rather
  // than a politer format break. A build that rejected these could never be
  // taught to accept them without another break — which is why the rule ships
  // with v3 even though nothing sets these bits yet.
  for (let bit = 1; bit <= 0xff; bit <<= 1) {
    if (bit & CRITICAL_FLAGS) continue;
    const frame = withByte(3, bit);
    assert.deepEqual(classifyFrame(frame), { kind: "ok" }, `flag 0x${bit.toString(16)}`);
    assert.equal(parseFrame(frame)!.header.flags, bit, "the bit survives parsing");
  }
});

test("the color-layer flag is explicitly backward compatible", () => {
  assert.equal(FLAG_COLOR_LAYERS & CRITICAL_FLAGS, 0);
  const frame = withByte(3, FLAG_COLOR_LAYERS);
  assert.deepEqual(classifyFrame(frame), { kind: "ok" });
  assert.equal(parseFrame(frame)!.header.flags, FLAG_COLOR_LAYERS);
  assert.equal(
    streamIdentity(parseFrame(frame)!.header),
    streamIdentity(parseFrame(goodFrame())!.header),
  );
});

test("a mixed flags byte is judged on its critical half alone", () => {
  let ignorable = 1;
  while (ignorable & CRITICAL_FLAGS) ignorable <<= 1;
  assert.deepEqual(classifyFrame(withByte(3, ignorable | FLAG_ENCRYPTED)), {
    kind: "unsupported-flags",
    flags: FLAG_ENCRYPTED, // the ignorable bit is not part of the complaint
  });
});

test("frames that are not Decimen's stay silent", () => {
  // Noise gets no advice: the receiver decodes every QR code in view, and a
  // wrong "update your device" latches on screen until a real frame clears it.
  for (const frame of [withByte(0, 0xd2), new Uint8Array([0xd1, 0xc3])]) {
    const verdict = classifyFrame(frame);
    assert.equal(verdict.kind, "foreign");
    assert.equal(frameVerdictMessage(verdict), null);
  }
});

test("a stray 0xD1 alone never produces version advice", () => {
  // Regression: an earlier v3 draft gated on 0xD1 only and read byte 1 as the
  // version, so ~1 binary QR payload in 256 was told to update a device that
  // has never run Decimen. Both magic bytes have to match before this file is
  // willing to say anything about versions at all.
  const legacy = new Set([0x0c, 0x0d]);
  const magic1 = goodFrame()[1]!;
  for (let byte1 = 0; byte1 <= 0xff; byte1++) {
    if (byte1 === magic1 || legacy.has(byte1)) continue;
    const verdict = classifyFrame(withByte(1, byte1));
    assert.equal(verdict.kind, "foreign", `byte1 0x${byte1.toString(16)} is not ours`);
    assert.equal(frameVerdictMessage(verdict), null);
  }
});

test("a good v3 frame classifies clean and carries no flags", () => {
  assert.deepEqual(classifyFrame(goodFrame()), { kind: "ok" });
  assert.equal(frameVerdictMessage({ kind: "ok" }), null);
  assert.equal(parseFrame(goodFrame())!.header.flags, 0);
});
