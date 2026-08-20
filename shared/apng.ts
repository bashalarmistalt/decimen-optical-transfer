// APNG assembly over the PNG primitives: acTL after IHDR, an fcTL before
// every frame, the first frame doubling as the IDAT default image, later
// frames as fdAT. Every frame is a full-frame replacement (dispose NONE,
// blend SOURCE) shown for exactly 1/fps seconds — no partial-frame or timing
// subtleties for a player to get wrong, and APNG's rational delays make the
// frame rate exact where GIF's centisecond clock could not.
//
// The animation loops forever (num_plays 0), like the live carousel it is a
// recording of. A receiver only ever needs distinct seq values, so a looping
// export decodes the same way the live stream does; how many carousel cycles
// to bake in is the exporter's call (see send/export.ts).

import {
  PNG_SIGNATURE,
  PLTE_BILEVEL,
  bilevelIhdr,
  deflate,
  packBilevelScanlines,
  pngChunk,
} from "./png";

export interface ApngSettings {
  /** Source raster dimensions (pre-scale), e.g. from rasterizeQrGrid. */
  width: number;
  height: number;
  /** Integer upscale baked into the file — see packBilevelScanlines. */
  scale: number;
  /** Whole animation frames per second; every frame delay is exactly 1/fps. */
  fps: number;
  /** Total frames, declared up front in acTL. finish() enforces the count. */
  frameCount: number;
}

export class ApngEncoder {
  private readonly parts: Uint8Array[] = [];
  private sequence = 0; // one counter shared by fcTL and fdAT, per the spec
  private framesAdded = 0;
  private finished = false;

  constructor(private readonly settings: ApngSettings) {
    const { width, height, scale, fps, frameCount } = settings;
    if (!Number.isInteger(fps) || fps < 1 || fps > 0xffff) {
      throw new Error(`fps must fit the delay denominator (1–65535), got ${fps}`);
    }
    if (!Number.isInteger(frameCount) || frameCount < 1) {
      throw new Error(`frameCount must be a positive integer, got ${frameCount}`);
    }
    const actl = new Uint8Array(8);
    new DataView(actl.buffer).setUint32(0, frameCount);
    // num_plays stays 0: loop forever.
    this.parts.push(
      PNG_SIGNATURE,
      pngChunk("IHDR", bilevelIhdr(width * scale, height * scale)),
      // PLTE is mandatory for the palette color type bilevelIhdr declares, and
      // it is what keeps ffmpeg able to decode this file at all — see png.ts.
      pngChunk("PLTE", PLTE_BILEVEL),
      pngChunk("acTL", actl),
    );
  }

  private fctl(): Uint8Array {
    const { width, height, scale, fps } = this.settings;
    const data = new Uint8Array(26);
    const dv = new DataView(data.buffer);
    dv.setUint32(0, this.sequence++);
    dv.setUint32(4, width * scale);
    dv.setUint32(8, height * scale);
    // x/y offsets 0 and dispose/blend 0 (NONE/SOURCE): full-frame replacement.
    dv.setUint16(20, 1); // delay numerator
    dv.setUint16(22, fps); // delay denominator — exactly 1/fps seconds
    return data;
  }

  /** Append one frame. Call strictly in sequence — each await must settle
   *  before the next frame starts, or chunks would interleave. */
  async addFrame(pixels: ArrayLike<number>): Promise<void> {
    const { width, height, scale, frameCount } = this.settings;
    if (this.finished) throw new Error("addFrame after finish()");
    if (this.framesAdded >= frameCount) {
      throw new Error(`more frames than the ${frameCount} declared in acTL`);
    }
    const compressed = await deflate(packBilevelScanlines(width, height, pixels, scale));
    this.parts.push(pngChunk("fcTL", this.fctl()));
    if (this.framesAdded === 0) {
      this.parts.push(pngChunk("IDAT", compressed));
    } else {
      const data = new Uint8Array(4 + compressed.length);
      new DataView(data.buffer).setUint32(0, this.sequence++);
      data.set(compressed, 4);
      this.parts.push(pngChunk("fdAT", data));
    }
    this.framesAdded++;
  }

  /** The finished file as Blob parts, IEND included. */
  finish(): Uint8Array[] {
    const { frameCount } = this.settings;
    if (this.finished) throw new Error("finish() called twice");
    if (this.framesAdded !== frameCount) {
      throw new Error(`acTL declared ${frameCount} frames, got ${this.framesAdded}`);
    }
    this.finished = true;
    this.parts.push(pngChunk("IEND", new Uint8Array(0)));
    return this.parts;
  }
}
