// Frame protocol: every QR frame is fully self-describing, so there is NO
// handshake — the receiver locks onto a stream mid-flight, and a new session
// id on any frame simply starts a fresh transfer.
//
// Layout (little-endian), 22 bytes, followed by `blockLen` payload bytes:
//   0  u8   magic 0xD1  ┐ together: "this is a Decimen frame at all"
//   1  u8   magic 0xC3  ┘ magic1 is fixed forever; 0x0C/0x0D mark v1/v2
//   2  u8   version     wire format version — 3 (see WIRE_VERSION)
//   3  u8   flags       feature bits WITHIN a version (see FLAG_*)
//   4  u16  sessionId   random per sender start
//   6  u32  seq         drives the fountain PRNG (see fountain.ts)
//  10  u16  k           source block count
//  12  u16  blockLen    payload bytes per frame
//  14  u32  totalLen    protected file-container length in bytes
//  18  u32  payloadFnv  FNV-1a of the whole container — verified on completion
//
// Why bytes 0–3 look like this (v2 → v3, the whole point of this format break):
//
// v1 → v2 spent a break on the magic bump 0x0C → 0x0D and bought no version
// field with it. `parseFrame` returned null on an unknown magic and the
// receiver silently did nothing, so a version-mismatched stream looked
// identical to bad lighting. That is survivable for a PWA, which reconverges
// on a service-worker refresh within days of a release. It is NOT survivable
// once store binaries are in the field: those update on the user's schedule,
// weeks or never, and a silent break strands real installs.
//
// So, from v3 on:
//
//   - TWO magic bytes answer "is this ours at all", and they answer it BEFORE
//     anything is said about versions. One byte is not enough to speak on: with
//     a lone 0xD1 gate, ~1 binary QR payload in 256 falls through to the
//     version branches and gets told to update a device that has never run
//     Decimen — and that advice latches (see verdictShown in receive/main.ts),
//     so a wrong guess stays on screen until a real frame clears it. 16 bits of
//     magic is what makes the verdicts below trustworthy enough to show a user.
//   - `version` (byte 2) gates parsing wholesale, and a receiver that does not
//     recognise it says so out loud (classifyFrame → frameVerdictMessage).
//     0x0C and 0x0D stay reserved as MAGIC1 values forever, precisely so a v3
//     receiver can name a v1/v2 sender instead of shrugging at it.
//   - `flags` (byte 3) gates orthogonal features within a version, split into
//     must-understand and ignorable halves (see CRITICAL_FLAGS). That split has
//     to ship with the first versioned build: a receiver that treats every
//     unknown bit as fatal cannot be taught otherwise without another format
//     break, so "some bits are safe to ignore" is not a rule that can be added
//     later — only declared now.
//
// There is deliberately NO reserved byte. An earlier draft of v3 kept one and
// spent magic1 to pay for it, which had it backwards: a reserved byte only
// duplicates what a must-understand flag bit already does (and four of those is
// more headroom than this format will ever need), while magic1 duplicates
// nothing. Worse, that draft classified a nonzero reserved byte as `malformed`,
// which is silent — so the one mechanism it was spent on could never have been
// used without reintroducing the exact failure v3 exists to abolish.
//
// Deployed v2 receivers match byte 1 against 0x0D exactly, so they reject v3
// frames on the magic check rather than misparsing a header whose fields have
// all moved.


import { OpticalError } from "./optical-error";
export const HEADER_LEN = 22;

const MAGIC0 = 0xd1;
/**
 * Second magic byte. Fixed for every version from v3 on — the version lives in
 * byte 2 now, so this one never has to move again.
 */
const MAGIC1 = 0xc3;

/**
 * Byte-1 values of the pre-versioning formats, reserved forever so a receiver
 * can tell "older sender" from "not a Decimen frame at all". These are magic1
 * values, not version numbers: v1 and v2 never carried a version field, and 1
 * and 2 have never appeared on the wire as bytes.
 */
