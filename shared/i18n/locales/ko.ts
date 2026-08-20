// Korean (한국어) — Machine-drafted (Claude), not yet reviewed by a native speaker.
//
// Once a native-speaker review lands, flip `reviewed: true` on the "ko" row in
// shared/i18n/registry.ts to remove the on-page unreviewed note.

import type { Messages } from "../messages";
import { localeByCode } from "../registry";

export const messages: Messages = {
  meta: localeByCode("ko")!,

  chrome: {
    navAriaLabel: "모드",
    navSend: "보내기",
    navReceive: "받기",
    modeBadgeSend: "보내기",
    modeBadgeReceive: "받기",
    footerLinksAriaLabel: "프로젝트 링크",
    footerSupport: "♥ 후원",
  },

  home: {
    title: "Decimen Optical Transfer — 빛으로 파일 전송",
    metaDescription:
      "화면과 카메라만으로 두 기기 사이에 파일이나 텍스트를 전송합니다. 파운틴 코딩된 애니메이션 QR 코드로 전해지며, 중간에 네트워크 경로가 없습니다.",
    ogDescription:
      "화면에서 카메라로 전해지는 파운틴 코딩 애니메이션 QR 코드. 계정도, 페어링도, 두 기기 사이의 네트워크 경로도 없습니다. 지속 속도 %TOP_SPEED%, 근거 자료와 함께 벤치마크했습니다.",
    ogImageAlt: "다른 화면의 애니메이션 QR 코드 스트림을 읽으며 전송 중인 휴대폰.",
    heroTitleHtml: "빛으로<br />파일을 전송하세요.",
    heroCopy:
      "한 화면에서 다른 기기의 카메라로 파일이나 텍스트를 보냅니다. 계정, 페어링, 클라우드 저장소, 기기 간 네트워크 경로가 전혀 필요 없습니다.",
    chooseSideAriaLabel: "역할 선택",
    cardSendKicker: "이 화면이 송신합니다",
    cardSendTitle: "파일 또는 텍스트 보내기",
    cardSendBody:
      "최대 %MAX_FILE_LABEL%의 모든 파일, 또는 최대 %MAX_SNIPPET_LABEL%의 텍스트 스니펫. 도움이 될 때는 압축하며, 원래 파일 이름 그대로 복원됩니다.",
    cardSendAction: "보내기",
    cardReceiveKicker: "이 카메라가 수신합니다",
    cardReceiveTitle: "카메라를 비춰 받기",
    cardReceiveBody: "보내는 쪽 화면에 카메라를 비추면 파일을 받습니다.",
    cardReceiveAction: "받기",
    shareSite: "Decimen 공유",
    supportTitle: "무료, 오픈 소스, 광고 없음",
    supportBodyHtml:
      'Decimen이 도움이 되었다면 <a href="https://buymeacoffee.com/bashalarmist" target="_blank" rel="noopener noreferrer">커피 한 잔</a>으로 응원해 주세요.',
    shareDialogTitle: "이 앱 공유",
    shareDialogHint: "다른 기기의 카메라로 이 코드를 스캔하거나, 링크를 보내 주세요.",
    siteLinkAriaLabel: "사이트 링크",
    privacyNote:
      "두 기기 사이에 네트워크 경로가 필요 없습니다. 바이트는 빛으로 이동합니다. 파일은 암호화되지 않으므로, 보내는 화면에 표시된 내용은 그 화면을 향한 어떤 카메라든 읽을 수 있습니다.",
  },

  send: {
    docTitle: "Decimen Optical Transfer — 보내기",
    eyebrow: "화면 → 카메라",
    introCopy: "수신기로 스캔하기 전까지는 아무것도 이 기기를 떠나지 않습니다.",
    modeAriaLabel: "보낼 항목",
    modeFile: "파일",
    modeSnippet: "텍스트 스니펫",
    titleFile: "파일 보내기",
    titleSnippet: "텍스트 보내기",
    selectFile: "파일 선택",
    stopTransfer: "전송 중지",
    anyFileUpTo: "모든 파일 · 최대 %MAX_FILE_LABEL%",
    selectedFile: (name) => `선택한 파일: ${name}`,
    demoPayload: "데모 페이로드",
    benchmarkPayload: "벤치마크 페이로드",
    demo512: "512 KB 이미지",
    demo2mb: "2 MB 이미지",
    demoBenchmark: "1 MB 벤치마크",
    navDemo: "데모",
    navBenchmark: "벤치마크",
    snippetLabel: "보낼 텍스트",
    snippetLabelWithMax: "보낼 텍스트 · 최대 %MAX_SNIPPET_LABEL%",
    snippetPlaceholder: "무엇이든 붙여넣거나 입력하세요 — URL, 설정 파일, 장문의 텍스트…",
    startTextStream: "텍스트 스트림 시작",
    settingsSummary: "전송 설정",
    settingTxFps: "송신 fps",
    settingBytesPerFrame: "프레임당 바이트",
    settingEcc: "오류 정정",
    settingLayout: "레이아웃",
    layout1: "코드 1개",
    layout2: "코드 2개 (1×2)",
    layout4: "코드 4개 (2×2)",
    layout6: "코드 6개 (2×3)",
    settingDisplaySize: "표시 크기",
    specTxRate: "송신 속도",
    specFramePayload: "프레임 페이로드",
    specQr: "QR",
    specSending: "전송 대상",
    specCompression: "압축",
    specFountainBlocks: "파운틴 블록",
    statusChooseFile: "시작하려면 파일을 선택하세요",
    statusPasteText: "시작하려면 텍스트를 붙여넣거나 입력하세요",
    statusChooseDemo: "시작하려면 데모 페이로드를 선택하세요",
    statusBenchmark: "시작하려면 벤치마크 페이로드를 보내세요",
    footerHint: "다른 기기에서 받기 화면을 여세요. 이 화면의 밝기를 높이세요.",
    footerHintStandalone:
      "다른 기기에서 독립 실행형 수신기를 여세요. 이 화면의 밝기를 높이세요.",
    shareDialogTitle: "수신기 공유",
    shareDialogHint: "다른 기기의 카메라로 이 코드를 스캔하거나, 링크를 보내 주세요.",
    receiverLinkAriaLabel: "수신기 링크",
    shareTitleData: "Decimen Optical Transfer — 수신기",
    loadingDemo: (name) => `${name} 불러오는 중…`,
    demoLoadFailed: (name, status) => `${name} 불러오기 실패 (${status})`,
    preparingFile: (name) => `${name} 준비 중…`,
    preparingSnippet: "텍스트 스니펫 준비 중…",
    fileEmpty: (name) => `${name} 파일이 비어 있어 보낼 내용이 없습니다.`,
    fileOverLimit: (name, size, limit) =>
      `${name}의 크기가 ${size}로, ${limit} 제한을 초과합니다.`,
    capacityError: (size, blocks, frameBytes, maxBlocks, suggestion) =>
      `${size} 크기에는 프레임당 ${frameBytes}바이트 기준으로 블록 ${blocks}개가 필요하지만, ` +
      `한 프레임이 번호를 매길 수 있는 블록은 최대 ${maxBlocks}개입니다. ` +
      `프레임당 바이트를 ${suggestion} 이상으로 올리세요.`,
    streaming: (name) => `${name} 스트리밍 중 — `,
    shareReceiverLink: "수신기 링크 공유",
    stallWarning: (seconds) =>
      `스트림이 ${seconds}초 동안 멈췄습니다 — 이 창이 가려져 있었거나 백그라운드에 있었습니다. ` +
      `창을 계속 표시하고 포커스를 유지하세요. 송신이 멈추면 수신기가 동기화를 잃습니다.`,
    fpsValue: (fps, codes) => (codes > 1 ? `${fps} fps × 코드 ${codes}개` : `${fps} fps`),
    frameBytesValue: (bytes, codes) =>
      codes > 1 ? `${bytes}바이트 × ${codes}` : `${bytes}바이트`,
    gzipTo: (size) => `gzip → ${size}`,
    compressionNone: "없음",
    exportSummary: "애니메이션 내보내기",
    exportIntro:
      "이 스트림을 반복 재생되는 애니메이션 파일로 저장합니다. 동영상이나 페이지에 넣으면 " +
      "재생 중인 루프를 향한 어떤 카메라든 파일을 받을 수 있습니다.",
    exportFormat: "형식",
    exportFormatZip: "PNG 시퀀스(ZIP)",
    exportFps: "프레임 속도",
    exportScale: "모듈 배율",
    exportCycles: "사이클 수",
    exportStart: "내보내기",
    exportCancel: "취소",
    exportEstimate: (frames, size, loop) => `${frames} 프레임 · 약 ${size} · 루프 ${loop}`,
    exportProgress: (percent) => `렌더링 중… ${percent}%`,
    exportFailed: (message) => `내보내기 실패: ${message}`,
    exportZipLimit: (frames, max) =>
      `${frames} 프레임은 ZIP 한도 ${max}을(를) 넘습니다. 사이클 수를 줄이거나, 레이아웃을 넓히거나, 프레임당 바이트를 늘려 줄이세요.`,
  },

  receive: {
    docTitle: "Decimen Optical Transfer — 받기",
    eyebrow: "카메라 → 내 기기",
    title: "받기",
    statusReady: "파일 또는 텍스트 스트림을 스캔할 준비가 되었습니다",
    startCamera: "카메라 시작",
    starting: "시작하는 중…",
    noSignalQuestion: "아무 반응이 없나요?",
    progressZero: "0% · 0 프레임",
    estimatingTime: "시간 추정 중…",
    progressAriaLabel: "전송 복원 진행률",
    tipsTitle: "문제 해결 팁",
    tipDropFrameBytes: (bytes) =>
      `보내는 기기에서 전송 설정을 열고 프레임당 바이트를 ${bytes}까지 낮추세요.`,
    tipDropTxFps: (fps) => `그래도 안 되나요? 보내는 쪽의 송신 fps도 ${fps}까지 낮추세요.`,
    tipFillView:
      "카메라 화면에 코드가 가득 차게 하고, 휴대폰을 어딘가에 받쳐 두세요 — " +
      "손 떨림으로 자동 초점이 계속 흔들리는 것이 가장 흔한 원인입니다.",
    tipBrightness: "보내는 화면의 밝기를 최대로 올리세요.",
    diagnosticsSummary: "실시간 진단",
    metricCaptureFps: "캡처 fps",
    metricDecodeFps: "디코드 fps",
    metricGoodput: "goodput",
    metricElapsed: "경과 시간",
    metricFrames: "프레임 신규/중복",
    metricBlocks: "블록 K",
    metricBlockLen: "블록 길이",
    metricTransfer: "전송",
    settingsSummary: "수신 설정",
    settingCamera: "카메라",
    cameraAuto: "자동",
    cameraN: (n) => `카메라 ${n}`,
    settingCaptureWidth: "캡처 너비",
    settingCaptureFps: "캡처 fps",
    settingDecodeWorkers: "디코드 워커",
    autoShowLabel: "받은 파일 자동으로 표시",
    settingsApplied: "카메라를 시작할 때 적용됩니다.",
    errSecureContext:
      "카메라에는 보안 컨텍스트가 필요합니다 — 다른 기기에서 카메라를 사용하려면 " +
      "이 페이지를 https로 제공해야 합니다. `npm run dev`는 이미 https로 제공합니다.",
    errPermissionDenied:
      "카메라 권한이 거부되었습니다 — 권한을 허용한 뒤 카메라 시작을 다시 누르세요.",
    errCameraGone:
      "해당 카메라를 더 이상 사용할 수 없습니다 — 카메라를 자동으로 되돌리고 카메라 시작을 누르세요.",
    errCamera: (message) => `카메라: ${message}`,
    errRestartFailed: "카메라: 전환 후 다시 시작하지 못했습니다 — 카메라 시작을 누르세요.",
    errLiveChangeRefused: "이 카메라가 실시간 변경을 거부했습니다 — 적용하려면 다시 시작하세요",
    cameraRefusedKeptPrevious: "해당 카메라가 시작을 거부했습니다 — 이전 카메라를 유지합니다",
    cameraSearching: (resolution) => `카메라 ${resolution} — 스트림 탐색 중…`,
    cameraActual: (resolution, fps, askedFps, workers) =>
      `카메라 ${resolution} @ ${fps} fps${askedFps === null ? "" : ` (요청 ${askedFps})`} · ` +
      `디코드 워커 ${workers}개 · 변경 사항 즉시 적용`,
    progressBlocks: (percent, solved, k) => `${percent}% · 블록 ${solved}/${k}`,
    framesDecoding: (frames) => `${frames} 프레임 · 디코딩 중`,
    aboutEta: (duration, frames) => `약 ${duration} · ${frames} 프레임`,
    etaTotal: (duration) => `총 ${duration}`,
    resyncing: "복구한 데이터를 검증하지 못했습니다. 다시 동기화하며 계속합니다…",
    resyncRestartSender: "계속 발생하면 보내는 쪽을 다시 시작하세요.",
    transferFailedShort: "전송 실패",
    transferFailedDetail:
      "이 스트림에서는 쓸 수 있는 데이터가 나오지 않았습니다. 보내는 쪽을 다시 시작한 뒤 " +
      "다시 스캔하세요 — 부분 전송으로 잃는 것은 시간뿐입니다.",
    tryAgain: "다시 시도",
    transferSummary: "전송 요약",
    transferComplete: "전송 완료!",
    recoveredFile: "100% · 파일 복원됨",
    recoveredText: "100% · 텍스트 복원됨",
    textReceived: "텍스트 수신 완료",
    textLabel: "텍스트",
    fileStats: (size, seconds, rate) => `${seconds} 동안 ${size} · ${rate}`,
    gzipDecompressed: "gzip 압축 해제됨",
    shaVerified: "SHA-256 검증됨 ✓",
    saveFile: (name) => `${name} 저장`,
    receiveAnother: "다른 파일 받기",
    showText: "텍스트 표시",
    mediaImage: "이미지",
    mediaVideo: "동영상",
    mediaAudio: "오디오",
    showMedia: (noun) => `${noun} 표시`,
    clearCache: "Decimen 캐시 지우기",
    cacheCleared: "캐시를 지웠습니다",
    clearCacheFailed: "지우기 실패 — 다시 시도하세요",
    receivedPreviewAlt: (name) => `받은 파일 미리보기: ${name}`,
    receivedFileAriaLabel: (name) => `받은 파일: ${name}`,
    supportAfter: "♥ 마음에 드셨나요? 커피 한 잔 사 주세요",
  },

  common: {
    copy: "복사",
    copied: "복사됨",
    copyFailed: "복사 실패",
    close: "닫기",
    share: "공유…",
    dismiss: "닫기",
    help: "도움말",
    gotIt: "확인",
  },

  errors: {
    fileEmpty: "비어 있지 않은 파일을 선택하세요.",
    fileOverLimit: (limit) => `이 브라우저 빌드에서 파일은 ${limit}까지로 제한됩니다.`,
    fileNameTooLong: "파일 이름 또는 미디어 유형이 너무 깁니다.",
    inflateOverflow: "복원된 파일이 선언된 길이를 넘어 확장됩니다.",
    containerTruncated: "복원된 파일 헤더가 불완전합니다.",
    containerBadMagic: "복원된 파일 헤더가 유효하지 않습니다.",
    containerBadCompression: "복원된 파일이 지원되지 않는 압축을 사용합니다.",
    containerLengthMismatch: "복원된 파일 길이가 헤더와 일치하지 않습니다.",
    gzipIncomplete: "복원된 gzip 페이로드가 불완전합니다.",
    gzipLengthMismatch: "gzip 페이로드 길이가 파일 헤더와 일치하지 않습니다.",
    decompressedLengthMismatch: "압축 해제된 파일 길이가 헤더와 일치하지 않습니다.",
    streamChecksumMismatch: "광학 스트림 체크섬이 일치하지 않습니다.",
    sha256Failed: "복원된 파일이 SHA-256 검증에 실패했습니다.",
    snippetEmpty: "보내기 전에 텍스트를 붙여넣거나 입력하세요.",
    snippetOverLimit: (limit) => `텍스트 스니펫은 ${limit}까지로 제한됩니다.`,
    snippetNotText: "이 스트림은 텍스트 스니펫이 아닙니다.",
    snippetBadUtf8: "복원된 스니펫이 유효한 UTF-8이 아닙니다.",
  },

  verdicts: {
    olderSender: (version) =>
      `상대 화면이 이전 버전의 Decimen 형식(v${version})을 보내고 있습니다. 보내는 기기를 업데이트하세요.`,
    newerSender: (version) =>
      `상대 화면이 더 새로운 Decimen 형식(v${version})을 보내고 있습니다. 받으려면 이 앱을 업데이트하세요.`,
    unsupportedFlags:
      "이 스트림은 이 버전에서 읽을 수 없는 Decimen 기능을 사용합니다. 받으려면 이 앱을 업데이트하세요.",
  },

  units: {
    bytes: "B",
    kilobytes: "KB",
    megabytes: "MB",
    kbPerSecond: (value) => `${value} KB/s`,
    secondsValue: (value) => `${value}초`,
    durHours: (hours) => `${hours}시간`,
    durMinutes: (minutes) => `${minutes}분`,
    durSeconds: (seconds) => `${seconds}초`,
  },

  i18n: {
    languageSelectLabel: "언어",
    unreviewedNote:
      "이 번역은 기계 번역 초안으로, 아직 원어민의 검수를 거치지 않았습니다.",
    unreviewedLinkText: "번역 문제 신고",
    switchOffer: "Decimen을 한국어로 볼 수 있습니다.",
    switchAction: "한국어로 보기",
  },
};
