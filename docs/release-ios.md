# Decimen Optical Transfer · iOS (Xcode project · build & sideload)

This is **not** an installable IPA. It is the generated & pre-patched Xcode
project (standalone Rust build phase, sandbox fixes, camera & file-sharing
Info.plist keys, full app icon set). Apple requires apps outside the App
Store to be signed w/ **your** Apple ID, so you build & install it yourself
w/ Xcode · takes about ten minutes the first time.

## Requirements

- A Mac w/ full **Xcode** (App Store, launched once) · not just Command Line Tools
- **Rust** via https://rustup.rs & **CocoaPods** (`brew install cocoapods`)
- **Node.js LTS** (for the frontend build)
- An Apple ID (a free one works · free-account installs expire after 7 days)
- An iPhone w/ **Developer Mode** on (Settings -> Privacy & Security)

## Manual path (using this zip)

1. Clone the fork, then unzip this archive so it sits at
   `src-tauri/gen/apple/` [may need to create the `gen` folder]
2. Open `src-tauri/gen/apple/decimen-optical-transfer.xcodeproj`.

## Sign & run (both paths)

1. Select the app target -> **Signing & Capabilities** -> choose your
   **Team** (free accounts: give the bundle id a unique suffix if Xcode asks).
2. Plug in the iPhone, select it as the destination, press **Run**. The
   first build compiles the Rust core & takes a few minutes.
3. On the phone: **Settings -> General -> VPN & Device Management** ->
   trust your developer certificate. Launch **Optical.AirGap**.

## Use

- **Receive:** Start camera (permission prompt uses the app's privacy
  string), point at a sender · verified files save into the **Files app**
  under the app's folder & appear in the in-app gallery w/ a full-size
  viewer + export.
- **Send:** works on the phone too; a 120 Hz (ProMotion) display expresses
  the fastest presets fully.
