export interface Box {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export interface PositionLike {
  topLeft: { x: number; y: number };
  topRight: { x: number; y: number };
  bottomLeft: { x: number; y: number };
  bottomRight: { x: number; y: number };
}

export function boxFromPosition(p: PositionLike): Box {
  const xs = [p.topLeft.x, p.topRight.x, p.bottomLeft.x, p.bottomRight.x];
  const ys = [p.topLeft.y, p.topRight.y, p.bottomLeft.y, p.bottomRight.y];
  return {
    x0: Math.min(...xs),
    y0: Math.min(...ys),
    x1: Math.max(...xs),
    y1: Math.max(...ys),
  };
}

export function unionBoxes(boxes: Box[]): Box | null {
  if (boxes.length === 0) return null;
  const out = { ...boxes[0]! };
  for (let i = 1; i < boxes.length; i++) {
    const b = boxes[i]!;
    if (b.x0 < out.x0) out.x0 = b.x0;
    if (b.y0 < out.y0) out.y0 = b.y0;
    if (b.x1 > out.x1) out.x1 = b.x1;
    if (b.y1 > out.y1) out.y1 = b.y1;
  }
  return out;
}

export function offsetBox(b: Box, dx: number, dy: number): Box {
  return { x0: b.x0 + dx, y0: b.y0 + dy, x1: b.x1 + dx, y1: b.y1 + dy };
}

export function inflateClamp(
  b: Box,
  padFrac: number,
  minPad: number,
  maxW: number,
  maxH: number,
): Box {
  const pad = Math.max(minPad, padFrac * Math.max(b.x1 - b.x0, b.y1 - b.y0));
  const x0 = Math.max(0, Math.floor(b.x0 - pad));
  const y0 = Math.max(0, Math.floor(b.y0 - pad));
  const x1 = Math.min(maxW, Math.ceil(b.x1 + pad));
  const y1 = Math.min(maxH, Math.ceil(b.y1 + pad));
  return { x0, y0, x1, y1 };
}

export function boxWidth(b: Box): number {
  return b.x1 - b.x0;
}

export function boxHeight(b: Box): number {
  return b.y1 - b.y0;
}

export interface GridTrack {
  box: Box | null;
  maxSymbols: number;
  partialStreak: number;
  lastPartial: Box | null;
  cells: Box[];
}

export function newGridTrack(): GridTrack {
  return { box: null, maxSymbols: 0, partialStreak: 0, lastPartial: null, cells: [] };
}

export const PARTIAL_SHRINK_LIMIT = 30;

export function updateGridTrack(t: GridTrack, boxes: Box[]): Box | null {
  const union = unionBoxes(boxes);
  if (!union) return t.box;
  if (boxes.length >= t.maxSymbols) {
    t.maxSymbols = boxes.length;
    t.box = union;
    t.partialStreak = 0;
    t.lastPartial = null;
    t.cells = boxes.map((b) => ({ ...b }));
    return t.box;
  }
  t.partialStreak++;
  t.lastPartial = t.lastPartial ? unionBoxes([t.lastPartial, union]) : union;
  if (t.partialStreak >= PARTIAL_SHRINK_LIMIT) {
    t.box = t.lastPartial;
    t.maxSymbols = boxes.length;
    t.partialStreak = 0;
    t.lastPartial = null;
    t.cells = [];
    return t.box;
  }
  t.box = t.box ? unionBoxes([t.box, union]) : union;
  return t.box;
}

export function dedupeBoxes(boxes: Box[]): Box[] {
  const out: Box[] = [];
  for (const b of boxes) {
    const bcx = (b.x0 + b.x1) / 2;
    const bcy = (b.y0 + b.y1) / 2;
    const bs = Math.max(boxWidth(b), boxHeight(b));
    let dup = false;
    for (const k of out) {
      const kcx = (k.x0 + k.x1) / 2;
      const kcy = (k.y0 + k.y1) / 2;
      const sep = 0.5 * Math.max(bs, boxWidth(k), boxHeight(k));
      if (Math.abs(bcx - kcx) < sep && Math.abs(bcy - kcy) < sep) {
        dup = true;
        break;
      }
    }
    if (!dup) out.push(b);
  }
  return out;
}

export function cellCropBoxes(
  cells: Box[],
  padFrac: number,
  minPad: number,
  minSide: number,
  maxW: number,
  maxH: number,
): Box[] | null {
  if (cells.length < 2) return null;
  const out: Box[] = [];
  for (const c of cells) {
    const b = inflateClamp(c, padFrac, minPad, maxW, maxH);
    if (boxWidth(b) < minSide || boxHeight(b) < minSide) return null;
    out.push(b);
  }
  return out;
}
