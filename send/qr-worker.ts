// QR encode worker: QRCode.create (up to V40) + rasterizeQr run OFF the main
// thread, so the sender's rAF paint loop never stalls on a phone. The module
// raster comes back as a transferred pixel buffer; the main thread wraps it in
// an ImageData at zero copy.
//
// The qrcode browser entry touches `document` only inside its canvas renderers,
// which this worker never calls — importing it here is safe.

import QRCode from "qrcode";
import { rasterizeLayeredQr } from "../shared/color-layer";
import { rasterizeQr } from "../shared/qr-raster";

const MARGIN = 4; // quiet-zone modules — must match send/main.ts

interface EncodeRequest {
  id: number;
  /** Locked after the first frame; undefined lets the worker auto-select the
   *  version (deterministic for a fixed byte length + ECC, so pre-lock frames
   *  and post-lock frames still land on identical geometry). */
  version?: number;
  ecc: "L" | "M" | "Q" | "H";
  bytes: Uint8Array;
  auxBytes?: Uint8Array;
}

const ctx = self as unknown as {
  onmessage: ((e: MessageEvent) => void) | null;
  postMessage(msg: unknown, transfer?: Transferable[]): void;
};

ctx.onmessage = (event: MessageEvent) => {
  const { id, version, ecc, bytes, auxBytes } = event.data as EncodeRequest;
  try {
    const qr = QRCode.create([{ data: bytes, mode: "byte" } as unknown as QRCode.QRCodeSegment], {
      errorCorrectionLevel: ecc,
      version,
      maskPattern: 4, // pinned — see the tuning notes in send/main.ts
    });
    let raster;
    if (auxBytes) {
      const aux = QRCode.create(
        [{ data: auxBytes, mode: "byte" } as unknown as QRCode.QRCodeSegment],
        { errorCorrectionLevel: ecc, version: qr.version, maskPattern: 4 },
      );
      raster = rasterizeLayeredQr(qr.modules.size, qr.modules.data, aux.modules.data, MARGIN);
    } else {
      raster = rasterizeQr(qr.modules.size, qr.modules.data, MARGIN);
    }
    ctx.postMessage(
      { id, version: qr.version, size: raster.size, pixels: raster.pixels },
      [raster.pixels.buffer],
    );
  } catch (err) {
    // e.g. frame bytes over capacity for the chosen ECC level — the main
    // thread turns this into the same error it used to catch synchronously.
    ctx.postMessage({ id, error: err instanceof Error ? err.message : String(err) });
  }
};
