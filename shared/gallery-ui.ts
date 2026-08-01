import { fmtSize, fmtWhen, removeEntry, type GalleryEntry, type StorageLike } from "./gallery";
import { iconEl } from "./icons";
import { delPayload, getPayload } from "./payloadstore";

const KIND_ICON: Record<string, string> = {
  image: "image",
  video: "video",
  audio: "audio",
  model3d: "cube",
  code: "code",
  text: "filetext",
  file: "file",
};

export function renderCards(
  container: HTMLElement,
  empty: HTMLElement,
  storage: StorageLike,
  storageKey: string,
  entries: GalleryEntry[],
  showSpeed: boolean,
  onChange: (entries: GalleryEntry[]) => void,
  onOpen?: (entry: GalleryEntry) => void,
): void {
  empty.hidden = entries.length > 0;
  const seen = new Set(entries.map((e) => e.id));
  for (const child of [...container.children]) {
    if (!seen.has((child as HTMLElement).dataset.id ?? "")) child.remove();
  }
  const existing = new Map(
    [...container.children].map((c) => [(c as HTMLElement).dataset.id ?? "", c as HTMLElement]),
  );
  let anchor: HTMLElement | null = null;
  for (const entry of entries) {
    let card = existing.get(entry.id);
    if (!card) {
      card = buildCard(entry, showSpeed, () => {
        onChange(removeEntry(storage, storageKey, entry.id));
      }, onOpen);
      container.insertBefore(card, anchor ? anchor.nextSibling : container.firstChild);
    } else if (entry.thumb && !card.querySelector(".thumb img")) {
      const thumb = card.querySelector(".thumb")!;
      thumb.querySelector("pre, .thumb > .icon")?.remove();
      const img = document.createElement("img");
      img.src = entry.thumb;
      img.alt = "";
      thumb.prepend(img);
    }
    anchor = card;
  }
}

function buildCard(entry: GalleryEntry, showSpeed: boolean, onDelete: () => void, onOpen?: (entry: GalleryEntry) => void): HTMLElement {
  const card = document.createElement("article");
  card.className = "card glass";
  card.dataset.id = entry.id;
  const thumb = document.createElement("div");
  thumb.className = "thumb";
  if (entry.thumb) {
    const img = document.createElement("img");
    img.src = entry.thumb;
    img.alt = "";
    thumb.append(img);
  } else if (entry.snippet) {
    const pre = document.createElement("pre");
    pre.textContent = entry.snippet;
    thumb.append(pre);
  } else {
    thumb.append(iconEl(KIND_ICON[entry.kind] ?? "file"));
  }
  const dot = document.createElement("span");
  dot.className = "kind-dot";
  dot.append(iconEl(KIND_ICON[entry.kind] ?? "file"));
  const del = document.createElement("button");
  del.className = "card-del";
  del.title = "Remove from gallery";
  del.append(iconEl("trash"));
  del.onclick = (e) => {
    e.stopPropagation();
    void delPayload(entry.id);
    onDelete();
  };
  if (onOpen) {
    card.classList.add("openable");
    card.onclick = () => onOpen(entry);
  }
  thumb.append(dot, del);
  const meta = document.createElement("div");
  meta.className = "card-meta";
  const name = document.createElement("div");
  name.className = "card-name";
  name.textContent = entry.name;
  name.title = entry.name;
  const when = document.createElement("div");
  when.className = "card-sub";
  when.append(iconEl("clock"), document.createTextNode(fmtWhen(entry.at)));
  const sub = document.createElement("div");
  sub.className = "card-sub";
  const bits = [fmtSize(entry.size)];
  if (entry.transmittedSize && entry.transmittedSize !== entry.size) {
    bits.push(`${fmtSize(entry.transmittedSize)} over the air`);
  }
  sub.append(document.createTextNode(bits.join(" · ")));
  meta.append(name, when, sub);
  if (showSpeed && entry.kbps !== undefined && entry.seconds !== undefined) {
    const speed = document.createElement("div");
    speed.className = "card-sub";
    speed.append(iconEl("zap"), document.createTextNode(`${entry.kbps.toFixed(1)} KB/s · ${entry.seconds.toFixed(1)} s`));
    meta.append(speed);
  }
  card.append(thumb, meta);
  return card;
}

