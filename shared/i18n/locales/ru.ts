// Russian (Русский). Machine-drafted (Claude), not yet reviewed by a native
// speaker. Once a native review lands, flip `reviewed: true` for "ru" in
// shared/i18n/registry.ts — that removes the on-page unreviewed note.

import type { Messages } from "../messages";
import { localeByCode } from "../registry";

export const messages: Messages = {
  meta: localeByCode("ru")!,

  chrome: {
    navAriaLabel: "Режим",
    navSend: "Отправка",
    navReceive: "Приём",
    modeBadgeSend: "Отправка",
    modeBadgeReceive: "Приём",
    footerLinksAriaLabel: "Ссылки проекта",
    footerSupport: "♥ поддержать",
  },

  home: {
    title: "Decimen Optical Transfer — передача файлов светом",
    metaDescription:
      "Отправляйте файлы и текст между двумя устройствами, используя только экран и камеру. Анимированные QR-коды с фонтанным кодированием, без сетевого соединения между устройствами.",
    ogDescription:
      "Анимированные QR-коды с фонтанным кодированием, с экрана на камеру. Без аккаунта, без сопряжения, без сетевого пути между устройствами. Стабильно %TOP_SPEED%, замерено и подтверждено.",
    ogImageAlt:
      "Телефон в процессе передачи считывает поток анимированных QR-кодов с другого экрана.",
    heroTitleHtml: "Передавайте файлы<br />светом.",
    heroCopy:
      "Отправьте файл или блок текста с одного экрана на камеру другого устройства. Без аккаунта, сопряжения, облачного хранилища и сетевого соединения между устройствами.",
    chooseSideAriaLabel: "Выберите сторону",
    cardSendKicker: "Этот экран передаёт",
    cardSendTitle: "Отправить файл или текст",
    cardSendBody:
      "Любой файл до %MAX_FILE_LABEL% или вставленный текстовый фрагмент до %MAX_SNIPPET_LABEL%. Сжимается, когда это помогает, и восстанавливается с исходным именем.",
    cardSendAction: "Отправить",
    cardReceiveKicker: "Эта камера принимает",
    cardReceiveTitle: "Наведите и получите",
    cardReceiveBody: "Наведите камеру на экран отправителя, чтобы получить файл.",
    cardReceiveAction: "Получить",
    shareSite: "Поделиться Decimen",
    supportTitle: "Бесплатно, открытый код, без рекламы",
    supportBodyHtml:
      'Если Decimen вам пригодился, можете <a href="https://buymeacoffee.com/bashalarmist" target="_blank" rel="noopener noreferrer">угостить меня кофе</a>.',
    shareDialogTitle: "Поделиться приложением",
    shareDialogHint:
      "Отсканируйте этот код камерой другого устройства или отправьте ему ссылку.",
    siteLinkAriaLabel: "Ссылка на сайт",
    privacyNote:
      "Сетевое соединение между устройствами не требуется — байты передаются светом. Файлы не шифруются, поэтому всё, что показывает передающий экран, доступно любой направленной на него камере.",
  },

  send: {
    docTitle: "Decimen Optical Transfer — отправка",
    eyebrow: "Экран → камера",
    introCopy: "Данные не покидают ваше устройство, пока вы не отсканируете их приёмником.",
    modeAriaLabel: "Что отправить",
    modeFile: "Файл",
    modeSnippet: "Текст",
    titleFile: "Отправить файл",
    titleSnippet: "Отправить текст",
    selectFile: "Выбрать файл",
    stopTransfer: "Остановить передачу",
    anyFileUpTo: "Любой файл · до %MAX_FILE_LABEL%",
    selectedFile: (name) => `Выбран файл: ${name}`,
    demoPayload: "Демо-данные",
    benchmarkPayload: "Данные бенчмарка",
    demo512: "Изображение 512 КБ",
    demo2mb: "Изображение 2 МБ",
    demoBenchmark: "Бенчмарк 1 МБ",
    navDemo: "Демо",
    navBenchmark: "Бенчмарк",
    snippetLabel: "Текст для отправки",
    snippetLabelWithMax: "Текст для отправки · до %MAX_SNIPPET_LABEL%",
    snippetPlaceholder:
      "Вставьте или введите что угодно — ссылку, конфиг, простыню текста…",
    startTextStream: "Начать передачу текста",
    settingsSummary: "Настройки передачи",
    settingTxFps: "fps передачи",
    settingBytesPerFrame: "байт / кадр",
    settingEcc: "коррекция ошибок",
    settingLayout: "компоновка",
    layout1: "1 код",
    layout2: "2 кода (1×2)",
    layout4: "4 кода (2×2)",
    layout6: "6 кодов (2×3)",
    settingDisplaySize: "размер на экране",
    colorBetaLabel: "цветовой канал (бета)",
    colorBetaHint: "Удваивает число кадров в коде; сначала проверьте оба экрана.",
    colorBetaTag: "цвет, бета",
    specTxRate: "скорость передачи",
    specFramePayload: "данные кадра",
    specQr: "qr",
    specSending: "отправляется",
    specCompression: "сжатие",
    specFountainBlocks: "фонтанные блоки",
    statusChooseFile: "Выберите файл, чтобы начать",
    statusPasteText: "Вставьте или введите текст, чтобы начать",
    statusChooseDemo: "Выберите демо-данные, чтобы начать",
    statusBenchmark: "Отправьте данные бенчмарка, чтобы начать",
    footerHint: "Откройте «Приём» на другом устройстве. Увеличьте яркость этого экрана.",
    footerHintStandalone:
      "Откройте автономный приёмник на другом устройстве. Увеличьте яркость этого экрана.",
    shareDialogTitle: "Поделиться приёмником",
    shareDialogHint:
      "Отсканируйте этот код камерой второго устройства или отправьте ему ссылку.",
    receiverLinkAriaLabel: "Ссылка на приёмник",
    shareTitleData: "Decimen Optical Transfer — приёмник",
    loadingDemo: (name) => `загрузка ${name}…`,
    demoLoadFailed: (name, status) => `не удалось загрузить ${name} (${status})`,
    preparingFile: (name) => `подготовка ${name}…`,
    preparingSnippet: "подготовка текста…",
    fileEmpty: (name) => `Файл ${name} пуст — отправлять нечего.`,
    fileOverLimit: (name, size, limit) =>
      `${name} занимает ${size} — больше лимита в ${limit}.`,
    capacityError: (size, blocks, frameBytes, maxBlocks, suggestion) =>
      `Для ${size} при ${frameBytes} байт на кадр блоков получается ${blocks}, ` +
      `а кадр может пронумеровать только ${maxBlocks} из них. ` +
      `Увеличьте «байт / кадр» до ${suggestion} или больше.`,
    streaming: (name) => `Передаётся ${name} — `,
    shareReceiverLink: "Поделиться ссылкой на приёмник",
    stallWarning: (seconds) =>
      `Поток замер на ${seconds} с — это окно было скрыто или в фоне. ` +
      `Держите его видимым и в фокусе: при паузе приёмник теряет захват.`,
    fpsValue: (fps, codes) =>
      codes > 1 ? `${fps} fps × ${codes} ${codes < 5 ? "кода" : "кодов"}` : `${fps} fps`,
    frameBytesValue: (bytes, codes) =>
      codes > 1 ? `${bytes} байт × ${codes}` : `${bytes} байт`,
    gzipTo: (size) => `gzip → ${size}`,
    compressionNone: "нет",
  },

  receive: {
    docTitle: "Decimen Optical Transfer — приём",
    eyebrow: "Камера → ваше устройство",
    title: "Приём",
    statusReady: "Готово к сканированию файла или текстового потока",
    startCamera: "Включить камеру",
    starting: "Запуск…",
    noSignalQuestion: "Ничего не происходит?",
    progressZero: "0% · 0 кадров",
    estimatingTime: "Оценка времени…",
    progressAriaLabel: "Ход восстановления передачи",
    tipsTitle: "Что проверить",
    tipDropFrameBytes: (bytes) =>
      `На отправителе откройте «Настройки передачи» и уменьшите «байт / кадр» до ${bytes}.`,
    tipDropTxFps: (fps) =>
      `Всё ещё ничего? Уменьшите на отправителе и «fps передачи» — до ${fps}.`,
    tipFillView:
      "Заполните кодом весь кадр камеры и прислоните телефон к чему-нибудь устойчивому — " +
      "чаще всего виноват автофокус, мечущийся из-за дрожи в руках.",
    tipBrightness: "Выкрутите яркость передающего экрана на максимум.",
    diagnosticsSummary: "Диагностика в реальном времени",
    metricCaptureFps: "fps захвата",
    metricDecodeFps: "fps декодирования",
    metricGoodput: "полезная скорость",
    metricElapsed: "прошло",
    metricFrames: "кадры нов./повт.",
    metricBlocks: "блоки K",
    metricBlockLen: "длина блока",
    metricTransfer: "передача",
    settingsSummary: "Настройки приёма",
    settingCamera: "камера",
    cameraAuto: "авто",
    cameraN: (n) => `камера ${n}`,
    settingCaptureWidth: "ширина захвата",
    settingCaptureFps: "fps захвата",
    settingDecodeWorkers: "потоки декодирования",
    autoShowLabel: "Показывать полученные файлы автоматически",
    settingsApplied: "Применяется при запуске камеры.",
    errSecureContext:
      "камере нужен защищённый контекст — страница должна открываться по https, " +
      "чтобы камера работала с другого устройства. `npm run dev` уже так делает.",
    errPermissionDenied:
      "нет доступа к камере — разрешите его и снова нажмите «Включить камеру».",
    errCameraGone:
      "эта камера больше недоступна — верните настройку «камера» на «авто» и нажмите «Включить камеру».",
    errCamera: (message) => `камера: ${message}`,
    errRestartFailed:
      "камера: не перезапустилась после переключения — нажмите «Включить камеру».",
    errLiveChangeRefused: "эта камера не приняла изменение на лету — перезапустите, чтобы применить",
    cameraRefusedKeptPrevious: "та камера не запустилась — оставлена прежняя",
    cameraSearching: (resolution) => `камера ${resolution} — поиск потока…`,
    cameraActual: (resolution, fps, askedFps, workers) =>
      `камера ${resolution} @ ${fps} fps${askedFps === null ? "" : ` (запрошено ${askedFps})`} · ` +
      `потоков декодирования: ${workers} · изменения применяются на лету`,
    progressBlocks: (percent, solved, k) => `${percent}% · блоков: ${solved}/${k}`,
    framesDecoding: (frames) => `кадров: ${frames} · декодирование`,
    aboutEta: (duration, frames) => `Около ${duration} · кадров: ${frames}`,
    etaTotal: (duration) => `всего ${duration}`,
    resyncing: "Восстановленные данные не прошли проверку. Повторная синхронизация…",
    resyncRestartSender: "Если это повторяется, перезапустите отправителя.",
    transferFailedShort: "Передача не удалась",
    transferFailedDetail:
      "Из этого потока не удалось извлечь ничего пригодного. Перезапустите отправителя " +
      "и отсканируйте снова — неудачная попытка не стоит ничего, кроме времени.",
    tryAgain: "Попробовать снова",
    transferSummary: "Итоги передачи",
    transferComplete: "Передача завершена!",
    recoveredFile: "100% · файл восстановлен",
    recoveredText: "100% · текст восстановлен",
    textReceived: "Текст получен",
    textLabel: "текст",
    fileStats: (size, seconds, rate) => `${size} за ${seconds} · ${rate}`,
    gzipDecompressed: "gzip распакован",
    shaVerified: "SHA-256 подтверждён ✓",
    saveFile: (name) => `Сохранить ${name}`,
    receiveAnother: "Получить ещё один файл",
    showText: "Показать текст",
    mediaImage: "изображение",
    mediaVideo: "видео",
    mediaAudio: "аудио",
    showMedia: (noun) => `Показать ${noun}`,
    clearCache: "Очистить кэш Decimen",
    cacheCleared: "Кэш очищен",
    clearCacheFailed: "Не удалось очистить — попробуйте ещё раз",
    receivedPreviewAlt: (name) => `Предпросмотр полученного файла: ${name}`,
    receivedFileAriaLabel: (name) => `Полученный файл: ${name}`,
    supportAfter: "♥ Понравилось? Угостите меня кофе",
  },

  common: {
    copy: "Копировать",
    copied: "Скопировано",
    copyFailed: "Не удалось скопировать",
    close: "Закрыть",
    share: "Поделиться…",
    dismiss: "Скрыть",
    help: "Справка",
    gotIt: "Понятно",
  },

  errors: {
    fileEmpty: "Выберите непустой файл.",
    fileOverLimit: (limit) => `В этой браузерной сборке файлы ограничены ${limit}.`,
    fileNameTooLong: "Имя файла или тип содержимого слишком длинные.",
    inflateOverflow: "Восстановленный файл при распаковке превышает заявленную длину.",
    containerTruncated: "Заголовок восстановленного файла обрезан.",
    containerBadMagic: "Заголовок восстановленного файла некорректен.",
    containerBadCompression: "Восстановленный файл использует неподдерживаемое сжатие.",
    containerLengthMismatch: "Длина восстановленного файла не совпадает с заголовком.",
    gzipIncomplete: "Восстановленные данные gzip неполны.",
    gzipLengthMismatch: "Длина данных gzip не совпадает с заголовком файла.",
    decompressedLengthMismatch: "Длина распакованного файла не совпадает с заголовком.",
    streamChecksumMismatch: "Контрольная сумма оптического потока не совпала.",
    sha256Failed: "Восстановленный файл не прошёл проверку SHA-256.",
    snippetEmpty: "Вставьте или введите текст перед отправкой.",
    snippetOverLimit: (limit) => `Текстовые фрагменты ограничены ${limit}.`,
    snippetNotText: "Этот поток — не текстовый фрагмент.",
    snippetBadUtf8: "Восстановленный фрагмент не является корректным UTF-8.",
  },

  verdicts: {
    olderSender: (version) =>
      `Передающий экран использует более старый формат Decimen (v${version}). Обновите отправляющее устройство.`,
    newerSender: (version) =>
      `Передающий экран использует более новый формат Decimen (v${version}). Обновите это приложение, чтобы принять поток.`,
    unsupportedFlags:
      "Этот поток использует возможность Decimen, которую эта версия не умеет читать. Обновите это приложение, чтобы принять поток.",
  },

  units: {
    bytes: "Б",
    kilobytes: "КБ",
    megabytes: "МБ",
    kbPerSecond: (value) => `${value} КБ/с`,
    secondsValue: (value) => `${value} с`,
    durHours: (hours) => `${hours} ч`,
    durMinutes: (minutes) => `${minutes} мин`,
    durSeconds: (seconds) => `${seconds} с`,
  },

  i18n: {
    languageSelectLabel: "Язык",
    unreviewedNote:
      "Этот перевод сделан машиной и ещё не проверен носителем языка.",
    unreviewedLinkText: "Сообщить об ошибке перевода",
    switchOffer: "Decimen доступен на русском.",
    switchAction: "Открыть на русском",
  },
};
