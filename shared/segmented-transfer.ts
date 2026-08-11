import { blockLength, MAX_SOURCE_BLOCKS } from "./frame-capacity";

const TEXT_ENCODER = new TextEncoder();
const TEXT_DECODER = new TextDecoder();
const MAGIC = new Uint8Array([0x44, 0x43, 0x53, 0x31]); // DCS1
const FIXED_HEADER_LEN = 117;

export const SEGMENT_PROTOCOL_VERSION = 1;
// Conservative source-block cap: leaves headroom below 0xffff for safety.
export const SEGMENT_BLOCK_MARGIN = 0x100;
export const MAX_SEGMENT_SOURCE_BLOCKS = MAX_SOURCE_BLOCKS - SEGMENT_BLOCK_MARGIN;

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
  segmentLength: number;
  segmentSha256: Uint8Array;
}

export interface ParsedSegmentContainer {
  meta: SegmentContainerMeta;
  payload: Uint8Array;
}

export function maxSegmentBytes(frameBytes: number): number {
  const payloadPerFrame = blockLength(frameBytes);
  if (!Number.isFinite(payloadPerFrame) || payloadPerFrame <= 0) {
    throw new Error("Frame size must exceed the protocol header size.");
  }
  return payloadPerFrame * MAX_SEGMENT_SOURCE_BLOCKS;
}

export function planSegments(totalBytes: number, frameBytes: number): SegmentPlan[] {
  if (!Number.isFinite(totalBytes) || totalBytes <= 0) {
    throw new Error("Total bytes must be a positive number.");
  }
  const maxBytes = maxSegmentBytes(frameBytes);
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
  if (meta.segmentLength !== payload.length) {
    throw new Error("Segment payload length does not match metadata.");
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
  const dataOffset = FIXED_HEADER_LEN + nameLen + typeLen;

  if (segmentCount === 0 || segmentIndex >= segmentCount) {
    throw new Error("Segment index/count metadata is invalid.");
  }
  if (segmentLength === 0) {
    throw new Error("Segment length must be non-zero.");
  }
  if (segmentOffset + segmentLength > totalSize) {
    throw new Error("Segment range exceeds total file size.");
  }
  if (dataOffset + segmentLength !== container.length) {
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
    },
    payload: container.subarray(dataOffset),
  };
}
