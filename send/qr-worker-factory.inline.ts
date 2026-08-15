// Standalone builds only. A module worker loaded from a file:// page is blocked
// by the opaque origin, so the worker ships as a base64 blob URL, which file://
// permits. Same trade-off as the receive side's worker-factory.inline.ts.
import InlineQrWorker from "./qr-worker.ts?worker&inline";

export function createQrWorker(): Worker {
  return new InlineQrWorker();
}
