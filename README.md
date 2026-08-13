# Decimen Optical Transfer: fountain-coded QR file transfer

Send a file between two devices using nothing but a **screen and a camera**.
One page displays the file as an endless stream of animated QR codes; another
device points its camera at it and reconstructs the file. **No network path
between the devices, no app, no pairing, no permissions beyond the camera.**
The payload travels as light.

## Try it

### **→ [decimen.app](https://decimen.app/)**

Open it on both devices and go — nothing to install. Works offline after the
first visit, and installs as an app on both iOS and Android if you want it on
a home screen.

Files up to 64 MB (or a pasted text snippet), filename and media type
preserved, gzip only when it helps, SHA-256 verified before anything is
offered — and received video plays right in the page. The interface speaks
twelve languages (English, español, português, français, Deutsch, italiano,
русский, हिन्दी, 简体中文, 日本語, 한국어, العربية — with right-to-left
layout where it belongs); machine-drafted translations say so on the page
until a native speaker has [reviewed them](docs/technical/localization.md). Currently measured at
**<!-- speed:begin -->418.5 KB/s sustained<!-- speed:end -->** screen to
camera — [records with receipts](#measured-speed).

<p align="center">
  <img src="docs/receiving.jpg" width="420"
       alt="Phone receiving a file over light: 130.5 KB/s goodput, halfway through decoding the sender's animated QR stream" />
</p>
<p align="center"><em>Mid-transfer: a phone pulling a file out of the air at 130 KB/s.</em></p>

Neither mode is encrypted: whatever is on the sending screen is readable by
any camera pointed at it. The property this gives you is no network, not
confidentiality — see [privacy](docs/user/privacy.md).

## Measured speed

<!-- benchmarks:begin -->
![sustained record](https://img.shields.io/badge/dynamic/json?label=sustained&color=blue&query=%24.sustained.badge&url=https%3A%2F%2Fraw.githubusercontent.com%2Fbashalarmistalt%2Fdecimen-optical-transfer%2Fmain%2Fbenchmarks%2Frecords.json)

One record run per device pair. Sustained is whole-transfer goodput;
peak is the best ≥1 s window inside that same run. Every row links to
the full diagnostics run report that produced it; settings identify the
sender configuration used by newly promoted records
([how these are measured](docs/technical/diagnostics.md)).

| pair | sustained | peak | transfer | codes | settings | devices | when | receipt |
|---|---|---|---|---|---|---|---|---|
| desktop → phone | **418.5 KB/s** | **601.5 KB/s** | 1.0 MB in 2.5 s | 4 | legacy record | Odyssey G9 49″ → iPhone 17 Pro Max | 2026-08-09 (v0.4.0) | [run](benchmarks/runs/2026-08-09T04-12-41-run.json) |
| phone → phone | **199.2 KB/s** | **340.8 KB/s** | 1.0 MB in 5.1 s | 2 | legacy record | iPhone 17 Pro Max → iPhone 17 Pro Max | 2026-08-09 (v0.4.0) | [run](benchmarks/runs/2026-08-09T04-49-39-run.json) |
<!-- benchmarks:end -->

## Documentation

**Using it** — [quick start](docs/user/quick-start.md) ·
[sending](docs/user/sending.md) · [receiving](docs/user/receiving.md) ·
[troubleshooting](docs/user/troubleshooting.md) ·
[install & offline](docs/user/install-and-offline.md) ·
[privacy](docs/user/privacy.md)

**How it's built** — [architecture](docs/technical/architecture.md) ·
[protocol](docs/technical/protocol.md) ·
[platform quirks](docs/technical/platform-quirks.md) ·
[build & release](docs/technical/build-and-release.md) ·
[localization](docs/technical/localization.md)

The short version of the protocol: a screen-to-camera link has no
back-channel, so the sender streams fountain-coded frames ([Luby
transform](https://en.wikipedia.org/wiki/Luby_transform_code)) — the receiver
collects *any* ~K·1.15 distinct frames in any order and peels the file out.
Dropped frames cost time, never correctness.

## Run it yourself

```bash
npm install
npm run dev               # https dev server with HMR
npm run serve             # build, then serve the production bundle
npm run demo              # demo mode: only the bundled payloads can be sent
npm run diagnostics       # dev server + per-transfer run reports in the terminal
npm run benchmark         # diagnostics + sender locked to the canonical 1 MB payload
npm run benchmark:promote # declare your best captured run a record (updates the table above)
npm test                  # golden wire-format vectors and unit tests
npm run build             # the hosted site → dist/
npm run build:standalone  # both self-contained pages → dist-standalone/
npm run build:all         # everything
```

Open `https://localhost:5173/send/` on the sending device and the printed
`Network` URL on the receiving phone (accept the self-signed certificate
once). Walkthrough: [quick start](docs/user/quick-start.md).

## Similar projects

The concept here was arrived at independently. It turns out several people
have had similar ideas, and their takes are all worth a look:

- [mohankumarelec/airgapped-qr-code-transfer](https://github.com/mohankumarelec/airgapped-qr-code-transfer):
  browser-based QR file transfer with compression and sequential chunking.
  Discovered after publicly demoing this project; convergent evolution in
  action.
- [divan/txqr](https://github.com/divan/txqr) (2018): animated QR plus
  fountain codes in Go, with two excellent write-ups on why fountain coding
  beats sequential looping.
- [sz3/libcimbar](https://github.com/sz3/libcimbar): goes past QR entirely
  with a custom high-density color code purpose-built for this channel.

Built by [Evan Crawley (Bash Alarmist)](https://www.linkedin.com/in/evan-crawley), with
[node-qrcode](https://github.com/soldair/node-qrcode) and
[decimen-codec](https://github.com/bashalarmistalt/decimen-codec), a custom
[zxing-cpp](https://github.com/zxing-cpp/zxing-cpp) build.

## License

[AGPL-3.0-or-later](LICENSE), as of v0.4.0. Releases up to and including
v0.3.0 were MIT-licensed and remain available under those terms.

Portions were contributed under MIT, and the vendored
[decimen-codec](https://github.com/bashalarmistalt/decimen-codec) decoder
(AGPL-3.0-or-later) incorporates
[zxing-cpp](https://github.com/zxing-cpp/zxing-cpp) under Apache-2.0 — see
[NOTICE](NOTICE).
