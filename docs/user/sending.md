# Sending

Open `/send/`. Two modes, switched at the top: **File** and **Text snippet**.

- **File** — tap **Select File** (any file up to 64 MB). Streaming starts immediately; the button becomes **Stop transfer**. Files are gzip-compressed only when that actually shrinks the optical payload.
- **Text snippet** — paste or type (up to 16 KB), tap **Start text stream**.

While streaming, the status line shows *Streaming ⟨name⟩ — Share receiver link*; the link opens a dialog with a QR of the receiver page, the copyable URL, and the OS share sheet.

**Tap the QR code to make it fullscreen** — as big as the device goes. Tap again (or Esc) to shrink back. A bigger physical code lets the receiver sit farther back or decode denser frames.

Leave the screen brightness at maximum. The stream loops forever; there is no "end" — the receiver finishes on its own.

## Transfer settings

Changing anything restarts the stream; the receiver resets automatically off the new session id. The grid at the bottom of the panel shows what the knobs produced (QR version, fountain blocks K, compression).

| setting | default | notes |
|---|---|---|
| tx fps | adaptive | 30 on a typical 60 Hz display; up to 60 when the display can hold each QR for about two refreshes |
| bytes / frame | 2953 (QR v40) | the density ceiling — great phone-to-phone at close range; back off to 1465 (v27) for monitors or distance |
| error correction | L | the fountain layer handles erasures; L is the right trade at these sizes |
| layout | adaptive | 2 codes on phones; 4 on larger displays. One code is the compatibility/long-distance setting, not the fast preset |
| display size | 900 px | capped by the screen; fullscreen ignores it |
| color channel (beta) | off | opt-in two-frame QR; test the exact sending display and receiving camera before relying on it |

The measured 418 KB/s benchmark uses four codes. A single code commonly lands
around 30–60 KB/s because goodput is the number of unique frames decoded each
second times the fountain block size. If a transfer crawls even with the
adaptive preset: bytes/frame → 1465, tx fps → 24, in that order.

The color beta uses blue/black and yellow/white module pairs to carry a second
fountain frame without changing the QR seen in luminance. A current receiver
can recover both frames; an older v3 receiver ignores the feature flag and
continues from the primary frames. Color performance depends on the display,
camera, brightness, viewing angle, and room light, so leave it off unless that
device pair has completed a verified test transfer.
