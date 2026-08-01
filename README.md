# Decimen Optical Transfer: fountain-coded QR file transfer

Send a file between two devices using nothing but a **screen and a camera**.
One page displays the file as an endless stream of animated QR codes; another
device points its camera at it and reconstructs the file. **No network path
between the devices, no app, no pairing, no permissions beyond the camera.**
The payload travels as light.

This is a minimal proof of concept extracted from a larger
experiment that reached **128 KB/s phone-to-phone** with denser frames,
multi-code grids, and an error-corrected color channel. This PoC keeps only
the essential trick & transmits a bundled demo image (512 KB or 2 MB) or
**any file you drop onto the sender page** at a comfortable rate.

<p align="center">
  <img src="docs/receiving.jpg" width="420"
       alt="Phone receiving a 2 MB image over light: 129.2 KB/s goodput, decoding the sender's animated QR code" />
</p>
<p align="center"><em>Mid-transfer: a phone pulling a 2 MB image out of the air at 129 KB/s.</em></p>

## Try it

**In a browser, no install:** the GitHub Pages demo at
`https://YOUR-GITHUB-USERNAME.github.io/decimen-optical-transfer/` · it
deploys automatically from `main` (enable once: repo **Settings -> Pages ->
Source: GitHub Actions**). The demo streams bundled sample payloads; the
receive page's camera works there bc github.io is https.

**Prebuilt apps:** the **Releases** page carries a macOS `.dmg` (Apple
silicon) & the pre-patched iOS Xcode project · each release describes its
install steps (`docs/release-macos.md`, `docs/release-ios.md`).

**From source:**

```bash
npm install
npm run dev
```

- On the **sending** device (a laptop is ideal): open
  `https://localhost:5173/send/` and it starts streaming immediately. Max
  screen brightness helps. To send your own file, drop it anywhere on the
  page (or pick one in Settings) & the stream restarts w/ it.
- On the **receiving** device (a phone): open the `Network` URL Vite prints
  (`https://<lan-ip>:5173/receive/`), accept the certificate warning once,
  tap **Start camera**, and point it at the code.
- A few seconds later: *Transfer Complete!* w/ the received file, verified
  by hash: a preview when it's an image, plus a **Save** button that
  downloads it under its original name.

