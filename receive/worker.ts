import wasmUrl from "zxing-wasm/reader/zxing_reader.wasm?url";
import { prepareZXingModule, readBarcodes } from "zxing-wasm/reader";
import { boxFromPosition, type Box } from "./roi";
import { splitPlanes } from "./planes";

const MAX_SYMBOLS = 8;

prepareZXingModule({
  overrides: {
    locateFile: (path: string, prefix: string) =>
      path.endsWith(".wasm") ? wasmUrl : prefix + path,
  },
});

const ctx = self as unknown as {
  onmessage: ((e: MessageEvent) => void) | null;
  postMessage(msg: unknown, transfer?: Transferable[]): void;
};

async function decodeImage(img: ImageData, fast: boolean): Promise<{ list: Uint8Array[]; boxes: Box[] }> {
  const results = await readBarcodes(img, {
    formats: ["QRCode"],
    maxNumberOfSymbols: MAX_SYMBOLS,
    tryHarder: !fast,
    tryInvert: !fast,
    tryDownscale: !fast,
  });
  const valid = results.filter((x) => x.isValid && x.bytes.length > 0);
  return { list: valid.map((x) => x.bytes), boxes: valid.map((x) => boxFromPosition(x.position)) };
}

ctx.onmessage = async (e: MessageEvent) => {
  const { id, buf, w, h, fast, color, bitmap } = e.data as {
    id: number;
    buf?: ArrayBuffer;
    w?: number;
    h?: number;
    fast: boolean;
    color?: boolean;
    bitmap?: ImageBitmap;
  };
  try {
    let img: ImageData;
    if (bitmap) {
      const oc = new OffscreenCanvas(bitmap.width, bitmap.height);
      const octx = oc.getContext("2d", { willReadFrequently: true })!;
      octx.drawImage(bitmap, 0, 0);
      img = octx.getImageData(0, 0, bitmap.width, bitmap.height);
      bitmap.close();
    } else {
      img = new ImageData(new Uint8ClampedArray(buf!), w!, h!);
    }
    if (!color) {
      const out = await decodeImage(img, fast);
      ctx.postMessage({ id, list: out.list, boxes: out.boxes });
      return;
    }
    const planes = splitPlanes(img.data);
    const list: Uint8Array[] = [];
    const boxes: Box[] = [];
    for (const p of planes) {
      const out = await decodeImage(new ImageData(p, img.width, img.height), fast);
      list.push(...out.list);
      boxes.push(...out.boxes);
    }
    ctx.postMessage({ id, list, boxes });
  } catch {
    ctx.postMessage({ id, list: [], boxes: [] });
  }
};

void readBarcodes(new ImageData(8, 8), { formats: ["QRCode"] })
  .catch(() => undefined)
  .then(() => ctx.postMessage({ id: -1, list: [], boxes: [] }));
