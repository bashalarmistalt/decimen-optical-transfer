const DB_NAME = "decimen-payloads";
const STORE = "p";
const MAX_ITEMS = 60;
const MAX_BYTES = 384 * 1024 * 1024;

interface Rec {
  id: string;
  at: number;
  size: number;
  blob: Blob;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const st = db.createObjectStore(STORE, { keyPath: "id" });
        st.createIndex("at", "at");
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error as Error);
  });
}

function tx<T>(mode: IDBTransactionMode, run: (st: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(STORE, mode);
        const req = run(t.objectStore(STORE));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error as Error);
        t.oncomplete = () => db.close();
      }),
  );
}

export async function putPayload(id: string, bytes: Uint8Array, at: number): Promise<void> {
  const rec: Rec = { id, at, size: bytes.length, blob: new Blob([bytes as BlobPart]) };
  await tx("readwrite", (st) => st.put(rec));
  await enforceBudget();
}

export async function getPayload(id: string): Promise<Uint8Array | null> {
  try {
    const rec = (await tx("readonly", (st) => st.get(id))) as Rec | undefined;
    if (!rec) return null;
    return new Uint8Array(await rec.blob.arrayBuffer());
  } catch {
    return null;
  }
}

export async function delPayload(id: string): Promise<void> {
  try {
    await tx("readwrite", (st) => st.delete(id));
  } catch {}
}

export async function enforceBudget(): Promise<void> {
  try {
    const all = (await tx("readonly", (st) => st.getAll())) as Rec[];
    const sorted = all.sort((a, b) => b.at - a.at);
    let total = 0;
    const evict: string[] = [];
    sorted.forEach((r, i) => {
      total += r.size;
      if (i >= MAX_ITEMS || total > MAX_BYTES) evict.push(r.id);
    });
    for (const id of evict) await delPayload(id);
  } catch {}
}
