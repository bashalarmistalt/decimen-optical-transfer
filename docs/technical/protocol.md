# Protocol

## The one-way channel problem

A screen-to-camera link has no back-channel: the receiver can't ask for retransmission, and it will inevitably miss frames (blur, refresh straddling, autofocus). Looping the frames and hoping is miserable — miss one frame and you wait a full cycle for it to come around.

## Fountain coding

The sender never sends the file's blocks directly. Each frame is the XOR of a pseudorandom *subset* of blocks; the subset is derived deterministically from the frame's sequence number, with subset sizes drawn from a robust-soliton distribution ([Luby transform coding](https://en.wikipedia.org/wiki/Luby_transform_code)). The receiver collects **any** ~K·1.15 distinct frames, in any order, and peels the file out. Dropped frames cost a little time, never correctness; sender and receiver frame rates need not match.

Sender and receiver must build **bit-identical** soliton distributions, and JS engines disagree about `Math.log` (implementation-approximated). `fountain.ts` therefore includes a deterministic log built from exactly-specified IEEE-754 ops — V8 vs JavaScriptCore desync is a silent, total failure mode.

## Frames are self-describing

A 20-byte header carries session id, sequence number, block count/size, total length, and a payload hash. No handshake: the receiver locks onto a stream mid-flight, and restarting the sender (new session id) resets the receiver automatically. Stream identity covers *every* header field that must hold constant, not just the session id.

## Container

Inside the fountain payload, a container preserves filename, media type, optional gzip (applied only when it shrinks the payload), and the SHA-256 of the original bytes. The receiver distinguishes files from text snippets by the container's media type, and verifies SHA-256 before offering anything.

## Segmented transfers

One stream numbers its source blocks in 16 bits, so a large file cannot fit in a single stream no matter how the file-size limit is set. Above 64 MB the sender switches to a second container (`DCS1`, version 2) nested the same way: it carries a random transfer id, the file identity, the segment's placement (index, count, offset, length), the SHA-256 of the whole file and of that segment, and — as of version 2 — its own gzip flag and on-wire length, so a segment compresses on the same terms as a single-stream file.

Each segment is streamed as an independent fountain session and the sender cycles through them forever. The receiver keys segments by transfer id plus file identity, verifies each one's SHA-256 as it lands, tolerates any arrival order and ignores repeats, then verifies the reassembled file against the whole-file hash before offering it.

Segments are capped at 16 MiB (`MAX_SEGMENT_PAYLOAD_BYTES`) rather than at whatever the block ceiling allows: both ends handle a segment whole, so the cap is what keeps the live set small enough for a phone.

## QR layer

Error correction stays at L: in-frame ECC and the fountain solve different problems (corruption vs erasure), and at these frame sizes "decode whole or discard" plus fountain redundancy is the better trade. The mask pattern is pinned (any declared mask is valid to a decoder), skipping the spec's 8-way mask evaluation for ~4× faster generation.

Golden wire-format vectors live in `tests/` — the encoder and decoder are held to fixed bytes, not just to each other.
