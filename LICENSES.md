# LICENSES · decimen-optical-transfer

Distribution context: the frontend & Tauri shell ship to user devices (web, macOS .app, iOS app), so the distributed-build bar applies. All entries verified from installed package metadata or upstream repos on 2026-07-31; re-verified from the installed v0.21 tree + the publishers' license pages on 2026-08-01.

## Runtime, distributed

| dependency | license | where it runs | clearance |
|---|---|---|---|
| qrcode (npm) | MIT | sender genworker | permissive, clear |
| zxing-wasm (npm, bundles zxing-cpp WASM) | MIT (zxing-cpp core: Apache-2.0) | receiver decode workers | permissive, clear · only the reader build is imported (the writer path & its vendored generators are not bundled) |
| fflate 0.8.3 (npm) | MIT | container gzip in sender worker & receiver | permissive, clear, verified from installed metadata |
| tauri (crate) | Apache-2.0 OR MIT | app shell | permissive, clear |
| tauri-plugin-fs (crate) | Apache-2.0 OR MIT | app shell, save path | permissive, clear |

## Build-time only, not distributed

| dependency | license | clearance |
|---|---|---|
| vite | MIT | clear |
| typescript | Apache-2.0 | clear |
| @vitejs/plugin-basic-ssl | MIT | dev server only, clear |
| @tauri-apps/cli | Apache-2.0 OR MIT | clear |
| tauri-build (crate) | Apache-2.0 OR MIT | clear |

## Assets

- shared/tokens.css & shared/glass.css: derived from the contributor's own frontend builder (uploaded reference, contributor-owned); accent recolored in-repo.
- Logo + send/receive/gallery glyphs in shared/icons.ts: user-supplied SVGs (uploaded 2026-07-31), converted to currentColor in-repo.
- public/demo/demo-image.png & public/demo/demo-video.mp4: from Pexels, both authored by Nicola Narracci (https://www.pexels.com/@nicola-narracci-157460431/), both marked "Free to use" under the Pexels License on their item pages (verified 2026-08-01). demo-video.mp4 = "Dynamic 3D Abstract Dot Wave Animation", https://www.pexels.com/video/dynamic-3d-abstract-dot-wave-animation-36315128/ · demo-image.png = a single-frame screenshot taken in-repo from "Futuristic Glowing Blue Abstract Ocean Waves", https://www.pexels.com/video/futuristic-glowing-blue-abstract-ocean-waves-34339183/ (a permitted modification under the license). Pexels License terms: free for personal & commercial use, no attribution required; prohibited: selling/redistributing the media standalone & unaltered, compiling content into a similar/competing service, use in trademarks, offensive depictions of identifiable people. They ship here only as bundled demo transfer payloads inside the app & Pages demo, & are trivially swappable. demo-audio.wav: synthesized in-repo (no third-party audio).
- src-tauri/icons/icon.png: master icon created by the contributor. Everything derives from it: the tauri-generated desktop/android sets & the iOS AppIcon.appiconset (scripts/gen_apple_icons).
- public/success.png & public/success-2mb.png: demo payloads inherited from the upstream repo (MIT-licensed repo).

No GPL, AGPL, NC, or ND licensed material anywhere in the tree. No LGPL binaries bundled; no sidecars. Pexels-licensed demo media carry the standalone-redistribution restriction noted above.

Distribution note: MIT & Apache-2.0 both require preserving copyright & license texts in distributed builds · keep the upstream LICENSE files (incl. zxing-cpp's Apache-2.0 text) alongside shipped bundles.
