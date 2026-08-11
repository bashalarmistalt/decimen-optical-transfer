import { blockLength, MAX_SOURCE_BLOCKS } from "./frame-capacity";

const TEXT_ENCODER = new TextEncoder();
const TEXT_DECODER = new TextDecoder();
const MAGIC = new Uint8Array([0x44, 0x43, 0x53, 0x31]); // DCS1
const FIXED_HEADER_LEN = 122;

// v2 added the compression byte and the on-wire length at the end of the fixed
// header. v1 receivers reject a v2 container on the version check rather than
// misreading it, which is the whole point of the byte.
export const SEGMENT_PROTOCOL_VERSION = 2;
// Conservative source-block cap: leaves headroom below 0xffff for safety.
export const SEGMENT_BLOCK_MARGIN = 0x100;
export const MAX_SEGMENT_SOURCE_BLOCKS = MAX_SOURCE_BLOCKS - SEGMENT_BLOCK_MARGIN;

/**
 * Byte ceiling on a single segment, independent of the source-block ceiling.
 *
 * The block cap alone allows ~190 MB per segment at 2953 bytes/frame, and a
 * segment is handled whole on both ends: the sender holds the sliced bytes plus
 * the packed container plus the prefetched next segment, and the receiver holds
 * a decoder buffer of the same order. That is a mobile out-of-memory, not a
 * transfer. 16 MiB keeps the sender's live set in the low hundreds of MB while
 * still being far more than a realistic optical transfer covers in one segment.
 */
export const MAX_SEGMENT_PAYLOAD_BYTES = 16 * 1024 * 1024;

export type SegmentCompression = "none" | "gzip";

export interface SegmentPlan {
  index: number;
  count: number;
  offset: number;
  length: number;
}

export interface SegmentContainerMeta {
  version: number;
  transferId: Uint8Array;
  fileName: string;
  mimeType: string;
  totalSize: number;
  fileSha256: Uint8Array;
  segmentIndex: number;
  segmentCount: number;
  segmentOffset: number;
  /** Length of the segment in the reassembled file — always the plain byte count. */
  segmentLength: number;
  /** SHA-256 of the plain segment bytes, never of the compressed form. */
  segmentSha256: Uint8Array;
  compression: SegmentCompression;
  /** Bytes actually carried in this container: `segmentLength` unless gzipped. */
  transmittedLength: number;
}

export interface ParsedSegmentContainer {
  meta: SegmentContainerMeta;
  payload: Uint8Array;
}

export function segmentContainerOverhead(fileName: string, mimeType: string): number {
  return (
    FIXED_HEADER_LEN +
    TEXT_ENCODER.encode(fileName).length +
    TEXT_ENCODER.encode(mimeType || "application/octet-stream").length
  );
}

/**
 * Largest container a segment stream may produce at this frame size.
 *
 * Two independent ceilings apply and the smaller wins: how many source blocks a
 * frame header can number, and how many bytes either end can safely hold at
 * once. Small frames are bound by the first, everything else by the second.
 */
export function maxSegmentBytes(frameBytes: number): number {
  const payloadPerFrame = blockLength(frameBytes);
  if (!Number.isFinite(payloadPerFrame) || payloadPerFrame <= 0) {
    throw new Error("Frame size must exceed the protocol header size.");
  }
  return Math.min(payloadPerFrame * MAX_SEGMENT_SOURCE_BLOCKS, MAX_SEGMENT_PAYLOAD_BYTES);
}

export function planSegments(totalBytes: number, frameBytes: number, overheadBytes = 0): SegmentPlan[] {
  if (!Number.isFinite(totalBytes) || totalBytes <= 0) {
    throw new Error("Total bytes must be a positive number.");
  }
  const maxBytes = maxSegmentBytes(frameBytes) - overheadBytes;
  if (maxBytes <= 0) {
    throw new Error("Frame capacity is too small for segment metadata.");
  }
  const count = Math.max(1, Math.ceil(totalBytes / maxBytes));
  const out: SegmentPlan[] = [];
  for (let index = 0; index < count; index++) {
    const offset = index * maxBytes;
    out.push({
      index,
      count,
      offset,
      length: Math.min(maxBytes, totalBytes - offset),
    });
  }
  return out;
}

export function createTransferId(): Uint8Array {
  const out = new Uint8Array(16);
  crypto.getRandomValues(out);
  return out;
}

function requireLen(name: string, bytes: Uint8Array, len: number): void {
  if (bytes.length !== len) throw new Error(`${name} must be ${len} bytes.`);
}

function toSafeNumber(value: bigint, field: string): number {
  if (value < 0n || value > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new Error(`${field} exceeds JavaScript's safe integer range.`);
  }
  return Number(value);
}

export function isSegmentContainer(bytes: Uint8Array): boolean {
  if (bytes.length < FIXED_HEADER_LEN) return false;
  return MAGIC.every((v, i) => bytes[i] === v);
}

