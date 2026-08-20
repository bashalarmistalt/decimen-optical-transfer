// Hindi (हिन्दी). Machine-drafted (Claude), not yet reviewed by a native speaker.
//
// Once a native review lands, flip `reviewed: true` for "hi" in
// shared/i18n/registry.ts — that removes the on-page unreviewed note.

import type { Messages } from "../messages";
import { localeByCode } from "../registry";

export const messages: Messages = {
  meta: localeByCode("hi")!,

  chrome: {
    navAriaLabel: "मोड",
    navSend: "भेजें",
    navReceive: "प्राप्त करें",
    modeBadgeSend: "भेजें",
    modeBadgeReceive: "प्राप्त करें",
    footerLinksAriaLabel: "प्रोजेक्ट लिंक",
    footerSupport: "♥ सहयोग",
  },

  home: {
    title: "Decimen Optical Transfer — रोशनी से फ़ाइलें ट्रांसफ़र करें",
    metaDescription:
      "सिर्फ़ एक स्क्रीन और एक कैमरे से दो डिवाइस के बीच फ़ाइल या टेक्स्ट भेजें। फ़ाउंटेन-कोडेड एनिमेटेड QR कोड — बीच में कोई नेटवर्क नहीं।",
    ogDescription:
      "फ़ाउंटेन-कोडेड एनिमेटेड QR कोड, स्क्रीन से कैमरे तक। न अकाउंट, न पेयरिंग, न दोनों डिवाइस के बीच कोई नेटवर्क। %TOP_SPEED% की स्थिर गति, प्रमाण सहित बेंचमार्क।",
    ogImageAlt: "ट्रांसफ़र के बीच एक फ़ोन, दूसरी स्क्रीन से एनिमेटेड QR कोड स्ट्रीम पढ़ता हुआ।",
    heroTitleHtml: "रोशनी से<br />फ़ाइलें ट्रांसफ़र करें।",
    heroCopy:
      "एक स्क्रीन से दूसरे डिवाइस के कैमरे तक फ़ाइल या टेक्स्ट भेजें। न अकाउंट, न पेयरिंग, न क्लाउड स्टोरेज, न डिवाइसों के बीच कोई नेटवर्क।",
    chooseSideAriaLabel: "एक विकल्प चुनें",
    cardSendKicker: "यह स्क्रीन भेजती है",
    cardSendTitle: "फ़ाइल या टेक्स्ट भेजें",
    cardSendBody:
      "%MAX_FILE_LABEL% तक की कोई भी फ़ाइल, या %MAX_SNIPPET_LABEL% तक का पेस्ट किया हुआ टेक्स्ट। जहाँ फ़ायदा हो वहाँ कंप्रेस, और मूल नाम के साथ वापस।",
    cardSendAction: "भेजें",
    cardReceiveKicker: "यह कैमरा प्राप्त करता है",
    cardReceiveTitle: "कैमरा दिखाएँ और प्राप्त करें",
    cardReceiveBody: "फ़ाइल प्राप्त करने के लिए अपना कैमरा भेजने वाली स्क्रीन की ओर करें।",
    cardReceiveAction: "प्राप्त करें",
    shareSite: "Decimen शेयर करें",
    supportTitle: "मुफ़्त, ओपन सोर्स, बिना विज्ञापन",
    supportBodyHtml:
      'अगर Decimen ने आपका काम आसान किया हो, तो आप <a href="https://buymeacoffee.com/bashalarmist" target="_blank" rel="noopener noreferrer">मुझे एक कॉफ़ी पिला सकते हैं</a>।',
    shareDialogTitle: "यह ऐप शेयर करें",
    shareDialogHint: "इसे दूसरे डिवाइस के कैमरे से स्कैन करें, या उसे लिंक भेज दें।",
    siteLinkAriaLabel: "साइट लिंक",
    privacyNote:
      "डिवाइसों के बीच किसी नेटवर्क की ज़रूरत नहीं — बाइट रोशनी के रूप में जाते हैं। फ़ाइलें एन्क्रिप्टेड नहीं होतीं, इसलिए भेजने वाली स्क्रीन पर जो कुछ है, उसे उस ओर किया गया कोई भी कैमरा पढ़ सकता है।",
  },

  send: {
    docTitle: "Decimen Optical Transfer — भेजें",
    eyebrow: "स्क्रीन → कैमरा",
    introCopy: "जब तक आप रिसीवर से स्कैन नहीं करते, आपके डिवाइस से कुछ भी बाहर नहीं जाता।",
    modeAriaLabel: "क्या भेजना है",
    modeFile: "फ़ाइल",
    modeSnippet: "टेक्स्ट स्निपेट",
    titleFile: "फ़ाइल भेजें",
    titleSnippet: "टेक्स्ट भेजें",
    selectFile: "फ़ाइल चुनें",
    stopTransfer: "ट्रांसफ़र रोकें",
    anyFileUpTo: "कोई भी फ़ाइल · %MAX_FILE_LABEL% तक",
    selectedFile: (name) => `चुनी गई फ़ाइल: ${name}`,
    demoPayload: "डेमो पेलोड",
    benchmarkPayload: "बेंचमार्क पेलोड",
    demo512: "512 KB इमेज",
    demo2mb: "2 MB इमेज",
    demoBenchmark: "1 MB बेंचमार्क",
    navDemo: "डेमो",
    navBenchmark: "बेंचमार्क",
    snippetLabel: "भेजने के लिए टेक्स्ट",
    snippetLabelWithMax: "भेजने के लिए टेक्स्ट · %MAX_SNIPPET_LABEL% तक",
    snippetPlaceholder: "कुछ भी पेस्ट करें या लिखें — कोई URL, कोई कॉन्फ़िग, टेक्स्ट का पूरा पहाड़…",
    startTextStream: "टेक्स्ट स्ट्रीम शुरू करें",
    settingsSummary: "ट्रांसफ़र सेटिंग्स",
    settingTxFps: "tx fps",
    settingBytesPerFrame: "बाइट / फ़्रेम",
    settingEcc: "एरर करेक्शन",
    settingLayout: "लेआउट",
    layout1: "1 कोड",
    layout2: "2 कोड (1×2)",
    layout4: "4 कोड (2×2)",
    layout6: "6 कोड (2×3)",
    settingDisplaySize: "डिस्प्ले साइज़",
    specTxRate: "tx रेट",
    specFramePayload: "फ़्रेम पेलोड",
    specQr: "qr",
    specSending: "भेजा जा रहा",
    specCompression: "कंप्रेशन",
    specFountainBlocks: "फ़ाउंटेन ब्लॉक",
    statusChooseFile: "शुरू करने के लिए कोई फ़ाइल चुनें",
    statusPasteText: "शुरू करने के लिए कुछ टेक्स्ट पेस्ट करें या लिखें",
    statusChooseDemo: "शुरू करने के लिए कोई डेमो पेलोड चुनें",
    statusBenchmark: "शुरू करने के लिए बेंचमार्क पेलोड भेजें",
    footerHint: "दूसरे डिवाइस पर “प्राप्त करें” खोलें। इस स्क्रीन की ब्राइटनेस बढ़ा दें।",
    footerHintStandalone:
      "दूसरे डिवाइस पर स्टैंडअलोन रिसीवर खोलें। इस स्क्रीन की ब्राइटनेस बढ़ा दें।",
    shareDialogTitle: "रिसीवर शेयर करें",
    shareDialogHint: "इसे दूसरे डिवाइस के कैमरे से स्कैन करें, या उसे लिंक भेज दें।",
    receiverLinkAriaLabel: "रिसीवर लिंक",
    shareTitleData: "Decimen Optical Transfer — रिसीवर",
    loadingDemo: (name) => `${name} लोड किया जा रहा है…`,
    demoLoadFailed: (name, status) => `${name} लोड नहीं हो सका (${status})`,
    preparingFile: (name) => `${name} तैयार किया जा रहा है…`,
    preparingSnippet: "टेक्स्ट स्निपेट तैयार किया जा रहा है…",
    fileEmpty: (name) => `${name} खाली है — भेजने के लिए कुछ नहीं है।`,
    fileOverLimit: (name, size, limit) =>
      `${name} का आकार ${size} है, जो ${limit} की सीमा से ज़्यादा है।`,
    capacityError: (size, blocks, frameBytes, maxBlocks, suggestion) =>
      `${size} के लिए ${frameBytes} बाइट प्रति फ़्रेम पर ${blocks} ब्लॉक चाहिए, जबकि एक फ़्रेम ` +
      `ज़्यादा से ज़्यादा ${maxBlocks} ही गिन सकता है। बाइट / फ़्रेम को ${suggestion} या उससे ऊपर कर दें।`,
    streaming: (name) => `${name} की स्ट्रीमिंग जारी — `,
    shareReceiverLink: "रिसीवर लिंक शेयर करें",
    stallWarning: (seconds) =>
      `स्ट्रीम ${seconds} सेकंड के लिए रुक गई — यह विंडो छिपी थी या बैकग्राउंड में थी। ` +
      `इसे दिखती और फ़ोकस में रखें; स्ट्रीम रुकने पर रिसीवर की पकड़ छूट जाती है।`,
    fpsValue: (fps, codes) => (codes > 1 ? `${fps} fps × ${codes} कोड` : `${fps} fps`),
    frameBytesValue: (bytes, codes) =>
      codes > 1 ? `${bytes} बाइट × ${codes}` : `${bytes} बाइट`,
    gzipTo: (size) => `gzip → ${size}`,
    compressionNone: "कोई नहीं",
    exportSummary: "एनीमेशन निर्यात करें",
    exportIntro:
      "इस स्ट्रीम को लूप होने वाली एनीमेशन फ़ाइल के रूप में सहेजें। इसे किसी वीडियो या पेज में जोड़ें — " +
      "चल रहे लूप की ओर कैमरा घुमाकर कोई भी डिवाइस फ़ाइल प्राप्त कर सकता है।",
    exportFormat: "फ़ॉर्मैट",
    exportFormatZip: "PNG अनुक्रम (ZIP)",
    exportFps: "फ़्रेम दर",
    exportScale: "मॉड्यूल स्केल",
    exportCycles: "चक्र",
    exportStart: "निर्यात करें",
    exportCancel: "रद्द करें",
    exportEstimate: (frames, size, loop) => `${frames} फ़्रेम · ~${size} · ${loop} लूप`,
    exportProgress: (percent) => `रेंडर हो रहा है… ${percent}%`,
    exportFailed: (message) => `निर्यात विफल: ${message}`,
    exportZipLimit: (frames, max) =>
      `${frames} फ़्रेम ${max} की ZIP सीमा से अधिक हैं। कम चक्र, व्यापक लेआउट, या अधिक बाइट / फ़्रेम से इसे घटाएँ।`,
  },

  receive: {
    docTitle: "Decimen Optical Transfer — प्राप्त करें",
    eyebrow: "कैमरा → आपका डिवाइस",
    title: "प्राप्त करें",
    statusReady: "फ़ाइल या टेक्स्ट स्ट्रीम स्कैन करने के लिए तैयार",
    startCamera: "कैमरा शुरू करें",
    starting: "शुरू हो रहा है…",
    noSignalQuestion: "कुछ नहीं हो रहा?",
    progressZero: "0% · 0 फ़्रेम",
    estimatingTime: "समय का अनुमान लगाया जा रहा है…",
    progressAriaLabel: "ट्रांसफ़र रिकवरी की प्रगति",
    tipsTitle: "समस्या हल करने के सुझाव",
    tipDropFrameBytes: (bytes) =>
      `भेजने वाले डिवाइस पर ट्रांसफ़र सेटिंग्स खोलें और बाइट / फ़्रेम घटाकर ${bytes} कर दें।`,
    tipDropTxFps: (fps) => `फिर भी कुछ नहीं? भेजने वाले का tx fps भी घटाकर ${fps} कर दें।`,
    tipFillView:
      "कोड से इस कैमरे का पूरा व्यू भर दें, और फ़ोन को किसी चीज़ से टिका दें — " +
      "हाथ काँपने से ऑटोफ़ोकस का भटकना ही आम वजह होती है।",
    tipBrightness: "भेजने वाली स्क्रीन की ब्राइटनेस पूरी बढ़ा दें।",
    diagnosticsSummary: "लाइव डायग्नोस्टिक्स",
    metricCaptureFps: "कैप्चर fps",
    metricDecodeFps: "डिकोड fps",
    metricGoodput: "गुडपुट",
    metricElapsed: "बीता समय",
    metricFrames: "फ़्रेम नए/दोहराए",
    metricBlocks: "ब्लॉक K",
    metricBlockLen: "ब्लॉक लंबाई",
    metricTransfer: "ट्रांसफ़र",
    settingsSummary: "रिसीव सेटिंग्स",
    settingCamera: "कैमरा",
    cameraAuto: "ऑटो",
    cameraN: (n) => `कैमरा ${n}`,
    settingCaptureWidth: "कैप्चर चौड़ाई",
    settingCaptureFps: "कैप्चर fps",
    settingDecodeWorkers: "डिकोड वर्कर",
    autoShowLabel: "प्राप्त फ़ाइलें अपने आप दिखाएँ",
    settingsApplied: "कैमरा शुरू होने पर लागू होती हैं।",
    errSecureContext:
      "कैमरे के लिए सुरक्षित कॉन्टेक्स्ट चाहिए — दूसरे डिवाइस से कैमरा इस्तेमाल करने के लिए " +
      "यह पेज https पर सर्व होना चाहिए। `npm run dev` पहले से ही ऐसा करता है।",
    errPermissionDenied:
      "कैमरे की अनुमति नहीं मिली — अनुमति दें, फिर “कैमरा शुरू करें” दोबारा दबाएँ।",
    errCameraGone:
      "वह कैमरा अब उपलब्ध नहीं है — कैमरा वापस ऑटो पर सेट करें और “कैमरा शुरू करें” दबाएँ।",
    errCamera: (message) => `कैमरा: ${message}`,
    errRestartFailed: "कैमरा: स्विच के बाद दोबारा शुरू नहीं हो सका — “कैमरा शुरू करें” दबाएँ।",
    errLiveChangeRefused: "इस कैमरे ने लाइव बदलाव स्वीकार नहीं किया — लागू करने के लिए दोबारा शुरू करें",
    cameraRefusedKeptPrevious: "वह कैमरा शुरू नहीं हुआ — पिछला ही चालू रखा गया है",
    cameraSearching: (resolution) => `कैमरा ${resolution} — स्ट्रीम खोजी जा रही है…`,
    cameraActual: (resolution, fps, askedFps, workers) =>
      `कैमरा ${resolution} @ ${fps} fps${askedFps === null ? "" : ` (माँगा गया ${askedFps})`} · ` +
      `${workers} डिकोड वर्कर · बदलाव लाइव लागू होते हैं`,
    progressBlocks: (percent, solved, k) => `${percent}% · ${solved}/${k} ब्लॉक`,
    framesDecoding: (frames) => `${frames} फ़्रेम · डिकोड जारी`,
    aboutEta: (duration, frames) => `लगभग ${duration} · ${frames} फ़्रेम`,
    etaTotal: (duration) => `कुल ${duration}`,
    resyncing: "रिकवर हुए डेटा का सत्यापन नहीं हुआ। फ़िर से सिंक करके जारी रखा जा रहा है…",
    resyncRestartSender: "अगर यह बार-बार हो, तो भेजने वाले को दोबारा शुरू करें।",
    transferFailedShort: "ट्रांसफ़र विफल",
    transferFailedDetail:
      "उस स्ट्रीम से कुछ भी काम का नहीं निकला। भेजने वाले को दोबारा शुरू करके फिर से स्कैन करें — " +
      "अधूरे ट्रांसफ़र में समय के सिवा कुछ नहीं जाता।",
    tryAgain: "फिर कोशिश करें",
    transferSummary: "ट्रांसफ़र सारांश",
    transferComplete: "ट्रांसफ़र पूरा हुआ!",
    recoveredFile: "100% · फ़ाइल प्राप्त हुई",
    recoveredText: "100% · टेक्स्ट प्राप्त हुआ",
    textReceived: "टेक्स्ट प्राप्त हुआ",
    textLabel: "टेक्स्ट",
    fileStats: (size, seconds, rate) => `${seconds} में ${size} · ${rate}`,
    gzipDecompressed: "gzip डीकंप्रेस किया गया",
    shaVerified: "SHA-256 सत्यापित ✓",
    saveFile: (name) => `${name} सेव करें`,
    receiveAnother: "एक और फ़ाइल प्राप्त करें",
    showText: "टेक्स्ट दिखाएँ",
    mediaImage: "इमेज",
    mediaVideo: "वीडियो",
    mediaAudio: "ऑडियो",
    showMedia: (noun) => `${noun} दिखाएँ`,
    clearCache: "Decimen कैश साफ़ करें",
    cacheCleared: "कैश साफ़ हो गया",
    clearCacheFailed: "साफ़ नहीं हो सका — फिर कोशिश करें",
    receivedPreviewAlt: (name) => `प्राप्त फ़ाइल का प्रीव्यू: ${name}`,
    receivedFileAriaLabel: (name) => `प्राप्त फ़ाइल: ${name}`,
    supportAfter: "♥ पसंद आया? मुझे एक कॉफ़ी पिलाएँ",
  },

  common: {
    copy: "कॉपी करें",
    copied: "कॉपी हो गया",
    copyFailed: "कॉपी नहीं हो सका",
    close: "बंद करें",
    share: "शेयर करें…",
    dismiss: "खारिज करें",
    help: "सहायता",
    gotIt: "ठीक है",
  },

  errors: {
    fileEmpty: "ऐसी फ़ाइल चुनें जो खाली न हो।",
    fileOverLimit: (limit) => `इस ब्राउज़र बिल्ड में फ़ाइलों की सीमा ${limit} है।`,
    fileNameTooLong: "फ़ाइल का नाम या मीडिया टाइप बहुत लंबा है।",
    inflateOverflow: "प्राप्त फ़ाइल अपनी घोषित लंबाई से बड़ी निकल रही है।",
    containerTruncated: "प्राप्त फ़ाइल का हेडर अधूरा है।",
    containerBadMagic: "प्राप्त फ़ाइल का हेडर अमान्य है।",
    containerBadCompression: "प्राप्त फ़ाइल में असमर्थित कंप्रेशन इस्तेमाल हुआ है।",
    containerLengthMismatch: "प्राप्त फ़ाइल की लंबाई उसके हेडर से मेल नहीं खाती।",
    gzipIncomplete: "प्राप्त gzip पेलोड अधूरा है।",
    gzipLengthMismatch: "gzip पेलोड की लंबाई फ़ाइल हेडर से मेल नहीं खाती।",
    decompressedLengthMismatch: "डीकंप्रेस की गई फ़ाइल की लंबाई हेडर से मेल नहीं खाती।",
    streamChecksumMismatch: "ऑप्टिकल स्ट्रीम का चेकसम मेल नहीं खाया।",
    sha256Failed: "प्राप्त फ़ाइल SHA-256 सत्यापन में विफल रही।",
    snippetEmpty: "भेजने से पहले कुछ टेक्स्ट पेस्ट करें या लिखें।",
    snippetOverLimit: (limit) => `टेक्स्ट स्निपेट की सीमा ${limit} है।`,
    snippetNotText: "यह स्ट्रीम टेक्स्ट स्निपेट नहीं है।",
    snippetBadUtf8: "प्राप्त स्निपेट मान्य UTF-8 नहीं है।",
  },

  verdicts: {
    olderSender: (version) =>
      `वह स्क्रीन पुराना Decimen फ़ॉर्मैट (v${version}) भेज रही है। भेजने वाले डिवाइस को अपडेट करें।`,
    newerSender: (version) =>
      `वह स्क्रीन नया Decimen फ़ॉर्मैट (v${version}) भेज रही है। इसे प्राप्त करने के लिए यह ऐप अपडेट करें।`,
    unsupportedFlags:
      "वह स्ट्रीम Decimen की ऐसी सुविधा इस्तेमाल करती है जिसे यह वर्शन नहीं पढ़ सकता। इसे प्राप्त करने के लिए यह ऐप अपडेट करें।",
  },

  units: {
    bytes: "B",
    kilobytes: "KB",
    megabytes: "MB",
    kbPerSecond: (value) => `${value} KB/s`,
    secondsValue: (value) => `${value} सेकंड`,
    durHours: (hours) => `${hours} घं`,
    durMinutes: (minutes) => `${minutes} मि`,
    durSeconds: (seconds) => `${seconds} से`,
  },

  i18n: {
    languageSelectLabel: "भाषा",
    unreviewedNote:
      "यह अनुवाद मशीन से तैयार किया गया है और अभी तक किसी हिन्दी भाषी ने इसकी समीक्षा नहीं की है।",
    unreviewedLinkText: "अनुवाद की समस्या बताएँ",
    switchOffer: "Decimen हिन्दी में उपलब्ध है।",
    switchAction: "हिन्दी में देखें",
  },
};
