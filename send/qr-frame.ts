// The one QR generation path. The live stream and the animation exporter both
// call this, so they cannot drift apart on the pinned mask or version locking.
//
// The mask pattern is pinned (any declared mask is valid to a decoder): this
// skips the spec's 8-way mask evaluation and speeds generation ~4×. It also
// means every code carries the same byte length at the same ECC with the same
// mask — so once the first code locks the version, every later create() lands
// on identical geometry, which tiling and grid rasterization require.

import QRCode from "qrcode";

/** Quiet-zone modules around every code, shared by the stream and the export. */
export const QUIET_ZONE_MODULES = 4;

export type EccLevel = "L" | "M" | "Q" | "H";

const PINNED_MASK_PATTERN = 4;

export type FrameQr = ReturnType<typeof QRCode.create>;

/** One frame's wire bytes as a QR matrix. Pass `version` undefined for the
 *  first code of a stream; it locks to that code's version, and every later
 *  call must pass the locked value. */
export function createFrameQr(bytes: Uint8Array, ecc: EccLevel, version: number | undefined): FrameQr {
  return QRCode.create([{ data: bytes, mode: "byte" } as unknown as QRCode.QRCodeSegment], {
    errorCorrectionLevel: ecc,
    version,
    maskPattern: PINNED_MASK_PATTERN,
  });
}
