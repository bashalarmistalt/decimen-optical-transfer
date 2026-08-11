// gzip helpers shared by the single-stream file container (protocol.ts) and the
// segmented large-file container (segmented-transfer.ts). Both ends of both
// paths inflate bytes that arrived over the optical channel, so the ceiling in
// gunzipBytes() is not optional — see its comment.

/** Enough of a win to be worth the gzip header and a second buffer. */
export const GZIP_MIN_GAIN_BYTES = 64;

/** Below this a gzip stream costs more than it can ever save. */
export const GZIP_MIN_INPUT_BYTES = 768;

export async function gzipBytes(bytes: Uint8Array): Promise<Uint8Array> {
  const compressed = new Blob([bytes as BlobPart])
    .stream()
    .pipeThrough(new CompressionStream("gzip"));
  return new Uint8Array(await new Response(compressed).arrayBuffer());
}

/**
 * Inflate with a hard output ceiling.
 *
 * The gzip trailer's declared size is attacker-controlled — it arrives over the
 * optical channel like everything else — so it is a hint, never a bound. This
 * counts bytes as they come off the stream and aborts the moment they exceed
 * `maxBytes`, which the caller has already clamped to the length its own header
 * declares. Without this an 80 KB stream could claim to be small and inflate to
 * gigabytes.
 */
export async function gunzipBytes(bytes: Uint8Array, maxBytes: number): Promise<Uint8Array> {
  const inflated = new Blob([bytes as BlobPart])
    .stream()
    .pipeThrough(new DecompressionStream("gzip"));
  const reader = inflated.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.length;
    if (total > maxBytes) {
      await reader.cancel();
      throw new Error("The recovered file expands past its declared length.");
    }
    chunks.push(value);
  }
  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.length;
  }
  return out;
}

/**
 * Is gzip worth attempting on this payload at all?
 *
 * Trying costs a full-size allocation and a pass over every byte to discover the
 * answer, so both the size floor and the media-type check exist to skip that
 * cost when it cannot pay off.
 */
export function shouldTryGzip(byteLength: number, precompressed: boolean): boolean {
  return byteLength >= GZIP_MIN_INPUT_BYTES && !precompressed;
}
