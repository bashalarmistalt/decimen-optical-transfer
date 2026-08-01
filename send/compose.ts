export interface CodeMatrix {
  size: number;
  data: Uint8Array;
}

export function composeGroup(
  codes: CodeMatrix[],
  cols: number,
  rows: number,
  margin: number,
): ImageData {
  const modules = codes[0]!.size;
  const cell = modules + 2 * margin;
  const gridW = cols * cell;
  const gridH = rows * cell;
  const img = new ImageData(gridW, gridH);
  const px = new Uint32Array(img.data.buffer);
  px.fill(0xffffffff);
  for (let g = 0; g < codes.length; g++) {
    const code = codes[g]!;
    const ox = (g % cols) * cell + margin;
    const oy = Math.floor(g / cols) * cell + margin;
    for (let y = 0; y < code.size; y++) {
      const row = (oy + y) * gridW + ox;
      const src = y * code.size;
      for (let x = 0; x < code.size; x++) {
        if (code.data[src + x]) px[row + x] = 0xff000000;
      }
    }
  }
  return img;
}

export function composeGroupColor(
  chans: [CodeMatrix[], CodeMatrix[], CodeMatrix[]],
  cols: number,
  rows: number,
  margin: number,
): ImageData {
  const modules = chans[0][0]!.size;
  const cell = modules + 2 * margin;
  const gridW = cols * cell;
  const gridH = rows * cell;
  const img = new ImageData(gridW, gridH);
  const data = img.data;
  data.fill(255);
  for (let c = 0; c < 3; c++) {
    const codes = chans[c]!;
    for (let g = 0; g < codes.length; g++) {
      const code = codes[g]!;
      const ox = (g % cols) * cell + margin;
      const oy = Math.floor(g / cols) * cell + margin;
      for (let y = 0; y < code.size; y++) {
        const row = (oy + y) * gridW + ox;
        const src = y * code.size;
        for (let x = 0; x < code.size; x++) {
          if (code.data[src + x]) data[(row + x) * 4 + c] = 0;
        }
      }
    }
  }
  return img;
}