const LEGACY_MAGIC1 = new Map<number, number>([
  [0x0c, 1],
  [0x0d, 2],
]);

/**
 * Wire format version this build speaks, carried in byte 2 of every frame.
 *
 * A u8, with 0 reserved as "ours, but no such version" — 254 generations after
 * this one. Not a constraint worth designing around; the point is that the next
 * break is a number, not a break.
 */
export const WIRE_VERSION = 3;

/**
 * Flag bits a receiver MUST understand to decode the payload at all; an unknown
 * one here is a loud reject.
 *
 * The complement (0xF0) is the ignorable half — bits a future sender may set to
 * describe a stream this build decodes correctly anyway. Nothing sets them yet,
 * and that is fine: what ships with v3 is the *rule*, because a receiver that
 * has already been told "every unknown bit is fatal" can only be corrected by
 * another format break. See streamIdentity(), which excludes them for the same
 * reason.
 */
export const CRITICAL_FLAGS = 0x0f;

/**
 * Payload is an encrypted container. Critical — a receiver that cannot decrypt
 * must not pretend it decoded — and deliberately NOT in SUPPORTED_FLAGS: this
 * build never sets it and must refuse streams that do, with a message rather
 * than silence. Claiming the bit now is what makes encryption a flag later
 * instead of wire v4.
 */
export const FLAG_ENCRYPTED = 0x01;

/**
 * A displayed QR carries an auxiliary fountain frame in chroma while its
 * weighted luminance remains an ordinary primary QR. Safe to ignore: receivers
 * without color support still decode the complete primary stream.
 */
export const FLAG_COLOR_LAYERS = 0x10;

/**
 * Critical flag bits this build can actually honour — currently none.
 */
const SUPPORTED_FLAGS = 0x00;
export const MAX_FILE_BYTES = 64 * 1024 * 1024;
/**
 * One place for the number, so the picker label, the rejection message and
 * packFile()'s own error can't drift apart. The HTML pulls it in as the
 * `%MAX_FILE_LABEL%` token (see htmlTokens() in vite.config.ts).
 *
 * README.md still spells it out in prose — nothing templates a markdown file,
 * so that one is on you if this ever changes.
 */
export const MAX_FILE_LABEL = `${MAX_FILE_BYTES / 1024 / 1024} MB`;
const FILE_HEADER_LEN = 49;
const FILE_MAGIC = new Uint8Array([0x44, 0x43, 0x46, 0x32]); // DCF2
const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

export type CompressionMode = "none" | "gzip";

export interface PackedOpticalFile {
  container: Uint8Array;
  compression: CompressionMode;
  originalSize: number;
  transmittedSize: number;
}

export interface OpticalFile {
  name: string;
  type: string;
  bytes: Uint8Array;
  sha256: Uint8Array;
  compression: CompressionMode;
  transmittedSize: number;
}

async function digest(bytes: Uint8Array): Promise<Uint8Array> {
  // Browser-created Uint8Arrays already own an ArrayBuffer. Pass the view
  // directly so verifying a 64 MB transfer does not first allocate and copy a
  // second 64 MB buffer. SharedArrayBuffer-backed views keep the safe copy.
  const input =
    bytes.buffer instanceof ArrayBuffer
      ? (bytes as Uint8Array<ArrayBuffer>)
      : Uint8Array.from(bytes);
  return new Uint8Array(await crypto.subtle.digest("SHA-256", input));
}

async function gzipAsync(bytes: Uint8Array): Promise<Uint8Array> {
  const compressed = new Blob([bytes as BlobPart])
    .stream()
    .pipeThrough(new CompressionStream("gzip"));
  return new Uint8Array(await new Response(compressed).arrayBuffer());
}