export async function openViewer(entry: GalleryEntry, loadBytes: () => Promise<Uint8Array | null>): Promise<void> {
  const overlay = document.createElement("div");
  overlay.className = "viewer";
  const head = document.createElement("div");
  head.className = "viewer-head glass";
  const title = document.createElement("div");
  title.className = "viewer-title";
  title.textContent = entry.name;
  title.title = entry.name;
  const close = document.createElement("button");
  close.className = "ghost-btn";
  close.append(iconEl("x"));
  const body = document.createElement("div");
  body.className = "viewer-body";
  head.append(title, close);
  overlay.append(head, body);
  document.body.append(overlay);
  let url: string | null = null;
  const dismiss = (): void => {
    if (url) URL.revokeObjectURL(url);
    overlay.remove();
  };
  close.onclick = dismiss;
  overlay.onclick = (e) => {
    if (e.target === overlay) dismiss();
  };
  const note = (text: string): void => {
    const p = document.createElement("p");
    p.className = "hint";
    p.textContent = text;
    body.append(p);
  };
  const bytes = await loadBytes();
  if (!bytes) {
    if (entry.thumb && entry.kind === "image") {
      const img = document.createElement("img");
      img.src = entry.thumb;
      body.append(img);
      note("preview only · the full file was not kept on this device");
    } else if (entry.snippet) {
      const pre = document.createElement("pre");
      pre.textContent = entry.snippet;
      body.append(pre);
      note("snippet only · the full file was not kept on this device");
    } else {
      note("the full file was not kept on this device");
    }
    return;
  }
  url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: entry.mime }));
  const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
  const fsw = fsReader();
  if (fsw?.writeFile) {
    const saveBtn = document.createElement("button");
    saveBtn.className = "ghost-btn viewer-save";
    saveBtn.append(iconEl("download"));
    saveBtn.title = isIOS ? "Save to the Files app" : "Save to Downloads";
    saveBtn.onclick = () => {
      saveBtn.disabled = true;
      fsw
        .writeFile!(entry.name, bytes, {
          baseDir: isIOS ? fsw.BaseDirectory.Document : fsw.BaseDirectory.Download,
        })
        .then(() => {
          saveBtn.disabled = false;
          note(isIOS ? "saved · Files app" : "saved to Downloads");
        })
        .catch((err: unknown) => {
          saveBtn.disabled = false;
          note(`save failed: ${err instanceof Error ? err.message : String(err)}`);
        });
    };
    head.insertBefore(saveBtn, close);
  } else {
    const a = document.createElement("a");
    a.className = "ghost-btn viewer-save";
    a.href = url;
    a.download = entry.name;
    a.title = "Download";
    a.append(iconEl("download"));
    head.insertBefore(a, close);
  }
  if (entry.kind === "image") {
    const img = document.createElement("img");
    img.src = url;
    body.append(img);
    if (/iPhone|iPad|iPod/.test(navigator.userAgent)) note("hold the picture to add it to Photos");
  } else if (entry.kind === "video") {
    const v = document.createElement("video");
    v.src = url;
    v.controls = true;
    v.playsInline = true;
    body.append(v);
  } else if (entry.kind === "audio") {
    const a = document.createElement("audio");
    a.src = url;
    a.controls = true;
    body.append(a);
  } else if (entry.kind === "text" || entry.kind === "code") {
    const pre = document.createElement("pre");
    pre.textContent = new TextDecoder("utf-8", { fatal: false }).decode(bytes.subarray(0, 200000));
    body.append(pre);
  } else {
    note("saved on this device · open it from the Files app");
  }
}

export interface FsReader {
  readFile(path: string, opts: { baseDir: number }): Promise<Uint8Array>;
  writeFile?(path: string, data: Uint8Array, opts: { baseDir: number }): Promise<void>;
  BaseDirectory: { Download: number; Document: number };
}

export function fsReader(): FsReader | null {
  const t = (window as unknown as { __TAURI__?: { fs?: FsReader } }).__TAURI__;
  return t?.fs?.readFile ? t.fs : null;
}

export function makeOpen(storageHasFs: FsReader | null): ((entry: GalleryEntry) => void) | undefined {
  return (entry: GalleryEntry) => {
    void openViewer(entry, async () => {
      const fromStore = await getPayload(entry.id);
      if (fromStore) return fromStore;
      const fs = storageHasFs;
      if (!fs || !entry.path) return null;
      for (const baseDir of [fs.BaseDirectory.Document, fs.BaseDirectory.Download]) {
        try {
          return await fs.readFile(entry.path, { baseDir });
        } catch {}
      }
      return null;
    });
  };
}
