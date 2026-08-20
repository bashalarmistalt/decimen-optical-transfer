import assert from "node:assert/strict";
import test from "node:test";
import { concatBytes, crc32 } from "../shared/png.ts";
import { zipStore, type ZipEntry } from "../shared/zip.ts";

const MODIFIED = new Date(2026, 0, 2, 3, 4, 6); // 2026-01-02 03:04:06
const DOS_DATE = ((2026 - 1980) << 9) | (1 << 5) | 2;
const DOS_TIME = (3 << 11) | (4 << 5) | (6 >> 1);

const ENTRIES: ZipEntry[] = [
  { name: "frame-0001.png", data: new Uint8Array([1, 2, 3, 4, 5]) },
  { name: "frames-per-second.txt", data: new TextEncoder().encode("10\n") },
];

function build(entries: readonly ZipEntry[] = ENTRIES): Uint8Array {
  return concatBytes(zipStore(entries, MODIFIED));
}

test("the end record finds a central directory that finds every local entry", () => {
  const bytes = build();
  const eocd = new DataView(bytes.buffer, bytes.byteLength - 22);
  assert.equal(eocd.getUint32(0, true), 0x06054b50, "EOCD signature");
  assert.equal(eocd.getUint16(8, true), ENTRIES.length);
  assert.equal(eocd.getUint16(10, true), ENTRIES.length);
  const centralSize = eocd.getUint32(12, true);
  const centralOffset = eocd.getUint32(16, true);
  assert.equal(centralOffset + centralSize + 22, bytes.length, "sections tile the file exactly");

  let at = centralOffset;
  for (const { name, data } of ENTRIES) {
    const record = new DataView(bytes.buffer, at);
    assert.equal(record.getUint32(0, true), 0x02014b50, `${name}: central signature`);
    assert.equal(record.getUint16(10, true), 0, `${name}: stored, not compressed`);
    assert.equal(record.getUint16(12, true), DOS_TIME, `${name}: time`);
    assert.equal(record.getUint16(14, true), DOS_DATE, `${name}: date`);
    assert.equal(record.getUint32(16, true), crc32(data), `${name}: CRC`);
    assert.equal(record.getUint32(20, true), data.length, `${name}: compressed size`);
    assert.equal(record.getUint32(24, true), data.length, `${name}: size`);
    const nameLength = record.getUint16(28, true);
    assert.equal(
      new TextDecoder().decode(bytes.subarray(at + 46, at + 46 + nameLength)),
      name,
    );

    // Follow the offset to the local header and check it agrees.
    const localOffset = record.getUint32(42, true);
    const local = new DataView(bytes.buffer, localOffset);
    assert.equal(local.getUint32(0, true), 0x04034b50, `${name}: local signature`);
    assert.equal(local.getUint32(14, true), crc32(data), `${name}: local CRC`);
    assert.equal(local.getUint16(26, true), nameLength);
    assert.deepEqual(
      [...bytes.subarray(localOffset + 30 + nameLength, localOffset + 30 + nameLength + data.length)],
      [...data],
      `${name}: stored bytes`,
    );
    at += 46 + nameLength;
  }
  assert.equal(at, centralOffset + centralSize, "central directory length agrees");
});

test("output is deterministic for a fixed modification date", () => {
  assert.deepEqual([...build()], [...build()]);
});

test("years before the DOS epoch clamp instead of underflowing", () => {
  const bytes = concatBytes(zipStore([ENTRIES[0]!], new Date(1975, 5, 15)));
  const local = new DataView(bytes.buffer);
  assert.equal(local.getUint16(12, true) >> 9, 0); // 1980
});

test("the classic format's entry ceiling is enforced", () => {
  const empty = new Uint8Array(0);
  const tooMany = Array.from({ length: 0x10000 }, (_, i) => ({ name: `${i}`, data: empty }));
  assert.throws(() => zipStore(tooMany, MODIFIED), /65535 entries/);
});