**Why the dev server is https-only:** the receiver uses `getUserMedia`, and
browsers remove that API entirely on insecure origins: a phone reaching
your dev server over plain http has no camera, full stop (`localhost` is
exempt, but your phone isn't localhost). That's a web platform rule, not a
choice. The dev server therefore ships with a self-signed certificate
(`@vitejs/plugin-basic-ssl`); the browser will warn on first visit. Tap
"Show Details" then "visit this website" (iOS) or "Advanced" then "Proceed"
(Android/desktop), and the page is still a secure context, so the camera
works. The odd-looking `lvh.me` hosts Vite prints are a public convenience
domain that resolves to 127.0.0.1 (same machine, nothing extra running).

Hold the phone steady, or better, prop it against something. Camera
autofocus hunting from hand tremor is the #1 throughput killer.

## How it works

**The one-way channel problem.** A screen-to-camera link has no back-channel:
the receiver can't ask for retransmission, and it will inevitably miss frames
(blur, refresh straddling, autofocus). Looping the frames and hoping is
miserable: miss one frame and you wait a full cycle for it to come around.

**Fountain codes fix this completely.** The sender never sends the file's
blocks directly. Each frame is the XOR of a pseudorandom *subset* of blocks;
the subset is derived deterministically from the frame's sequence number,
with subset sizes drawn from a robust-soliton distribution ([Luby transform
coding](https://en.wikipedia.org/wiki/Luby_transform_code)). The receiver
collects **any** ~K·1.15 distinct frames, in any order, and peels the file
out of them. Dropped frames cost a little time, never correctness. Sender
and receiver frame rates don't need to match at all.

**Every frame is self-describing.** A 20-byte header carries the session id,
sequence number, block count/size, file length, and a hash. There is no
handshake: the receiver locks onto a stream mid-flight, and restarting the
sender (new session id) automatically resets the receiver. The payload
itself is wrapped w/ a tiny prefix (1 length byte + UTF-8 filename), so the
receiver can save whatever arrives under its real name & type.

**Decoding.** Safari has never shipped `BarcodeDetector` (WebKit bug 281848),
so decoding is [zxing-cpp](https://github.com/zxing-cpp/zxing-cpp) compiled
to WASM, running in workers fed by `requestVideoFrameCallback`. Busy workers
mean dropped frames, which the fountain happily absorbs.

## Hard-won details baked into this PoC

- **JS engines disagree about `Math.log`** (it's implementation-approximated).
  Sender and receiver must build bit-identical soliton distributions, so
  `fountain.ts` includes a deterministic log built from exactly-specified
  IEEE-754 ops. V8 vs JavaScriptCore desync is a silent, total failure mode.
- **iOS lies about camera frame rate.** `frameRate: {ideal: 60}` silently
  delivers 30; you must demand `{exact: 60}` (works at 1280-wide capture)
  and fall back. Always read back `getSettings()`.
- **`requestVideoFrameCallback` chains outlive their stream** and resume on
  the next one; without a generation counter, every stop/start leaks a
  zombie capture loop.
- **Progress bars must track frames collected, not blocks solved.** LT
  peeling back-loads its solve cascade: block-count progress looks stalled
  for most of the transfer, then teleports to 100%.
- **QR error correction is set to the minimum (L).** In-frame ECC and the
  fountain layer solve different problems (corruption vs erasure), but at
  these frame sizes level L plus frame disposal is the better trade.

## Tuning

The sender's **Transfer** side panel holds a file
picker, payload choice (your file or a 512 KB / 2 MB demo image), tx fps, bytes per frame, error-correction level, and
display size; accent color & presets live on the gear **Settings** page in
the main area. Changing anything restarts the stream, and the receiver resets
automatically off the new session id. On the receiver: capture width, capture fps, color, and decode worker
count (defaults 1280 · 60 · mono · 3), applied when the camera starts.

| setting | default | notes |
|---|---|---|
| tx fps | 60 | each frame must own at least 2 refresh cycles of the display, so the panel clamps the effective rate (60 lands 30-31 on a 60-62 Hz screen; true 60 needs a 120 Hz panel) |
| bytes / frame | 2953 (QR v40) | denser is faster if the receiver still decodes it; drop to 1465 (v27) for distance or shaky hands |
| grid | 1x1 | codes shown per frame; each code is an independent fountain frame, so 2x2 is a clean 4x multiplier w/o any protocol change |
| color | mono | rgb packs 3 codes per cell into the R/G/B channels (x3 ceiling); needs decent white balance & the receiver's Color set to rgb |

**Reading the panel honestly.** The sender now shows a live effective line
under the parameters: the true B/code after v40 capacity clamping for the
chosen error-correction level (2953 needs L; picking M silently used to
drop you to 2331), the fps after clamping to half the measured display
refresh (60 fps on a 60 Hz panel tears half the frames for the camera), &
the resulting KB/s ceiling. The receiver's crop tracker is now sticky: a
torn frame that decodes one code of a grid no longer collapses the ROI to
that quadrant (it grows-only, re-anchoring after ~30 sustained-small
captures), which is what silently turned 2x2 runs into 1x1 performance.

**Reaching Bluetooth-class speeds.** Goodput = bytes/code x codes/frame x
fps / ~1.18 fountain overhead x decode success. 2x2 w/ 1465 B at 30 fps
budgets ~145 KB/s goodput, i.e. Bluetooth Classic territory; 2x2 w/ 2953 B
(V40) budgets ~290 KB/s. The catch is pixels-per-module at the camera:
2x2 V27 wants >=1280-wide capture w/ the grid filling the viewfinder, 2x2
V40 wants 1920 capture, propped & close. Old receivers still work against
a gridded sender, they just decode one code per capture instead of all of
them, bc every code is self-describing.

## What this new PR adds

The PoC above grew into a shippable app in this tree; the additions, in the
order they earned their place:

- **App shells & pipelines.** Tauri macOS .app + iOS app, fully offline, w/
  one-command builds (`build_macos_app` / `build_ios_app`): standalone Xcode
  build phase, Info.plist merge (camera usage, file sharing), icon
  generation from one master, scoped plugin-fs saves.
- **Launcher & galleries.** A landing launcher, sent + received galleries w/
  full-size originals persisted (IndexedDB, 60 items / 384 MB, oldest-first
  eviction), & a fullscreen viewer w/ a save/export control on every
  platform: plugin-fs to Downloads / the Files app under Tauri, a blob
  download in browsers (incl. the Pages demo).
- **Receive pipeline.** Sticky grow-only grid ROI w/ re-anchor (fixes the
  quadrant collapse that turned 2x2 into 1x1), per-cell parallel decode
  fan-out w/ per-round aggregation, worker count to 8, ImageBitmap ->
  OffscreenCanvas readback inside workers, a duplicate-capture skim skip, &
  plane-sighting dedupe.
- **Sender.** Preset chips incl. **Prime** (upstream's ~130 KB/s field
  recipe: 60 fps · 2953 B · 1x1 · L), the live effective-params line
  (capacity clamp, display-safe fps, KB/s ceiling), grids to 3x2, & an
  **rgb x3** channel-multiplex mode: three independent droplet codes per
  cell packed into the R/G/B channels; a failed plane is just a lost
  droplet, bc the fountain never learns color exists.
- **Field-tuned defaults.** Sender: 60 fps · 2953 B · My file as the first
  source toggle. Receiver: 1280 wide · 60 cap fps · mono · 3 workers.
- **Ops.** Global error overlays on every page, accent theming, phone-safe
  chrome (safe-area insets, bottom tab rail), & a GitHub Pages demo
  workflow (`npm run build:pages` + actions deploy).
- All shebang scripts need to be `chmod +x [name-of-shebang]` to make them executable.
- iOS & macOS markdowns are in the `docs` folder & both app bundles are in the `app_bundles` folder.

The parent experiment's measured ceiling with this exact architecture plus
denser frames, a 120 fps ProMotion sender, and stacked codes: ~128 KB/s
handheld, ~186 KB/s propped.

## Similar projects

The concept here was arrived at independently. It turns out
several people have had similar ideas, and their takes are all
worth a look:

- [mohankumarelec/airgapped-qr-code-transfer](https://github.com/mohankumarelec/airgapped-qr-code-transfer):
  browser-based QR file transfer with compression and sequential chunking.
  Discovered after publicly demoing this project; convergent evolution in
  action.
- [divan/txqr](https://github.com/divan/txqr) (2018): animated QR plus
  fountain codes in Go, with two excellent write-ups on why fountain coding
  beats sequential looping.
- [sz3/libcimbar](https://github.com/sz3/libcimbar): goes past QR entirely
  with a custom high-density color code purpose-built for this channel.

Built with [node-qrcode](https://github.com/soldair/node-qrcode) and
[zxing-wasm](https://github.com/Sec-ant/zxing-wasm).

## License

MIT
