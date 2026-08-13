// Ordered pool of QR-encode workers for the sender. Unlike DecodeWorkerPool
// (receive side), which is fire-and-drop, this pool hands every result back to
// the caller keyed by request id, and the sender drains results strictly in
// sequence order, so out-of-order completion is harmless. Bytes buffers are
// transferred to the workers at zero copy; the returned raster pixel buffers
// are transferred back the same way.

export interface QrGenWorker {
  onmessage: ((event: MessageEvent) => void) | null;
  postMessage(message: unknown, transfer?: Transferable[]): void;
  terminate(): void;
}

export type QrEcc = "L" | "M" | "Q" | "H";

export interface QrGenRequest {
  id: number;
  /** Locked after the first frame; undefined lets the worker auto-select the
   *  version, which is deterministic for a fixed byte length + ECC. */
  version?: number;
  ecc: QrEcc;
  bytes: Uint8Array;
}

export interface QrGenResult {
  id: number;
  version: number;
  size: number;
  pixels: Uint32Array<ArrayBuffer>;
}

export interface QrGenError {
  id: number;
  error: string;
}

export class QrGenPool {
  private readonly workers: QrGenWorker[] = [];
  private readonly busy: boolean[] = [];
  private readonly queue: QrGenRequest[] = [];
  private terminated = false;

  constructor(
    count: number,
    private readonly onResult: (result: QrGenResult) => void,
    private readonly onError: (error: QrGenError) => void,
    create: () => QrGenWorker,
  ) {
    for (let i = 0; i < count; i++) {
      this.busy.push(false);
      const worker = create();
      worker.onmessage = (event: MessageEvent) => {
        if (this.terminated) return;
        this.busy[i] = false;
        const message = event.data as QrGenResult | QrGenError;
        if ("error" in message) this.onError(message);
        else this.onResult(message);
        this.dispatchNext();
      };
      this.workers.push(worker);
    }
  }

  submit(request: QrGenRequest): void {
    if (this.terminated) return;
    this.queue.push(request);
    this.dispatchNext();
  }

  /** Drops queued work and terminates the workers. Call when a stream ends or a
   *  new stream takes over (a stale callback must not outlive its `generation`). */
  terminate(): void {
    if (this.terminated) return;
    this.terminated = true;
    this.queue.length = 0;
    for (const worker of this.workers) {
      worker.onmessage = null;
      worker.terminate();
    }
    this.workers.length = 0;
    this.busy.length = 0;
  }

  private dispatchNext(): void {
    if (this.terminated) return;
    while (this.queue.length > 0) {
      const slot = this.busy.indexOf(false);
      if (slot === -1) return; // all workers busy — wait for the next onmessage
      const request = this.queue.shift()!;
      this.busy[slot] = true;
      this.workers[slot]!.postMessage(request, [request.bytes.buffer as ArrayBuffer]);
    }
  }
}
