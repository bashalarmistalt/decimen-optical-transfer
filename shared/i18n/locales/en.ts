// English — the source catalog. Every other locale translates THIS file.
//
// The build cross-checks these values against the inline English in the HTML
// pages (build/i18n-pages.ts): if a data-i18n element's text and its catalog
// value drift apart, the build fails and names the key. Edit copy in both
// places — the HTML stays readable, the catalog stays authoritative.

import type { Messages } from "../messages";
import { localeByCode } from "../registry";
import { ENGLISH_ERRORS } from "../../optical-error";

export const messages: Messages = {
  meta: localeByCode("en")!,

  chrome: {
    navAriaLabel: "Mode",
    navSend: "Send",
    navReceive: "Receive",
    modeBadgeSend: "Send",
    modeBadgeReceive: "Receive",
    footerLinksAriaLabel: "Project links",
    footerSupport: "♥ support",
  },

  home: {
    title: "Decimen Optical Transfer — transfer files with light",
    metaDescription:
      "Send a file or text between two devices with nothing but a screen and a camera. Fountain-coded animated QR codes, no network path in between.",
    ogDescription:
      "Fountain-coded animated QR codes, screen to camera. No account, no pairing, no network path between the two devices. %TOP_SPEED% sustained, benchmarked with receipts.",
    ogImageAlt: "A phone mid-transfer, reading an animated QR code stream off another screen.",
    heroTitleHtml: "Transfer files<br />with light.",
    heroCopy:
      "Send a file or a block of text from one screen to another device's camera. No account, pairing, cloud storage, or network path between devices.",
    chooseSideAriaLabel: "Choose a side",
    cardSendKicker: "This screen transmits",
    cardSendTitle: "Send a file or text",
    cardSendBody:
      "Any file up to %MAX_FILE_LABEL%, or a pasted text snippet up to %MAX_SNIPPET_LABEL%. Compressed when it helps, restored with its original name.",
    cardSendAction: "Send",
    cardReceiveKicker: "This camera receives",
    cardReceiveTitle: "Point and receive",
    cardReceiveBody: "Point your camera at the sender's screen to receive the file.",
    cardReceiveAction: "Receive",
    shareSite: "Share Decimen",
    supportTitle: "Free, open source, no ads",
    supportBodyHtml:
      'If Decimen made your day easier, you can <a href="https://buymeacoffee.com/bashalarmist" target="_blank" rel="noopener noreferrer">buy me a coffee</a>.',
    shareDialogTitle: "Share this app",
    shareDialogHint: "Scan this with another device's camera, or send it the link.",
    siteLinkAriaLabel: "Site link",
    privacyNote:
      "A network path is not required between the devices. The bytes travel as light. Files are not encrypted, so anything on the sending screen is readable by any camera pointed at it.",
  },

  send: {
    docTitle: "Decimen Optical Transfer — send",
    eyebrow: "Screen → camera",
    introCopy: "Nothing leaves your device until you scan with a receiver.",
    modeAriaLabel: "What to send",
    modeFile: "File",
    modeSnippet: "Text snippet",
    titleFile: "Send a file",
    titleSnippet: "Send text",
    selectFile: "Select File",
    stopTransfer: "Stop transfer",
    anyFileUpTo: "Any file · up to %MAX_FILE_LABEL%",
    selectedFile: (name) => `Selected file: ${name}`,
    demoPayload: "Demo payload",
    benchmarkPayload: "Benchmark payload",
    demo512: "512 KB image",
    demo2mb: "2 MB image",
    demoBenchmark: "1 MB benchmark",
    navDemo: "Demo",
    navBenchmark: "Benchmark",
    snippetLabel: "Text to send",
    snippetLabelWithMax: "Text to send · up to %MAX_SNIPPET_LABEL%",
    snippetPlaceholder: "Paste or type anything — a URL, a config, a wall of text…",
    startTextStream: "Start text stream",
    settingsSummary: "Transfer settings",
    settingTxFps: "tx fps",
    settingBytesPerFrame: "bytes / frame",
    settingEcc: "error correction",
    settingLayout: "layout",
    layout1: "1 code",
    layout2: "2 codes (1×2)",
    layout4: "4 codes (2×2)",
    layout6: "6 codes (2×3)",
    settingDisplaySize: "display size",
    colorBetaLabel: "color channel (beta)",
    colorBetaHint: "Doubles frames per QR; test both screens first.",
    colorBetaTag: "color beta",
    specTxRate: "tx rate",
    specFramePayload: "frame payload",
    specQr: "qr",
    specSending: "sending",
    specCompression: "compression",
    specFountainBlocks: "fountain blocks",
    statusChooseFile: "Choose a file to begin",
    statusPasteText: "Paste or type some text to begin",
    statusChooseDemo: "Choose a demo payload to begin",
    statusBenchmark: "Send the benchmark payload to begin",
    footerHint: "Open Receive on the other device. Turn up this screen's brightness.",
    footerHintStandalone:
      "Open the standalone receiver on the other device. Turn up this screen's brightness.",
    shareDialogTitle: "Share the receiver",
    shareDialogHint: "Scan this with the other device's camera, or send it the link.",
    receiverLinkAriaLabel: "Receiver link",
    shareTitleData: "Decimen Optical Transfer — receiver",
    loadingDemo: (name) => `loading ${name}…`,
    demoLoadFailed: (name, status) => `could not load ${name} (${status})`,
    preparingFile: (name) => `preparing ${name}…`,
    preparingSnippet: "preparing text snippet…",
    fileEmpty: (name) => `${name} is empty — there is nothing to send.`,
    fileOverLimit: (name, size, limit) => `${name} is ${size}, over the ${limit} limit.`,
    capacityError: (size, blocks, frameBytes, maxBlocks, suggestion) =>
      `${size} needs ${blocks} blocks at ${frameBytes} bytes per frame, and a frame can ` +
      `only number ${maxBlocks} of them. Raise bytes / frame to ${suggestion} or more.`,
    streaming: (name) => `Streaming ${name} — `,
    shareReceiverLink: "Share receiver link",
    stallWarning: (seconds) =>
      `Stream froze for ${seconds} s — this window was hidden or in the background. ` +
      `Keep it visible and focused; the receiver loses lock when it pauses.`,
    fpsValue: (fps, codes) => (codes > 1 ? `${fps} fps × ${codes} codes` : `${fps} fps`),
    frameBytesValue: (bytes, codes) =>
      codes > 1 ? `${bytes} bytes × ${codes}` : `${bytes} bytes`,
    gzipTo: (size) => `gzip → ${size}`,
    compressionNone: "none",
  },

  receive: {
    docTitle: "Decimen Optical Transfer — receive",
    eyebrow: "Camera → your device",
    title: "Receive",
    statusReady: "Ready to scan a file or text stream",
    startCamera: "Start camera",
    starting: "Starting…",
    noSignalQuestion: "Nothing happening?",
    progressZero: "0% · 0 frames",
    estimatingTime: "Estimating time…",
    progressAriaLabel: "Transfer recovery progress",
    tipsTitle: "Troubleshooting tips",
    tipDropFrameBytes: (bytes) =>
      `On the sender, open Transfer settings and drop bytes / frame to ${bytes}.`,
    tipDropTxFps: (fps) => `Still nothing? Drop the sender's tx fps to ${fps} as well.`,
    tipFillView:
      "Fill this camera's view with the code, and prop the phone against something — " +
      "autofocus hunting from hand tremor is the usual culprit.",
    tipBrightness: "Turn the sending screen's brightness all the way up.",
    diagnosticsSummary: "Live diagnostics",
    metricCaptureFps: "capture fps",
    metricDecodeFps: "decode fps",
    metricGoodput: "goodput",
    metricElapsed: "elapsed",
    metricFrames: "frames new/dup",
    metricBlocks: "blocks K",
    metricBlockLen: "block len",
    metricTransfer: "transfer",
    settingsSummary: "Receive settings",
    settingCamera: "camera",
    cameraAuto: "auto",
    cameraN: (n) => `camera ${n}`,
    settingCaptureWidth: "capture width",
    settingCaptureFps: "capture fps",
    settingDecodeWorkers: "decode workers",
    autoShowLabel: "Show received files automatically",
    settingsApplied: "Applied when the camera starts.",
    errSecureContext:
      "camera needs a secure context — this page must be served over https to " +
      "use the camera from another device. `npm run dev` already is.",
    errPermissionDenied: "camera permission denied — allow it, then tap Start camera again.",
    errCameraGone:
      "that camera is no longer available — set camera back to auto and tap Start camera.",
    errCamera: (message) => `camera: ${message}`,
    errRestartFailed: "camera: could not restart after the switch — tap Start camera.",
    errLiveChangeRefused: "this camera refused a live change — restart to apply",
    cameraRefusedKeptPrevious: "that camera refused to start — kept the previous one",
    cameraSearching: (resolution) => `camera ${resolution} — searching for a stream…`,
    cameraActual: (resolution, fps, askedFps, workers) =>
      `camera ${resolution} @ ${fps} fps${askedFps === null ? "" : ` (asked ${askedFps})`} · ` +
      `${workers} decode worker${workers === 1 ? "" : "s"} · changes apply live`,
    progressBlocks: (percent, solved, k) => `${percent}% · ${solved}/${k} blocks`,
    framesDecoding: (frames) => `${frames} frames · decoding`,
    aboutEta: (duration, frames) => `About ${duration} · ${frames} frames`,
    etaTotal: (duration) => `${duration} total`,
    resyncing: "Recovered bytes did not verify. Re-syncing and continuing…",
    resyncRestartSender: "If this keeps happening, restart the sender.",
    transferFailedShort: "Transfer failed",
    transferFailedDetail:
      "Nothing usable came out of that stream. Restart the sender, then scan it again — " +
      "a partial transfer costs nothing but the time.",
    tryAgain: "Try again",
    transferSummary: "Transfer summary",
    transferComplete: "Transfer Complete!",
    recoveredFile: "100% · file recovered",
    recoveredText: "100% · text recovered",
    textReceived: "Text received",
    textLabel: "text",
    fileStats: (size, seconds, rate) => `${size} in ${seconds} · ${rate}`,
    gzipDecompressed: "gzip decompressed",
    shaVerified: "SHA-256 verified ✓",
    saveFile: (name) => `Save ${name}`,
    receiveAnother: "Receive another file",
    showText: "Show text",
    mediaImage: "image",
    mediaVideo: "video",
    mediaAudio: "audio",
    showMedia: (noun) => `Show ${noun}`,
    clearCache: "Clear Decimen cache",
    cacheCleared: "Cache cleared",
    clearCacheFailed: "Clear failed — try again",
    receivedPreviewAlt: (name) => `Received file preview: ${name}`,
    receivedFileAriaLabel: (name) => `Received file: ${name}`,
    supportAfter: "♥ Enjoyed this? Buy me a coffee",
  },

  common: {
    copy: "Copy",
    copied: "Copied",
    copyFailed: "Copy failed",
    close: "Close",
    share: "Share…",
    dismiss: "Dismiss",
    help: "Help",
    gotIt: "Got it",
  },

  // The English error wording lives beside the codes that throw it, so the
  // thrown message and this catalog can never disagree.
  errors: ENGLISH_ERRORS,

  verdicts: {
    olderSender: (version) =>
      `That screen is sending an older Decimen format (v${version}). Update the sending device.`,
    newerSender: (version) =>
      `That screen is sending a newer Decimen format (v${version}). Update this app to receive it.`,
    unsupportedFlags:
      "That stream uses a Decimen feature this version cannot read. Update this app to receive it.",
  },

  units: {
    bytes: "B",
    kilobytes: "KB",
    megabytes: "MB",
    kbPerSecond: (value) => `${value} KB/s`,
    secondsValue: (value) => `${value} s`,
    durHours: (hours) => `${hours}h`,
    durMinutes: (minutes) => `${minutes}m`,
    durSeconds: (seconds) => `${seconds}s`,
  },

  i18n: {
    languageSelectLabel: "Language",
    unreviewedNote:
      "This translation is machine-drafted and has not yet been reviewed by a native speaker.",
    unreviewedLinkText: "Report a translation issue",
    switchOffer: "Decimen is available in English.",
    switchAction: "View in English",
  },
};
