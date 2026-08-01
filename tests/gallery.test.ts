import assert from "node:assert/strict";
import test from "node:test";
import { addEntry, kindFor, loadEntries, removeEntry, textSnippet, MAX_ENTRIES, type GalleryEntry, type StorageLike } from "../shared/gallery";

function fakeStorage(): StorageLike & { map: Map<string, string> } {
  const map = new Map<string, string>();
  return {
    map,
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => void map.set(k, v),
  };
}

function entry(id: string, at: number): GalleryEntry {
  return { id, name: `${id}.bin`, mime: "", kind: "file", size: 10, transmittedSize: 10, at };
}

test("kind detection covers image/video/audio/3D/code/text via mime and extension", () => {
  assert.equal(kindFor("x.png", ""), "image");
  assert.equal(kindFor("x", "image/webp"), "image");
  assert.equal(kindFor("clip.mov", ""), "video");
  assert.equal(kindFor("song", "audio/mpeg"), "audio");
  assert.equal(kindFor("mesh.glb", ""), "model3d");
  assert.equal(kindFor("scene", "model/gltf-binary"), "model3d");
  assert.equal(kindFor("main.rs", ""), "code");
  assert.equal(kindFor("notes.md", ""), "text");
  assert.equal(kindFor("blob.xyz", "application/octet-stream"), "file");
});

test("entries add newest-first, dedupe by id, and cap at the limit", () => {
  const s = fakeStorage();
  for (let i = 0; i < MAX_ENTRIES + 10; i++) addEntry(s, "k", entry(`e${i}`, i));
  const all = loadEntries(s, "k");
  assert.equal(all.length, MAX_ENTRIES);
  assert.equal(all[0]!.id, `e${MAX_ENTRIES + 9}`);
  addEntry(s, "k", entry(all[3]!.id, 999));
  const after = loadEntries(s, "k");
  assert.equal(after.length, MAX_ENTRIES);
  assert.equal(after[0]!.at, 999);
});

test("remove deletes by id and corrupt storage degrades to empty", () => {
  const s = fakeStorage();
  addEntry(s, "k", entry("a", 1));
  addEntry(s, "k", entry("b", 2));
  assert.equal(removeEntry(s, "k", "a").length, 1);
  s.map.set("k", "{nonsense");
  assert.deepEqual(loadEntries(s, "k"), []);
});

test("text snippet strips nulls and bounds length", () => {
  const bytes = new TextEncoder().encode("hello\u0000 world " + "x".repeat(500));
  const snip = textSnippet(bytes);
  assert.ok(snip.startsWith("hello world"));
  assert.ok(snip.length <= 220);
});
