import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";
import QRCode from "qrcode";
import { rasterizeLayeredQr, sampleLayeredQr } from "../shared/color-layer.ts";
import DecimenCodec from "../vendor/decimen-codec/decimen_codec.js";

const wasmBinary = readFileSync(
  fileURLToPath(new URL("../vendor/decimen-codec/decimen_codec.wasm", import.meta.url)),
);

function qr(bytes: Uint8Array, version?: number) {
  return QRCode.create(
    [{ data: bytes, mode: "byte" } as unknown as QRCode.QRCodeSegment],
    { errorCorrectionLevel: "L", version, maskPattern: 4 },
  );
}

function upscale(pixels: Uint32Array, size: number, scale: number): Uint8ClampedArray {
  const source = new Uint8ClampedArray(pixels.buffer);
  const outSize = size * scale;
  const out = new Uint8ClampedArray(outSize * outSize * 4);
  for (let y = 0; y < outSize; y++) {
    for (let x = 0; x < outSize; x++) {
      const src = (Math.floor(y / scale) * size + Math.floor(x / scale)) * 4;
      out.set(source.subarray(src, src + 4), (y * outSize + x) * 4);
    }
  }
  return out;
}

test("the vendored codec recovers both frames from one layered QR", async () => {
  const primaryBytes = Uint8Array.from({ length: 320 }, (_, i) => (i * 17 + 3) & 0xff);
  const auxiliaryBytes = Uint8Array.from({ length: 320 }, (_, i) => (i * 29 + 7) & 0xff);
  const primary = qr(primaryBytes);
  const auxiliary = qr(auxiliaryBytes, primary.version);
  const raster = rasterizeLayeredQr(
    primary.modules.size,
    primary.modules.data,
    auxiliary.modules.data,
    4,
  );
  const scale = 4;
  const size = raster.size * scale;
  const rgba = upscale(raster.pixels, raster.size, scale);
  const codec = await DecimenCodec({
    instantiateWasm(imports, done) {
      WebAssembly.instantiate(wasmBinary, imports).then(({ instance, module }) =>
        done(instance, module),
      );
      return {};
    },
  });
  assert.equal(codec.version(), "0.3.0-beta.1");
  assert.equal(codec.build(), "fa67f8d");

  const imagePtr = codec._malloc(rgba.length);
  codec.HEAPU8.set(rgba, imagePtr);
  const found = codec.readFull(imagePtr, size, size, true, 2, false);
  try {
    assert.equal(found.size(), 1);
    const decodedPrimary = found.get(0);
    assert.equal(decodedPrimary.valid, true, decodedPrimary.error);
    assert.deepEqual(Uint8Array.from(decodedPrimary.bytes), primaryBytes);

    const sampled = sampleLayeredQr(
      rgba,
      size,
      size,
      decodedPrimary.position,
      decodedPrimary.modules,
    );
    assert.ok(sampled, "color sampling should clear its confidence gate");
    const matrixPtr = codec._malloc(sampled.auxiliary.length);
    codec.HEAPU8.set(sampled.auxiliary, matrixPtr);
    try {
      const decodedAuxiliary = codec.readMatrix(matrixPtr, decodedPrimary.modules);
      assert.equal(decodedAuxiliary.valid, true, decodedAuxiliary.error);
      assert.deepEqual(Uint8Array.from(decodedAuxiliary.bytes), auxiliaryBytes);
    } finally {
      codec._free(matrixPtr);
    }
  } finally {
    found.delete();
    codec._free(imagePtr);
  }
});
