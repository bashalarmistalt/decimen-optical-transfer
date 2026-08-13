import { fnv1a, unpackFile, verifyFile, type OpticalFile } from "./protocol";

export type CompletionFailureReason =
  | "payload-checksum"
  | "container-invalid"
  | "file-digest";

export type CompletionVerification =
  | { ok: true; file: OpticalFile }
  | { ok: false; reason: CompletionFailureReason };

/** Verify recovered bytes without changing receiver state or tearing down I/O. */
export async function verifyCompletedPayload(
  payload: Uint8Array,
  expectedFnv: number,
): Promise<CompletionVerification> {
  if (fnv1a(payload) !== expectedFnv) return { ok: false, reason: "payload-checksum" };

  let file: OpticalFile;
  try {
    file = await unpackFile(payload);
  } catch {
    return { ok: false, reason: "container-invalid" };
  }

  try {
    return (await verifyFile(file))
      ? { ok: true, file }
      : { ok: false, reason: "file-digest" };
  } catch {
    return { ok: false, reason: "file-digest" };
  }
}

/**
 * Completion verification is asynchronous. One stream may have only one
 * verification in flight, while a newly detected stream must not wait for an
 * obsolete stream's digest to finish.
 */
export class CompletionClaims {
  private readonly active = new Set<string>();

  claim(identity: string): boolean {
    if (this.active.has(identity)) return false;
    this.active.add(identity);
    return true;
  }

  release(identity: string): void {
    this.active.delete(identity);
  }
}

/** Bounded duplicate suppression for worker replies that decode the same QR. */
export class RecentFrameFilter {
  private readonly keys = new Set<string>();
  private readonly order: string[] = [];

  constructor(private readonly limit = 256) {
    if (!Number.isInteger(limit) || limit < 1) throw new RangeError("limit must be positive");
  }

  isDuplicate(identity: string, seq: number): boolean {
    const key = `${identity}\u0000${seq}`;
    if (this.keys.has(key)) return true;
    this.keys.add(key);
    this.order.push(key);
    if (this.order.length > this.limit) {
      this.keys.delete(this.order.shift()!);
    }
    return false;
  }

  clear(): void {
    this.keys.clear();
    this.order.length = 0;
  }
}
