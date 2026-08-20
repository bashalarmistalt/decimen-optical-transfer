// Store-mode ZIP writer for the PNG-sequence export. No compression — the
// entries are PNGs, already deflated — so this is a pure structure writer:
// local headers, a central directory, the end record. CRCs reuse png.ts's
// crc32 (same polynomial). Entry data is referenced, never copied: the parts
// go straight into a Blob.
//
// Limits are the classic (non-ZIP64) format's: 65535 entries and 4 GB of
// offsets. Both throw rather than silently writing a corrupt archive; the
// exporter checks the entry count before it starts rendering (ZIP_MAX_FRAMES
// in send/export.ts), so a user hits a named message, not this throw.

import { crc32 } from "./png";

export interface ZipEntry {
  name: string;
  data: Uint8Array;
}

const textEncoder = new TextEncoder();

/** MS-DOS 2-second timestamp pair. Pass a fixed date for reproducible output. */
function dosDateTime(modified: Date): { time: number; date: number } {
  const year = Math.max(1980, modified.getFullYear());
  return {
    time: (modified.getHours() << 11) | (modified.getMinutes() << 5) | (modified.getSeconds() >> 1),
    date: ((year - 1980) << 9) | ((modified.getMonth() + 1) << 5) | modified.getDate(),
  };
}

// General-purpose flag bit 11: entry names are UTF-8. Ours are ASCII, which
// UTF-8 contains, so the flag is simply always true.
const FLAG_UTF8_NAMES = 0x0800;
const METHOD_STORE = 0;
const VERSION_NEEDED = 20;

export function zipStore(entries: readonly ZipEntry[], modified: Date): Uint8Array[] {
  if (entries.length > 0xffff) {
    throw new Error(`a ZIP holds at most 65535 entries, got ${entries.length}`);
  }
  const { time, date } = dosDateTime(modified);
  const parts: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;
  for (const { name, data } of entries) {
    const nameBytes = textEncoder.encode(name);
    if (nameBytes.length > 0xffff) throw new Error(`entry name too long: ${name}`);
    const crc = crc32(data);

    const local = new Uint8Array(30 + nameBytes.length);
    const lv = new DataView(local.buffer);
    lv.setUint32(0, 0x04034b50, true);
    lv.setUint16(4, VERSION_NEEDED, true);
    lv.setUint16(6, FLAG_UTF8_NAMES, true);
    lv.setUint16(8, METHOD_STORE, true);
    lv.setUint16(10, time, true);
    lv.setUint16(12, date, true);
    lv.setUint32(14, crc, true);
    lv.setUint32(18, data.length, true); // compressed size — stored, so equal
    lv.setUint32(22, data.length, true);
    lv.setUint16(26, nameBytes.length, true);
    // extra field length stays 0
    local.set(nameBytes, 30);
    parts.push(local, data);

    const record = new Uint8Array(46 + nameBytes.length);
    const cv = new DataView(record.buffer);
    cv.setUint32(0, 0x02014b50, true);
    cv.setUint16(4, VERSION_NEEDED, true); // version made by
    cv.setUint16(6, VERSION_NEEDED, true);
    cv.setUint16(8, FLAG_UTF8_NAMES, true);
    cv.setUint16(10, METHOD_STORE, true);
    cv.setUint16(12, time, true);
    cv.setUint16(14, date, true);
    cv.setUint32(16, crc, true);
    cv.setUint32(20, data.length, true);
    cv.setUint32(24, data.length, true);
    cv.setUint16(28, nameBytes.length, true);
    // extra, comment, disk number, internal and external attributes stay 0
    cv.setUint32(42, offset, true);
    record.set(nameBytes, 46);
    central.push(record);

    offset += local.length + data.length;
    if (offset > 0xffffffff) throw new Error("ZIP offsets exceed 4 GB");
  }

  const centralSize = central.reduce((sum, record) => sum + record.length, 0);
  if (offset + centralSize > 0xffffffff) throw new Error("ZIP offsets exceed 4 GB");
  const eocd = new Uint8Array(22);
  const ev = new DataView(eocd.buffer);
  ev.setUint32(0, 0x06054b50, true);
  // disk numbers stay 0
  ev.setUint16(8, entries.length, true);
  ev.setUint16(10, entries.length, true);
  ev.setUint32(12, centralSize, true);
  ev.setUint32(16, offset, true);
  // comment length stays 0
  return [...parts, ...central, eocd];
}
