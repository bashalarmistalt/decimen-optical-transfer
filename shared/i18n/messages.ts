// The complete surface of user-facing text, as one typed interface.
//
// Every locale catalog (locales/<code>.ts) implements this. TypeScript is the
// completeness check: a locale missing a key, or carrying a stray one, fails
// `npm run build` — the same fail-loud rule htmlTokens() applies to %TOKENS%.
//
// Two kinds of entry:
//   - strings: static copy. Keys referenced from HTML via data-i18n="dot.path"
//     are swapped into the built per-locale pages (build/i18n-pages.ts) and at
//     runtime in the standalone files. A string may carry %TOKEN% placeholders
//     (build-time constants like %MAX_FILE_LABEL%); translations must keep
//     them verbatim.
//   - functions: runtime messages with values interpolated where the sentence
//     needs them. Word order differs across languages, which is why these are
//     functions and not concatenation at the call site.
//
// FOR TRANSLATORS
//   - Keep "Decimen" and "Decimen Optical Transfer" untranslated; same for
//     license names (AGPL-3.0-or-later), "QR", "SHA-256", "gzip", "fps",
//     "KB"/"MB" style units unless your language has an established form.
//   - Values marked ...Html may contain the same inline tags the English text
//     has (<br />, <a …>). Keep the tags, translate the text between them.
//   - Numbers arrive pre-formatted for the locale; put them where they read
//     naturally.
//   - The tone of the English source is plain, direct, and a little dry.
//     Match it. When in doubt, be clear rather than literal.

import type { LocaleInfo } from "./registry";

export interface Messages {
  /** This catalog's row in the registry — import it, never restate it. */
  meta: LocaleInfo;

  /** Header, footer, and nav shared by every page. */
  chrome: {
    navAriaLabel: string; // "Mode"
    navSend: string;
    navReceive: string;
    /** Standalone files collapse the nav to a badge naming their one mode. */
    modeBadgeSend: string;
    modeBadgeReceive: string;
    footerLinksAriaLabel: string; // "Project links"
    footerSupport: string; // "♥ support"
  };

  /** Landing page (index.html) — hosted site only, so %TOKENS% are allowed. */
  home: {
    /** Doc title and og:title. Keep the brand name, translate the tagline. */
    title: string;
    metaDescription: string;
    ogDescription: string; // carries %TOP_SPEED%
    ogImageAlt: string;
    heroTitleHtml: string; // carries a <br />
    heroCopy: string;
    chooseSideAriaLabel: string;
    cardSendKicker: string; // "This screen transmits"
    cardSendTitle: string;
    cardSendBody: string; // carries %MAX_FILE_LABEL%, %MAX_SNIPPET_LABEL%
    cardSendAction: string; // "Send"
    cardReceiveKicker: string;
    cardReceiveTitle: string;
    cardReceiveBody: string;
    cardReceiveAction: string; // "Receive"
    shareSite: string; // "Share Decimen"
    supportTitle: string; // "Free, open source, no ads"
    supportBodyHtml: string; // carries an <a …>coffee link</a>
    shareDialogTitle: string; // "Share this app"
    shareDialogHint: string;
    siteLinkAriaLabel: string;
    privacyNote: string;
  };

