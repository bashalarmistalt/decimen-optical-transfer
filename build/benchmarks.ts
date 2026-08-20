// Benchmark records: promote captured diagnostics runs into benchmarks/ and
// render the README "Measured speed" section from them. The JSON is the
// truth, this script is the only writer of the README section, and CI diffs
// the regenerated result — the numbers in prose can never drift from the
// data (see docs/technical/diagnostics.md).
//
// Records are kept per device-pair CATEGORY ("desktop → phone",
// "phone → phone", …), derived from the device registry's types. A
// category's record is ONE run — the eligible run with the best
// whole-transfer goodput — and its peak column is that same run's best
// ≥1 s timeline window. One run, one row: every cell in a table row
// describes the same transfer and links to the same receipt, by
// construction. The top-level `sustained` is the best record across
// categories — the badge and the README intro read it.
//
//   npm run benchmark:promote               # scan captured runs, take the best
//   npm run benchmark:promote -- <run.json> # consider one specific run
//   npm run benchmark:readme                # re-render the README section
import { createHash } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { createInterface } from "node:readline/promises";
import { fileURLToPath } from "node:url";
import {
  formatSenderSettings,
  parseSenderSettings,
  type SenderSettings,
} from "./benchmark-settings";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const RECORDS_PATH = resolve(ROOT, "benchmarks/records.json");
const RUNS_DIR = resolve(ROOT, "benchmarks/runs");
const CAPTURE_DIR = resolve(ROOT, "scratch/diagnostics-runs");
const README_PATH = resolve(ROOT, "README.md");

type Report = Record<string, unknown>;

interface DeviceEntry {
  label: string; // what the README table shows, e.g. "iPhone 17 Pro Max"
  notes?: string; // model numbers etc. — committed with the record's entry
  type?: string; // "phone" | "desktop" | "tablet" — categories derive from this
}

interface RecordEntry {
  category: string; // e.g. "phone → phone", from the two devices' types
  date: string; // YYYY-MM-DD, from the run report's own timestamp
  sustainedKBs: number; // whole-transfer goodput — what a record is ranked by
  peakKBs: number | null; // the SAME run's best ≥1 s window
  payloadBytes: number;
  seconds: number;
  codes: number; // QR codes on screen (receiver's observed peak)
  devices: string; // "<sender> → <receiver>", from the device registry
  senderDevice?: DeviceEntry; // full detail (model numbers etc.)
  receiverDevice?: DeviceEntry;
  version: string | null; // app version stamped into the run by the endpoint
  runFile: string; // repo-relative receipt path
  badge: string; // preformatted for the shields.io dynamic-JSON badge
  /** Sender announcement paired by session id. Optional only for records
   * created before provenance capture was added. New promotions require it. */
  settings?: SenderSettings;
}

interface CanonicalPayload {
  file: string; // repo-relative path of the pinned benchmark payload
  bytes: number;
  sha256: string;
}

interface Records {
  payload: CanonicalPayload;
  // Best record across categories — generated; the badge and the README
  // intro marker read this, so its JSON path must stay stable.
  sustained: RecordEntry | null;
  categories: Record<string, RecordEntry | null>;
  history: RecordEntry[];
}

function loadRecords(): Records {
  return JSON.parse(readFileSync(RECORDS_PATH, "utf8")) as Records;
}

/** Recompute the top-level overall-best pointer from the categories. */
function refreshBest(records: Records): void {
  let best: RecordEntry | null = null;
  for (const e of Object.values(records.categories))
    if (e && (!best || e.sustainedKBs > best.sustainedKBs)) best = e;
  records.sustained = best;
}

// ---- Device registry --------------------------------------------------------
// UAs can't name real hardware (every iPhone says "iPhone"; the sender's UA
// says nothing about the emitting display, which is half the optical
// channel). The registry lives in gitignored scratch/, remembers a device
// per UA, and promote asks — pick from the list or type a new one. The
// chosen labels and their notes (model numbers) are committed with the
// record; the registry itself never is.