/**
 * Inflate with a hard output ceiling.
 *
 * The gzip trailer's declared size is attacker-controlled — it arrives over the
 * optical channel like everything else — so it is a hint, never a bound. This
 * counts bytes as they come off the stream and aborts the moment they exceed
 * `maxBytes`, which the caller has already clamped to MAX_FILE_BYTES. Without
 * this an 80 KB stream could claim to be small and inflate to gigabytes.
 */
async function gunzipAsync(bytes: Uint8Array, maxBytes: number): Promise<Uint8Array> {
  const inflated = new Blob([bytes as BlobPart])
    .stream()
    .pipeThrough(new DecompressionStream("gzip"));
  const reader = inflated.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.length;
    if (total > maxBytes) {
      await reader.cancel();
      throw new OpticalError("inflateOverflow");
    }
    chunks.push(value);
  }
  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.length;
  }
  return out;
}

/**
 * Reduce a name to a bare basename.
 *
 * Applied on BOTH ends. The sender doing it is a convenience; the receiver
 * doing it is the part that matters, because the name it unpacks arrived over
 * the optical channel and is whatever the other screen chose to display. The
 * `download` attribute is the only consumer and browsers sanitise it too, but
 * the receiver has no reason to take the sender's word for it.
 */
function safeFileName(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? "";
  // Strip control characters (NUL and newlines in particular) and the
  // relative-path names that survive a basename split.
  const cleaned = base.replace(/[\u0000-\u001f\u007f]/g, "").trim();
  return cleaned === "" || cleaned === "." || cleaned === ".." ? "transfer.bin" : cleaned;
}

/** Media types whose bytes are already entropy-coded, keyed by exact subtype. */
const PRECOMPRESSED_TYPES = new Set([
  "application/gzip",
  "application/java-archive",
  "application/vnd.rar",
  "application/x-7z-compressed",
  "application/x-brotli",
  "application/x-bzip",
  "application/x-bzip2",
  "application/x-gzip",
  "application/x-lzma",
  "application/x-rar-compressed",
  "application/x-xz",
  "application/x-zip-compressed",
  "application/zip",
  "application/zstd",
]);

/** Image and audio subtypes that are NOT already compressed — the exceptions
 *  to the otherwise-safe "all image/*, all audio/*" rule. */
const COMPRESSIBLE_IMAGES = /^image\/(bmp|x-ms-bmp|svg\+xml|tiff|x-icon|vnd\.microsoft\.icon)$/;
const COMPRESSIBLE_AUDIO = /^audio\/(wav|x-wav|wave|vnd\.wave|aiff|x-aiff|basic|l16)$/;

/**
 * Would gzip be a waste of time on this?
 *
 * Trying costs a full-size allocation and a pass over every byte to discover
 * the answer. On a 64 MB pick that is one of the five simultaneous copies the
 * sender holds, and JPEGs, MP4s and zips — the files people actually send —
 * never win the trade.
 *
 * Deliberately a list rather than a heuristic, and deliberately conservative:
 * a wrong "skip" costs a few percent of transfer size, a wrong "try" costs a
 * whole buffer. Formats that genuinely do compress (bmp, svg, tiff, wav) are
 * excluded on purpose, and PDF is left off the list entirely — its streams are
 * usually deflated already, but text-heavy ones still gain enough to matter.
 */
export function isPrecompressedType(type: string): boolean {
  const media = type.split(";")[0]!.trim().toLowerCase();
  if (media.startsWith("video/")) return true;
  if (media.startsWith("image/")) return !COMPRESSIBLE_IMAGES.test(media);
  if (media.startsWith("audio/")) return !COMPRESSIBLE_AUDIO.test(media);
  // The OOXML and OpenDocument families are zip containers.
  if (media.startsWith("application/vnd.openxmlformats-officedocument.")) return true;
  if (media.startsWith("application/vnd.oasis.opendocument.")) return true;
  if (media.endsWith("+zip")) return true;
  return PRECOMPRESSED_TYPES.has(media);
}