export function packSegmentContainer(meta: SegmentContainerMeta, payload: Uint8Array): Uint8Array {
  if (meta.version !== SEGMENT_PROTOCOL_VERSION) {
    throw new Error(`Unsupported segment protocol version ${meta.version}.`);
  }
  if (meta.transmittedLength !== payload.length) {
    throw new Error("Segment payload length does not match metadata.");
  }
  if (meta.segmentLength <= 0) {
    throw new Error("Segment length must be non-zero.");
  }
  if (meta.compression === "none" && meta.transmittedLength !== meta.segmentLength) {
    throw new Error("An uncompressed segment must carry exactly its own bytes.");
  }
  if (meta.segmentOffset + meta.segmentLength > meta.totalSize) {
    throw new Error("Segment range exceeds total file size.");
  }
  if (meta.segmentIndex < 0 || meta.segmentIndex >= meta.segmentCount || meta.segmentCount <= 0) {
    throw new Error("Segment index/count metadata is invalid.");
  }
  requireLen("transferId", meta.transferId, 16);
  requireLen("fileSha256", meta.fileSha256, 32);
  requireLen("segmentSha256", meta.segmentSha256, 32);

  const nameBytes = TEXT_ENCODER.encode(meta.fileName);
  const typeBytes = TEXT_ENCODER.encode(meta.mimeType || "application/octet-stream");
  if (nameBytes.length > 0xffff || typeBytes.length > 0xffff) {
    throw new Error("File name or MIME type is too long for segment metadata.");
  }

  const out = new Uint8Array(FIXED_HEADER_LEN + nameBytes.length + typeBytes.length + payload.length);
  const view = new DataView(out.buffer);
  out.set(MAGIC, 0);
  view.setUint8(4, meta.version);
  out.set(meta.transferId, 5);
  view.setUint32(21, meta.segmentIndex, true);
  view.setUint32(25, meta.segmentCount, true);
  view.setBigUint64(29, BigInt(meta.segmentOffset), true);
  view.setUint32(37, meta.segmentLength, true);
  view.setBigUint64(41, BigInt(meta.totalSize), true);
  view.setUint16(49, nameBytes.length, true);
  view.setUint16(51, typeBytes.length, true);
  out.set(meta.fileSha256, 53);
  out.set(meta.segmentSha256, 85);
  view.setUint8(117, meta.compression === "gzip" ? 1 : 0);
  view.setUint32(118, meta.transmittedLength, true);

  let cursor = FIXED_HEADER_LEN;
  out.set(nameBytes, cursor);
  cursor += nameBytes.length;
  out.set(typeBytes, cursor);
  cursor += typeBytes.length;
  out.set(payload, cursor);
  return out;
}

export function parseSegmentContainer(container: Uint8Array): ParsedSegmentContainer {
  if (container.length < FIXED_HEADER_LEN) {
    throw new Error("Segment container is incomplete.");
  }
  for (let i = 0; i < MAGIC.length; i++) {
    if (container[i] !== MAGIC[i]) throw new Error("Segment container magic is invalid.");
  }

  const view = new DataView(container.buffer, container.byteOffset, container.byteLength);
  const version = view.getUint8(4);
  if (version !== SEGMENT_PROTOCOL_VERSION) {
    throw new Error(`Unsupported segment protocol version ${version}.`);
  }

  const segmentIndex = view.getUint32(21, true);
  const segmentCount = view.getUint32(25, true);
  const segmentOffset = toSafeNumber(view.getBigUint64(29, true), "Segment offset");
  const segmentLength = view.getUint32(37, true);
  const totalSize = toSafeNumber(view.getBigUint64(41, true), "Total size");
  const nameLen = view.getUint16(49, true);
  const typeLen = view.getUint16(51, true);
  const compressionByte = view.getUint8(117);
  const transmittedLength = view.getUint32(118, true);
  const dataOffset = FIXED_HEADER_LEN + nameLen + typeLen;

  if (segmentCount === 0 || segmentIndex >= segmentCount) {
    throw new Error("Segment index/count metadata is invalid.");
  }
  if (segmentLength === 0 || transmittedLength === 0) {
    throw new Error("Segment length must be non-zero.");
  }
  if (compressionByte > 1) {
    throw new Error("The recovered segment uses unsupported compression.");
  }
  const compression: SegmentCompression = compressionByte === 1 ? "gzip" : "none";
  if (compression === "none" && transmittedLength !== segmentLength) {
    throw new Error("An uncompressed segment must carry exactly its own bytes.");
  }
  if (segmentOffset + segmentLength > totalSize) {
    throw new Error("Segment range exceeds total file size.");
  }
  if (dataOffset + transmittedLength !== container.length) {
    throw new Error("Segment payload length does not match metadata.");
  }

  const transferId = container.slice(5, 21);
  const fileSha256 = container.slice(53, 85);
  const segmentSha256 = container.slice(85, 117);

  return {
    meta: {
      version,
      transferId,
      fileName: TEXT_DECODER.decode(container.subarray(FIXED_HEADER_LEN, FIXED_HEADER_LEN + nameLen)),
      mimeType:
        TEXT_DECODER.decode(
          container.subarray(FIXED_HEADER_LEN + nameLen, FIXED_HEADER_LEN + nameLen + typeLen),
        ) || "application/octet-stream",
      totalSize,
      fileSha256,
      segmentIndex,
      segmentCount,
      segmentOffset,
      segmentLength,
      segmentSha256,
      compression,
      transmittedLength,
    },
    payload: container.subarray(dataOffset),
  };
}
