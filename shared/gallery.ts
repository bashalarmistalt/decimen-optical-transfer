export type AssetKind = "image" | "video" | "audio" | "model3d" | "code" | "text" | "file";

export interface GalleryEntry {
  id: string;
  name: string;
  mime: string;
  kind: AssetKind;
  size: number;
  transmittedSize: number;
  seconds?: number;
  kbps?: number;
  at: number;
  thumb?: string;
  snippet?: string;
  path?: string;
  stored?: boolean;
}

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export const MAX_ENTRIES = 60;

const EXT_KIND: Record<string, AssetKind> = {
  png: "image", jpg: "image", jpeg: "image", gif: "image", webp: "image", bmp: "image", svg: "image", heic: "image", avif: "image",
  mp4: "video", webm: "video", mov: "video", mkv: "video", avi: "video",
  mp3: "audio", wav: "audio", ogg: "audio", flac: "audio", m4a: "audio", aac: "audio",
  glb: "model3d", gltf: "model3d", obj: "model3d", stl: "model3d", fbx: "model3d", usdz: "model3d", ply: "model3d",
  js: "code", ts: "code", jsx: "code", tsx: "code", py: "code", rs: "code", c: "code", h: "code", cpp: "code", java: "code",
  go: "code", rb: "code", swift: "code", kt: "code", sh: "code", css: "code", html: "code", json: "code", yaml: "code", yml: "code", toml: "code", sql: "code",
  txt: "text", md: "text", log: "text", csv: "text", rtf: "text",
};

export function kindFor(name: string, mime: string): AssetKind {
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("audio/")) return "audio";
  if (mime.startsWith("model/")) return "model3d";
  if (mime.startsWith("text/")) return "text";
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  return EXT_KIND[ext] ?? "file";
}

export function textSnippet(bytes: Uint8Array, limit = 220): string {
  const head = bytes.subarray(0, Math.min(bytes.length, 4096));
  const decoded = new TextDecoder("utf-8", { fatal: false }).decode(head);
  const clean = decoded.replace(/\u0000/g, "").trim();
  return clean.slice(0, limit);
}

export function loadEntries(storage: StorageLike, key: string): GalleryEntry[] {
  try {
    const raw = storage.getItem(key);
    if (!raw) return [];
    const value: unknown = JSON.parse(raw);
    if (!Array.isArray(value)) return [];
    return (value as GalleryEntry[]).filter(
      (e) => e && typeof e.id === "string" && typeof e.name === "string" && typeof e.at === "number",
    ).slice(0, MAX_ENTRIES);
  } catch {
    return [];
  }
}

export function addEntry(
  storage: StorageLike,
  key: string,
  entry: GalleryEntry,
): GalleryEntry[] {
  const current = loadEntries(storage, key).filter((e) => e.id !== entry.id);
  const entries = [entry, ...current].slice(0, MAX_ENTRIES);
  try {
    storage.setItem(key, JSON.stringify(entries));
  } catch {
    const slim = entries.map((e) => ({ ...e, thumb: undefined })).slice(0, 20);
    try {
      storage.setItem(key, JSON.stringify(slim));
      return slim;
    } catch {}
  }
  return entries;
}

export function removeEntry(storage: StorageLike, key: string, id: string): GalleryEntry[] {
  const entries = loadEntries(storage, key).filter((e) => e.id !== id);
  try {
    storage.setItem(key, JSON.stringify(entries));
  } catch {}
  return entries;
}

export async function makeThumb(bytes: Uint8Array, mime: string, px = 128): Promise<string | undefined> {
  if (!mime.startsWith("image/") || typeof document === "undefined") return undefined;
  try {
    const blob = new Blob([bytes as BlobPart], { type: mime });
    const bmp = await createImageBitmap(blob);
    const scale = Math.min(1, px / Math.max(bmp.width, bmp.height));
    const w = Math.max(1, Math.round(bmp.width * scale));
    const h = Math.max(1, Math.round(bmp.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    canvas.getContext("2d")!.drawImage(bmp, 0, 0, w, h);
    bmp.close();
    return canvas.toDataURL("image/jpeg", 0.72);
  } catch {
    return undefined;
  }
}

export function fmtSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function fmtWhen(at: number): string {
  const d = new Date(at);
  return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
}