const REGISTRY_PATH = resolve(ROOT, "scratch/benchmark-devices.json");

interface Registry {
  devices: DeviceEntry[];
  uaMap: Record<string, string>; // exact UA → device label, the recall key
}

function loadRegistry(): Registry {
  if (!existsSync(REGISTRY_PATH)) return { devices: [], uaMap: {} };
  return JSON.parse(readFileSync(REGISTRY_PATH, "utf8")) as Registry;
}

function guessType(ua: unknown): string {
  if (typeof ua !== "string") return "desktop";
  if (/iPad/.test(ua)) return "tablet";
  if (/iPhone|Android|Mobile/.test(ua)) return "phone";
  return "desktop";
}

type Ask = (q: string) => Promise<string>;

async function chooseDevice(side: string, ua: unknown, reg: Registry, ask: Ask | null): Promise<DeviceEntry> {
  const uaStr = typeof ua === "string" ? ua : "";
  const remembered = reg.devices.find((d) => d.label === reg.uaMap[uaStr]);
  const guess = (): DeviceEntry => ({ label: uaLabel(ua), type: guessType(ua) });
  if (!ask) return remembered ?? guess(); // non-interactive: best effort
  console.log(`\n${side} — UA: ${uaStr ? uaStr.slice(0, 88) : "(unknown)"}`);
  const ordered = [...(remembered ? [remembered] : []), ...reg.devices.filter((d) => d !== remembered)];
  ordered.forEach((d, i) =>
    console.log(
      `  [${i + 1}] ${d.label}${d.notes ? ` — ${d.notes}` : ""}${d === remembered ? "   (remembered for this UA)" : ""}`,
    ),
  );
  console.log(`  [0] just the UA guess: ${uaLabel(ua)}`);
  const answer = (
    await ask(`${side}: pick a number or type a new device label${ordered.length ? " [1]" : ""}: `)
  ).trim();
  let chosen: DeviceEntry;
  if (answer === "" && ordered.length) chosen = ordered[0] as DeviceEntry;
  else if (/^\d+$/.test(answer)) {
    const picked = Number(answer) === 0 ? undefined : ordered[Number(answer) - 1];
    chosen = picked ?? guess();
  } else {
    const notes = (await ask("  notes (model number etc., optional): ")).trim();
    const type =
      (await ask(`  type (phone/desktop/tablet) [${guessType(ua)}]: `)).trim() || guessType(ua);
    chosen = { label: answer, type, ...(notes ? { notes } : {}) };
    reg.devices.push(chosen);
  }
  if (!chosen.type) chosen.type = guessType(ua);
  if (uaStr && reg.devices.includes(chosen)) reg.uaMap[uaStr] = chosen.label;
  return chosen;
}

/** "Pixel 8 Chrome", "iPhone Safari", "Linux Firefox" — enough to tell the
 *  two ends of a record apart; the receipt keeps the full user agents. */
function uaLabel(ua: unknown): string {
  if (typeof ua !== "string" || !ua) return "unknown";
  const browser = /Firefox\//.test(ua)
    ? "Firefox"
    : /Edg\//.test(ua)
      ? "Edge"
      : /Chrome\//.test(ua)
        ? "Chrome"
        : /Safari\//.test(ua)
          ? "Safari"
          : "browser";
  const android = /Android [\d.]+; ([^);]+)/.exec(ua);
  if (android) {
    const model = android[1]?.trim();
    // Chrome's reduced UA reports every Android device as model "K".
    return `${!model || model === "K" ? "Android" : model} ${browser}`;
  }
  if (/iPhone/.test(ua)) return `iPhone ${browser}`;
  if (/iPad/.test(ua)) return `iPad ${browser}`;
  const os = /Windows/.test(ua)
    ? "Windows"
    : /Mac OS X/.test(ua)
      ? "Mac"
      : /CrOS/.test(ua)
        ? "ChromeOS"
        : /Linux|X11/.test(ua)
          ? "Linux"
          : "desktop";
  return `${os} ${browser}`;
}

