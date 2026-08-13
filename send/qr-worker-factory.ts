// Served builds: a module worker fetched by URL, matching the receive side's
// worker-factory pattern.
//
// Standalone builds swap this file for qr-worker-factory.inline.ts at resolve
// time (see vite.config.ts / build/use-inline-variants.ts).
export function createQrWorker(): Worker {
  return new Worker(new URL("./qr-worker.ts", import.meta.url), { type: "module" });
}
