# Sending

Open `/send/`. Two modes, switched at the top: **File** and **Text snippet**.

- **File** — tap **Select File** (any file). Streaming starts immediately; the button becomes **Stop transfer**. Files are gzip-compressed only when that actually shrinks the optical payload.
  - Up to 64 MB the file travels as one stream.
  - Above that the sender splits it into segments of at most 16 MiB and streams them in turn, cycling until the receiver has them all. Each segment carries its own SHA-256 plus the hash of the whole file; the receiver verifies every segment on arrival, and the reassembled file again before offering it. Segments may arrive in any order, and a repeated one is ignored — so the sender can keep looping until the receiver is done. Expect this to take a while: a segmented transfer is many single transfers back to back.
- **Text snippet** — paste or type (up to 16 KB), tap **Start text stream**.

While streaming, the status line shows *Streaming ⟨name⟩ — Share receiver link*; the link opens a dialog with a QR of the receiver page, the copyable URL, and the OS share sheet.

**Tap the QR code to make it fullscreen** — as big as the device goes. Tap again (or Esc) to shrink back. A bigger physical code lets the receiver sit farther back or decode denser frames.

Leave the screen brightness at maximum. The stream loops forever; there is no "end" — the receiver finishes on its own.

## Transfer settings

Changing anything restarts the stream; the receiver resets automatically off the new session id. The grid at the bottom of the panel shows what the knobs produced (QR version, fountain blocks K, compression).

| setting | default | notes |
|---|---|---|
| tx fps | 60 | tuned for a 120 Hz sender; on a 60 Hz screen drop to 24–30 if the receiver stalls |
| bytes / frame | 2953 (QR v40) | the density ceiling — great phone-to-phone at close range; back off to 1465 (v27) for monitors or distance |
| error correction | L | the fountain layer handles erasures; L is the right trade at these sizes |
| display size | 900 px | capped by the screen; fullscreen ignores it |

Defaults favor the best-case demo. If a transfer crawls: bytes/frame → 1465, tx fps → 24, in that order.