/** Best ≥1 s window of new-frame throughput in the run's timeline.
 *  Samples are cumulative counters, one per 500 ms stats tick:
 *  [seconds, framesNew, ...] — so a window's rate is Δframes·blockLen/Δt.
 *  Returns null when the run carries no usable timeline. */
function peakWindowKBs(report: Report): number | null {
  const timeline = report.timeline as number[][] | undefined;
  const fountain = report.fountain as Report | undefined;
  const blockLen = fountain?.blockLen as number | undefined;
  if (!Array.isArray(timeline) || timeline.length < 2 || !blockLen) return null;
  let best = 0;
  for (let i = 0; i + 1 < timeline.length; i++) {
    const si = timeline[i];
    if (!si) continue;
    for (let j = i + 1; j < timeline.length; j++) {
      const sj = timeline[j];
      if (!sj) continue;
      const dt = (sj[0] ?? 0) - (si[0] ?? 0);
      if (dt < 1) continue; // sub-second windows are capture-jitter noise
      const frames = (sj[1] ?? 0) - (si[1] ?? 0);
      best = Math.max(best, (frames * blockLen) / 1024 / dt);
      break; // smallest ≥1 s window starting at i is the sharpest peak
    }
  }
  return best > 0 ? Number(best.toFixed(1)) : null;
}

interface CapturedRun {
  path: string;
  report: Report;
}

/** Load every captured report; pair receiver runs with sender announcements
 *  by sessionId for the device label's sending half. */
function loadCaptured(paths: string[]): {
  receivers: CapturedRun[];
  senderUa: Map<unknown, unknown>;
  senderSettings: Map<unknown, SenderSettings>;
} {
  const receivers: CapturedRun[] = [];
  const senderUa = new Map<unknown, unknown>();
  const senderSettings = new Map<unknown, SenderSettings>();
  for (const path of paths) {
    let report: Report;
    try {
      report = JSON.parse(readFileSync(path, "utf8")) as Report;
    } catch {
      continue; // half-written or foreign file — not a candidate
    }
    if (report.role === "receiver") receivers.push({ path, report });
    else if (report.role === "sender" && report.settings) {
      senderUa.set(report.sessionId, report.ua);
      const settings = parseSenderSettings(report.settings);
      if (settings) senderSettings.set(report.sessionId, settings);
    }
  }
  return { receivers, senderUa, senderSettings };
}