export async function packFile(
  name: string,
  type: string,
  bytes: Uint8Array,
): Promise<PackedOpticalFile> {
  if (bytes.length === 0) throw new OpticalError("fileEmpty");
  if (bytes.length > MAX_FILE_BYTES) {
    throw new OpticalError("fileOverLimit", { limit: MAX_FILE_LABEL });
  }

  const nameBytes = textEncoder.encode(safeFileName(name));
  const typeBytes = textEncoder.encode(type || "application/octet-stream");
  if (nameBytes.length > 0xffff || typeBytes.length > 0xffff) {
    throw new OpticalError("fileNameTooLong");
  }

  // Too small to be worth a gzip header, or a format gzip cannot help with.
  const tryGzip = bytes.length >= 768 && !isPrecompressedType(type);
  const [sha256, compressed] = await Promise.all([
    digest(bytes),
    tryGzip ? gzipAsync(bytes) : Promise.resolve(undefined),
  ]);
  const useGzip = compressed !== undefined && compressed.length + 64 < bytes.length;
  const transmitted = useGzip ? compressed : bytes;
  const compression: CompressionMode = useGzip ? "gzip" : "none";
  const out = new Uint8Array(
    FILE_HEADER_LEN + nameBytes.length + typeBytes.length + transmitted.length,
  );
  const view = new DataView(out.buffer);
  out.set(FILE_MAGIC, 0);
  view.setUint8(4, useGzip ? 1 : 0);
  view.setUint16(5, nameBytes.length, true);
  view.setUint16(7, typeBytes.length, true);
  view.setUint32(9, bytes.length, true);
  view.setUint32(13, transmitted.length, true);
  out.set(sha256, 17);
  out.set(nameBytes, FILE_HEADER_LEN);
  out.set(typeBytes, FILE_HEADER_LEN + nameBytes.length);
  out.set(transmitted, FILE_HEADER_LEN + nameBytes.length + typeBytes.length);
  return {
    container: out,
    compression,
    originalSize: bytes.length,
    transmittedSize: transmitted.length,
  };
}

export async function unpackFile(container: Uint8Array): Promise<OpticalFile> {
  if (container.length < FILE_HEADER_LEN) throw new OpticalError("containerTruncated");
  for (let i = 0; i < FILE_MAGIC.length; i++) {
    if (container[i] !== FILE_MAGIC[i]) throw new OpticalError("containerBadMagic");
  }

  const view = new DataView(container.buffer, container.byteOffset, container.byteLength);
  const compressionByte = view.getUint8(4);
  if (compressionByte > 1) throw new OpticalError("containerBadCompression");
  const compression: CompressionMode = compressionByte === 1 ? "gzip" : "none";
  const nameLength = view.getUint16(5, true);
  const typeLength = view.getUint16(7, true);
  const fileLength = view.getUint32(9, true);
  const transmittedLength = view.getUint32(13, true);
  const dataOffset = FILE_HEADER_LEN + nameLength + typeLength;
  if (
    fileLength === 0 ||
    fileLength > MAX_FILE_BYTES ||
    transmittedLength === 0 ||
    transmittedLength > MAX_FILE_BYTES ||
    dataOffset + transmittedLength !== container.length
  ) {
    throw new OpticalError("containerLengthMismatch");
  }

  const transmitted = container.slice(dataOffset);
  if (compression === "gzip") {
    if (transmitted.length < 18) throw new OpticalError("gzipIncomplete");
    const trailer = new DataView(
      transmitted.buffer,
      transmitted.byteOffset + transmitted.byteLength - 4,
      4,
    );
    if (trailer.getUint32(0, true) !== fileLength) {
      throw new OpticalError("gzipLengthMismatch");
    }
  }
  const bytes = compression === "gzip" ? await gunzipAsync(transmitted, fileLength) : transmitted;
  if (bytes.length !== fileLength) {
    throw new OpticalError("decompressedLengthMismatch");
  }

  return {
    name: safeFileName(
      textDecoder.decode(container.subarray(FILE_HEADER_LEN, FILE_HEADER_LEN + nameLength)),
    ),
    type:
      textDecoder.decode(container.subarray(FILE_HEADER_LEN + nameLength, dataOffset)) ||
      "application/octet-stream",
    sha256: container.slice(17, 49),
    bytes,
    compression,
    transmittedSize: transmittedLength,
  };
}

