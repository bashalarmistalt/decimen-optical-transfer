// Hand-written types for the decimen-codec build (embind API). Source of
// truth: ../../../decimen-codec/wrapper/decimen_codec.cpp — keep in step.

export interface DecimenPoint {
  x: number;
  y: number;
}

export interface DecimenQuad {
  topLeft: DecimenPoint;
  topRight: DecimenPoint;
  bottomRight: DecimenPoint;
  bottomLeft: DecimenPoint;
}

export interface DecimenResult {
  valid: boolean;
  error: string;
  bytes: Uint8Array;
  position: DecimenQuad;
  /** Symbol dimension in modules (17 + 4·version); 0 when unknown. */
  modules: number;
}

export interface DecimenResultVector {
  size(): number;
  get(index: number): DecimenResult;
  delete(): void;
}

export interface DecimenModule {
  _malloc(bytes: number): number;
  _free(ptr: number): void;
  HEAPU8: Uint8Array;
  /** Codec version (decimen-codec package.json at build time), e.g. "0.3.0-beta.1". */
  version(): string;
  /** Build id: git short hash, "-dirty" when built from an uncommitted tree. */
  build(): string;
  readFull(
    ptr: number,
    width: number,
    height: number,
    tryHarder: boolean,
    maxSymbols: number,
    returnErrors: boolean,
  ): DecimenResultVector;
  readTracked(
    ptr: number,
    width: number,
    height: number,
    dim: number,
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    x3: number,
    y3: number,
  ): DecimenResult;
  /** Decode a row-major QR module matrix (one byte per module, 0/1). */
  readMatrix(ptr: number, dim: number): DecimenResult;
  /** Debug: the raw sampled module grid for a quad — dim×dim row-major 0/1,
   *  or null when binarization or sampling fails. */
  trackedMatrix(
    ptr: number,
    width: number,
    height: number,
    dim: number,
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    x3: number,
    y3: number,
  ): Uint8Array | null;
  /** Debug: project one module-space point through the tracked transform. */
  projectPoint(
    dim: number,
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    x3: number,
    y3: number,
    mx: number,
    my: number,
  ): { x: number; y: number; valid: boolean };
  /** Debug: one row of the binarized matrix, 0/1 per pixel, or null. */
  binarizedRow(ptr: number, width: number, height: number, y: number): Uint8Array | null;
}

export default function DecimenCodec(options?: {
  locateFile?: (path: string, prefix: string) => string;
  instantiateWasm?: (
    imports: WebAssembly.Imports,
    done: (instance: WebAssembly.Instance, module: WebAssembly.Module) => void,
  ) => object;
}): Promise<DecimenModule>;
