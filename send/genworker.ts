import QRCode from "qrcode";
import { LTEncoder } from "../shared/fountain";
import { MAX_K, fnv1a, packFile, packFrame, type FrameHeader } from "../shared/protocol";
import { composeGroup, composeGroupColor, type CodeMatrix } from "./compose";

const MARGIN = 4;

interface InitMsg {
  type: "init";
  sessionId: number;
  blockLen: number;
  ecc: "L" | "M" | "Q" | "H";
  cols: number;
  rows: number;
  channels: 1 | 3;
  name: string;
  fileType: string;
  bytes: ArrayBuffer;
}

const ctx = self as unknown as {
  onmessage: ((e: MessageEvent) => void) | null;
  postMessage(msg: unknown, transfer?: Transferable[]): void;
};

let encoder: LTEncoder | null = null;
let header: FrameHeader | null = null;
let ecc: "L" | "M" | "Q" | "H" = "L";
let cols = 1;
let rows = 1;
let channels: 1 | 3 = 1;
let nextSeq = 0;
let version: number | undefined;
let metaSent = false;
let packed: { compression: "none" | "gzip"; originalSize: number; transmittedSize: number } | null =
  null;
let pendingPulls = 0;

async function initStream(msg: InitMsg): Promise<void> {
  ecc = msg.ecc;
  cols = msg.cols;
  rows = msg.rows;
  channels = msg.channels;
  const file = await packFile(msg.name, msg.fileType, new Uint8Array(msg.bytes));
  const k = Math.ceil(file.container.length / msg.blockLen);
  if (k > MAX_K) {
    const maxMb = ((MAX_K * msg.blockLen) / 1024 / 1024).toFixed(0);
    ctx.postMessage({
      type: "error",
      message:
        `${msg.name} needs ${k} blocks (max ${MAX_K}) even after packing; ` +
        `raise bytes/frame or keep files under ~${maxMb} MB at this setting`,
    });
    return;
  }
  header = {
    sessionId: msg.sessionId,
    seq: 0,
    k,
    blockLen: msg.blockLen,
    totalLen: file.container.length,
    payloadFnv: fnv1a(file.container),
  };
  packed = {
    compression: file.compression,
    originalSize: file.originalSize,
    transmittedSize: file.transmittedSize,
  };
  encoder = new LTEncoder(file.container, msg.blockLen, msg.sessionId);
  const backlog = pendingPulls;
  pendingPulls = 0;
  for (let i = 0; i < backlog; i++) serveGroup();
}

ctx.onmessage = (e: MessageEvent) => {
  const msg = e.data as InitMsg | { type: "pull" };
  if (msg.type === "init") {
    initStream(msg).catch((err: unknown) => {
      ctx.postMessage({
        type: "error",
        message: err instanceof Error ? err.message : String(err),
      });
    });
    return;
  }
  if (msg.type !== "pull") return;
  if (!encoder || !header) {
    pendingPulls++;
    return;
  }
  serveGroup();
};

function makeCode(): CodeMatrix {
  const bytes = packFrame({ ...header!, seq: nextSeq }, encoder!.encode(nextSeq));
  nextSeq++;
  const qr = QRCode.create([{ data: bytes, mode: "byte" } as unknown as QRCode.QRCodeSegment], {
    errorCorrectionLevel: ecc,
    version,
    maskPattern: 4,
  });
  if (version === undefined) version = qr.version;
  return { size: qr.modules.size, data: qr.modules.data as Uint8Array };
}

function serveGroup(): void {
  if (!encoder || !header || !packed) return;
  try {
    const codes: CodeMatrix[] = [];
    for (let g = 0; g < cols * rows; g++) codes.push(makeCode());
    if (!metaSent) {
      metaSent = true;
      ctx.postMessage({
        type: "meta",
        version,
        modules: codes[0]!.size,
        k: header.k,
        compression: packed.compression,
        originalSize: packed.originalSize,
        transmittedSize: packed.transmittedSize,
      });
    }
    let img: ImageData;
    if (channels === 3) {
      const g2: CodeMatrix[] = [];
      const g3: CodeMatrix[] = [];
      for (let g = 0; g < cols * rows; g++) g2.push(makeCode());
      for (let g = 0; g < cols * rows; g++) g3.push(makeCode());
      img = composeGroupColor([codes, g2, g3], cols, rows, MARGIN);
    } else {
      img = composeGroup(codes, cols, rows, MARGIN);
    }
    ctx.postMessage({ type: "group", buf: img.data.buffer, w: img.width, h: img.height }, [
      img.data.buffer,
    ]);
  } catch (err) {
    ctx.postMessage({ type: "error", message: err instanceof Error ? err.message : String(err) });
  }
}
