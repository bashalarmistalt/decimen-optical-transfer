# Decimen Optical Transfer: fountain-coded QR file transfer
![screenshot.png](public/screenshot.png)

Transfer files between devices with light — zero network, zero pairing, 100% offline.

a Progressive Web App that moves files and text snippets from one screen to another device's camera using fountain-coded animated QR codes.

Why it's useful:
- Air-gapped & offline: No Wi-Fi, Bluetooth, local LAN path, cloud storage, or account required.
- Fountain-coded transmission: Uses Luby transform (soliton) fountain codes so the receiver can scan frames in any order. Dropping a frame never corrupts the transfer.
- Any file or text: Automatically compresses compressible data with gzip and restores original filenames and bytes bit-exact (verified via SHA-256).
- Zero-install PWA: Runs entirely in the browser. You can install it once and use it offline forever.

Open it on your laptop, point your phone camera at the screen, and transfer files with light.
Send a file between two devices using nothing but a **screen and a camera**.
One page displays the file as an endless stream of animated QR codes; another
device points its camera at it and reconstructs the file. **No network path
between the devices, no app, no pairing, no permissions beyond the camera.**
The payload travels as light.

**Live at [App](https://decimen-opt.pages.dev/)** — open it on both devices and
go. Works offline after the first visit.

This is a minimal proof of concept extracted from a larger
experiment that reached **128 KB/s phone-to-phone** with denser frames,
multi-code grids, and an error-corrected color channel. This version accepts
arbitrary files up to 64 MB, preserves their filename and media type inside
the fountain stream, adaptively uses gzip only when it shrinks the optical
payload, and verifies SHA-256 before offering the received file for download.
The sender can also stream a pasted text snippet instead of a file; the
receiver works out which one is arriving from the container's media type.

<p align="center">
  <img src="docs/receiving.jpg" width="420"
       alt="Phone receiving a 2 MB image over light: 129.2 KB/s goodput, decoding the sender's animated QR code" />
</p>
<p align="center"><em>Mid-transfer: a phone pulling a 2 MB image out of the air at 129 KB/s.</em></p>

## Try it

The hosted site is live at [App](https://decimen-opt.pages.dev/); everything
below is for running it yourself.

```bash
npm install
npm run dev               # dev server with HMR
npm run serve             # build, then serve the production bundle
npm run demo              # demo mode: only the bundled payloads can be sent
npm test                  # golden wire-format vectors and unit tests
npm run build             # the hosted site → dist/
npm run build:standalone  # both self-contained pages → dist-standalone/
npm run build:all         # everything
```

`npm run demo` locks the sender to the two bundled images — no file picker, no
text box. Use it when the sending machine is going to sit unattended in front
of people, so nobody can browse the host's filesystem through the picker. It
runs the dev server with `VITE_DEMO=1`, which swaps the sender's controls for
the demo payload buttons and never wires up the file input. Note that this is
the dev server, not a hardened kiosk: the picker markup is still in the DOM
(inert, and hidden), and anyone with the machine's keyboard has devtools.

- On the **sending** device (a laptop is ideal): open
  `https://localhost:5173/send/`, choose a file, and it starts streaming. Max
  screen brightness helps.
- On the **receiving** device (a phone): open the `Network` URL Vite prints
  (`https://<lan-ip>:5173/receive/`), accept the certificate warning once,
  tap **Start camera**, and point it at the code.
- When recovery completes, save the received file after its SHA-256 check
  passes.
- To send text instead, flip the sender to **Text snippet** and paste into the
  box. The receiver is the same page either way — nothing is stored, the text
  is shown with a copy button and is gone when you close the tab.

Neither mode is encrypted: whatever is on the sending screen is readable by
any camera pointed at it. The property this gives you is no network, not
confidentiality.

## Ways to run it

Three shapes, all built from the same source.

| | what it is | needs a server? | offline |
|---|---|---|---|
| **Hosted site** | the three pages, plus a service worker — live at [App](https://decimen-opt.pages.dev/) | yes, any static host | after the first visit |
| **`decimen-sender.html`** | one file, ~55 KB | no | always |
| **`decimen-receiver.html`** | one file, ~1.3 MB | see below | always |

Built artifacts for all three are attached to every
[release](../../releases).

### Hosted site, offline afterwards

The built site registers a service worker that precaches every page, the
decoder wasm included. Load it once over the network, then add it to your home
screen: it opens and transfers with the network off. This is the one to use on
a phone — it keeps a real `https://` origin, which is what the camera wants.

Any of the three pages will do it — the registration is rooted at the site, not
at the page, so landing straight on `/receive/` from a shared link caches the
whole thing just as visiting the home page does.

### Standalone files

`npm run build:standalone` produces two pages with nothing external in them at
all: no `<script src>`, no stylesheet link, no fetch. The receiver carries the
940 KB decoder wasm as a `data:` URI and its decode worker as a base64 blob
URL, which is why it is 1.3 MB. Mail one to someone, drop it on a USB stick,
open it — no install, no server, no network.

**The receiver has one real caveat.** Opening it from `file://` gives the page
an opaque origin. `file://` counts as a secure context, so `navigator.media
Devices` exists and nothing *looks* wrong, but the camera permission is keyed
to that origin — desktop Chrome and Firefox will generally prompt and work,
while **iOS Safari and Android Chrome opening a local file will not give you a
camera.** Since the receiver is usually the phone, that matters. Serve the file
over http(s) from anything, or use the hosted site's offline mode instead.

The sender has no such problem — canvas and QR generation only. It works from
`file://` everywhere.

### Deploying

Three workflows in `.github/workflows`:

- **`ci.yml`** — tests and builds on every push to `main` or `release/*` and on
  every PR. Also asserts the served `receive` chunk stays under 20 KB, which
  catches the inlined worker or wasm leaking out of the standalone build into
  the site, and that each page's manifest and service-worker references point
  at files that exist.
- **`pages.yml`** — deploys the site to GitHub Pages on every push to `main`.
  Enable it once under Settings → Pages → Source → GitHub Actions.
- **`release.yml`** — on a `v*` tag, builds everything and attaches
  `decimen-<tag>-site.zip`, `decimen-<tag>-sender.html`,
  `decimen-<tag>-receiver.html`, and `SHA256SUMS.txt` to the release.

The site build uses `base: "./"`, so it works under a project subpath
(`user.github.io/repo/`) with no configuration.


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
sender (new session id) automatically resets the receiver.

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
  for most of the transfer, then teleports to 100%. The receiver estimates
  remaining time from its observed unique-frame rate. A hybrid of incoming
  frames and actually decoded blocks keeps the bar moving through redundancy;
  only verified completion reaches 100%.
- **QR error correction is set to the minimum (L).** In-frame ECC and the
  fountain layer solve different problems (corruption vs erasure), but at
  these frame sizes level L plus frame disposal is the better trade.

## Tuning

Both pages have a collapsed **Settings** panel. On the sender: tx fps, bytes
per frame, error-correction level, and display size. Changing anything
restarts the stream, and the receiver resets automatically off the new
session id. On the receiver: capture width, capture fps, and decode worker
count, applied live while the camera runs — a device that refuses a live
reconfigure (iOS, sometimes) keeps the current stream and says so.

| setting | default | notes |
|---|---|---|
| tx fps | 60 | tuned for goodput on a 120 Hz sender; on a 60 Hz screen each frame owns a single refresh, so drop to 24–30 if the receiver stalls |
| bytes / frame | 2953 (QR v40) | the density ceiling. Great phone-to-phone at close range; back off to 1465 (v27) for arbitrary monitors or a distant camera |

The defaults are set for the best-case demo rather than the safest handshake.
If a transfer crawls, the two things to try first are dropping bytes/frame to
1465 and tx fps to 24.

The parent experiment's measured ceiling with this exact architecture plus
denser frames, a 120 fps ProMotion sender, and stacked codes: ~128 KB/s
handheld, ~186 KB/s propped.

## Similar projects

The concept here was arrived at independently. It turns out
several people have had similar ideas, and their takes are all
worth a look:
- [bashalarmistalt/decimen-optical-transfer](https://github.com/bashalarmistalt/decimen-optical-transfer/): initial app and idea.
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
