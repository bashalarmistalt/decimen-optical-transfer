// Italian (italiano). Machine-drafted (Claude), not yet reviewed by a native
// speaker. Once a native review lands, flip `reviewed: true` for "it" in
// shared/i18n/registry.ts to remove the on-page unreviewed note.

import type { Messages } from "../messages";
import { localeByCode } from "../registry";

export const messages: Messages = {
  meta: localeByCode("it")!,

  chrome: {
    navAriaLabel: "Modalità",
    navSend: "Invia",
    navReceive: "Ricevi",
    modeBadgeSend: "Invia",
    modeBadgeReceive: "Ricevi",
    footerLinksAriaLabel: "Link del progetto",
    footerSupport: "♥ sostieni",
  },

  home: {
    title: "Decimen Optical Transfer — trasferisci file con la luce",
    metaDescription:
      "Invia un file o un testo tra due dispositivi con soltanto uno schermo e una fotocamera. Codici QR animati con codifica fountain, nessun percorso di rete in mezzo.",
    ogDescription:
      "Codici QR animati con codifica fountain, da schermo a fotocamera. Nessun account, nessun abbinamento, nessun percorso di rete tra i due dispositivi. %TOP_SPEED% sostenuti, misurati e documentati.",
    ogImageAlt:
      "Un telefono a metà trasferimento, mentre legge un flusso di codici QR animati da un altro schermo.",
    heroTitleHtml: "Trasferisci file<br />con la luce.",
    heroCopy:
      "Invia un file o un blocco di testo da uno schermo alla fotocamera di un altro dispositivo. Nessun account, abbinamento, archiviazione cloud o percorso di rete tra i dispositivi.",
    chooseSideAriaLabel: "Scegli un lato",
    cardSendKicker: "Questo schermo trasmette",
    cardSendTitle: "Invia un file o un testo",
    cardSendBody:
      "Qualsiasi file fino a %MAX_FILE_LABEL%, o un frammento di testo incollato fino a %MAX_SNIPPET_LABEL%. Compresso quando conviene, ripristinato con il nome originale.",
    cardSendAction: "Invia",
    cardReceiveKicker: "Questa fotocamera riceve",
    cardReceiveTitle: "Inquadra e ricevi",
    cardReceiveBody:
      "Punta la fotocamera verso lo schermo del mittente per ricevere il file.",
    cardReceiveAction: "Ricevi",
    shareSite: "Condividi Decimen",
    supportTitle: "Gratuito, open source, senza pubblicità",
    supportBodyHtml:
      'Se Decimen ti ha semplificato la giornata, puoi <a href="https://buymeacoffee.com/bashalarmist" target="_blank" rel="noopener noreferrer">offrirmi un caffè</a>.',
    shareDialogTitle: "Condividi questa app",
    shareDialogHint:
      "Scansiona questo codice con la fotocamera di un altro dispositivo, oppure inviagli il link.",
    siteLinkAriaLabel: "Link al sito",
    privacyNote:
      "Non serve un percorso di rete tra i dispositivi: i byte viaggiano come luce. I file non sono cifrati, quindi tutto ciò che appare sullo schermo che trasmette è leggibile da qualunque fotocamera puntata su di esso.",
  },

  send: {
    docTitle: "Decimen Optical Transfer — invio",
    eyebrow: "Schermo → fotocamera",
    introCopy: "Niente lascia il tuo dispositivo finché non scansioni con un ricevitore.",
    modeAriaLabel: "Cosa inviare",
    modeFile: "File",
    modeSnippet: "Frammento di testo",
    titleFile: "Invia un file",
    titleSnippet: "Invia testo",
    selectFile: "Seleziona file",
    stopTransfer: "Interrompi trasferimento",
    anyFileUpTo: "Qualsiasi file · fino a %MAX_FILE_LABEL%",
    selectedFile: (name) => `File selezionato: ${name}`,
    demoPayload: "Payload demo",
    benchmarkPayload: "Payload benchmark",
    demo512: "Immagine da 512 KB",
    demo2mb: "Immagine da 2 MB",
    demoBenchmark: "Benchmark da 1 MB",
    navDemo: "Demo",
    navBenchmark: "Benchmark",
    snippetLabel: "Testo da inviare",
    snippetLabelWithMax: "Testo da inviare · fino a %MAX_SNIPPET_LABEL%",
    snippetPlaceholder:
      "Incolla o scrivi qualsiasi cosa: un URL, una configurazione, un muro di testo…",
    startTextStream: "Avvia flusso di testo",
    settingsSummary: "Impostazioni di trasferimento",
    settingTxFps: "fps tx",
    settingBytesPerFrame: "byte / frame",
    settingEcc: "correzione errori",
    settingLayout: "layout",
    layout1: "1 codice",
    layout2: "2 codici (1×2)",
    layout4: "4 codici (2×2)",
    layout6: "6 codici (2×3)",
    settingDisplaySize: "dimensione a schermo",
    specTxRate: "velocità tx",
    specFramePayload: "payload per frame",
    specQr: "qr",
    specSending: "in invio",
    specCompression: "compressione",
    specFountainBlocks: "blocchi fountain",
    statusChooseFile: "Scegli un file per iniziare",
    statusPasteText: "Incolla o scrivi del testo per iniziare",
    statusChooseDemo: "Scegli un payload demo per iniziare",
    statusBenchmark: "Invia il payload benchmark per iniziare",
    footerHint:
      "Apri Ricevi sull'altro dispositivo. Alza la luminosità di questo schermo.",
    footerHintStandalone:
      "Apri il ricevitore standalone sull'altro dispositivo. Alza la luminosità di questo schermo.",
    shareDialogTitle: "Condividi il ricevitore",
    shareDialogHint:
      "Scansiona questo codice con la fotocamera dell'altro dispositivo, oppure inviagli il link.",
    receiverLinkAriaLabel: "Link al ricevitore",
    shareTitleData: "Decimen Optical Transfer — ricevitore",
    loadingDemo: (name) => `caricamento di ${name}…`,
    demoLoadFailed: (name, status) => `impossibile caricare ${name} (${status})`,
    preparingFile: (name) => `preparazione di ${name}…`,
    preparingSnippet: "preparazione del frammento di testo…",
    fileEmpty: (name) => `${name} è vuoto: non c'è nulla da inviare.`,
    fileOverLimit: (name, size, limit) =>
      `${name} è di ${size}, oltre il limite di ${limit}.`,
    capacityError: (size, blocks, frameBytes, maxBlocks, suggestion) =>
      `${size} richiede ${blocks} blocchi a ${frameBytes} byte per frame, ma un frame ` +
      `può numerarne al massimo ${maxBlocks}. Alza byte / frame a ${suggestion} o più.`,
    streaming: (name) => `Trasmissione di ${name} — `,
    shareReceiverLink: "Condividi il link del ricevitore",
    stallWarning: (seconds) =>
      `Il flusso si è bloccato per ${seconds} s: questa finestra era nascosta o in background. ` +
      `Tienila visibile e in primo piano; quando si ferma, il ricevitore perde l'aggancio.`,
    fpsValue: (fps, codes) => (codes > 1 ? `${fps} fps × ${codes} codici` : `${fps} fps`),
    frameBytesValue: (bytes, codes) =>
      codes > 1 ? `${bytes} byte × ${codes}` : `${bytes} byte`,
    gzipTo: (size) => `gzip → ${size}`,
    compressionNone: "nessuna",
    exportSummary: "Esporta animazione",
    exportIntro:
      "Salva questo flusso come file di animazione in loop. Incorporalo in un video o in una pagina: " +
      "qualsiasi fotocamera puntata sul loop in riproduzione può ricevere il file.",
    exportFormat: "formato",
    exportFormatZip: "Sequenza PNG (ZIP)",
    exportFps: "frequenza fotogrammi",
    exportScale: "scala dei moduli",
    exportCycles: "cicli",
    exportStart: "Esporta",
    exportCancel: "Annulla",
    exportEstimate: (frames, size, loop) => `${frames} fotogrammi · ~${size} · loop di ${loop}`,
    exportProgress: (percent) => `rendering… ${percent}%`,
    exportFailed: (message) => `esportazione non riuscita: ${message}`,
    exportZipLimit: (frames, max) =>
      `${frames} fotogrammi superano il limite ZIP di ${max}. Riducilo con meno cicli, un layout più ampio o più byte / frame.`,
  },

  receive: {
    docTitle: "Decimen Optical Transfer — ricezione",
    eyebrow: "Fotocamera → il tuo dispositivo",
    title: "Ricevi",
    statusReady: "Pronto a scansionare un flusso di file o testo",
    startCamera: "Avvia fotocamera",
    starting: "Avvio…",
    noSignalQuestion: "Non succede niente?",
    progressZero: "0% · 0 frame",
    estimatingTime: "Stima del tempo…",
    progressAriaLabel: "Avanzamento del recupero del trasferimento",
    tipsTitle: "Consigli in caso di problemi",
    tipDropFrameBytes: (bytes) =>
      `Sul mittente, apri Impostazioni di trasferimento e abbassa byte / frame a ${bytes}.`,
    tipDropTxFps: (fps) =>
      `Ancora niente? Abbassa anche fps tx del mittente a ${fps}.`,
    tipFillView:
      "Riempi l'inquadratura di questa fotocamera con il codice e appoggia il telefono " +
      "a qualcosa: di solito il colpevole è l'autofocus che oscilla per il tremolio della mano.",
    tipBrightness: "Alza al massimo la luminosità dello schermo che trasmette.",
    diagnosticsSummary: "Diagnostica in tempo reale",
    metricCaptureFps: "fps cattura",
    metricDecodeFps: "fps decodifica",
    metricGoodput: "goodput",
    metricElapsed: "trascorso",
    metricFrames: "frame nuovi/dup",
    metricBlocks: "blocchi K",
    metricBlockLen: "lung. blocco",
    metricTransfer: "trasferimento",
    settingsSummary: "Impostazioni di ricezione",
    settingCamera: "fotocamera",
    cameraAuto: "auto",
    cameraN: (n) => `fotocamera ${n}`,
    settingCaptureWidth: "larghezza cattura",
    settingCaptureFps: "fps cattura",
    settingDecodeWorkers: "worker di decodifica",
    autoShowLabel: "Mostra automaticamente i file ricevuti",
    settingsApplied: "Applicate all'avvio della fotocamera.",
    errSecureContext:
      "la fotocamera richiede un contesto sicuro: per usarla da un altro dispositivo " +
      "questa pagina deve essere servita in https. `npm run dev` lo fa già.",
    errPermissionDenied:
      "permesso fotocamera negato: consentilo, poi tocca di nuovo Avvia fotocamera.",
    errCameraGone:
      "quella fotocamera non è più disponibile: riporta fotocamera su auto e tocca Avvia fotocamera.",
    errCamera: (message) => `fotocamera: ${message}`,
    errRestartFailed:
      "fotocamera: impossibile riavviarla dopo il cambio — tocca Avvia fotocamera.",
    errLiveChangeRefused:
      "questa fotocamera ha rifiutato una modifica a caldo — riavvia per applicarla",
    cameraRefusedKeptPrevious:
      "quella fotocamera non è partita — mantenuta la precedente",
    cameraSearching: (resolution) => `fotocamera ${resolution} — in cerca di un flusso…`,
    cameraActual: (resolution, fps, askedFps, workers) =>
      `fotocamera ${resolution} @ ${fps} fps${askedFps === null ? "" : ` (richiesti ${askedFps})`} · ` +
      `${workers} worker di decodifica · le modifiche si applicano subito`,
    progressBlocks: (percent, solved, k) => `${percent}% · ${solved}/${k} blocchi`,
    framesDecoding: (frames) => `${frames} frame · decodifica in corso`,
    aboutEta: (duration, frames) => `Circa ${duration} · ${frames} frame`,
    etaTotal: (duration) => `${duration} in totale`,
    resyncing: "I dati recuperati non hanno superato la verifica. Nuova sincronizzazione in corso…",
    resyncRestartSender: "Se continua a succedere, riavvia il mittente.",
    transferFailedShort: "Trasferimento non riuscito",
    transferFailedDetail:
      "Da quel flusso non è uscito nulla di utilizzabile. Riavvia il mittente e scansiona " +
      "di nuovo: un trasferimento parziale non costa altro che il tempo.",
    tryAgain: "Riprova",
    transferSummary: "Riepilogo del trasferimento",
    transferComplete: "Trasferimento completato!",
    recoveredFile: "100% · file recuperato",
    recoveredText: "100% · testo recuperato",
    textReceived: "Testo ricevuto",
    textLabel: "testo",
    fileStats: (size, seconds, rate) => `${size} in ${seconds} · ${rate}`,
    gzipDecompressed: "gzip decompresso",
    shaVerified: "SHA-256 verificato ✓",
    saveFile: (name) => `Salva ${name}`,
    receiveAnother: "Ricevi un altro file",
    showText: "Mostra testo",
    mediaImage: "immagine",
    mediaVideo: "video",
    mediaAudio: "audio",
    showMedia: (noun) => `Mostra ${noun}`,
    clearCache: "Svuota la cache di Decimen",
    cacheCleared: "Cache svuotata",
    clearCacheFailed: "Svuotamento non riuscito — riprova",
    receivedPreviewAlt: (name) => `Anteprima del file ricevuto: ${name}`,
    receivedFileAriaLabel: (name) => `File ricevuto: ${name}`,
    supportAfter: "♥ Ti è piaciuto? Offrimi un caffè",
  },

  common: {
    copy: "Copia",
    copied: "Copiato",
    copyFailed: "Copia non riuscita",
    close: "Chiudi",
    share: "Condividi…",
    dismiss: "Ignora",
    help: "Aiuto",
    gotIt: "Ho capito",
  },

  errors: {
    fileEmpty: "Scegli un file non vuoto.",
    fileOverLimit: (limit) =>
      `In questa build per browser i file sono limitati a ${limit}.`,
    fileNameTooLong: "Il nome del file o il tipo di media è troppo lungo.",
    inflateOverflow: "Il file recuperato si espande oltre la lunghezza dichiarata.",
    containerTruncated: "L'intestazione del file recuperato è incompleta.",
    containerBadMagic: "L'intestazione del file recuperato non è valida.",
    containerBadCompression: "Il file recuperato usa una compressione non supportata.",
    containerLengthMismatch:
      "La lunghezza del file recuperato non corrisponde alla sua intestazione.",
    gzipIncomplete: "Il payload gzip recuperato è incompleto.",
    gzipLengthMismatch:
      "La lunghezza del payload gzip non corrisponde all'intestazione del file.",
    decompressedLengthMismatch:
      "La lunghezza del file decompresso non corrisponde alla sua intestazione.",
    streamChecksumMismatch: "Il checksum del flusso ottico non corrisponde.",
    sha256Failed: "Il file recuperato non ha superato la verifica SHA-256.",
    snippetEmpty: "Incolla o scrivi del testo prima di inviare.",
    snippetOverLimit: (limit) => `I frammenti di testo sono limitati a ${limit}.`,
    snippetNotText: "Questo flusso non è un frammento di testo.",
    snippetBadUtf8: "Il frammento recuperato non è UTF-8 valido.",
  },

  verdicts: {
    olderSender: (version) =>
      `Quello schermo trasmette un formato Decimen più vecchio (v${version}). Aggiorna il dispositivo che invia.`,
    newerSender: (version) =>
      `Quello schermo trasmette un formato Decimen più recente (v${version}). Aggiorna questa app per riceverlo.`,
    unsupportedFlags:
      "Quel flusso usa una funzionalità di Decimen che questa versione non sa leggere. Aggiorna questa app per riceverlo.",
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
    languageSelectLabel: "Lingua",
    unreviewedNote:
      "Questa traduzione è stata generata automaticamente e non è ancora stata revisionata da un madrelingua.",
    unreviewedLinkText: "Segnala un problema di traduzione",
    switchOffer: "Decimen è disponibile in italiano.",
    switchAction: "Visualizza in italiano",
  },
};
