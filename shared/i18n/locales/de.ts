// German (Deutsch). Machine-drafted (Claude), not yet reviewed by a native
// speaker. Once a native review lands, flip `reviewed: true` for "de" in
// shared/i18n/registry.ts to remove the on-page unreviewed note.

import type { Messages } from "../messages";
import { localeByCode } from "../registry";

export const messages: Messages = {
  meta: localeByCode("de")!,

  chrome: {
    navAriaLabel: "Modus",
    navSend: "Senden",
    navReceive: "Empfangen",
    modeBadgeSend: "Senden",
    modeBadgeReceive: "Empfangen",
    footerLinksAriaLabel: "Projekt-Links",
    footerSupport: "♥ unterstützen",
  },

  home: {
    title: "Decimen Optical Transfer — Dateien mit Licht übertragen",
    metaDescription:
      "Senden Sie eine Datei oder Text zwischen zwei Geräten — nur mit Bildschirm und Kamera. Fountain-codierte animierte QR-Codes, ganz ohne Netzwerkverbindung dazwischen.",
    ogDescription:
      "Fountain-codierte animierte QR-Codes, vom Bildschirm zur Kamera. Kein Konto, kein Pairing, keine Netzwerkverbindung zwischen den Geräten. %TOP_SPEED% dauerhaft, per Benchmark belegt.",
    ogImageAlt:
      "Ein Smartphone mitten in der Übertragung, das einen animierten QR-Code-Stream von einem anderen Bildschirm liest.",
    heroTitleHtml: "Dateien übertragen —<br />mit Licht.",
    heroCopy:
      "Senden Sie eine Datei oder einen Textblock von einem Bildschirm zur Kamera eines anderen Geräts. Ohne Konto, Pairing, Cloud-Speicher oder Netzwerkverbindung zwischen den Geräten.",
    chooseSideAriaLabel: "Seite wählen",
    cardSendKicker: "Dieser Bildschirm sendet",
    cardSendTitle: "Datei oder Text senden",
    cardSendBody:
      "Jede Datei bis %MAX_FILE_LABEL% oder ein eingefügter Textschnipsel bis %MAX_SNIPPET_LABEL%. Komprimiert, wenn es hilft, und mit dem Originalnamen wiederhergestellt.",
    cardSendAction: "Senden",
    cardReceiveKicker: "Diese Kamera empfängt",
    cardReceiveTitle: "Draufhalten und empfangen",
    cardReceiveBody:
      "Richten Sie Ihre Kamera auf den Bildschirm des Senders, um die Datei zu empfangen.",
    cardReceiveAction: "Empfangen",
    shareSite: "Decimen teilen",
    supportTitle: "Kostenlos, Open Source, ohne Werbung",
    supportBodyHtml:
      'Wenn Decimen Ihnen den Tag leichter gemacht hat, können Sie mir <a href="https://buymeacoffee.com/bashalarmist" target="_blank" rel="noopener noreferrer">einen Kaffee spendieren</a>.',
    shareDialogTitle: "Diese App teilen",
    shareDialogHint:
      "Scannen Sie den Code mit der Kamera eines anderen Geräts, oder schicken Sie ihm den Link.",
    siteLinkAriaLabel: "Website-Link",
    privacyNote:
      "Zwischen den Geräten ist keine Netzwerkverbindung nötig. Die Bytes reisen als Licht. Dateien sind nicht verschlüsselt — was auf dem sendenden Bildschirm zu sehen ist, kann jede darauf gerichtete Kamera mitlesen.",
  },

  send: {
    docTitle: "Decimen Optical Transfer — Senden",
    eyebrow: "Bildschirm → Kamera",
    introCopy: "Nichts verlässt Ihr Gerät, bis Sie mit einem Empfänger scannen.",
    modeAriaLabel: "Was gesendet wird",
    modeFile: "Datei",
    modeSnippet: "Textschnipsel",
    titleFile: "Datei senden",
    titleSnippet: "Text senden",
    selectFile: "Datei auswählen",
    stopTransfer: "Übertragung stoppen",
    anyFileUpTo: "Jede Datei · bis %MAX_FILE_LABEL%",
    selectedFile: (name) => `Ausgewählte Datei: ${name}`,
    demoPayload: "Demo-Daten",
    benchmarkPayload: "Benchmark-Daten",
    demo512: "512-KB-Bild",
    demo2mb: "2-MB-Bild",
    demoBenchmark: "1-MB-Benchmark",
    navDemo: "Demo",
    navBenchmark: "Benchmark",
    snippetLabel: "Zu sendender Text",
    snippetLabelWithMax: "Zu sendender Text · bis %MAX_SNIPPET_LABEL%",
    snippetPlaceholder:
      "Beliebigen Text einfügen oder eintippen — eine URL, eine Config, eine Textwand…",
    startTextStream: "Textstream starten",
    settingsSummary: "Übertragungseinstellungen",
    settingTxFps: "tx fps",
    settingBytesPerFrame: "Bytes / Frame",
    settingEcc: "Fehlerkorrektur",
    settingLayout: "Layout",
    layout1: "1 Code",
    layout2: "2 Codes (1×2)",
    layout4: "4 Codes (2×2)",
    layout6: "6 Codes (2×3)",
    settingDisplaySize: "Anzeigegröße",
    specTxRate: "tx-Rate",
    specFramePayload: "Frame-Payload",
    specQr: "qr",
    specSending: "sendet",
    specCompression: "Kompression",
    specFountainBlocks: "Fountain-Blöcke",
    statusChooseFile: "Wählen Sie zum Start eine Datei",
    statusPasteText: "Fügen Sie zum Start Text ein oder tippen Sie welchen",
    statusChooseDemo: "Wählen Sie zum Start Demo-Daten",
    statusBenchmark: "Senden Sie zum Start die Benchmark-Daten",
    footerHint:
      "Öffnen Sie auf dem anderen Gerät „Empfangen“. Drehen Sie die Helligkeit dieses Bildschirms hoch.",
    footerHintStandalone:
      "Öffnen Sie auf dem anderen Gerät den eigenständigen Empfänger. Drehen Sie die Helligkeit dieses Bildschirms hoch.",
    shareDialogTitle: "Empfänger teilen",
    shareDialogHint:
      "Scannen Sie den Code mit der Kamera des anderen Geräts, oder schicken Sie ihm den Link.",
    receiverLinkAriaLabel: "Empfänger-Link",
    shareTitleData: "Decimen Optical Transfer — Empfänger",
    loadingDemo: (name) => `lade ${name}…`,
    demoLoadFailed: (name, status) => `${name} konnte nicht geladen werden (${status})`,
    preparingFile: (name) => `bereite ${name} vor…`,
    preparingSnippet: "bereite Textschnipsel vor…",
    fileEmpty: (name) => `${name} ist leer — es gibt nichts zu senden.`,
    fileOverLimit: (name, size, limit) =>
      `${name} ist ${size} groß — über dem Limit von ${limit}.`,
    capacityError: (size, blocks, frameBytes, maxBlocks, suggestion) =>
      `${size} braucht bei ${frameBytes} Bytes pro Frame ${blocks} Blöcke, ein Frame kann ` +
      `aber nur ${maxBlocks} davon adressieren. Erhöhen Sie Bytes / Frame auf mindestens ${suggestion}.`,
    streaming: (name) => `Sende ${name} — `,
    shareReceiverLink: "Empfänger-Link teilen",
    stallWarning: (seconds) =>
      `Der Stream stand ${seconds} s lang still — dieses Fenster war verdeckt oder im ` +
      `Hintergrund. Halten Sie es sichtbar und im Fokus; bei Pausen verliert der Empfänger die Synchronisation.`,
    fpsValue: (fps, codes) => (codes > 1 ? `${fps} fps × ${codes} Codes` : `${fps} fps`),
    frameBytesValue: (bytes, codes) =>
      codes > 1 ? `${bytes} Bytes × ${codes}` : `${bytes} Bytes`,
    gzipTo: (size) => `gzip → ${size}`,
    compressionNone: "keine",
    exportSummary: "Animation exportieren",
    exportIntro:
      "Speichert diesen Stream als Animationsdatei in Endlosschleife. In ein Video oder eine Seite eingebettet " +
      "kann jede Kamera, die auf die laufende Schleife zeigt, die Datei empfangen.",
    exportFormat: "Format",
    exportFormatZip: "PNG-Sequenz (ZIP)",
    exportFps: "Bildrate",
    exportScale: "Modul-Skalierung",
    exportCycles: "Zyklen",
    exportStart: "Exportieren",
    exportCancel: "Abbrechen",
    exportEstimate: (frames, size, loop) => `${frames} Frames · ~${size} · ${loop} Schleife`,
    exportProgress: (percent) => `rendern… ${percent} %`,
    exportFailed: (message) => `Export fehlgeschlagen: ${message}`,
    exportZipLimit: (frames, max) =>
      `${frames} Frames überschreiten das ZIP-Limit von ${max}. Reduzieren Sie es mit weniger Zyklen, einem breiteren Layout oder mehr Bytes / Frame.`,
  },

  receive: {
    docTitle: "Decimen Optical Transfer — Empfangen",
    eyebrow: "Kamera → Ihr Gerät",
    title: "Empfangen",
    statusReady: "Bereit, eine Datei oder einen Textstream zu scannen",
    startCamera: "Kamera starten",
    starting: "Startet…",
    noSignalQuestion: "Tut sich nichts?",
    progressZero: "0 % · 0 Frames",
    estimatingTime: "Zeit wird geschätzt…",
    progressAriaLabel: "Fortschritt der Wiederherstellung",
    tipsTitle: "Tipps zur Fehlersuche",
    tipDropFrameBytes: (bytes) =>
      `Öffnen Sie am Sender die Übertragungseinstellungen und senken Sie Bytes / Frame auf ${bytes}.`,
    tipDropTxFps: (fps) => `Immer noch nichts? Senken Sie am Sender auch tx fps auf ${fps}.`,
    tipFillView:
      "Füllen Sie das Kamerabild mit dem Code aus und lehnen Sie das Telefon an etwas an — " +
      "meist ist ein Autofokus schuld, der wegen zitternder Hände pumpt.",
    tipBrightness: "Drehen Sie die Helligkeit des sendenden Bildschirms ganz auf.",
    diagnosticsSummary: "Live-Diagnose",
    metricCaptureFps: "Aufnahme-fps",
    metricDecodeFps: "Decode-fps",
    metricGoodput: "Goodput",
    metricElapsed: "verstrichen",
    metricFrames: "Frames neu/dup",
    metricBlocks: "Blöcke K",
    metricBlockLen: "Blocklänge",
    metricTransfer: "Übertragung",
    settingsSummary: "Empfangseinstellungen",
    settingCamera: "Kamera",
    cameraAuto: "auto",
    cameraN: (n) => `Kamera ${n}`,
    settingCaptureWidth: "Aufnahmebreite",
    settingCaptureFps: "Aufnahme-fps",
    settingDecodeWorkers: "Decode-Worker",
    autoShowLabel: "Empfangene Dateien automatisch anzeigen",
    settingsApplied: "Wird beim Kamerastart übernommen.",
    errSecureContext:
      "Kamera braucht einen sicheren Kontext — diese Seite muss über https ausgeliefert " +
      "werden, damit ein anderes Gerät die Kamera nutzen kann. `npm run dev` erfüllt das bereits.",
    errPermissionDenied:
      "Kamerazugriff verweigert — erlauben Sie ihn und tippen Sie erneut auf „Kamera starten“.",
    errCameraGone:
      "diese Kamera ist nicht mehr verfügbar — stellen Sie Kamera auf auto zurück und tippen Sie auf „Kamera starten“.",
    errCamera: (message) => `Kamera: ${message}`,
    errRestartFailed:
      "Kamera: Neustart nach dem Wechsel fehlgeschlagen — tippen Sie auf „Kamera starten“.",
    errLiveChangeRefused:
      "diese Kamera lehnt Änderungen im laufenden Betrieb ab — zum Übernehmen neu starten",
    cameraRefusedKeptPrevious: "diese Kamera wollte nicht starten — die vorherige bleibt aktiv",
    cameraSearching: (resolution) => `Kamera ${resolution} — suche einen Stream…`,
    cameraActual: (resolution, fps, askedFps, workers) =>
      `Kamera ${resolution} @ ${fps} fps${askedFps === null ? "" : ` (angefragt: ${askedFps})`} · ` +
      `${workers} Decode-Worker · Änderungen gelten sofort`,
    progressBlocks: (percent, solved, k) => `${percent} % · ${solved}/${k} Blöcke`,
    framesDecoding: (frames) => `${frames} Frames · wird decodiert`,
    aboutEta: (duration, frames) => `Noch etwa ${duration} · ${frames} Frames`,
    etaTotal: (duration) => `${duration} gesamt`,
    resyncing: "Die wiederhergestellten Daten konnten nicht bestätigt werden. Synchronisierung läuft erneut…",
    resyncRestartSender: "Wenn das weiter passiert, starten Sie den Sender neu.",
    transferFailedShort: "Übertragung fehlgeschlagen",
    transferFailedDetail:
      "Aus diesem Stream kam nichts Brauchbares. Starten Sie den Sender neu und scannen Sie " +
      "erneut — eine abgebrochene Übertragung kostet nichts außer der Zeit.",
    tryAgain: "Erneut versuchen",
    transferSummary: "Übertragungsübersicht",
    transferComplete: "Übertragung abgeschlossen!",
    recoveredFile: "100 % · Datei wiederhergestellt",
    recoveredText: "100 % · Text wiederhergestellt",
    textReceived: "Text empfangen",
    textLabel: "Text",
    fileStats: (size, seconds, rate) => `${size} in ${seconds} · ${rate}`,
    gzipDecompressed: "gzip entpackt",
    shaVerified: "SHA-256 verifiziert ✓",
    saveFile: (name) => `${name} speichern`,
    receiveAnother: "Weitere Datei empfangen",
    showText: "Text anzeigen",
    mediaImage: "Bild",
    mediaVideo: "Video",
    mediaAudio: "Audio",
    showMedia: (noun) => `${noun} anzeigen`,
    clearCache: "Decimen-Cache leeren",
    cacheCleared: "Cache geleert",
    clearCacheFailed: "Leeren fehlgeschlagen — erneut versuchen",
    receivedPreviewAlt: (name) => `Vorschau der empfangenen Datei: ${name}`,
    receivedFileAriaLabel: (name) => `Empfangene Datei: ${name}`,
    supportAfter: "♥ Hat Ihnen das gefallen? Spendieren Sie mir einen Kaffee",
  },

  common: {
    copy: "Kopieren",
    copied: "Kopiert",
    copyFailed: "Kopieren fehlgeschlagen",
    close: "Schließen",
    share: "Teilen…",
    dismiss: "Ausblenden",
    help: "Hilfe",
    gotIt: "Alles klar",
  },

  errors: {
    fileEmpty: "Wählen Sie eine Datei, die nicht leer ist.",
    fileOverLimit: (limit) => `Dateien sind in diesem Browser-Build auf ${limit} begrenzt.`,
    fileNameTooLong: "Der Dateiname oder der Medientyp ist zu lang.",
    inflateOverflow:
      "Die wiederhergestellte Datei wächst beim Entpacken über ihre angegebene Länge hinaus.",
    containerTruncated: "Der Header der wiederhergestellten Datei ist unvollständig.",
    containerBadMagic: "Der Header der wiederhergestellten Datei ist ungültig.",
    containerBadCompression:
      "Die wiederhergestellte Datei verwendet eine nicht unterstützte Kompression.",
    containerLengthMismatch:
      "Die Länge der wiederhergestellten Datei passt nicht zu ihrem Header.",
    gzipIncomplete: "Die wiederhergestellten gzip-Daten sind unvollständig.",
    gzipLengthMismatch: "Die Länge der gzip-Daten passt nicht zum Datei-Header.",
    decompressedLengthMismatch:
      "Die Länge der entpackten Datei passt nicht zu ihrem Header.",
    streamChecksumMismatch: "Die Prüfsumme des optischen Streams stimmt nicht.",
    sha256Failed: "Die wiederhergestellte Datei hat die SHA-256-Prüfung nicht bestanden.",
    snippetEmpty: "Fügen Sie vor dem Senden Text ein oder tippen Sie welchen.",
    snippetOverLimit: (limit) => `Textschnipsel sind auf ${limit} begrenzt.`,
    snippetNotText: "Dieser Stream ist kein Textschnipsel.",
    snippetBadUtf8: "Der wiederhergestellte Schnipsel ist kein gültiges UTF-8.",
  },

  verdicts: {
    olderSender: (version) =>
      `Dieser Bildschirm sendet ein älteres Decimen-Format (v${version}). Aktualisieren Sie das sendende Gerät.`,
    newerSender: (version) =>
      `Dieser Bildschirm sendet ein neueres Decimen-Format (v${version}). Aktualisieren Sie diese App, um es zu empfangen.`,
    unsupportedFlags:
      "Dieser Stream nutzt eine Decimen-Funktion, die diese Version nicht lesen kann. Aktualisieren Sie diese App, um ihn zu empfangen.",
  },

  units: {
    bytes: "B",
    kilobytes: "KB",
    megabytes: "MB",
    kbPerSecond: (value) => `${value} KB/s`,
    secondsValue: (value) => `${value} s`,
    durHours: (hours) => `${hours} h`,
    durMinutes: (minutes) => `${minutes} min`,
    durSeconds: (seconds) => `${seconds} s`,
  },

  i18n: {
    languageSelectLabel: "Sprache",
    unreviewedNote:
      "Diese Übersetzung wurde maschinell erstellt und noch nicht von einem Muttersprachler geprüft.",
    unreviewedLinkText: "Übersetzungsfehler melden",
    switchOffer: "Decimen ist auf Deutsch verfügbar.",
    switchAction: "Auf Deutsch ansehen",
  },
};