async function promote(explicitPath?: string): Promise<void> {
  const records = loadRecords();
  const canonical = records.payload;
  const onDisk = createHash("sha256")
    .update(readFileSync(resolve(ROOT, canonical.file)))
    .digest("hex");
  if (onDisk !== canonical.sha256)
    throw new Error(
      `${canonical.file} no longer matches the pinned sha256 in records.json — ` +
        "regenerating the canonical payload breaks record comparability",
    );

  // Sender announcements are read from the capture dir even for an explicit
  // run file, so the sending device can still be named.
  const capturedPaths = readdirSync(CAPTURE_DIR, { withFileTypes: true })
    .filter((e) => e.isFile() && e.name.endsWith(".json"))
    .map((e) => resolve(CAPTURE_DIR, e.name))
    .sort();
  const { receivers, senderUa, senderSettings } = loadCaptured(
    explicitPath ? [...capturedPaths, resolve(explicitPath)] : capturedPaths,
  );
  const pool = explicitPath
    ? receivers.filter((r) => r.path === resolve(explicitPath))
    : receivers;

  const successful = pool.filter(
    (r) => r.report.ok === true && r.report.payloadSha256 === canonical.sha256,
  );
  const eligible = successful.filter((r) => senderSettings.has(r.report.sessionId));
  console.log(
    `${pool.length} receiver run(s) scanned, ${successful.length} successful canonical, ` +
      `${eligible.length} with paired sender settings`,
  );
  if (eligible.length === 0)
    throw new Error(
      "no eligible runs — record runs need a successful canonical receiver report " +
        "and its paired sender settings announcement from the same diagnostics session",
    );

  // Devices resolve first (registry list, remembered per UA) because the
  // category a run competes in comes from its device types. Memoized per
  // UA-pair side, so a session with one hardware setup asks at most twice.
  const registry = loadRegistry();
  const rl = process.stdin.isTTY
    ? createInterface({ input: process.stdin, output: process.stdout })
    : null;
  const ask: Ask | null = rl ? (q) => rl.question(q) : null;
  const memo = new Map<string, DeviceEntry>();
  const resolveDevice = async (side: string, ua: unknown): Promise<DeviceEntry> => {
    const key = `${side} ${String(ua)}`;
    if (!memo.has(key)) memo.set(key, await chooseDevice(side, ua, registry, ask));
    return memo.get(key) as DeviceEntry;
  };

  interface Judged {
    run: CapturedRun;
    sustainedKBs: number;
    category: string;
    senderDevice: DeviceEntry;
    receiverDevice: DeviceEntry;
  }
  const judged: Judged[] = [];
  for (const run of eligible) {
    const senderDevice = await resolveDevice("Sender", senderUa.get(run.report.sessionId));
    const receiverDevice = await resolveDevice(
      "Receiver",
      (run.report.device as Report | undefined)?.ua,
    );
    judged.push({
      run,
      sustainedKBs: run.report.goodputKBs as number,
      category: `${senderDevice.type ?? "desktop"} → ${receiverDevice.type ?? "desktop"}`,
      senderDevice,
      receiverDevice,
    });
  }
  rl?.close();

  const toEntry = (j: Judged): RecordEntry => {
    const report = j.run.report;
    const meta = (report._meta ?? {}) as Report;
    const stamp = String(report.when ?? meta.receivedAt ?? "");
    if (!stamp) throw new Error(`${j.run.path}: run report carries no timestamp`);
    const codes = report.codes as number;
    if (!codes) throw new Error(`${j.run.path}: run report carries no code count`);
    return {
      category: j.category,
      date: stamp.slice(0, 10),
      sustainedKBs: j.sustainedKBs,
      peakKBs: peakWindowKBs(report),
      payloadBytes: report.payloadBytes as number,
      seconds: report.seconds as number,
      codes,
      devices: `${j.senderDevice.label} → ${j.receiverDevice.label}`,
      senderDevice: j.senderDevice,
      receiverDevice: j.receiverDevice,
      version: typeof meta.appVersion === "string" ? meta.appVersion : null,
      runFile: `benchmarks/runs/${stamp.slice(0, 19).replace(/:/g, "-")}-run.json`,
      badge: `${j.sustainedKBs} KB/s`,
      settings: senderSettings.get(report.sessionId)!,
    };
  };

  // One record run per category: the best sustained goodput wins, and its
  // own peak window rides along. A run can never split across rows.
  const taken: { j: Judged; entry: RecordEntry }[] = [];
  for (const category of new Set(judged.map((j) => j.category))) {
    const best = judged
      .filter((j) => j.category === category)
      .reduce((a, b) => (b.sustainedKBs > a.sustainedKBs ? b : a));
    const current = records.categories[category] ?? null;
    if (!current || best.sustainedKBs > current.sustainedKBs)
      taken.push({ j: best, entry: toEntry(best) });
  }
  if (taken.length === 0)
    throw new Error("beats no category record — nothing promoted");

  mkdirSync(RUNS_DIR, { recursive: true });
  for (const { j, entry } of taken) {
    copyFileSync(j.run.path, resolve(ROOT, entry.runFile));
    records.categories[entry.category] = entry;
    records.history.push(entry);
    console.log(
      `${entry.category} record: ${entry.sustainedKBs} KB/s sustained` +
        `${entry.peakKBs ? ` / ${entry.peakKBs} peak` : ""} (${entry.devices}, ${entry.date})`,
    );
    console.log(`  settings: ${formatSenderSettings(entry.settings!)}`);
  }
  refreshBest(records);
  writeFileSync(REGISTRY_PATH, JSON.stringify(registry, null, 2) + "\n");
  writeFileSync(RECORDS_PATH, JSON.stringify(records, null, 2) + "\n");
  renderReadme(records);
}

