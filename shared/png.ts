// Minimal PNG building blocks for the animation exporter.
//
// Scope is deliberately narrow: bilevel images (1 bit per pixel, 0 = black,
// 1 = white), filter type 0 on every scanline, one zlib stream per image.
// That is exactly what a rasterized QR frame needs — its pixels are pure
// black/white u32s straight out of qr-raster.ts — and nothing more. The
// compression rides the same CompressionStream the container layer already
// uses (protocol.ts), so this adds no dependency and runs in Node for tests.

export const PNG_SIGNATURE = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

/** Matches shared/qr-raster.ts: opaque white. Anything else packs as dark. */
const WHITE = 0xffffffff;

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

/** Standard CRC-32 — the PNG chunk one, which is also the ZIP entry one.
 *  Variadic so a chunk can hash type + data without concatenating them. */
export function crc32(...parts: readonly Uint8Array[]): number {
  let c = 0xffffffff;
  for (const bytes of parts) {
    for (let i = 0; i < bytes.length; i++) {
      c = CRC_TABLE[(c ^ bytes[i]!) & 0xff]! ^ (c >>> 8);
    }
  }
  return (c ^ 0xffffffff) >>> 0;
}

/** One complete chunk: big-endian length, four-char type, data, CRC of
 *  type + data. PNG integers are big-endian throughout. */
export function pngChunk(type: string, data: Uint8Array): Uint8Array {
  const out = new Uint8Array(12 + data.length);
  const dv = new DataView(out.buffer);
  dv.setUint32(0, data.length);
  for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i);
  out.set(data, 8);
  dv.setUint32(8 + data.length, crc32(out.subarray(4, 8 + data.length)));
  return out;
}

/** IHDR payload for a bilevel image: bit depth 1, color type 3 (palette),
 *  compression, filter and interlace all 0.
 *
 *  Palette rather than the grayscale it looks like it should be, and this is
 *  load-bearing: 1-bit *grayscale* is the one PNG format ffmpeg's APNG decoder
 *  refuses (AVERROR_PATCHWELCOME — it decodes 1-bit palette and every deeper
 *  grayscale fine), which would strand the exported animation for exactly the
 *  video pipelines it exists to feed. Palette costs one 6-byte PLTE per file
 *  and not one bit of pixel data: the packing is unchanged, because bit 1
 *  already means white and PLTE_BILEVEL puts white at index 1. Do not
 *  "simplify" this back to color type 0. */
export function bilevelIhdr(width: number, height: number): Uint8Array {
  const data = new Uint8Array(13);
  const dv = new DataView(data.buffer);
  dv.setUint32(0, width);
  dv.setUint32(4, height);
  data[8] = 1; // bit depth: one bit per pixel
  data[9] = 3; // color type: palette — see above, this is not cosmetic
  return data;
}

/** The two-entry palette bilevelIhdr implies: index 0 black, index 1 white,
 *  matching the bit sense packBilevelScanlines writes. Every image that
 *  carries a bilevelIhdr must carry this PLTE too — palette PNGs require it. */
export const PLTE_BILEVEL = new Uint8Array([0, 0, 0, 0xff, 0xff, 0xff]);

/**
 * Filtered scanlines for a bilevel image: each row is a zero filter byte, then
 * pixels packed eight to a byte, most significant bit leftmost, 1 = white.
 *
 * `scale` bakes an integer upscale into the file, nearest-neighbor by
 * construction — every module stays a crisp scale×scale block. That is the
 * point of baking it in: a video pipeline re-encoding the animation gets fat
 * unambiguous modules instead of 1-px ones its chroma subsampling would smear.
 * Each row is packed once per SOURCE row and memcpy-repeated down its band, so
 * the cost scales with source pixels, not output pixels.
 *
 * Padding bits in a row's last byte are zeroed, so output is deterministic —
 * the golden tests depend on that.
 */
export function packBilevelScanlines(
  width: number,
  height: number,
  pixels: ArrayLike<number>,
  scale: number,
): Uint8Array {
  if (!Number.isInteger(scale) || scale < 1) {
    throw new Error(`scale must be a positive integer, got ${scale}`);
  }
  const rowBytes = 1 + Math.ceil((width * scale) / 8);
  const out = new Uint8Array(rowBytes * height * scale);
  const padBits = (width * scale) % 8;
  const lastByteMask = padBits === 0 ? 0xff : (0xff << (8 - padBits)) & 0xff;
  for (let y = 0; y < height; y++) {
    const rowStart = y * scale * rowBytes;
    // The filter byte stays 0; data bytes start all-white, dark pixels clear bits.
    out.fill(0xff, rowStart + 1, rowStart + rowBytes);
    const src = y * width;
    for (let x = 0; x < width; x++) {
      if (pixels[src + x] === WHITE) continue;
      for (let bit = x * scale, end = bit + scale; bit < end; bit++) {
        const at = rowStart + 1 + (bit >> 3);
        out[at] = out[at]! & ~(0x80 >> (bit & 7));
      }
    }
    const last = rowStart + rowBytes - 1;
    out[last] = out[last]! & lastByteMask;
    for (let r = 1; r < scale; r++) {
      out.copyWithin(rowStart + r * rowBytes, rowStart, rowStart + rowBytes);
    }
  }
  return out;
}

/** Deflate to a zlib stream — what IDAT and fdAT carry. Same CompressionStream
 *  machinery as the container layer's gzip (protocol.ts). */
export async function deflate(bytes: Uint8Array): Promise<Uint8Array> {
  const compressed = new Blob([bytes as BlobPart])
    .stream()
    .pipeThrough(new CompressionStream("deflate"));
  return new Uint8Array(await new Response(compressed).arrayBuffer());
}

export function concatBytes(parts: readonly Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

/** A complete standalone bilevel PNG — one frame of the PNG-sequence export. */
export async function encodeBilevelPng(
  width: number,
  height: number,
  pixels: ArrayLike<number>,
  scale: number,
): Promise<Uint8Array> {
  const idat = await deflate(packBilevelScanlines(width, height, pixels, scale));
  return concatBytes([
    PNG_SIGNATURE,
    pngChunk("IHDR", bilevelIhdr(width * scale, height * scale)),
    pngChunk("PLTE", PLTE_BILEVEL),
    pngChunk("IDAT", idat),
    pngChunk("IEND", new Uint8Array(0)),
  ]);
}
