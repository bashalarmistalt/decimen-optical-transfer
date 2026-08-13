// Brazilian Portuguese (pt-BR).
// Machine-drafted (Claude), not yet reviewed by a native speaker.
// Once a native review lands, flip `reviewed: true` for pt-br in
// shared/i18n/registry.ts to remove the on-page unreviewed note.

import type { Messages } from "../messages";
import { localeByCode } from "../registry";

export const messages: Messages = {
  meta: localeByCode("pt-br")!,

  chrome: {
    navAriaLabel: "Modo",
    navSend: "Enviar",
    navReceive: "Receber",
    modeBadgeSend: "Enviar",
    modeBadgeReceive: "Receber",
    footerLinksAriaLabel: "Links do projeto",
    footerSupport: "♥ apoie",
  },

  home: {
    title: "Decimen Optical Transfer — transfira arquivos com luz",
    metaDescription:
      "Envie um arquivo ou texto entre dois dispositivos usando apenas uma tela e uma câmera. Códigos QR animados com codificação fountain, sem nenhum caminho de rede no meio.",
    ogDescription:
      "Códigos QR animados com codificação fountain, da tela para a câmera. Sem conta, sem pareamento, sem caminho de rede entre os dois dispositivos. %TOP_SPEED% sustentados, comprovados em benchmark.",
    ogImageAlt:
      "Um celular no meio de uma transferência, lendo um fluxo de códigos QR animados na tela de outro dispositivo.",
    heroTitleHtml: "Transfira arquivos<br />com luz.",
    heroCopy:
      "Envie um arquivo ou um bloco de texto de uma tela para a câmera de outro dispositivo. Sem conta, pareamento, armazenamento em nuvem ou caminho de rede entre os dispositivos.",
    chooseSideAriaLabel: "Escolha um lado",
    cardSendKicker: "Esta tela transmite",
    cardSendTitle: "Envie um arquivo ou texto",
    cardSendBody:
      "Qualquer arquivo de até %MAX_FILE_LABEL%, ou um trecho de texto colado de até %MAX_SNIPPET_LABEL%. Comprimido quando ajuda, restaurado com o nome original.",
    cardSendAction: "Enviar",
    cardReceiveKicker: "Esta câmera recebe",
    cardReceiveTitle: "Aponte e receba",
    cardReceiveBody: "Aponte a câmera para a tela do remetente para receber o arquivo.",
    cardReceiveAction: "Receber",
    shareSite: "Compartilhar o Decimen",
    supportTitle: "Gratuito, código aberto, sem anúncios",
    supportBodyHtml:
      'Se o Decimen facilitou o seu dia, você pode <a href="https://buymeacoffee.com/bashalarmist" target="_blank" rel="noopener noreferrer">me pagar um café</a>.',
    shareDialogTitle: "Compartilhar este app",
    shareDialogHint: "Escaneie com a câmera de outro dispositivo, ou envie o link para ele.",
    siteLinkAriaLabel: "Link do site",
    privacyNote:
      "Não é necessário um caminho de rede entre os dispositivos. Os bytes viajam como luz. Os arquivos não são criptografados, então qualquer coisa na tela de envio pode ser lida por qualquer câmera apontada para ela.",
  },

  send: {
    docTitle: "Decimen Optical Transfer — enviar",
    eyebrow: "Tela → câmera",
    introCopy: "Nada sai do seu dispositivo até você escanear com um receptor.",
    modeAriaLabel: "O que enviar",
    modeFile: "Arquivo",
    modeSnippet: "Trecho de texto",
    titleFile: "Enviar um arquivo",
    titleSnippet: "Enviar texto",
    selectFile: "Selecionar arquivo",
    stopTransfer: "Parar transferência",
    anyFileUpTo: "Qualquer arquivo · até %MAX_FILE_LABEL%",
    selectedFile: (name) => `Arquivo selecionado: ${name}`,
    demoPayload: "Payload de demonstração",
    benchmarkPayload: "Payload de benchmark",
    demo512: "Imagem de 512 KB",
    demo2mb: "Imagem de 2 MB",
    demoBenchmark: "Benchmark de 1 MB",
    navDemo: "Demo",
    navBenchmark: "Benchmark",
    snippetLabel: "Texto a enviar",
    snippetLabelWithMax: "Texto a enviar · até %MAX_SNIPPET_LABEL%",
    snippetPlaceholder: "Cole ou digite qualquer coisa — uma URL, uma config, um textão…",
    startTextStream: "Iniciar fluxo de texto",
    settingsSummary: "Configurações de transferência",
    settingTxFps: "fps de tx",
    settingBytesPerFrame: "bytes / quadro",
    settingEcc: "correção de erros",
    settingLayout: "layout",
    layout1: "1 código",
    layout2: "2 códigos (1×2)",
    layout4: "4 códigos (2×2)",
    layout6: "6 códigos (2×3)",
    settingDisplaySize: "tamanho de exibição",
    specTxRate: "taxa de tx",
    specFramePayload: "payload do quadro",
    specQr: "qr",
    specSending: "enviando",
    specCompression: "compressão",
    specFountainBlocks: "blocos fountain",
    statusChooseFile: "Escolha um arquivo para começar",
    statusPasteText: "Cole ou digite um texto para começar",
    statusChooseDemo: "Escolha um payload de demonstração para começar",
    statusBenchmark: "Envie o payload de benchmark para começar",
    footerHint: "Abra Receber no outro dispositivo. Aumente o brilho desta tela.",
    footerHintStandalone:
      "Abra o receptor independente no outro dispositivo. Aumente o brilho desta tela.",
    shareDialogTitle: "Compartilhar o receptor",
    shareDialogHint: "Escaneie com a câmera do outro dispositivo, ou envie o link para ele.",
    receiverLinkAriaLabel: "Link do receptor",
    shareTitleData: "Decimen Optical Transfer — receptor",
    loadingDemo: (name) => `carregando ${name}…`,
    demoLoadFailed: (name, status) => `não foi possível carregar ${name} (${status})`,
    preparingFile: (name) => `preparando ${name}…`,
    preparingSnippet: "preparando trecho de texto…",
    fileEmpty: (name) => `${name} está vazio — não há nada para enviar.`,
    fileOverLimit: (name, size, limit) => `${name} tem ${size}, acima do limite de ${limit}.`,
    capacityError: (size, blocks, frameBytes, maxBlocks, suggestion) =>
      `${size} precisa de ${blocks} blocos a ${frameBytes} bytes por quadro, e um quadro ` +
      `só consegue numerar ${maxBlocks} deles. Aumente bytes / quadro para ${suggestion} ou mais.`,
    streaming: (name) => `Transmitindo ${name} — `,
    shareReceiverLink: "Compartilhar link do receptor",
    stallWarning: (seconds) =>
      `O fluxo congelou por ${seconds} s — esta janela ficou oculta ou em segundo plano. ` +
      `Mantenha-a visível e em foco; o receptor perde a sincronia quando ela pausa.`,
    fpsValue: (fps, codes) => (codes > 1 ? `${fps} fps × ${codes} códigos` : `${fps} fps`),
    frameBytesValue: (bytes, codes) =>
      codes > 1 ? `${bytes} bytes × ${codes}` : `${bytes} bytes`,
    gzipTo: (size) => `gzip → ${size}`,
    compressionNone: "nenhuma",
  },

  receive: {
    docTitle: "Decimen Optical Transfer — receber",
    eyebrow: "Câmera → seu dispositivo",
    title: "Receber",
    statusReady: "Pronto para escanear um fluxo de arquivo ou de texto",
    startCamera: "Iniciar câmera",
    starting: "Iniciando…",
    noSignalQuestion: "Nada acontecendo?",
    progressZero: "0% · 0 quadros",
    estimatingTime: "Estimando o tempo…",
    progressAriaLabel: "Progresso da recuperação da transferência",
    tipsTitle: "Dicas para resolver problemas",
    tipDropFrameBytes: (bytes) =>
      `No remetente, abra Configurações de transferência e reduza bytes / quadro para ${bytes}.`,
    tipDropTxFps: (fps) => `Ainda nada? Reduza também o fps de tx do remetente para ${fps}.`,
    tipFillView:
      "Preencha a visão desta câmera com o código e apoie o celular em alguma coisa — " +
      "o foco automático oscilando com o tremor das mãos é o culpado de sempre.",
    tipBrightness: "Aumente o brilho da tela de envio até o máximo.",
    diagnosticsSummary: "Diagnóstico ao vivo",
    metricCaptureFps: "fps de captura",
    metricDecodeFps: "fps de decodificação",
    metricGoodput: "goodput",
    metricElapsed: "decorrido",
    metricFrames: "quadros novos/dup",
    metricBlocks: "blocos K",
    metricBlockLen: "tam. do bloco",
    metricTransfer: "transferência",
    settingsSummary: "Configurações de recepção",
    settingCamera: "câmera",
    cameraAuto: "auto",
    cameraN: (n) => `câmera ${n}`,
    settingCaptureWidth: "largura de captura",
    settingCaptureFps: "fps de captura",
    settingDecodeWorkers: "workers de decodificação",
    autoShowLabel: "Mostrar arquivos recebidos automaticamente",
    settingsApplied: "Aplicadas quando a câmera inicia.",
    errSecureContext:
      "a câmera precisa de um contexto seguro — esta página precisa ser servida via https " +
      "para usar a câmera de outro dispositivo. O `npm run dev` já faz isso.",
    errPermissionDenied:
      "permissão de câmera negada — permita e toque em Iniciar câmera de novo.",
    errCameraGone:
      "essa câmera não está mais disponível — volte a câmera para auto e toque em Iniciar câmera.",
    errCamera: (message) => `câmera: ${message}`,
    errRestartFailed: "câmera: não foi possível reiniciar após a troca — toque em Iniciar câmera.",
    errLiveChangeRefused: "esta câmera recusou uma alteração ao vivo — reinicie para aplicar",
    cameraRefusedKeptPrevious: "essa câmera recusou iniciar — a anterior foi mantida",
    cameraSearching: (resolution) => `câmera ${resolution} — procurando um fluxo…`,
    cameraActual: (resolution, fps, askedFps, workers) =>
      `câmera ${resolution} @ ${fps} fps${askedFps === null ? "" : ` (pedido ${askedFps})`} · ` +
      `${workers} worker${workers === 1 ? "" : "s"} de decodificação · alterações aplicadas ao vivo`,
    progressBlocks: (percent, solved, k) => `${percent}% · ${solved}/${k} blocos`,
    framesDecoding: (frames) => `${frames} quadros · decodificando`,
    aboutEta: (duration, frames) => `Cerca de ${duration} · ${frames} quadros`,
    etaTotal: (duration) => `${duration} no total`,
    resyncing: "Os dados recuperados não passaram na verificação. Ressincronizando e continuando…",
    resyncRestartSender: "Se isso continuar, reinicie o remetente.",
    transferFailedShort: "Falha na transferência",
    transferFailedDetail:
      "Nada aproveitável saiu desse fluxo. Reinicie o remetente e escaneie de novo — " +
      "uma transferência parcial não custa nada além do tempo.",
    tryAgain: "Tentar de novo",
    transferSummary: "Resumo da transferência",
    transferComplete: "Transferência concluída!",
    recoveredFile: "100% · arquivo recuperado",
    recoveredText: "100% · texto recuperado",
    textReceived: "Texto recebido",
    textLabel: "texto",
    fileStats: (size, seconds, rate) => `${size} em ${seconds} · ${rate}`,
    gzipDecompressed: "gzip descomprimido",
    shaVerified: "SHA-256 verificado ✓",
    saveFile: (name) => `Salvar ${name}`,
    receiveAnother: "Receber outro arquivo",
    showText: "Mostrar texto",
    mediaImage: "imagem",
    mediaVideo: "vídeo",
    mediaAudio: "áudio",
    showMedia: (noun) => `Mostrar ${noun}`,
    clearCache: "Limpar cache do Decimen",
    cacheCleared: "Cache limpo",
    clearCacheFailed: "Falha ao limpar — tente de novo",
    receivedPreviewAlt: (name) => `Prévia do arquivo recebido: ${name}`,
    receivedFileAriaLabel: (name) => `Arquivo recebido: ${name}`,
    supportAfter: "♥ Gostou? Me pague um café",
  },

  common: {
    copy: "Copiar",
    copied: "Copiado",
    copyFailed: "Falha ao copiar",
    close: "Fechar",
    share: "Compartilhar…",
    dismiss: "Dispensar",
    help: "Ajuda",
    gotIt: "Entendi",
  },

  errors: {
    fileEmpty: "Escolha um arquivo que não esteja vazio.",
    fileOverLimit: (limit) => `Os arquivos são limitados a ${limit} nesta versão para navegador.`,
    fileNameTooLong: "O nome do arquivo ou o tipo de mídia é longo demais.",
    inflateOverflow: "O arquivo recuperado se expande além do comprimento declarado.",
    containerTruncated: "O cabeçalho do arquivo recuperado está incompleto.",
    containerBadMagic: "O cabeçalho do arquivo recuperado é inválido.",
    containerBadCompression: "O arquivo recuperado usa uma compressão não suportada.",
    containerLengthMismatch: "O comprimento do arquivo recuperado não corresponde ao cabeçalho.",
    gzipIncomplete: "O payload gzip recuperado está incompleto.",
    gzipLengthMismatch:
      "O comprimento do payload gzip não corresponde ao cabeçalho do arquivo.",
    decompressedLengthMismatch:
      "O comprimento do arquivo descomprimido não corresponde ao cabeçalho.",
    streamChecksumMismatch: "O checksum do fluxo óptico não confere.",
    sha256Failed: "O arquivo recuperado falhou na verificação SHA-256.",
    snippetEmpty: "Cole ou digite um texto antes de enviar.",
    snippetOverLimit: (limit) => `Trechos de texto são limitados a ${limit}.`,
    snippetNotText: "Este fluxo não é um trecho de texto.",
    snippetBadUtf8: "O trecho recuperado não é UTF-8 válido.",
  },

  verdicts: {
    olderSender: (version) =>
      `Aquela tela está enviando um formato Decimen mais antigo (v${version}). Atualize o dispositivo de envio.`,
    newerSender: (version) =>
      `Aquela tela está enviando um formato Decimen mais novo (v${version}). Atualize este app para recebê-lo.`,
    unsupportedFlags:
      "Esse fluxo usa um recurso do Decimen que esta versão não consegue ler. Atualize este app para recebê-lo.",
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
      "Esta tradução é um rascunho gerado por máquina e ainda não foi revisada por um falante nativo.",
    unreviewedLinkText: "Relatar problema de tradução",
    switchOffer: "O Decimen está disponível em português.",
    switchAction: "Ver em português",
  },
};
