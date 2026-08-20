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
| tx fps | 60 | tuned for a 120 Hz sender; on a 60 Hz screen drop to 24–30 if the receiver stalls |
| bytes / frame | 2953 (QR v40) | the density ceiling — great phone-to-phone at close range; back off to 1465 (v27) for monitors or distance |
| error correction | L | the fountain layer handles erasures; L is the right trade at these sizes |
| layout | 1 code | 2/4/6 same-version codes tiled at once, each an independent fountain frame; more codes need more camera resolution per module |
| display size | 900 px | capped by the screen; fullscreen ignores it |

Defaults favor the best-case demo. If a transfer crawls: bytes/frame → 1465, tx fps → 24, in that order.

## Export animation

The stream doesn't have to play live. **Export animation** (a subsection at the bottom of Transfer settings, visible while a stream is up) renders the same frames into a downloadable file. Any camera pointed at the file *playing* — in a browser tab, embedded in a page, inside a video — receives it exactly as if it were watching the live sender; the receiver needs nothing new.

The export inherits the Transfer settings above (bytes/frame, error correction, layout) and adds its own:

| option | default | notes |
|---|---|---|
| format | APNG | one looping animated PNG; plays in every browser. **PNG sequence (ZIP)** is numbered frames for video editors, which import a sequence at an exact rate — the ZIP includes a `frames-per-second.txt` note. |
| frame rate | 10 fps | 5/10/15/30 divide evenly into 30 and 60 fps video, so a re-encode drops nothing. 60 is full rate for direct playback; the live sender's caveat applies — a 60 Hz display gives each frame one refresh. |
| module scale | 4× | pixels per module, baked in. 1-px modules don't survive video compression; fat ones do. 1× is fine for playback in a browser at native size. |
| cycles | 2 | carousel cycles in the file. One cycle decodes at low loss, but a looping file replays the same repair frames forever — a second cycle adds the repair variety a lossy receive may need. |

The line under the options forecasts frames, file size (measured from a real sample frame, not modeled) and loop length. Rendering happens on the page — the forecast becomes a progress percentage and the button becomes **Cancel** — then the file downloads as `⟨name⟩.decimen.png` or `.zip`.

When embedding in video: keep the video's frame rate a whole multiple of the export's (dropped frames cost time, never correctness — but they do cost time), and don't let compression shrink the code — big in the frame, 4× scale or more.
