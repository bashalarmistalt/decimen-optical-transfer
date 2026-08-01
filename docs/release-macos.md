# Decimen Optical Transfer · macOS (Apple silicon)

Offline screen-to-camera file transfer: sender, receiver, & gallery in one
desktop app. No network access needed or used · the payload travels as light.

**Download:** `Decimen Optical Transfer_<version>_aarch64.dmg` below.

## Requirements

- Apple silicon Mac (M1 or newer) · this build is arm64-only
- A camera (built-in or external) if this Mac will be the receiver

## Install

1. Open the `.dmg` & drag **Decimen Optical Transfer** into **Applications**, then eject.
2. First launch: this build is not notarized, so macOS will block the first
   double-click. Open **System Settings -> Privacy & Security**, scroll down,
   & press **Open Anyway** next to the app name, then confirm. Needed once.

## Use

- **Send:** pick **My file** (or drop any file on the page), press
  **Confirm & stream**, & turn screen brightness up.
- **Receive:** press **Start camera** (grant the camera permission on first
  use) & point it at a sender. Verified files auto-save to **Downloads**.
- **Gallery:** every sent & received item opens fullscreen; the download
  control in the viewer header exports the original.

Defaults ship field-tuned (60 tx fps · 2953 B; the panel line shows the
effective rate after the display clamp). If a handheld receive struggles,
drop bytes/frame to 1465 & steady the phone.
