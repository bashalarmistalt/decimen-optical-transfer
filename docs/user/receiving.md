# Receiving

Open `/receive/`, tap **Start camera**, point it at the sender's code. There is no pairing: the receiver locks onto any Decimen stream mid-flight, works out on its own whether a file or text is arriving, and restarts cleanly if the sender does. It also cannot tell a live sender from an [exported animation](sending.md#export-animation) playing in a page or a video — point it at either.

Fill the camera view with the code and prop the phone against something — autofocus hunting from hand tremor is the #1 throughput killer. On cameras that support it (Android, typically) continuous autofocus is enabled automatically.

Progress counts **frames collected**, not blocks solved — fountain decoding back-loads its solve cascade, so the bar is estimated from frame rate and only verified completion reaches 100%.

If an assembled transfer fails verification, the receiver re-syncs and keeps
receiving while the sender continues streaming. After repeated failures the
status line recommends restarting the sender.

## When it lands

- The file is verified against its SHA-256 before anything is offered.
- Images, video, and audio preview inline — video plays in the page (never autoplays), other files just get the **Save** link. Turn off **Show received files automatically** and the preview waits behind a **Show** button instead; see [Privacy](privacy.md).
- **Receive another file** reloads into a fresh receiver.
- **Clear Decimen cache** scrubs the received bytes from browser storage, and appears only when something is actually cached — see [Privacy](privacy.md).
- Text snippets appear with a **Copy** button and exist only until the tab closes.

**Live diagnostics** (capture/decode fps, goodput, frames, K) is collapsible during the transfer and becomes the **Transfer summary** when it ends.

## Receive settings

Camera settings apply live while the camera runs; a device that refuses a live reconfigure (iOS, sometimes) keeps the current stream and says so. Frame rates the camera reports it cannot reach are grayed out.

| setting | default | notes |
|---|---|---|
| camera | auto | the device list fills in once the camera starts (browsers hide camera names until permission is granted); pick a specific one when auto grabs the wrong lens — front, or a telephoto — and the stream switches over live |
| capture width | 1280 | 1920 costs decode time; 960 helps weak CPUs |
| capture fps | 60 | 30, 60, 90, and 120 are offered; unsupported rates are disabled after the camera reports its capabilities |
| decode workers | device max | one WASM decoder per worker; busy workers drop frames, which the fountain absorbs |
| show received files automatically | on | the only setting that persists between sessions, and the only one read when a transfer *lands* rather than when the camera starts |