  /** Send page: static markup and runtime messages together. */
  send: {
    docTitle: string; // "Decimen Optical Transfer — send"
    eyebrow: string; // "Screen → camera"
    introCopy: string;
    modeAriaLabel: string; // "What to send"
    modeFile: string;
    modeSnippet: string;
    titleFile: string; // h1 in file mode — also the static h1
    titleSnippet: string; // h1 in snippet mode
    selectFile: string; // picker button, idle
    stopTransfer: string; // picker button, streaming
    anyFileUpTo: string; // "Any file · up to %MAX_FILE_LABEL%"
    selectedFile: (name: string) => string;
    demoPayload: string;
    benchmarkPayload: string;
    demo512: string; // "512 KB image"
    demo2mb: string; // "2 MB image"
    demoBenchmark: string; // "1 MB benchmark"
    navDemo: string; // nav badge in demo mode
    navBenchmark: string;
    snippetLabel: string; // "Text to send"
    snippetLabelWithMax: string; // "Text to send · up to %MAX_SNIPPET_LABEL%"
    snippetPlaceholder: string;
    startTextStream: string;
    settingsSummary: string; // "Transfer settings"
    settingTxFps: string;
    settingBytesPerFrame: string;
    settingEcc: string;
    settingLayout: string;
    layout1: string; // "1 code"
    layout2: string; // "2 codes (1×2)"
    layout4: string;
    layout6: string;
    settingDisplaySize: string;
    colorBetaLabel: string;
    colorBetaHint: string;
    colorBetaTag: string;
    specTxRate: string;
    specFramePayload: string;
    specQr: string;
    specSending: string;
    specCompression: string;
    specFountainBlocks: string;
    statusChooseFile: string;
    statusPasteText: string;
    statusChooseDemo: string;
    statusBenchmark: string;
    footerHint: string; // "Open Receive on the other device. …"
    footerHintStandalone: string; // standalone build swaps the key to this
    shareDialogTitle: string; // "Share the receiver"
    shareDialogHint: string;
    receiverLinkAriaLabel: string;
    /** navigator.share sheet title for the receiver link. */
    shareTitleData: string;
    loadingDemo: (name: string) => string;
    demoLoadFailed: (name: string, status: number) => string;
    preparingFile: (name: string) => string;
    preparingSnippet: string;
    fileEmpty: (name: string) => string;
    fileOverLimit: (name: string, size: string, limit: string) => string;
    /** The bytes/frame setting can't carry this payload; name the fix. */
    capacityError: (
      size: string,
      blocks: string,
      frameBytes: string,
      maxBlocks: string,
      suggestion: string,
    ) => string;
    /** Trailing separator stays: the share-link button is appended after it. */
    streaming: (name: string) => string;
    shareReceiverLink: string;
    stallWarning: (seconds: string) => string;
    fpsValue: (fps: string, codes: number) => string; // "60 fps" / "60 fps × 4 codes"
    frameBytesValue: (bytes: string, codes: number) => string;
    gzipTo: (size: string) => string; // "gzip → 1.2 MB"
    compressionNone: string;
  };

  /** Receive page: static markup and runtime messages together. */
  receive: {
    docTitle: string;
    eyebrow: string; // "Camera → your device"
    title: string; // h1 "Receive"
    statusReady: string;
    startCamera: string;
    starting: string; // "Starting…"
    noSignalQuestion: string; // "Nothing happening?"
    progressZero: string; // "0% · 0 frames"
    estimatingTime: string;
    progressAriaLabel: string;
    tipsTitle: string; // "Troubleshooting tips"
    tipDropFrameBytes: (bytes: string) => string;
    tipDropTxFps: (fps: string) => string;
    tipFillView: string;
    tipBrightness: string;
    diagnosticsSummary: string; // "Live diagnostics"
    metricCaptureFps: string;
    metricDecodeFps: string;
    metricGoodput: string;
    metricElapsed: string;
    metricFrames: string; // "frames new/dup"
    metricBlocks: string; // "blocks K"
    metricBlockLen: string;
    metricTransfer: string;
    settingsSummary: string; // "Receive settings"
    settingCamera: string;
    cameraAuto: string; // the "auto" option
    cameraN: (n: number) => string; // unlabeled device fallback
    settingCaptureWidth: string;
    settingCaptureFps: string;
    settingDecodeWorkers: string;
    autoShowLabel: string; // "Show received files automatically"
    settingsApplied: string; // "Applied when the camera starts."
    errSecureContext: string;
    errPermissionDenied: string;
    errCameraGone: string;
    errCamera: (message: string) => string; // "camera: …"
    errRestartFailed: string;
    errLiveChangeRefused: string;
    cameraRefusedKeptPrevious: string;
    cameraSearching: (resolution: string) => string;
    /** The "applied settings" line under Receive settings. `askedFps` is null
     *  when the camera delivered what was asked. Avoid plural gymnastics:
     *  "decode workers: N" style is fine. */
    cameraActual: (
      resolution: string,
      fps: string,
      askedFps: string | null,
      workers: number,
    ) => string;
    progressBlocks: (percent: string, solved: string, k: string) => string;
    framesDecoding: (frames: string) => string;
    aboutEta: (duration: string, frames: string) => string;
    etaTotal: (duration: string) => string; // "12s total"
    /** A completed fountain assembly failed verification; capture continues. */
    resyncing: string;
    resyncRestartSender: string;
    transferFailedShort: string; // eta line + failure heading
    transferFailedDetail: string;
    tryAgain: string;
    transferSummary: string; // diagnostics relabel after the run
    transferComplete: string;
    recoveredFile: string; // "100% · file recovered"
    recoveredText: string; // "100% · text recovered"
    textReceived: string;
    /** Stands in for the size in fileStats when the payload was text. */
    textLabel: string;
    fileStats: (size: string, seconds: string, rate: string) => string;
    gzipDecompressed: string;
    shaVerified: string; // "SHA-256 verified ✓"
    saveFile: (name: string) => string;
    receiveAnother: string;
    showText: string;
    mediaImage: string;
    mediaVideo: string;
    mediaAudio: string;
    showMedia: (noun: string) => string; // "Show image"
    clearCache: string;
    cacheCleared: string;
    clearCacheFailed: string;
    receivedPreviewAlt: (name: string) => string;
    receivedFileAriaLabel: (name: string) => string;
    supportAfter: string; // "♥ Enjoyed this? Buy me a coffee"
  };

