# Documentation

## Using Decimen

- [Quick start](user/quick-start.md) — two devices, one minute.
- [Sending](user/sending.md) — files, text snippets, transfer settings, fullscreen, sharing, animation export.
- [Receiving](user/receiving.md) — camera, settings, what happens when a transfer lands.
- [Troubleshooting](user/troubleshooting.md) — when nothing decodes.
- [Install & offline](user/install-and-offline.md) — PWA install, offline use, standalone files, demo mode.
- [Privacy](user/privacy.md) — what leaves the device (nothing), what persists (almost nothing).

## Technical

- [Architecture](technical/architecture.md) — pages, shared modules, build plugins.
- [Protocol](technical/protocol.md) — fountain coding, frame format, verification.
- [Versioning](technical/versioning.md) — the wire contract: magic, version, flags, and what a receiver owes the user when it can't decode.
- [Golden vectors](technical/golden-vectors.md) — conformance bytes for a second implementation. A diff here is a wire change.
- [Platform quirks](technical/platform-quirks.md) — the hard-won iOS/Android/Safari details baked into the code.
- [Build & release](technical/build-and-release.md) — scripts, build modes, CI, releasing.
- [Diagnostics](technical/diagnostics.md) — the `npm run diagnostics` run rig: per-transfer reports, what the numbers attribute blame to.
