import assert from "node:assert/strict";
import test from "node:test";
import { LTDecoder, LTEncoder } from "../shared/fountain.ts";
import { fnv1a, packFile } from "../shared/protocol.ts";
import {
  CompletionClaims,
  RecentFrameFilter,
  verifyCompletedPayload,
} from "../shared/receiver-session.ts";

test("completion verification classifies each recoverable failure", async () => {
  const packed = await packFile(
    "payload.bin",
    "application/octet-stream",
    new Uint8Array([1, 2, 3, 4]),
  );

  assert.deepEqual(await verifyCompletedPayload(packed.container, fnv1a(packed.container) ^ 1), {
    ok: false,
    reason: "payload-checksum",
  });

  const malformed = packed.container.slice();
  malformed[0] ^= 0xff;
  assert.deepEqual(await verifyCompletedPayload(malformed, fnv1a(malformed)), {
    ok: false,
    reason: "container-invalid",
  });

  const badDigest = packed.container.slice();
  badDigest[17] ^= 0xff;
  assert.deepEqual(await verifyCompletedPayload(badDigest, fnv1a(badDigest)), {
    ok: false,
    reason: "file-digest",
  });
});

test("a failed assembly can be recovered by a fresh decoder on the same stream", async () => {
  const packed = await packFile(
    "payload.bin",
    "application/octet-stream",
    new Uint8Array(2_000).map((_, i) => (i * 37) & 0xff),
  );
  const sessionId = 42;
  const encoder = new LTEncoder(packed.container, 256, sessionId);

  const poisoned = new LTDecoder(encoder.k, encoder.blockLen, sessionId, packed.container.length);
  for (let seq = 0; seq < encoder.k; seq++) {
    const block = encoder.encode(seq);
    if (seq === 0) block[0] ^= 0xff;
    poisoned.addFrame(seq, block);
  }
  assert.ok(poisoned.isComplete);
  const first = await verifyCompletedPayload(poisoned.assemble()!, fnv1a(packed.container));
  assert.deepEqual(first, { ok: false, reason: "payload-checksum" });

  const replacement = new LTDecoder(
    encoder.k,
    encoder.blockLen,
    sessionId,
    packed.container.length,
  );
  for (let seq = 0; seq < encoder.k; seq++) replacement.addFrame(seq, encoder.encode(seq));
  const second = await verifyCompletedPayload(replacement.assemble()!, fnv1a(packed.container));
  assert.equal(second.ok, true);
});

test("completion claims suppress same-stream races without blocking a new stream", () => {
  const claims = new CompletionClaims();
  assert.equal(claims.claim("stream-a"), true);
  assert.equal(claims.claim("stream-a"), false);
  assert.equal(claims.claim("stream-b"), true);
  claims.release("stream-a");
  assert.equal(claims.claim("stream-a"), true);
});

test("recent-frame filtering suppresses duplicates and stays bounded", () => {
  const frames = new RecentFrameFilter(2);
  assert.equal(frames.isDuplicate("stream", 1), false);
  assert.equal(frames.isDuplicate("stream", 1), true);
  assert.equal(frames.isDuplicate("stream", 2), false);
  assert.equal(frames.isDuplicate("stream", 3), false);
  assert.equal(frames.isDuplicate("stream", 1), false, "old entries should be evicted");
  frames.clear();
  assert.equal(frames.isDuplicate("stream", 3), false);
});