  /** Small shared UI words. */
  common: {
    copy: string;
    copied: string;
    copyFailed: string;
    close: string;
    share: string; // "Share…" (OS share sheet opener)
    dismiss: string;
    help: string;
    gotIt: string;
  };

  /**
   * Failures from the optical container layer, keyed by OpticalErrorCode
   * (shared/optical-error.ts). These are the cross-client wording contract:
   * any Decimen client showing one of these shows this catalog's wording.
   */
  errors: {
    fileEmpty: string;
    fileOverLimit: (limit: string) => string;
    fileNameTooLong: string;
    inflateOverflow: string;
    containerTruncated: string;
    containerBadMagic: string;
    containerBadCompression: string;
    containerLengthMismatch: string;
    gzipIncomplete: string;
    gzipLengthMismatch: string;
    decompressedLengthMismatch: string;
    streamChecksumMismatch: string;
    sha256Failed: string;
    snippetEmpty: string;
    snippetOverLimit: (limit: string) => string;
    snippetNotText: string;
    snippetBadUtf8: string;
  };

  /**
   * Wire-version verdicts (protocol.ts classifyFrame). Same contract as
   * errors: every client words a version mismatch exactly this way.
   */
  verdicts: {
    olderSender: (version: number) => string;
    newerSender: (version: number) => string;
    unsupportedFlags: string;
  };

  /** Units and short value formats. Numbers arrive locale-formatted. */
  units: {
    bytes: string; // "B"
    kilobytes: string; // "KB"
    megabytes: string; // "MB"
    kbPerSecond: (value: string) => string; // "245.3 KB/s"
    secondsValue: (value: string) => string; // "12.3 s"
    /** Compact duration parts, composed as "3m 5s" by formatDurationL. */
    durHours: (hours: string) => string; // "2h"
    durMinutes: (minutes: string) => string; // "3m"
    durSeconds: (seconds: string) => string; // "12s"
  };

  /** The i18n layer's own strings — switcher, unreviewed note, home banner. */
  i18n: {
    languageSelectLabel: string; // aria-label on the switcher
    /** Footer note shown while meta.reviewed is false: this translation is
     *  machine-drafted and unreviewed. Short, honest, non-alarming. */
    unreviewedNote: string;
    /** Link text appended to the note, pointing at the GitHub issues page. */
    unreviewedLinkText: string;
    /** Home-page banner offering this language to a browser that prefers it.
     *  Written in THIS language ("Decimen est disponible en français"). */
    switchOffer: string;
    switchAction: string; // "Voir en français"
  };
}
