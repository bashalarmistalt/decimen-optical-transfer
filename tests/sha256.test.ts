import assert from "node:assert/strict";
import test from "node:test";
import { bytesToHex, digestBlob, digestBytes, equalBytes } from "../shared/sha256.ts";

function sampleBytes(size: number): Uint8Array {
  const out = new Uint8Array(size);
  for (let i = 0; i < size; i++) out[i] = (i * 131 + (i >>> 3) * 17) & 0xff;
  return out;
}

test("incremental SHA-256 matches WebCrypto on varied sizes", async () => {
  for (const size of [0, 1, 1024, 1024 * 1024 + 17]) {
    const bytes = sampleBytes(size);
    const expected = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
    assert.equal(equalBytes(digestBytes(bytes), expected), true, `size=${size}`);
  }
});

test("blob SHA-256 matches byte SHA-256", async () => {
  const bytes = sampleBytes(3 * 1024 * 1024 + 321);
  const blobHash = await digestBlob(new Blob([bytes]));
  assert.equal(equalBytes(blobHash, digestBytes(bytes)), true);
});

test("bytesToHex is stable", () => {
  assert.equal(bytesToHex(new Uint8Array([0, 1, 254, 255])), "0001feff");
});
