import assert from "node:assert/strict";
import test from "node:test";
import {
  QrGenPool,
  type QrGenError,
  type QrGenRequest,
  type QrGenResult,
  type QrGenWorker,
} from "../shared/qr-pool.ts";

class FakeWorker implements QrGenWorker {
  onmessage: ((event: MessageEvent) => void) | null = null;
  readonly sent: QrGenRequest[] = [];
  readonly transfers: Transferable[][] = [];
  terminated = false;

  postMessage(message: unknown, transfer: Transferable[] = []): void {
    this.sent.push(message as QrGenRequest);
    this.transfers.push(transfer);
  }

  terminate(): void {
    this.terminated = true;
  }

  reply(message: QrGenResult | QrGenError): void {
    this.onmessage?.({ data: message } as MessageEvent);
  }
}

function request(id: number): QrGenRequest {
  return { id, ecc: "L", bytes: new Uint8Array([id]) };
}

function result(id: number): QrGenResult {
  return { id, version: 1, size: 29, pixels: new Uint32Array(29 * 29) };
}

function harness(count = 2) {
  const workers: FakeWorker[] = [];
  const results: QrGenResult[] = [];
  const errors: QrGenError[] = [];
  const pool = new QrGenPool(
    count,
    (value) => results.push(value),
    (value) => errors.push(value),
    () => {
      const worker = new FakeWorker();
      workers.push(worker);
      return worker;
    },
  );
  return { pool, workers, results, errors };
}

test("workers run concurrently and a freed slot takes queued work", () => {
  const { pool, workers, results } = harness();
  pool.submit(request(0));
  pool.submit(request(1));
  pool.submit(request(2));

  assert.deepEqual(workers.map((worker) => worker.sent.map(({ id }) => id)), [[0], [1]]);
  assert.equal(workers[0]!.transfers[0]![0], workers[0]!.sent[0]!.bytes.buffer);

  workers[1]!.reply(result(1));
  assert.deepEqual(results.map(({ id }) => id), [1], "pool completion order is intentionally raw");
  assert.deepEqual(workers[1]!.sent.map(({ id }) => id), [1, 2]);
});

test("worker errors use the error callback and still free the slot", () => {
  const { pool, workers, errors } = harness(1);
  pool.submit(request(0));
  pool.submit(request(1));
  workers[0]!.reply({ id: 0, error: "too dense" });

  assert.deepEqual(errors, [{ id: 0, error: "too dense" }]);
  assert.deepEqual(workers[0]!.sent.map(({ id }) => id), [0, 1]);
});

test("termination drops queued work and prevents stale callbacks", () => {
  const { pool, workers, results, errors } = harness(1);
  pool.submit(request(0));
  pool.submit(request(1));
  const staleHandler = workers[0]!.onmessage;
  pool.terminate();

  assert.equal(workers[0]!.terminated, true);
  assert.equal(workers[0]!.onmessage, null);
  staleHandler?.({ data: result(0) } as MessageEvent);
  pool.submit(request(2));
  assert.deepEqual(results, []);
  assert.deepEqual(errors, []);
  assert.deepEqual(workers[0]!.sent.map(({ id }) => id), [0]);
});