export async function verifyFile(file: OpticalFile): Promise<boolean> {
  const actual = await digest(file.bytes);
  return actual.every((value, index) => value === file.sha256[index]);
}

export interface FrameHeader {
  sessionId: number;
  seq: number;
  k: number;
  blockLen: number;
  totalLen: number;
  payloadFnv: number;
  /**
   * Feature bits (see FLAG_* and CRITICAL_FLAGS). Required, not optional: the
   * wire always carries this byte, so every construction site should have to
   * say what goes in it rather than silently inheriting a default it never
   * considered. Nothing this build sends sets any bit — they are all 0.
   */
  flags: number;
}

/**
 * Why a frame did not parse — the difference between "point the camera
 * somewhere else" and "one of these two devices needs an update".
 *
 * `foreign` is the silent case on purpose: the receiver decodes every QR code
 * in view, including shop-window ones, and narrating those would be noise.
 * Every other non-ok verdict has something true and actionable to say, which
 * is the part v2 could not express.
 */
export type FrameVerdict =
  | { kind: "ok" }
  | { kind: "foreign" }
  | { kind: "older-sender"; version: number }
  | { kind: "newer-sender"; version: number }
  | { kind: "unsupported-flags"; flags: number }
  | { kind: "malformed" };

export function packFrame(h: FrameHeader, block: Uint8Array): Uint8Array {
  const out = new Uint8Array(HEADER_LEN + block.length);
  const dv = new DataView(out.buffer);
  dv.setUint8(0, MAGIC0);
  dv.setUint8(1, MAGIC1);
  dv.setUint8(2, WIRE_VERSION);
  dv.setUint8(3, h.flags);
  dv.setUint16(4, h.sessionId, true);
  dv.setUint32(6, h.seq, true);
  dv.setUint16(10, h.k, true);
  dv.setUint16(12, h.blockLen, true);
  dv.setUint32(14, h.totalLen, true);
  dv.setUint32(18, h.payloadFnv, true);
  out.set(block, HEADER_LEN);
  return out;
}

/**
 * Single owner of "is this frame ours, and can we decode it?".
 *
 * parseFrame() delegates here so the yes/no answer and the reason for a no can
 * never drift apart — the failure mode versioning is supposed to prevent.
 */
export function classifyFrame(bytes: Uint8Array): FrameVerdict {
  // Needs bytes 0–3 before anything can be said about it.
  if (bytes.length < 4 || bytes[0] !== MAGIC0) return { kind: "foreign" };
  if (bytes[1] !== MAGIC1) {
    // A pre-versioning sender put its format marker where magic1 now lives.
    // Anything else this far in is not ours, and gets silence.
    const legacy = LEGACY_MAGIC1.get(bytes[1]!);
    return legacy === undefined
      ? { kind: "foreign" }
      : { kind: "older-sender", version: legacy };
  }

  // Past 16 bits of magic the frame is Decimen's, so every verdict below can
  // name a version out loud without wondering whether it is really a stray QR
  // code in the background. That confidence is the entire reason magic1 exists.
  const version = bytes[2]!;
  if (version === 0) return { kind: "malformed" }; // ours, but no such version
  if (version !== WIRE_VERSION) {
    return version > WIRE_VERSION
      ? { kind: "newer-sender", version }
      : { kind: "older-sender", version };
  }

  // Only the critical half is enforced. Ignorable bits are skipped on purpose:
  // a future sender may use them to describe a stream this build decodes
  // correctly regardless, and refusing those would make the ignorable half of
  // the byte a lie. Report just the offending bits, not the whole byte.
  const unknownCritical = bytes[3]! & CRITICAL_FLAGS & ~SUPPORTED_FLAGS;
  if (unknownCritical !== 0) return { kind: "unsupported-flags", flags: unknownCritical };

  if (bytes.length <= HEADER_LEN) return { kind: "malformed" };
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const k = dv.getUint16(10, true);
  const blockLen = dv.getUint16(12, true);
  const totalLen = dv.getUint32(14, true);
  if (k === 0 || blockLen === 0 || totalLen === 0) return { kind: "malformed" };
  if (bytes.length !== HEADER_LEN + blockLen) return { kind: "malformed" };
  return { kind: "ok" };
}

