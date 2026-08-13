// Spanish (neutral, international).
// Machine-drafted (Claude), not yet reviewed by a native speaker.
// Once a native review lands, flip `reviewed: true` for "es" in
// shared/i18n/registry.ts to remove the on-page unreviewed note.

import type { Messages } from "../messages";
import { localeByCode } from "../registry";

export const messages: Messages = {
  meta: localeByCode("es")!,

  chrome: {
    navAriaLabel: "Modo",
    navSend: "Enviar",
    navReceive: "Recibir",
    modeBadgeSend: "Enviar",
    modeBadgeReceive: "Recibir",
    footerLinksAriaLabel: "Enlaces del proyecto",
    footerSupport: "♥ apoyar",
  },

  home: {
    title: "Decimen Optical Transfer — transferir archivos con luz",
    metaDescription:
      "Envíe un archivo o texto entre dos dispositivos con nada más que una pantalla y una cámara. Códigos QR animados con codificación fountain, sin ruta de red de por medio.",
    ogDescription:
      "Códigos QR animados con codificación fountain, de pantalla a cámara. Sin cuenta, sin emparejamiento, sin ruta de red entre los dos dispositivos. %TOP_SPEED% sostenidos, medidos con pruebas verificables.",
    ogImageAlt:
      "Un teléfono en plena transferencia, leyendo una secuencia animada de códigos QR desde otra pantalla.",
    heroTitleHtml: "Transfiera archivos<br />con luz.",
    heroCopy:
      "Envíe un archivo o un bloque de texto desde una pantalla a la cámara de otro dispositivo. Sin cuenta, sin emparejamiento, sin nube y sin ruta de red entre los dispositivos.",
    chooseSideAriaLabel: "Elija un lado",
    cardSendKicker: "Esta pantalla transmite",
    cardSendTitle: "Enviar un archivo o texto",
    cardSendBody:
      "Cualquier archivo de hasta %MAX_FILE_LABEL%, o un fragmento de texto pegado de hasta %MAX_SNIPPET_LABEL%. Se comprime cuando conviene y se restaura con su nombre original.",
    cardSendAction: "Enviar",
    cardReceiveKicker: "Esta cámara recibe",
    cardReceiveTitle: "Apuntar y recibir",
    cardReceiveBody: "Apunte la cámara a la pantalla del emisor para recibir el archivo.",
    cardReceiveAction: "Recibir",
    shareSite: "Compartir Decimen",
    supportTitle: "Gratis, de código abierto, sin anuncios",
    supportBodyHtml:
      'Si Decimen le facilitó el día, puede <a href="https://buymeacoffee.com/bashalarmist" target="_blank" rel="noopener noreferrer">invitarme un café</a>.',
    shareDialogTitle: "Compartir esta aplicación",
    shareDialogHint: "Escanee esto con la cámara de otro dispositivo, o envíele el enlace.",
    siteLinkAriaLabel: "Enlace del sitio",
    privacyNote:
      "No se requiere una ruta de red entre los dispositivos. Los bytes viajan como luz. Los archivos no van cifrados, así que cualquier cámara apuntada a la pantalla emisora puede leer lo que muestra.",
  },

  send: {
    docTitle: "Decimen Optical Transfer — enviar",
    eyebrow: "Pantalla → cámara",
    introCopy: "Nada sale de este dispositivo hasta que lo escanee con un receptor.",
    modeAriaLabel: "Qué enviar",
    modeFile: "Archivo",
    modeSnippet: "Fragmento de texto",
    titleFile: "Enviar un archivo",
    titleSnippet: "Enviar texto",
    selectFile: "Seleccionar archivo",
    stopTransfer: "Detener transferencia",
    anyFileUpTo: "Cualquier archivo · hasta %MAX_FILE_LABEL%",
    selectedFile: (name) => `Archivo seleccionado: ${name}`,
    demoPayload: "Carga de demostración",
    benchmarkPayload: "Carga de benchmark",
    demo512: "Imagen de 512 KB",
    demo2mb: "Imagen de 2 MB",
    demoBenchmark: "Benchmark de 1 MB",
    navDemo: "Demo",
    navBenchmark: "Benchmark",
    snippetLabel: "Texto a enviar",
    snippetLabelWithMax: "Texto a enviar · hasta %MAX_SNIPPET_LABEL%",
    snippetPlaceholder:
      "Pegue o escriba cualquier cosa — una URL, una configuración, un muro de texto…",
    startTextStream: "Iniciar transmisión de texto",
    settingsSummary: "Ajustes de transferencia",
    settingTxFps: "fps de tx",
    settingBytesPerFrame: "bytes / fotograma",
    settingEcc: "corrección de errores",
    settingLayout: "disposición",
    layout1: "1 código",
    layout2: "2 códigos (1×2)",
    layout4: "4 códigos (2×2)",
    layout6: "6 códigos (2×3)",
    settingDisplaySize: "tamaño en pantalla",
    specTxRate: "tasa de tx",
    specFramePayload: "carga por fotograma",
    specQr: "qr",
    specSending: "enviando",
    specCompression: "compresión",
    specFountainBlocks: "bloques fountain",
    statusChooseFile: "Elija un archivo para comenzar",
    statusPasteText: "Pegue o escriba texto para comenzar",
    statusChooseDemo: "Elija una carga de demostración para comenzar",
    statusBenchmark: "Envíe la carga de benchmark para comenzar",
    footerHint: "Abra Recibir en el otro dispositivo. Suba el brillo de esta pantalla.",
    footerHintStandalone:
      "Abra el receptor independiente en el otro dispositivo. Suba el brillo de esta pantalla.",
    shareDialogTitle: "Compartir el receptor",
    shareDialogHint: "Escanee esto con la cámara del otro dispositivo, o envíele el enlace.",
    receiverLinkAriaLabel: "Enlace del receptor",
    shareTitleData: "Decimen Optical Transfer — receptor",
    loadingDemo: (name) => `cargando ${name}…`,
    demoLoadFailed: (name, status) => `no se pudo cargar ${name} (${status})`,
    preparingFile: (name) => `preparando ${name}…`,
    preparingSnippet: "preparando el fragmento de texto…",
    fileEmpty: (name) => `${name} está vacío — no hay nada que enviar.`,
    fileOverLimit: (name, size, limit) =>
      `${name} ocupa ${size}, por encima del límite de ${limit}.`,
    capacityError: (size, blocks, frameBytes, maxBlocks, suggestion) =>
      `${size} necesita ${blocks} bloques a ${frameBytes} bytes por fotograma, y un fotograma ` +
      `solo puede numerar ${maxBlocks} de ellos. Suba bytes / fotograma a ${suggestion} o más.`,
    streaming: (name) => `Transmitiendo ${name} — `,
    shareReceiverLink: "Compartir enlace del receptor",
    stallWarning: (seconds) =>
      `La transmisión se congeló durante ${seconds} s — esta ventana estuvo oculta o en segundo ` +
      `plano. Manténgala visible y en primer plano; el receptor pierde la sincronización cuando ` +
      `se pausa la transmisión.`,
    fpsValue: (fps, codes) => (codes > 1 ? `${fps} fps × ${codes} códigos` : `${fps} fps`),
    frameBytesValue: (bytes, codes) =>
      codes > 1 ? `${bytes} bytes × ${codes}` : `${bytes} bytes`,
    gzipTo: (size) => `gzip → ${size}`,
    compressionNone: "ninguna",
  },

  receive: {
    docTitle: "Decimen Optical Transfer — recibir",
    eyebrow: "Cámara → su dispositivo",
    title: "Recibir",
    statusReady: "Listo para escanear una transmisión de archivo o de texto",
    startCamera: "Iniciar cámara",
    starting: "Iniciando…",
    noSignalQuestion: "¿No pasa nada?",
    progressZero: "0% · 0 fotogramas",
    estimatingTime: "Estimando el tiempo…",
    progressAriaLabel: "Progreso de recuperación de la transferencia",
    tipsTitle: "Consejos para solucionar problemas",
    tipDropFrameBytes: (bytes) =>
      `En el emisor, abra Ajustes de transferencia y baje bytes / fotograma a ${bytes}.`,
    tipDropTxFps: (fps) => `¿Sigue sin funcionar? Baje también los fps de tx del emisor a ${fps}.`,
    tipFillView:
      "Llene la vista de esta cámara con el código y apoye el teléfono contra algo — " +
      "el enfoque automático oscilando por el temblor de la mano es el culpable habitual.",
    tipBrightness: "Suba al máximo el brillo de la pantalla emisora.",
    diagnosticsSummary: "Diagnóstico en vivo",
    metricCaptureFps: "fps de captura",
    metricDecodeFps: "fps de decodificación",
    metricGoodput: "goodput",
    metricElapsed: "transcurrido",
    metricFrames: "fotogramas nuevos/dup",
    metricBlocks: "bloques K",
    metricBlockLen: "long. de bloque",
    metricTransfer: "transferencia",
    settingsSummary: "Ajustes de recepción",
    settingCamera: "cámara",
    cameraAuto: "auto",
    cameraN: (n) => `cámara ${n}`,
    settingCaptureWidth: "ancho de captura",
    settingCaptureFps: "fps de captura",
    settingDecodeWorkers: "workers de decodificación",
    autoShowLabel: "Mostrar los archivos recibidos automáticamente",
    settingsApplied: "Se aplican al iniciar la cámara.",
    errSecureContext:
      "la cámara necesita un contexto seguro — esta página debe servirse por https para " +
      "usar la cámara desde otro dispositivo. `npm run dev` ya lo hace.",
    errPermissionDenied:
      "permiso de cámara denegado — concédalo y vuelva a tocar Iniciar cámara.",
    errCameraGone:
      "esa cámara ya no está disponible — vuelva a poner cámara en auto y toque Iniciar cámara.",
    errCamera: (message) => `cámara: ${message}`,
    errRestartFailed: "cámara: no se pudo reiniciar tras el cambio — toque Iniciar cámara.",
    errLiveChangeRefused: "esta cámara rechazó un cambio en vivo — reinicie para aplicarlo",
    cameraRefusedKeptPrevious: "esa cámara se negó a iniciar — se mantuvo la anterior",
    cameraSearching: (resolution) => `cámara ${resolution} — buscando una transmisión…`,
    cameraActual: (resolution, fps, askedFps, workers) =>
      `cámara ${resolution} @ ${fps} fps${askedFps === null ? "" : ` (se pidió ${askedFps})`} · ` +
      `${workers} worker${workers === 1 ? "" : "s"} de decodificación · los cambios se aplican en vivo`,
    progressBlocks: (percent, solved, k) => `${percent}% · ${solved}/${k} bloques`,
    framesDecoding: (frames) => `${frames} fotogramas · decodificando`,
    aboutEta: (duration, frames) => `Aprox. ${duration} · ${frames} fotogramas`,
    etaTotal: (duration) => `${duration} en total`,
    resyncing: "Los datos recuperados no superaron la verificación. Resincronizando y continuando…",
    resyncRestartSender: "Si esto sigue ocurriendo, reinicie el emisor.",
    transferFailedShort: "Transferencia fallida",
    transferFailedDetail:
      "De esa transmisión no salió nada utilizable. Reinicie el emisor y vuelva a escanear — " +
      "una transferencia parcial solo cuesta el tiempo.",
    tryAgain: "Intentar de nuevo",
    transferSummary: "Resumen de la transferencia",
    transferComplete: "¡Transferencia completada!",
    recoveredFile: "100% · archivo recuperado",
    recoveredText: "100% · texto recuperado",
    textReceived: "Texto recibido",
    textLabel: "texto",
    fileStats: (size, seconds, rate) => `${size} en ${seconds} · ${rate}`,
    gzipDecompressed: "gzip descomprimido",
    shaVerified: "SHA-256 verificado ✓",
    saveFile: (name) => `Guardar ${name}`,
    receiveAnother: "Recibir otro archivo",
    showText: "Mostrar texto",
    mediaImage: "imagen",
    mediaVideo: "video",
    mediaAudio: "audio",
    showMedia: (noun) => `Mostrar ${noun}`,
    clearCache: "Borrar caché de Decimen",
    cacheCleared: "Caché borrada",
    clearCacheFailed: "No se pudo borrar — intente de nuevo",
    receivedPreviewAlt: (name) => `Vista previa del archivo recibido: ${name}`,
    receivedFileAriaLabel: (name) => `Archivo recibido: ${name}`,
    supportAfter: "♥ ¿Le gustó? Invíteme un café",
  },

  common: {
    copy: "Copiar",
    copied: "Copiado",
    copyFailed: "No se pudo copiar",
    close: "Cerrar",
    share: "Compartir…",
    dismiss: "Descartar",
    help: "Ayuda",
    gotIt: "Entendido",
  },

  errors: {
    fileEmpty: "Elija un archivo que no esté vacío.",
    fileOverLimit: (limit) =>
      `Los archivos están limitados a ${limit} en esta versión para navegador.`,
    fileNameTooLong: "El nombre del archivo o el tipo de medio es demasiado largo.",
    inflateOverflow: "El archivo recuperado se expande más allá de su longitud declarada.",
    containerTruncated: "El encabezado del archivo recuperado está incompleto.",
    containerBadMagic: "El encabezado del archivo recuperado no es válido.",
    containerBadCompression: "El archivo recuperado usa una compresión no compatible.",
    containerLengthMismatch: "La longitud del archivo recuperado no coincide con su encabezado.",
    gzipIncomplete: "La carga gzip recuperada está incompleta.",
    gzipLengthMismatch: "La longitud de la carga gzip no coincide con el encabezado del archivo.",
    decompressedLengthMismatch:
      "La longitud del archivo descomprimido no coincide con su encabezado.",
    streamChecksumMismatch: "La suma de verificación de la transmisión óptica no coincidió.",
    sha256Failed: "El archivo recuperado no superó la verificación SHA-256.",
    snippetEmpty: "Pegue o escriba texto antes de enviar.",
    snippetOverLimit: (limit) => `Los fragmentos de texto están limitados a ${limit}.`,
    snippetNotText: "Esta transmisión no es un fragmento de texto.",
    snippetBadUtf8: "El fragmento recuperado no es UTF-8 válido.",
  },

  verdicts: {
    olderSender: (version) =>
      `Esa pantalla está enviando un formato Decimen más antiguo (v${version}). Actualice el dispositivo emisor.`,
    newerSender: (version) =>
      `Esa pantalla está enviando un formato Decimen más nuevo (v${version}). Actualice esta aplicación para recibirlo.`,
    unsupportedFlags:
      "Esa transmisión usa una función de Decimen que esta versión no puede leer. Actualice esta aplicación para recibirla.",
  },

  units: {
    bytes: "B",
    kilobytes: "KB",
    megabytes: "MB",
    kbPerSecond: (value) => `${value} KB/s`,
    secondsValue: (value) => `${value} s`,
    durHours: (hours) => `${hours}h`,
    durMinutes: (minutes) => `${minutes}min`,
    durSeconds: (seconds) => `${seconds}s`,
  },

  i18n: {
    languageSelectLabel: "Idioma",
    unreviewedNote:
      "Esta traducción fue generada automáticamente y aún no ha sido revisada por un hablante nativo.",
    unreviewedLinkText: "Informar de un problema de traducción",
    switchOffer: "Decimen está disponible en español.",
    switchAction: "Ver en español",
  },
};
