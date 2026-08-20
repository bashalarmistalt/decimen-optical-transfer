// Japanese (日本語).
// Machine-drafted (Claude), not yet reviewed by a native speaker.
// Once a native review lands, flip `reviewed: true` for "ja" in
// shared/i18n/registry.ts to remove the on-page unreviewed note.

import type { Messages } from "../messages";
import { localeByCode } from "../registry";

export const messages: Messages = {
  meta: localeByCode("ja")!,

  chrome: {
    navAriaLabel: "モード",
    navSend: "送信",
    navReceive: "受信",
    modeBadgeSend: "送信",
    modeBadgeReceive: "受信",
    footerLinksAriaLabel: "プロジェクトのリンク",
    footerSupport: "♥ 支援",
  },

  home: {
    title: "Decimen Optical Transfer — 光でファイルを転送",
    metaDescription:
      "画面とカメラだけで、2台のデバイス間でファイルやテキストを送れます。ファウンテン符号化されたアニメーションQRコードを使い、間にネットワーク経路はありません。",
    ogDescription:
      "ファウンテン符号化されたアニメーションQRコードで、画面からカメラへ。アカウントもペアリングも、デバイス間のネットワーク経路も不要。実測データ付きベンチマークで %TOP_SPEED% を持続。",
    ogImageAlt:
      "転送中のスマートフォンが、別の画面のアニメーションQRコードのストリームを読み取っている様子。",
    heroTitleHtml: "光で<br />ファイルを転送。",
    heroCopy:
      "ファイルやテキストを、画面から別のデバイスのカメラへ送信。アカウント、ペアリング、クラウド保存、デバイス間のネットワーク経路はいずれも不要です。",
    chooseSideAriaLabel: "送信側・受信側を選択",
    cardSendKicker: "この画面から送信",
    cardSendTitle: "ファイルやテキストを送信",
    cardSendBody:
      "%MAX_FILE_LABEL% までの任意のファイル、または %MAX_SNIPPET_LABEL% までの貼り付けたテキストを送れます。有効な場合は圧縮され、元のファイル名で復元されます。",
    cardSendAction: "送信",
    cardReceiveKicker: "このカメラで受信",
    cardReceiveTitle: "カメラを向けて受信",
    cardReceiveBody: "カメラを送信側の画面に向けると、ファイルを受信できます。",
    cardReceiveAction: "受信",
    shareSite: "Decimen を共有",
    supportTitle: "無料・オープンソース・広告なし",
    supportBodyHtml:
      'Decimen が役に立ったら、<a href="https://buymeacoffee.com/bashalarmist" target="_blank" rel="noopener noreferrer">コーヒーを1杯おごる</a>ことで応援できます。',
    shareDialogTitle: "このアプリを共有",
    shareDialogHint: "別のデバイスのカメラでこれをスキャンするか、リンクを送ってください。",
    siteLinkAriaLabel: "サイトのリンク",
    privacyNote:
      "デバイス間にネットワーク経路は必要ありません。データは光として伝わります。ファイルは暗号化されないため、送信中の画面は、そこに向けられたどのカメラからも読み取れます。",
  },

  send: {
    docTitle: "Decimen Optical Transfer — 送信",
    eyebrow: "画面 → カメラ",
    introCopy: "受信側でスキャンするまで、データがこのデバイスの外に出ることはありません。",
    modeAriaLabel: "送信する内容",
    modeFile: "ファイル",
    modeSnippet: "テキスト",
    titleFile: "ファイルを送信",
    titleSnippet: "テキストを送信",
    selectFile: "ファイルを選択",
    stopTransfer: "転送を停止",
    anyFileUpTo: "任意のファイル · 最大 %MAX_FILE_LABEL%",
    selectedFile: (name) => `選択したファイル: ${name}`,
    demoPayload: "デモ用データ",
    benchmarkPayload: "ベンチマーク用データ",
    demo512: "512 KB の画像",
    demo2mb: "2 MB の画像",
    demoBenchmark: "1 MB ベンチマーク",
    navDemo: "デモ",
    navBenchmark: "ベンチマーク",
    snippetLabel: "送信するテキスト",
    snippetLabelWithMax: "送信するテキスト · 最大 %MAX_SNIPPET_LABEL%",
    snippetPlaceholder: "URL、設定ファイル、長文など、何でも貼り付けるか入力してください…",
    startTextStream: "テキストの送信を開始",
    settingsSummary: "転送設定",
    settingTxFps: "送信 fps",
    settingBytesPerFrame: "バイト / フレーム",
    settingEcc: "誤り訂正",
    settingLayout: "レイアウト",
    layout1: "コード1個",
    layout2: "コード2個 (1×2)",
    layout4: "コード4個 (2×2)",
    layout6: "コード6個 (2×3)",
    settingDisplaySize: "表示サイズ",
    specTxRate: "送信レート",
    specFramePayload: "フレームペイロード",
    specQr: "QR",
    specSending: "送信対象",
    specCompression: "圧縮",
    specFountainBlocks: "ファウンテンブロック",
    statusChooseFile: "ファイルを選択すると開始します",
    statusPasteText: "テキストを貼り付けるか入力すると開始します",
    statusChooseDemo: "デモ用データを選択すると開始します",
    statusBenchmark: "ベンチマーク用データを送信すると開始します",
    footerHint: "もう一方のデバイスで「受信」を開き、この画面の明るさを上げてください。",
    footerHintStandalone:
      "もう一方のデバイスでスタンドアロン受信ページを開き、この画面の明るさを上げてください。",
    shareDialogTitle: "受信ページを共有",
    shareDialogHint: "もう一方のデバイスのカメラでこれをスキャンするか、リンクを送ってください。",
    receiverLinkAriaLabel: "受信ページのリンク",
    shareTitleData: "Decimen Optical Transfer — 受信ページ",
    loadingDemo: (name) => `${name} を読み込み中…`,
    demoLoadFailed: (name, status) => `${name} を読み込めませんでした (${status})`,
    preparingFile: (name) => `${name} を準備中…`,
    preparingSnippet: "テキストを準備中…",
    fileEmpty: (name) => `${name} は空です。送信できる内容がありません。`,
    fileOverLimit: (name, size, limit) =>
      `${name} は ${size} あり、上限の ${limit} を超えています。`,
    capacityError: (size, blocks, frameBytes, maxBlocks, suggestion) =>
      `${size} をフレームあたり ${frameBytes} バイトで送るには ${blocks} 個のブロックが必要ですが、` +
      `1 フレームで扱えるのは ${maxBlocks} 個までです。「バイト / フレーム」を ${suggestion} 以上に上げてください。`,
    streaming: (name) => `${name} を送信中 — `,
    shareReceiverLink: "受信ページのリンクを共有",
    stallWarning: (seconds) =>
      `ストリームが ${seconds} 秒間停止しました。このウィンドウが非表示またはバックグラウンドになっていたためです。` +
      `ウィンドウを表示したままフォーカスしておいてください。送信が止まると、受信側は同期を失います。`,
    fpsValue: (fps, codes) => (codes > 1 ? `${fps} fps × ${codes} コード` : `${fps} fps`),
    frameBytesValue: (bytes, codes) =>
      codes > 1 ? `${bytes} バイト × ${codes}` : `${bytes} バイト`,
    gzipTo: (size) => `gzip → ${size}`,
    compressionNone: "なし",
    exportSummary: "アニメーションを書き出す",
    exportIntro:
      "このストリームをループ再生されるアニメーションファイルとして保存します。動画やページに埋め込めば、" +
      "再生中のループにカメラを向けるだけでファイルを受信できます。",
    exportFormat: "形式",
    exportFormatZip: "PNG 連番(ZIP)",
    exportFps: "フレームレート",
    exportScale: "モジュール拡大率",
    exportCycles: "サイクル数",
    exportStart: "書き出す",
    exportCancel: "キャンセル",
    exportEstimate: (frames, size, loop) => `${frames} フレーム · 約 ${size} · ループ ${loop}`,
    exportProgress: (percent) => `レンダリング中… ${percent}%`,
    exportFailed: (message) => `書き出しに失敗しました: ${message}`,
    exportZipLimit: (frames, max) =>
      `${frames} フレームは ZIP の上限 ${max} を超えています。サイクル数を減らす、レイアウトを広げる、バイト / フレームを増やすことで削減できます。`,
  },

  receive: {
    docTitle: "Decimen Optical Transfer — 受信",
    eyebrow: "カメラ → このデバイス",
    title: "受信",
    statusReady: "ファイルやテキストのストリームをスキャンする準備ができました",
    startCamera: "カメラを開始",
    starting: "開始しています…",
    noSignalQuestion: "反応がありませんか？",
    progressZero: "0% · 0 フレーム",
    estimatingTime: "所要時間を推定中…",
    progressAriaLabel: "転送復元の進捗",
    tipsTitle: "トラブルシューティングのヒント",
    tipDropFrameBytes: (bytes) =>
      `送信側で「転送設定」を開き、「バイト / フレーム」を ${bytes} に下げてください。`,
    tipDropTxFps: (fps) =>
      `それでも反応がない場合は、送信側の「送信 fps」も ${fps} に下げてください。`,
    tipFillView:
      "コードがこのカメラの視野いっぱいに映るようにし、スマートフォンは何かに立てかけて固定してください。" +
      "手ぶれによるオートフォーカスの迷いが、最もよくある原因です。",
    tipBrightness: "送信側の画面の明るさを最大にしてください。",
    diagnosticsSummary: "ライブ診断",
    metricCaptureFps: "キャプチャ fps",
    metricDecodeFps: "デコード fps",
    metricGoodput: "実効速度",
    metricElapsed: "経過時間",
    metricFrames: "フレーム 新規/重複",
    metricBlocks: "ブロック K",
    metricBlockLen: "ブロック長",
    metricTransfer: "転送",
    settingsSummary: "受信設定",
    settingCamera: "カメラ",
    cameraAuto: "自動",
    cameraN: (n) => `カメラ ${n}`,
    settingCaptureWidth: "キャプチャ幅",
    settingCaptureFps: "キャプチャ fps",
    settingDecodeWorkers: "デコードワーカー数",
    autoShowLabel: "受信したファイルを自動的に表示",
    settingsApplied: "カメラの開始時に適用されます。",
    errSecureContext:
      "カメラにはセキュアコンテキストが必要です。別のデバイスからカメラを使うには、" +
      "このページを https で配信する必要があります。`npm run dev` は最初から https です。",
    errPermissionDenied:
      "カメラの使用が許可されませんでした。許可してから、もう一度「カメラを開始」をタップしてください。",
    errCameraGone:
      "そのカメラは利用できなくなりました。カメラを「自動」に戻して「カメラを開始」をタップしてください。",
    errCamera: (message) => `カメラ: ${message}`,
    errRestartFailed:
      "カメラ: 切り替え後に再起動できませんでした。「カメラを開始」をタップしてください。",
    errLiveChangeRefused:
      "このカメラは動作中の設定変更を受け付けませんでした（再起動すると適用されます）",
    cameraRefusedKeptPrevious: "そのカメラを起動できなかったため、以前のカメラを使い続けます",
    cameraSearching: (resolution) => `カメラ ${resolution} — ストリームを探しています…`,
    cameraActual: (resolution, fps, askedFps, workers) =>
      `カメラ ${resolution} @ ${fps} fps${askedFps === null ? "" : ` (要求 ${askedFps})`} · ` +
      `デコードワーカー ${workers} 個 · 変更は即時適用`,
    progressBlocks: (percent, solved, k) => `${percent}% · ${solved}/${k} ブロック`,
    framesDecoding: (frames) => `${frames} フレーム · デコード中`,
    aboutEta: (duration, frames) => `約 ${duration} · ${frames} フレーム`,
    etaTotal: (duration) => `合計 ${duration}`,
    transferFailedShort: "転送失敗",
    transferFailedDetail:
      "このストリームからは有効なデータを復元できませんでした。送信側を再起動して、もう一度スキャンしてください。" +
      "転送が途中で終わっても、失うのは時間だけです。",
    tryAgain: "もう一度試す",
    transferSummary: "転送結果",
    transferComplete: "転送完了！",
    recoveredFile: "100% · ファイルを復元しました",
    recoveredText: "100% · テキストを復元しました",
    textReceived: "テキストを受信しました",
    textLabel: "テキスト",
    fileStats: (size, seconds, rate) => `${size} を ${seconds}で受信 · ${rate}`,
    gzipDecompressed: "gzip 展開済み",
    shaVerified: "SHA-256 検証済み ✓",
    saveFile: (name) => `${name} を保存`,
    receiveAnother: "別のファイルを受信",
    showText: "テキストを表示",
    mediaImage: "画像",
    mediaVideo: "動画",
    mediaAudio: "音声",
    showMedia: (noun) => `${noun}を表示`,
    clearCache: "Decimen のキャッシュを消去",
    cacheCleared: "キャッシュを消去しました",
    clearCacheFailed: "消去できませんでした。もう一度お試しください",
    receivedPreviewAlt: (name) => `受信したファイルのプレビュー: ${name}`,
    receivedFileAriaLabel: (name) => `受信したファイル: ${name}`,
    supportAfter: "♥ 気に入りましたか？コーヒーを1杯おごる",
  },

  common: {
    copy: "コピー",
    copied: "コピーしました",
    copyFailed: "コピーできませんでした",
    close: "閉じる",
    share: "共有…",
    dismiss: "閉じる",
    help: "ヘルプ",
    gotIt: "OK",
  },

  errors: {
    fileEmpty: "空でないファイルを選択してください。",
    fileOverLimit: (limit) => `このブラウザ版で送れるファイルは ${limit} までです。`,
    fileNameTooLong: "ファイル名またはメディアタイプが長すぎます。",
    inflateOverflow: "復元したファイルが、宣言された長さを超えて展開されます。",
    containerTruncated: "復元したファイルのヘッダーが不完全です。",
    containerBadMagic: "復元したファイルのヘッダーが不正です。",
    containerBadCompression: "復元したファイルは未対応の圧縮形式を使用しています。",
    containerLengthMismatch: "復元したファイルの長さがヘッダーと一致しません。",
    gzipIncomplete: "復元した gzip ペイロードが不完全です。",
    gzipLengthMismatch: "gzip ペイロードの長さがファイルヘッダーと一致しません。",
    decompressedLengthMismatch: "展開後のファイルの長さがヘッダーと一致しません。",
    streamChecksumMismatch: "光学ストリームのチェックサムが一致しませんでした。",
    sha256Failed: "復元したファイルは SHA-256 検証に失敗しました。",
    snippetEmpty: "送信する前に、テキストを貼り付けるか入力してください。",
    snippetOverLimit: (limit) => `テキストは ${limit} までです。`,
    snippetNotText: "このストリームはテキストではありません。",
    snippetBadUtf8: "復元したテキストは有効な UTF-8 ではありません。",
  },

  verdicts: {
    olderSender: (version) =>
      `相手の画面は古い Decimen 形式 (v${version}) で送信しています。送信側のデバイスを更新してください。`,
    newerSender: (version) =>
      `相手の画面は新しい Decimen 形式 (v${version}) で送信しています。受信するには、このアプリを更新してください。`,
    unsupportedFlags:
      "このストリームは、このバージョンでは読み取れない Decimen の機能を使用しています。受信するには、このアプリを更新してください。",
  },

  units: {
    bytes: "B",
    kilobytes: "KB",
    megabytes: "MB",
    kbPerSecond: (value) => `${value} KB/s`,
    secondsValue: (value) => `${value} 秒`,
    durHours: (hours) => `${hours}時間`,
    durMinutes: (minutes) => `${minutes}分`,
    durSeconds: (seconds) => `${seconds}秒`,
  },

  i18n: {
    languageSelectLabel: "言語",
    unreviewedNote:
      "この日本語訳は機械翻訳による下書きで、まだネイティブスピーカーの確認を受けていません。",
    unreviewedLinkText: "翻訳の問題を報告",
    switchOffer: "Decimen は日本語でもご利用いただけます。",
    switchAction: "日本語で表示",
  },
};
