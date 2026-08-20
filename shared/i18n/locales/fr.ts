// French — Français.
// Machine-drafted (Claude), not yet reviewed by a native speaker.
//
// When a native review lands, flip `reviewed: true` for "fr" in
// shared/i18n/registry.ts — that removes the on-page unreviewed note.

import type { Messages } from "../messages";
import { localeByCode } from "../registry";

export const messages: Messages = {
  meta: localeByCode("fr")!,

  chrome: {
    navAriaLabel: "Mode",
    navSend: "Envoyer",
    navReceive: "Recevoir",
    modeBadgeSend: "Envoi",
    modeBadgeReceive: "Réception",
    footerLinksAriaLabel: "Liens du projet",
    footerSupport: "♥ soutenir",
  },

  home: {
    title: "Decimen Optical Transfer — transférer des fichiers par la lumière",
    metaDescription:
      "Envoyez un fichier ou du texte entre deux appareils avec rien d’autre qu’un écran et une caméra. Des codes QR animés à codage fontaine, sans aucun chemin réseau entre les deux.",
    ogDescription:
      "Des codes QR animés à codage fontaine, de l’écran à la caméra. Sans compte, sans appairage, sans chemin réseau entre les deux appareils. %TOP_SPEED% en continu, mesuré preuves à l’appui.",
    ogImageAlt:
      "Un téléphone en plein transfert, en train de lire un flux de codes QR animés sur un autre écran.",
    heroTitleHtml: "Transférez des fichiers<br />par la lumière.",
    heroCopy:
      "Envoyez un fichier ou un bloc de texte d’un écran vers la caméra d’un autre appareil. Sans compte, sans appairage, sans stockage cloud ni chemin réseau entre les appareils.",
    chooseSideAriaLabel: "Choisir un côté",
    cardSendKicker: "Cet écran transmet",
    cardSendTitle: "Envoyer un fichier ou du texte",
    cardSendBody:
      "N’importe quel fichier jusqu’à %MAX_FILE_LABEL%, ou un extrait de texte collé jusqu’à %MAX_SNIPPET_LABEL%. Compressé quand c’est utile, restauré avec son nom d’origine.",
    cardSendAction: "Envoyer",
    cardReceiveKicker: "Cette caméra reçoit",
    cardReceiveTitle: "Pointez et recevez",
    cardReceiveBody:
      "Pointez votre caméra vers l’écran de l’expéditeur pour recevoir le fichier.",
    cardReceiveAction: "Recevoir",
    shareSite: "Partager Decimen",
    supportTitle: "Gratuit, open source, sans publicité",
    supportBodyHtml:
      'Si Decimen vous a facilité la vie, vous pouvez <a href="https://buymeacoffee.com/bashalarmist" target="_blank" rel="noopener noreferrer">m’offrir un café</a>.',
    shareDialogTitle: "Partager cette application",
    shareDialogHint:
      "Scannez ceci avec la caméra d’un autre appareil, ou envoyez-lui le lien.",
    siteLinkAriaLabel: "Lien du site",
    privacyNote:
      "Aucun chemin réseau n’est requis entre les appareils. Les octets voyagent sous forme de lumière. Les fichiers ne sont pas chiffrés : tout ce qui s’affiche sur l’écran émetteur peut être lu par n’importe quelle caméra pointée dessus.",
  },

  send: {
    docTitle: "Decimen Optical Transfer — envoyer",
    eyebrow: "Écran → caméra",
    introCopy:
      "Rien ne quitte votre appareil tant que vous ne scannez pas l’écran avec un récepteur.",
    modeAriaLabel: "Contenu à envoyer",
    modeFile: "Fichier",
    modeSnippet: "Extrait de texte",
    titleFile: "Envoyer un fichier",
    titleSnippet: "Envoyer du texte",
    selectFile: "Choisir un fichier",
    stopTransfer: "Arrêter le transfert",
    anyFileUpTo: "N’importe quel fichier · jusqu’à %MAX_FILE_LABEL%",
    selectedFile: (name) => `Fichier sélectionné : ${name}`,
    demoPayload: "Contenu de démo",
    benchmarkPayload: "Contenu de benchmark",
    demo512: "image de 512 KB",
    demo2mb: "image de 2 MB",
    demoBenchmark: "benchmark de 1 MB",
    navDemo: "Démo",
    navBenchmark: "Benchmark",
    snippetLabel: "Texte à envoyer",
    snippetLabelWithMax: "Texte à envoyer · jusqu’à %MAX_SNIPPET_LABEL%",
    snippetPlaceholder:
      "Collez ou tapez n’importe quoi — une URL, une config, un pavé de texte…",
    startTextStream: "Démarrer le flux de texte",
    settingsSummary: "Réglages du transfert",
    settingTxFps: "fps d’émission",
    settingBytesPerFrame: "octets / trame",
    settingEcc: "correction d’erreurs",
    settingLayout: "disposition",
    layout1: "1 code",
    layout2: "2 codes (1×2)",
    layout4: "4 codes (2×2)",
    layout6: "6 codes (2×3)",
    settingDisplaySize: "taille d’affichage",
    specTxRate: "débit d’émission",
    specFramePayload: "charge par trame",
    specQr: "qr",
    specSending: "envoi",
    specCompression: "compression",
    specFountainBlocks: "blocs fontaine",
    statusChooseFile: "Choisissez un fichier pour commencer",
    statusPasteText: "Collez ou tapez du texte pour commencer",
    statusChooseDemo: "Choisissez un contenu de démo pour commencer",
    statusBenchmark: "Envoyez le contenu de benchmark pour commencer",
    footerHint:
      "Ouvrez Recevoir sur l’autre appareil. Montez la luminosité de cet écran.",
    footerHintStandalone:
      "Ouvrez le récepteur autonome sur l’autre appareil. Montez la luminosité de cet écran.",
    shareDialogTitle: "Partager le récepteur",
    shareDialogHint:
      "Scannez ceci avec la caméra de l’autre appareil, ou envoyez-lui le lien.",
    receiverLinkAriaLabel: "Lien du récepteur",
    shareTitleData: "Decimen Optical Transfer — récepteur",
    loadingDemo: (name) => `chargement de ${name}…`,
    demoLoadFailed: (name, status) => `impossible de charger ${name} (${status})`,
    preparingFile: (name) => `préparation de ${name}…`,
    preparingSnippet: "préparation de l’extrait de texte…",
    fileEmpty: (name) => `${name} est vide — il n’y a rien à envoyer.`,
    fileOverLimit: (name, size, limit) =>
      `${name} fait ${size}, au-delà de la limite de ${limit}.`,
    capacityError: (size, blocks, frameBytes, maxBlocks, suggestion) =>
      `${size} nécessite ${blocks} blocs à ${frameBytes} octets par trame, et une trame ` +
      `ne peut en numéroter que ${maxBlocks}. Montez octets / trame à ${suggestion} ou plus.`,
    streaming: (name) => `Diffusion de ${name} — `,
    shareReceiverLink: "Partager le lien du récepteur",
    stallWarning: (seconds) =>
      `Le flux s’est figé pendant ${seconds} s — cette fenêtre était masquée ou en ` +
      `arrière-plan. Gardez-la visible et au premier plan ; le récepteur décroche ` +
      `dès qu’elle se met en pause.`,
    fpsValue: (fps, codes) => (codes > 1 ? `${fps} fps × ${codes} codes` : `${fps} fps`),
    frameBytesValue: (bytes, codes) =>
      codes > 1 ? `${bytes} octets × ${codes}` : `${bytes} octets`,
    gzipTo: (size) => `gzip → ${size}`,
    compressionNone: "aucune",
    exportSummary: "Exporter l’animation",
    exportIntro:
      "Enregistrez ce flux comme fichier d’animation en boucle. Intégrez-le dans une vidéo ou une page : " +
      "toute caméra pointée vers la boucle en lecture peut recevoir le fichier.",
    exportFormat: "format",
    exportFormatZip: "Séquence PNG (ZIP)",
    exportFps: "cadence d’images",
    exportScale: "échelle des modules",
    exportCycles: "cycles",
    exportStart: "Exporter",
    exportCancel: "Annuler",
    exportEstimate: (frames, size, loop) => `${frames} images · ~${size} · boucle de ${loop}`,
    exportProgress: (percent) => `rendu… ${percent} %`,
    exportFailed: (message) => `échec de l’export : ${message}`,
    exportZipLimit: (frames, max) =>
      `${frames} images dépassent la limite ZIP de ${max}. Réduisez-la avec moins de cycles, une disposition plus large ou plus d’octets / trame.`,
  },

  receive: {
    docTitle: "Decimen Optical Transfer — recevoir",
    eyebrow: "Caméra → votre appareil",
    title: "Recevoir",
    statusReady: "Prêt à scanner un flux de fichier ou de texte",
    startCamera: "Démarrer la caméra",
    starting: "Démarrage…",
    noSignalQuestion: "Rien ne se passe ?",
    progressZero: "0 % · 0 trame",
    estimatingTime: "Estimation de la durée…",
    progressAriaLabel: "Progression de la récupération du transfert",
    tipsTitle: "Conseils de dépannage",
    tipDropFrameBytes: (bytes) =>
      `Sur l’expéditeur, ouvrez les Réglages du transfert et baissez octets / trame à ${bytes}.`,
    tipDropTxFps: (fps) =>
      `Toujours rien ? Baissez aussi les fps d’émission de l’expéditeur à ${fps}.`,
    tipFillView:
      "Remplissez le champ de cette caméra avec le code, et calez le téléphone contre " +
      "quelque chose — l’autofocus qui patine à cause du tremblement des mains est le " +
      "coupable habituel.",
    tipBrightness: "Montez la luminosité de l’écran émetteur au maximum.",
    diagnosticsSummary: "Diagnostics en direct",
    metricCaptureFps: "fps de capture",
    metricDecodeFps: "fps de décodage",
    metricGoodput: "débit utile",
    metricElapsed: "écoulé",
    metricFrames: "trames nouv/dup",
    metricBlocks: "blocs K",
    metricBlockLen: "long. bloc",
    metricTransfer: "transfert",
    settingsSummary: "Réglages de réception",
    settingCamera: "caméra",
    cameraAuto: "auto",
    cameraN: (n) => `caméra ${n}`,
    settingCaptureWidth: "largeur de capture",
    settingCaptureFps: "fps de capture",
    settingDecodeWorkers: "workers de décodage",
    autoShowLabel: "Afficher automatiquement les fichiers reçus",
    settingsApplied: "Appliqués au démarrage de la caméra.",
    errSecureContext:
      "la caméra exige un contexte sécurisé — cette page doit être servie en https pour " +
      "utiliser la caméra depuis un autre appareil. `npm run dev` l’est déjà.",
    errPermissionDenied:
      "permission caméra refusée — accordez-la, puis appuyez de nouveau sur Démarrer la caméra.",
    errCameraGone:
      "cette caméra n’est plus disponible — remettez caméra sur auto et appuyez sur " +
      "Démarrer la caméra.",
    errCamera: (message) => `caméra : ${message}`,
    errRestartFailed:
      "caméra : redémarrage impossible après le changement — appuyez sur Démarrer la caméra.",
    errLiveChangeRefused:
      "cette caméra a refusé un changement à chaud — redémarrez pour appliquer",
    cameraRefusedKeptPrevious:
      "cette caméra a refusé de démarrer — la précédente est conservée",
    cameraSearching: (resolution) => `caméra ${resolution} — recherche d’un flux…`,
    cameraActual: (resolution, fps, askedFps, workers) =>
      `caméra ${resolution} @ ${fps} fps${askedFps === null ? "" : ` (demandé ${askedFps})`} · ` +
      `workers de décodage : ${workers} · les changements s’appliquent à chaud`,
    progressBlocks: (percent, solved, k) => `${percent} % · ${solved}/${k} blocs`,
    framesDecoding: (frames) => `${frames} trames · décodage`,
    aboutEta: (duration, frames) => `Environ ${duration} · ${frames} trames`,
    etaTotal: (duration) => `${duration} au total`,
    transferFailedShort: "Échec du transfert",
    transferFailedDetail:
      "Rien d’utilisable n’est sorti de ce flux. Redémarrez l’expéditeur, puis scannez à " +
      "nouveau — un transfert partiel ne coûte que le temps passé.",
    tryAgain: "Réessayer",
    transferSummary: "Résumé du transfert",
    transferComplete: "Transfert terminé !",
    recoveredFile: "100 % · fichier récupéré",
    recoveredText: "100 % · texte récupéré",
    textReceived: "Texte reçu",
    textLabel: "texte",
    fileStats: (size, seconds, rate) => `${size} en ${seconds} · ${rate}`,
    gzipDecompressed: "décompression gzip",
    shaVerified: "SHA-256 vérifié ✓",
    saveFile: (name) => `Enregistrer ${name}`,
    receiveAnother: "Recevoir un autre fichier",
    showText: "Afficher le texte",
    mediaImage: "l’image",
    mediaVideo: "la vidéo",
    mediaAudio: "l’audio",
    showMedia: (noun) => `Afficher ${noun}`,
    clearCache: "Vider le cache Decimen",
    cacheCleared: "Cache vidé",
    clearCacheFailed: "Échec du vidage — réessayez",
    receivedPreviewAlt: (name) => `Aperçu du fichier reçu : ${name}`,
    receivedFileAriaLabel: (name) => `Fichier reçu : ${name}`,
    supportAfter: "♥ Ça vous a plu ? Offrez-moi un café",
  },

  common: {
    copy: "Copier",
    copied: "Copié",
    copyFailed: "Échec de la copie",
    close: "Fermer",
    share: "Partager…",
    dismiss: "Ignorer",
    help: "Aide",
    gotIt: "Compris",
  },

  errors: {
    fileEmpty: "Choisissez un fichier non vide.",
    fileOverLimit: (limit) =>
      `Les fichiers sont limités à ${limit} dans cette version pour navigateur.`,
    fileNameTooLong: "Le nom du fichier ou son type de média est trop long.",
    inflateOverflow:
      "Le fichier récupéré se décompresse au-delà de sa longueur déclarée.",
    containerTruncated: "L’en-tête du fichier récupéré est incomplet.",
    containerBadMagic: "L’en-tête du fichier récupéré est invalide.",
    containerBadCompression:
      "Le fichier récupéré utilise une compression non prise en charge.",
    containerLengthMismatch:
      "La longueur du fichier récupéré ne correspond pas à son en-tête.",
    gzipIncomplete: "La charge utile gzip récupérée est incomplète.",
    gzipLengthMismatch:
      "La longueur de la charge utile gzip ne correspond pas à l’en-tête du fichier.",
    decompressedLengthMismatch:
      "La longueur du fichier décompressé ne correspond pas à son en-tête.",
    streamChecksumMismatch: "La somme de contrôle du flux optique ne correspond pas.",
    sha256Failed: "La vérification SHA-256 du fichier récupéré a échoué.",
    snippetEmpty: "Collez ou tapez du texte avant d’envoyer.",
    snippetOverLimit: (limit) => `Les extraits de texte sont limités à ${limit}.`,
    snippetNotText: "Ce flux n’est pas un extrait de texte.",
    snippetBadUtf8: "L’extrait récupéré n’est pas de l’UTF-8 valide.",
  },

  verdicts: {
    olderSender: (version) =>
      `Cet écran envoie un format Decimen plus ancien (v${version}). Mettez à jour ` +
      `l’appareil émetteur.`,
    newerSender: (version) =>
      `Cet écran envoie un format Decimen plus récent (v${version}). Mettez à jour ` +
      `cette application pour le recevoir.`,
    unsupportedFlags:
      "Ce flux utilise une fonctionnalité Decimen que cette version ne sait pas lire. " +
      "Mettez à jour cette application pour le recevoir.",
  },

  units: {
    // KB/MB kept over Ko/Mo: the MAX_FILE_LABEL / MAX_SNIPPET_LABEL build
    // constants and error `limit` params carry "MB" verbatim, so Ko/Mo could
    // not be consistent everywhere sizes appear.
    bytes: "B",
    kilobytes: "KB",
    megabytes: "MB",
    kbPerSecond: (value) => `${value} KB/s`,
    secondsValue: (value) => `${value} s`,
    durHours: (hours) => `${hours} h`,
    durMinutes: (minutes) => `${minutes} min`,
    durSeconds: (seconds) => `${seconds} s`,
  },

  i18n: {
    languageSelectLabel: "Langue",
    unreviewedNote:
      "Cette traduction a été générée automatiquement et n’a pas encore été relue par " +
      "un locuteur natif.",
    unreviewedLinkText: "Signaler un problème de traduction",
    switchOffer: "Decimen est disponible en français.",
    switchAction: "Voir en français",
  },
};