const BEGIN = "<!-- benchmarks:begin -->";
const END = "<!-- benchmarks:end -->";

// Badge reads records.json straight off raw.githubusercontent — no server,
// and it goes stale exactly never, because it reads the same file this
// script renders from.
const BADGE_URL =
  "https://img.shields.io/badge/dynamic/json?label=sustained&color=blue" +
  "&query=%24.sustained.badge" +
  "&url=https%3A%2F%2Fraw.githubusercontent.com%2Fbashalarmistalt%2Fdecimen-optical-transfer%2Fmain%2Fbenchmarks%2Frecords.json";

function tableRow(e: RecordEntry): string {
  const mb = (e.payloadBytes / 1024 / 1024).toFixed(1);
  const when = e.version ? `${e.date} (v${e.version})` : e.date;
  const peak = e.peakKBs ? `**${e.peakKBs} KB/s**` : "—";
  const settings = e.settings ? formatSenderSettings(e.settings) : "legacy record";
  return `| ${e.category} | **${e.sustainedKBs} KB/s** | ${peak} | ${mb} MB in ${e.seconds.toFixed(1)} s | ${e.codes} | ${settings} | ${e.devices} | ${when} | [run](${e.runFile}) |`;
}

function renderReadme(records: Records): void {
  const lines: string[] = [];
  const entries = Object.values(records.categories).filter((e): e is RecordEntry => e !== null);
  if (entries.length === 0) {
    lines.push(
      "_No captured records yet — `npm run benchmark`, then " +
        "`npm run benchmark:promote` (see [Diagnostics](docs/technical/diagnostics.md))._",
    );
  } else {
    if (records.sustained) lines.push(`![sustained record](${BADGE_URL})`, "");
    lines.push(
      "One record run per device pair. Sustained is whole-transfer goodput;",
      "peak is the best ≥1 s window inside that same run. Every row links to",
      "the full diagnostics run report that produced it; settings identify the",
      "sender configuration used by newly promoted records",
      "([how these are measured](docs/technical/diagnostics.md)).",
      "",
      "| pair | sustained | peak | transfer | codes | settings | devices | when | receipt |",
      "|---|---|---|---|---|---|---|---|---|",
      ...entries.sort((a, b) => b.sustainedKBs - a.sustainedKBs).map(tableRow),
    );
  }

  const readme = readFileSync(README_PATH, "utf8");
  const begin = readme.indexOf(BEGIN);
  const end = readme.indexOf(END);
  if (begin === -1 || end === -1 || end < begin)
    throw new Error(`README.md is missing the ${BEGIN} / ${END} markers`);
  let next =
    readme.slice(0, begin + BEGIN.length) + "\n" + lines.join("\n") + "\n" + readme.slice(end);
  // The intro's headline number is script-owned too, via inline markers.
  const SPEED_RE = /(<!-- speed:begin -->)[\s\S]*?(<!-- speed:end -->)/;
  if (!SPEED_RE.test(next))
    throw new Error("README.md is missing the <!-- speed:begin/end --> intro markers");
  next = next.replace(
    SPEED_RE,
    `$1${records.sustained ? `${records.sustained.sustainedKBs} KB/s sustained` : "unmeasured"}$2`,
  );
  if (next !== readme) {
    writeFileSync(README_PATH, next);
    console.log("README benchmarks section rewritten");
  } else {
    console.log("README benchmarks section already current");
  }
}

const USAGE =
  "usage: benchmarks.ts promote [run.json]   # no arg: scan captured runs, take the best\n" +
  "       benchmarks.ts readme";

const [cmd, maybePath] = process.argv.slice(2);
if (cmd === "promote") await promote(maybePath);
else if (cmd === "readme") renderReadme(loadRecords());
else {
  console.error(USAGE);
  process.exit(2);
}
