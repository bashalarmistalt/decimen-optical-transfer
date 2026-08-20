// Arabic (العربية) — Modern Standard Arabic, RTL.
// Machine-drafted (Claude), not yet reviewed by a native speaker.
// When a native review lands, flip `reviewed: true` for "ar" in
// shared/i18n/registry.ts to remove the on-page unreviewed note.

import type { Messages } from "../messages";
import { localeByCode } from "../registry";

export const messages: Messages = {
  meta: localeByCode("ar")!,

  chrome: {
    navAriaLabel: "الوضع",
    navSend: "إرسال",
    navReceive: "استقبال",
    modeBadgeSend: "إرسال",
    modeBadgeReceive: "استقبال",
    footerLinksAriaLabel: "روابط المشروع",
    footerSupport: "♥ ادعمنا",
  },

  home: {
    title: "Decimen Optical Transfer — نقل الملفات بالضوء",
    metaDescription:
      "أرسل ملفًا أو نصًا بين جهازين دون أي شيء سوى شاشة وكاميرا. رموز QR متحركة بترميز النافورة، من دون أي مسار شبكي بينهما.",
    ogDescription:
      "رموز QR متحركة بترميز النافورة، من الشاشة إلى الكاميرا. بلا حساب ولا اقتران ولا مسار شبكي بين الجهازين. سرعة مستمرة تبلغ %TOP_SPEED%، وفق قياسات موثقة.",
    ogImageAlt: "هاتف في منتصف عملية النقل يقرأ بث رموز QR متحركة من شاشة أخرى.",
    heroTitleHtml: "انقل الملفات<br />بالضوء.",
    heroCopy:
      "أرسل ملفًا أو مقطعًا نصيًا من شاشة إلى كاميرا جهاز آخر. بلا حساب ولا اقتران ولا تخزين سحابي ولا مسار شبكي بين الجهازين.",
    chooseSideAriaLabel: "اختر طرفًا",
    cardSendKicker: "هذه الشاشة تبثّ",
    cardSendTitle: "إرسال ملف أو نص",
    cardSendBody:
      "أي ملف حتى %MAX_FILE_LABEL%، أو مقتطف نصي ملصق حتى %MAX_SNIPPET_LABEL%. يُضغط عندما يفيد ذلك، ويُستعاد باسمه الأصلي.",
    cardSendAction: "إرسال",
    cardReceiveKicker: "هذه الكاميرا تستقبل",
    cardReceiveTitle: "وجِّه واستقبِل",
    cardReceiveBody: "وجِّه الكاميرا نحو شاشة المرسِل لاستقبال الملف.",
    cardReceiveAction: "استقبال",
    shareSite: "مشاركة Decimen",
    supportTitle: "مجاني ومفتوح المصدر وبلا إعلانات",
    supportBodyHtml:
      'إذا جعل Decimen يومك أسهل، يمكنك أن <a href="https://buymeacoffee.com/bashalarmist" target="_blank" rel="noopener noreferrer">تشتري لي فنجان قهوة</a>.',
    shareDialogTitle: "مشاركة هذا التطبيق",
    shareDialogHint: "امسح هذا الرمز بكاميرا جهاز آخر، أو أرسل إليه الرابط.",
    siteLinkAriaLabel: "رابط الموقع",
    privacyNote:
      "لا يلزم أي مسار شبكي بين الجهازين؛ فالبايتات تنتقل على هيئة ضوء. الملفات غير مشفَّرة، لذا يمكن لأي كاميرا موجَّهة إلى شاشة الإرسال قراءة كل ما يظهر عليها.",
  },

  send: {
    docTitle: "Decimen Optical Transfer — الإرسال",
    eyebrow: "الشاشة ← الكاميرا",
    introCopy: "لا يغادر جهازَك أي شيء حتى تمسح الرمز بجهاز مستقبِل.",
    modeAriaLabel: "ما الذي تريد إرساله",
    modeFile: "ملف",
    modeSnippet: "مقتطف نصي",
    titleFile: "إرسال ملف",
    titleSnippet: "إرسال نص",
    selectFile: "اختيار ملف",
    stopTransfer: "إيقاف النقل",
    anyFileUpTo: "أي ملف · حتى %MAX_FILE_LABEL%",
    selectedFile: (name) => `الملف المحدد: ${name}`,
    demoPayload: "حمولة تجريبية",
    benchmarkPayload: "حمولة قياس الأداء",
    demo512: "صورة 512 KB",
    demo2mb: "صورة 2 MB",
    demoBenchmark: "قياس أداء 1 MB",
    navDemo: "تجريبي",
    navBenchmark: "قياس الأداء",
    snippetLabel: "النص المراد إرساله",
    snippetLabelWithMax: "النص المراد إرساله · حتى %MAX_SNIPPET_LABEL%",
    snippetPlaceholder: "الصق أو اكتب أي شيء — رابطًا أو ملف إعدادات أو نصًا طويلًا…",
    startTextStream: "بدء بث النص",
    settingsSummary: "إعدادات النقل",
    settingTxFps: "fps الإرسال",
    settingBytesPerFrame: "بايت / إطار",
    settingEcc: "تصحيح الأخطاء",
    settingLayout: "التخطيط",
    layout1: "رمز واحد",
    layout2: "رمزان (1×2)",
    layout4: "4 رموز (2×2)",
    layout6: "6 رموز (2×3)",
    settingDisplaySize: "حجم العرض",
    specTxRate: "معدل الإرسال",
    specFramePayload: "حمولة الإطار",
    specQr: "QR",
    specSending: "قيد الإرسال",
    specCompression: "الضغط",
    specFountainBlocks: "كتل النافورة",
    statusChooseFile: "اختر ملفًا للبدء",
    statusPasteText: "الصق أو اكتب نصًا للبدء",
    statusChooseDemo: "اختر حمولة تجريبية للبدء",
    statusBenchmark: "أرسل حمولة قياس الأداء للبدء",
    footerHint: "افتح «استقبال» على الجهاز الآخر، وارفع سطوع هذه الشاشة.",
    footerHintStandalone: "افتح المستقبِل المستقل على الجهاز الآخر، وارفع سطوع هذه الشاشة.",
    shareDialogTitle: "مشاركة المستقبِل",
    shareDialogHint: "امسح هذا الرمز بكاميرا الجهاز الآخر، أو أرسل إليه الرابط.",
    receiverLinkAriaLabel: "رابط المستقبِل",
    shareTitleData: "Decimen Optical Transfer — المستقبِل",
    loadingDemo: (name) => `جارٍ تحميل ${name}…`,
    demoLoadFailed: (name, status) => `تعذّر تحميل ${name} (${status})`,
    preparingFile: (name) => `جارٍ تحضير ${name}…`,
    preparingSnippet: "جارٍ تحضير المقتطف النصي…",
    fileEmpty: (name) => `الملف ${name} فارغ — لا يوجد ما يُرسَل.`,
    fileOverLimit: (name, size, limit) =>
      `حجم الملف ${name} هو ${size}، وهذا يتجاوز الحد البالغ ${limit}.`,
    capacityError: (size, blocks, frameBytes, maxBlocks, suggestion) =>
      `يحتاج ${size} إلى ${blocks} كتلة عند ${frameBytes} بايت لكل إطار، ` +
      `ولا يمكن للإطار الواحد ترقيم أكثر من ${maxBlocks} منها. ` +
      `ارفع «بايت / إطار» إلى ${suggestion} أو أكثر.`,
    streaming: (name) => `جارٍ بث ${name} — `,
    shareReceiverLink: "مشاركة رابط المستقبِل",
    stallWarning: (seconds) =>
      `توقّف البث لمدة ${seconds} ث — كانت هذه النافذة مخفية أو في الخلفية. ` +
      `أبقِها ظاهرة ونشطة؛ فالمستقبِل يفقد التزامن عندما تتوقف.`,
    fpsValue: (fps, codes) => (codes > 1 ? `${fps} fps × ${codes} رموز` : `${fps} fps`),
    frameBytesValue: (bytes, codes) =>
      codes > 1 ? `${bytes} بايت × ${codes}` : `${bytes} بايت`,
    gzipTo: (size) => `gzip إلى ${size}`,
    compressionNone: "بدون",
    exportSummary: "تصدير الرسم المتحرك",
    exportIntro:
      "احفظ هذا البث كملف رسم متحرك يتكرر باستمرار. ضمِّنه في فيديو أو صفحة — " +
      "وأي كاميرا موجهة نحو الحلقة أثناء تشغيلها يمكنها استقبال الملف.",
    exportFormat: "الصيغة",
    exportFormatZip: "تسلسل PNG ‏(ZIP)",
    exportFps: "معدل الإطارات",
    exportScale: "مقياس الوحدات",
    exportCycles: "الدورات",
    exportStart: "تصدير",
    exportCancel: "إلغاء",
    exportEstimate: (frames, size, loop) => `${frames} إطارًا · ~${size} · حلقة مدتها ${loop}`,
    exportProgress: (percent) => `جارٍ الإنشاء… ${percent}%`,
    exportFailed: (message) => `فشل التصدير: ${message}`,
    exportZipLimit: (frames, max) =>
      `${frames} إطارًا يتجاوز حدّ ZIP البالغ ${max}. قلّله بعدد دورات أقل، أو تخطيط أوسع، أو المزيد من البايتات / إطار.`,
  },

  receive: {
    docTitle: "Decimen Optical Transfer — الاستقبال",
    eyebrow: "الكاميرا ← جهازك",
    title: "استقبال",
    statusReady: "جاهز لمسح بث ملف أو نص",
    startCamera: "تشغيل الكاميرا",
    starting: "جارٍ التشغيل…",
    noSignalQuestion: "لا يحدث شيء؟",
    progressZero: "0% · 0 من الإطارات",
    estimatingTime: "جارٍ تقدير الوقت…",
    progressAriaLabel: "تقدّم استعادة النقل",
    tipsTitle: "نصائح لحل المشكلات",
    tipDropFrameBytes: (bytes) =>
      `على جهاز الإرسال، افتح «إعدادات النقل» وخفّض «بايت / إطار» إلى ${bytes}.`,
    tipDropTxFps: (fps) => `أما زال لا شيء يحدث؟ خفّض «fps الإرسال» على المرسِل إلى ${fps} أيضًا.`,
    tipFillView:
      "املأ مجال رؤية الكاميرا بالرمز، واسند الهاتف إلى شيء ثابت — " +
      "فبحث التركيز التلقائي الناتج عن اهتزاز اليد هو السبب المعتاد.",
    tipBrightness: "ارفع سطوع شاشة الإرسال إلى أقصاه.",
    diagnosticsSummary: "تشخيصات مباشرة",
    metricCaptureFps: "fps الالتقاط",
    metricDecodeFps: "fps فك الترميز",
    metricGoodput: "المعدل الفعلي",
    metricElapsed: "الوقت المنقضي",
    metricFrames: "الإطارات (جديدة/مكررة)",
    metricBlocks: "الكتل K",
    metricBlockLen: "طول الكتلة",
    metricTransfer: "النقل",
    settingsSummary: "إعدادات الاستقبال",
    settingCamera: "الكاميرا",
    cameraAuto: "تلقائي",
    cameraN: (n) => `الكاميرا ${n}`,
    settingCaptureWidth: "عرض الالتقاط",
    settingCaptureFps: "fps الالتقاط",
    settingDecodeWorkers: "عمّال فك الترميز",
    autoShowLabel: "عرض الملفات المستلمة تلقائيًا",
    settingsApplied: "تُطبَّق عند تشغيل الكاميرا.",
    errSecureContext:
      "تحتاج الكاميرا إلى سياق آمن — يجب أن تُقدَّم هذه الصفحة عبر https " +
      "لاستخدام الكاميرا من جهاز آخر. الأمر `npm run dev` يوفّر ذلك أصلًا.",
    errPermissionDenied: "رُفض إذن الكاميرا — اسمح به ثم انقر «تشغيل الكاميرا» مرة أخرى.",
    errCameraGone:
      "هذه الكاميرا لم تعد متاحة — أعد ضبط الكاميرا إلى «تلقائي» ثم انقر «تشغيل الكاميرا».",
    errCamera: (message) => `الكاميرا: ${message}`,
    errRestartFailed: "الكاميرا: تعذّرت إعادة التشغيل بعد التبديل — انقر «تشغيل الكاميرا».",
    errLiveChangeRefused: "رفضت هذه الكاميرا تغييرًا أثناء التشغيل — أعد التشغيل لتطبيقه",
    cameraRefusedKeptPrevious: "رفضت تلك الكاميرا التشغيل — أُبقيَ على الكاميرا السابقة",
    cameraSearching: (resolution) => `الكاميرا ${resolution} — جارٍ البحث عن بث…`,
    cameraActual: (resolution, fps, askedFps, workers) =>
      `الكاميرا ${resolution} بمعدل ${fps} fps${askedFps === null ? "" : ` (المطلوب ${askedFps})`} · ` +
      `عمّال فك الترميز: ${workers} · تسري التغييرات مباشرةً`,
    progressBlocks: (percent, solved, k) => `${percent}% · ${solved}/${k} كتلة`,
    framesDecoding: (frames) => `${frames} من الإطارات · جارٍ فك الترميز`,
    aboutEta: (duration, frames) => `حوالي ${duration} · ${frames} من الإطارات`,
    etaTotal: (duration) => `${duration} إجمالًا`,
    resyncing: "لم تجتز البيانات المستعادة التحقق. تجري إعادة المزامنة والمتابعة…",
    resyncRestartSender: "إذا تكرر ذلك، فأعد تشغيل المرسِل.",
    transferFailedShort: "فشل النقل",
    transferFailedDetail:
      "لم يخرج من ذلك البث شيء صالح للاستخدام. أعد تشغيل المرسِل ثم امسحه من جديد — " +
      "فالنقل الجزئي لا يكلّف سوى الوقت.",
    tryAgain: "حاول مرة أخرى",
    transferSummary: "ملخص النقل",
    transferComplete: "اكتمل النقل!",
    recoveredFile: "100% · استُعيد الملف",
    recoveredText: "100% · استُعيد النص",
    textReceived: "تم استلام النص",
    textLabel: "نص",
    fileStats: (size, seconds, rate) => `${size} خلال ${seconds} · ${rate}`,
    gzipDecompressed: "فُكّ ضغط gzip",
    shaVerified: "تم التحقق من SHA-256 ✓",
    saveFile: (name) => `حفظ ${name}`,
    receiveAnother: "استقبال ملف آخر",
    showText: "عرض النص",
    mediaImage: "الصورة",
    mediaVideo: "الفيديو",
    mediaAudio: "المقطع الصوتي",
    showMedia: (noun) => `عرض ${noun}`,
    clearCache: "مسح ذاكرة Decimen المؤقتة",
    cacheCleared: "تم مسح الذاكرة المؤقتة",
    clearCacheFailed: "فشل المسح — حاول مرة أخرى",
    receivedPreviewAlt: (name) => `معاينة الملف المستلَم: ${name}`,
    receivedFileAriaLabel: (name) => `الملف المستلَم: ${name}`,
    supportAfter: "♥ أعجبك هذا؟ اشترِ لي فنجان قهوة",
  },

  common: {
    copy: "نسخ",
    copied: "تم النسخ",
    copyFailed: "فشل النسخ",
    close: "إغلاق",
    share: "مشاركة…",
    dismiss: "تجاهل",
    help: "مساعدة",
    gotIt: "فهمت",
  },

  errors: {
    fileEmpty: "اختر ملفًا غير فارغ.",
    fileOverLimit: (limit) => `يقتصر حجم الملفات على ${limit} في إصدار المتصفح هذا.`,
    fileNameTooLong: "اسم الملف أو نوع الوسائط طويل جدًا.",
    inflateOverflow: "يتجاوز الملف المستعاد طوله المعلَن عند فك الضغط.",
    containerTruncated: "ترويسة الملف المستعاد غير مكتملة.",
    containerBadMagic: "ترويسة الملف المستعاد غير صالحة.",
    containerBadCompression: "يستخدم الملف المستعاد ضغطًا غير مدعوم.",
    containerLengthMismatch: "طول الملف المستعاد لا يطابق ترويسته.",
    gzipIncomplete: "حمولة gzip المستعادة غير مكتملة.",
    gzipLengthMismatch: "طول حمولة gzip لا يطابق ترويسة الملف.",
    decompressedLengthMismatch: "طول الملف بعد فك الضغط لا يطابق ترويسته.",
    streamChecksumMismatch: "المجموع الاختباري للبث الضوئي غير مطابق.",
    sha256Failed: "أخفق الملف المستعاد في اجتياز التحقق من SHA-256.",
    snippetEmpty: "الصق أو اكتب نصًا قبل الإرسال.",
    snippetOverLimit: (limit) => `تقتصر المقتطفات النصية على ${limit}.`,
    snippetNotText: "هذا البث ليس مقتطفًا نصيًا.",
    snippetBadUtf8: "المقتطف المستعاد ليس بترميز UTF-8 صالح.",
  },

  verdicts: {
    olderSender: (version) =>
      `تلك الشاشة ترسل بتنسيق Decimen أقدم (v${version}). حدِّث الجهاز المرسِل.`,
    newerSender: (version) =>
      `تلك الشاشة ترسل بتنسيق Decimen أحدث (v${version}). حدِّث هذا التطبيق لاستقباله.`,
    unsupportedFlags:
      "يستخدم هذا البث ميزة من Decimen لا يستطيع هذا الإصدار قراءتها. حدِّث هذا التطبيق لاستقباله.",
  },

  units: {
    bytes: "B",
    kilobytes: "KB",
    megabytes: "MB",
    kbPerSecond: (value) => `${value} KB/s`,
    secondsValue: (value) => `${value} ث`,
    durHours: (hours) => `${hours} س`,
    durMinutes: (minutes) => `${minutes} د`,
    durSeconds: (seconds) => `${seconds} ث`,
  },

  i18n: {
    languageSelectLabel: "اللغة",
    unreviewedNote: "هذه الترجمة مُعدَّة آليًا ولم يراجعها متحدث أصلي بالعربية بعد.",
    unreviewedLinkText: "الإبلاغ عن مشكلة في الترجمة",
    switchOffer: "يتوفر Decimen باللغة العربية.",
    switchAction: "العرض بالعربية",
  },
};