/**
 * What to put on screen for a verdict, or null when there is nothing worth
 * saying. Lives beside the format rather than in the receiver's DOM code so
 * every client — web, iOS, Android — words the same failure the same way.
 *
 * This is the ENGLISH reference wording. Localized clients render the same
 * verdicts from their locale catalog (shared/i18n's verdictMessage), whose
 * English entries are pinned to this function by tests/i18n.test.ts — the
 * contract is per-language now, keyed by verdict kind, not per-string.
 */
export function frameVerdictMessage(verdict: FrameVerdict): string | null {
  switch (verdict.kind) {
    case "older-sender":
      return `That screen is sending an older Decimen format (v${verdict.version}). Update the sending device.`;
    case "newer-sender":
      return `That screen is sending a newer Decimen format (v${verdict.version}). Update this app to receive it.`;
    case "unsupported-flags":
      return "That stream uses a Decimen feature this version cannot read. Update this app to receive it.";
    default:
      return null;
  }
}

export function parseFrame(
  bytes: Uint8Array,
): { header: FrameHeader; block: Uint8Array } | null {
  if (classifyFrame(bytes).kind !== "ok") return null;
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const header: FrameHeader = {
    sessionId: dv.getUint16(4, true),
    seq: dv.getUint32(6, true),
    k: dv.getUint16(10, true),
    blockLen: dv.getUint16(12, true),
    totalLen: dv.getUint32(14, true),
    payloadFnv: dv.getUint32(18, true),
    flags: dv.getUint8(3),
  };
  return { header, block: bytes.subarray(HEADER_LEN) };
}

/**
 * Everything about a frame that has to hold constant for a decoder to keep
 * accepting frames into it. `seq` is deliberately absent — it is the one field
 * that varies within a stream.
 *
 * The receiver resets on ANY disagreement, not just a new session id: session
 * ids are 16 bits drawn at random on every sender restart, so a collision
 * across a restart is rare but real, and a mismatched frame fed into the old
 * decoder corrupts it silently — surfacing only as a checksum failure after the
 * whole transfer has run. Including `payloadFnv` also means a sender restarted
 * on the SAME file resumes into the same decoder, which is correct: identical
 * k, sessionId and seq produce an identical frame.
 */
export function streamIdentity(h: FrameHeader): string {
  // Critical bits only. An ignorable bit that flips mid-stream must NOT reset
  // the decoder — doing so would throw away every block recovered so far, which
  // is strictly worse than rejecting the frame, and would mean the ignorable
  // half of the flags byte was never ignorable at all.
  const critical = h.flags & CRITICAL_FLAGS;
  return `${h.sessionId}:${h.k}:${h.blockLen}:${h.totalLen}:${h.payloadFnv}:${critical}`;
}

export function fnv1a(bytes: Uint8Array): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < bytes.length; i++) {
    h ^= bytes[i]!;
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** splitmix32 — deterministic across JS engines (integer ops only). */
export function splitmix32(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x9e3779b9) | 0;
    let t = s ^ (s >>> 16);
    t = Math.imul(t, 0x21f0aaad);
    t ^= t >>> 15;
    t = Math.imul(t, 0x735a2d97);
    t ^= t >>> 15;
    return t >>> 0;
  };
}
