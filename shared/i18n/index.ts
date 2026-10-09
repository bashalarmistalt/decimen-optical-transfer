// The i18n runtime: resolve a locale, load its catalog, put it on screen.
//
// Two delivery paths share this module:
//
//   HOSTED  Every locale has its own built page tree (/es/send/ …), fully
//           translated at build time by build/i18n-pages.ts and stamped with
//           data-i18n-static. On those pages this module does NO text work —
//           the URL owns the locale, the switcher navigates between trees,
//           and this module only loads the catalog for runtime messages.
//
//   RUNTIME The standalone single-files (and the dev server's plain pages)
//           keep their data-i18n attributes and English text. Here the locale
//           comes from the stored choice or navigator.languages, and
//           applyHtmlTranslations() swaps the static copy in place.
//
// Catalogs load via dynamic import so each locale is its own chunk: the
// receive entry has a CI size tripwire (see ci.yml), and thirteen statically
// bundled catalogs would blow straight through it. The standalone builds set
// inlineDynamicImports, so THEY carry every catalog — which is exactly right
// for a file that can't know its reader's language until it is opened.

import { DEFAULT_LOCALE, LOCALES, matchLocale, localeByCode, type LocaleInfo } from "./registry";
import type { Messages } from "./messages";
import { OpticalError, errorText } from "../optical-error";
import type { FrameVerdict } from "../protocol";
import { MAX_FILE_LABEL } from "../protocol";
import { MAX_SNIPPET_LABEL } from "../snippet";

const LOCALE_KEY = "decimen:locale";
const BANNER_DISMISSED_KEY = "decimen:locale-banner-dismissed";
const ISSUES_URL = "https://github.com/bashalarmistalt/decimen-optical-transfer/issues";

// Catalog loading lives in its own module because the standalone build swaps
// it wholesale (loaders.ts → loaders.inline.ts, static imports) — see the
// note in loaders.ts. Re-exported for tests/i18n.test.ts's parity check.
export { loaders } from "./loaders";
import { loaders } from "./loaders";

/** The active catalog. Set once by initI18n(); every entry awaits that before
 *  wiring UI, so downstream modules can import { msg } and use it freely. */
export let msg: Messages;

/** Values available to %TOKEN% placeholders at runtime. Build-time-only tokens
 *  (%TOP_SPEED%, %APP_VERSION%…) are deliberately absent: strings carrying
 *  them exist only on the hosted pages, which the build already translated. */
const RUNTIME_TOKENS: Record<string, string> = {
  MAX_FILE_LABEL,
  MAX_SNIPPET_LABEL,
};

export function fillTokens(value: string, tokens: Record<string, string>): string {
  return value.replace(/%([A-Z][A-Z0-9_]*)%/g, (whole, name: string) =>
    name in tokens ? tokens[name]! : whole,
  );
}

/** Fill a catalog string's %TOKENS% from the runtime constants — for catalog
 *  entries the TS side re-renders (the file-picker label, say), so the HTML
 *  and the runtime write the same wording from the same key. */
export function fillRuntimeTokens(value: string): string {
  return fillTokens(value, RUNTIME_TOKENS);
}

function storedLocale(): string | null {
  // localStorage throws under file:// in some browsers and in some privacy
  // modes; a language preference is not worth taking the page down for.
  try {
    return localStorage.getItem(LOCALE_KEY);
  } catch {
    return null;
  }
}

function storeLocale(code: string): void {
  try {
    localStorage.setItem(LOCALE_KEY, code);
  } catch {
    // The choice still holds for this page view; it just won't survive.
  }
}

/** The locale a statically translated page was built as, or null. */
function staticLocale(): LocaleInfo | null {
  const code = document.documentElement.dataset.i18nStatic;
  return code ? (localeByCode(code) ?? null) : null;
}

function resolveLocale(): LocaleInfo {
  // A baked page IS its locale — the URL owns it, switching means navigating.
  const baked = staticLocale();
  if (baked) return baked;
  const stored = storedLocale();
  if (stored) {
    const info = localeByCode(stored);
    if (info) return info;
  }
  const preferred = typeof navigator !== "undefined" ? navigator.languages : [];
  return matchLocale(preferred ?? []) ?? localeByCode(DEFAULT_LOCALE)!;
}

/** Dot-path lookup into the catalog for data-i18n keys. Loud on a miss: a
 *  typo'd key must fail the build check and the dev console, never ship as
 *  silently untranslated text. */
function lookup(messages: Messages, path: string): string {
  let node: unknown = messages;
  for (const part of path.split(".")) {
    if (node === null || typeof node !== "object" || !(part in node)) {
      throw new Error(`i18n: no catalog entry at "${path}"`);
    }
    node = (node as Record<string, unknown>)[part];
  }
  if (typeof node !== "string") {
    throw new Error(`i18n: catalog entry "${path}" is not a plain string`);
  }
  return node;
}

/**
 * Swap every data-i18n-marked node under `root` to `messages`.
 *
 * The same contract the build plugin implements in node (build/i18n-pages.ts):
 *   data-i18n="path"        textContent
 *   data-i18n-html="path"   innerHTML (values that carry inline markup)
 *   data-i18n-attr="attr:path;attr2:path2"   attribute values
 *
 * A translated value with a %TOKEN% this runtime can't fill keeps its English
 * original — those strings belong to hosted-only pages where the build fills
 * them; here that is a console warning, not a crash, because the standalone
 * file must keep working even if a catalog slips.
 */
export function applyHtmlTranslations(root: ParentNode, messages: Messages): void {
  const filled = (path: string): string | null => {
    const value = fillTokens(lookup(messages, path), RUNTIME_TOKENS);
    if (/%[A-Z][A-Z0-9_]*%/.test(value)) {
      console.warn(`i18n: "${path}" needs a build-time token; keeping English`);
      return null;
    }
    return value;
  };
  for (const el of root.querySelectorAll<HTMLElement>("[data-i18n]")) {
    const value = filled(el.dataset.i18n!);
    if (value !== null) el.textContent = value;
  }
  for (const el of root.querySelectorAll<HTMLElement>("[data-i18n-html]")) {
    const value = filled(el.dataset.i18nHtml!);
    if (value !== null) el.innerHTML = value;
  }
  for (const el of root.querySelectorAll<HTMLElement>("[data-i18n-attr]")) {
    for (const pair of el.dataset.i18nAttr!.split(";")) {
      const colon = pair.indexOf(":");
      if (colon < 1) throw new Error(`i18n: bad data-i18n-attr entry "${pair}"`);
      const value = filled(pair.slice(colon + 1));
      if (value !== null) el.setAttribute(pair.slice(0, colon), value);
    }
  }
}

/**
 * Resolve, load, apply, and wire the language UI. Every page entry awaits
 * this before touching the DOM, so `msg` is safe everywhere afterwards.
 */
export async function initI18n(): Promise<Messages> {
  const info = resolveLocale();
  msg = (await loaders[info.code]!()).messages;

  const baked = staticLocale();
  if (!baked) {
    // Runtime path (standalone, dev): translate in place. English needs no
    // text pass, but lang/dir still get set — a previous session may have
    // left an override pointing elsewhere.
    if (info.code !== DEFAULT_LOCALE) applyHtmlTranslations(document, msg);
    document.documentElement.lang = info.lang;
    document.documentElement.dir = info.dir;
  }

  wireLanguageSwitcher(info);
  if (!info.reviewed) mountUnreviewedNote();
  if (document.body.classList.contains("home-page")) void maybeOfferLocaleBanner(info);
  return msg;
}

/** The page part of the current URL: "" (home), "send/", or "receive/". */
function pagePath(): string {
  if (document.body.classList.contains("home-page")) return "";
  return document.body.classList.contains("receiver-page") ? "receive/" : "send/";
}

/**
 * Relative URL from this page to the same page in another locale. Works under
 * any deploy subpath because it only ever steps up past the segments this
 * page is known to have: [locale?]/[page?]/.
 */
function localeUrl(current: LocaleInfo, target: LocaleInfo): string {
  const depth = (current.code === DEFAULT_LOCALE ? 0 : 1) + (pagePath() === "" ? 0 : 1);
  const up = depth === 0 ? "./" : "../".repeat(depth);
  const localePart = target.code === DEFAULT_LOCALE ? "" : `${target.code}/`;
  return `${up}${localePart}${pagePath()}`;
}

function wireLanguageSwitcher(current: LocaleInfo): void {
  const footer = document.querySelector(".site-footer");
  if (!footer) return;
  const holder = document.createElement("div");
  holder.className = "footer-lang";
  const select = document.createElement("select");
  select.className = "lang-select";
  select.setAttribute("aria-label", msg.i18n.languageSelectLabel);
  for (const locale of LOCALES) {
    const option = new Option(locale.nativeName, locale.code, false, locale.code === current.code);
    select.append(option);
  }
  // The boot locale is only the starting point on the runtime path: after a
  // live switch, "no-op if already selected" has to compare against where the
  // page IS, not where it woke up.
  let active = current;
  select.addEventListener("change", () => {
    const target = localeByCode(select.value);
    if (!target || target.code === active.code) return;
    storeLocale(target.code);
    if (staticLocale()) {
      // Hosted: every locale is its own page tree — switching is navigation.
      window.location.href = localeUrl(current, target);
      return;
    }
    // Standalone/dev: swap in place. NOT a reload — localStorage throws under
    // file:// on some browsers (see the auto-show note in receive/main.ts),
    // and a reload that forgot the choice would put the old language back.
    // The data-i18n markers are still in this DOM, so re-applying another
    // catalog is the boot path run again.
    void (async () => {
      msg = (await loaders[target.code]!()).messages;
      applyHtmlTranslations(document, msg);
      document.documentElement.lang = target.lang;
      document.documentElement.dir = target.dir;
      select.setAttribute("aria-label", msg.i18n.languageSelectLabel);
      document.querySelector(".i18n-note")?.remove();
      if (!target.reviewed) mountUnreviewedNote();
      active = target;
    })();
  });
  holder.append(select);
  footer.append(holder);
}

/**
 * The per-language "this translation is unreviewed" note — one quiet line in
 * the footer, in the language it is about, linking to the issue tracker.
 * Removing it for a locale is one flag in shared/i18n/registry.ts
 * (reviewed: true); nothing else changes.
 */
function mountUnreviewedNote(): void {
  const footer = document.querySelector(".site-footer");
  if (!footer) return;
  const note = document.createElement("p");
  note.className = "i18n-note";
  const link = document.createElement("a");
  link.href = ISSUES_URL;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  link.textContent = msg.i18n.unreviewedLinkText;
  note.append(`${msg.i18n.unreviewedNote} `, link);
  footer.prepend(note);
}

/**
 * Home page only: a dismissible one-liner offering the visitor's own language
 * when the page isn't already in it. In the visitor's language, not the
 * page's — the reader it exists for is the one who can't read the page.
 */
async function maybeOfferLocaleBanner(pageLocale: LocaleInfo): Promise<void> {
  try {
    if (localStorage.getItem(BANNER_DISMISSED_KEY)) return;
  } catch {
    return; // no way to remember a dismissal — never nag
  }
  const stored = storedLocale();
  // An explicit earlier choice wins over navigator; either way, only offer
  // when it differs from the page being read.
  const wanted = stored ? localeByCode(stored) : matchLocale(navigator.languages ?? []);
  if (!wanted || wanted.code === pageLocale.code) return;
  const { messages: theirs } = await loaders[wanted.code]!();

  const banner = document.createElement("div");
  banner.className = "locale-banner";
  const link = document.createElement("a");
  link.href = localeUrl(pageLocale, wanted);
  link.textContent = `${theirs.i18n.switchOffer} ${theirs.i18n.switchAction} →`;
  const dismiss = document.createElement("button");
  dismiss.type = "button";
  dismiss.className = "text-button";
  dismiss.textContent = theirs.common.dismiss;
  dismiss.addEventListener("click", () => {
    banner.remove();
    try {
      localStorage.setItem(BANNER_DISMISSED_KEY, "1");
    } catch {
      // Dismissed for this visit at least.
    }
  });
  banner.append(link, dismiss);
  document.querySelector("main")?.prepend(banner);
}

// ---------------------------------------------------------------------------
// Locale-aware formatting. The pure, locale-independent versions stay in
// shared/format.ts and shared/progress.ts (tests pin them); these are the
// display-side counterparts that follow the active catalog.

function fmt(maxFrac: number, minFrac = 0): Intl.NumberFormat {
  return new Intl.NumberFormat(msg.meta.lang, {
    maximumFractionDigits: maxFrac,
    minimumFractionDigits: minFrac,
  });
}

/** Locale-formatted number, e.g. 1234.5 → "1 234,5" in fr. */
export function fmtNumber(value: number, maxFrac = 1, minFrac = 0): string {
  return fmt(maxFrac, minFrac).format(value);
}

export function fmtInt(value: number): string {
  return fmt(0).format(value);
}

/** shared/format.ts formatBytes, with the locale's digits and unit labels. */
export function formatBytesL(bytes: number): string {
  if (bytes < 1024) return `${fmtInt(bytes)} ${msg.units.bytes}`;
  if (bytes < 1024 * 1024) return `${fmtNumber(bytes / 1024, 1, 1)} ${msg.units.kilobytes}`;
  return `${fmtNumber(bytes / 1024 / 1024, 1, 1)} ${msg.units.megabytes}`;
}

/** shared/progress.ts formatDuration, composed from the catalog's units. */
export function formatDurationL(seconds: number): string {
  const rounded = Math.max(1, Math.ceil(seconds));
  const u = msg.units;
  if (rounded < 60) return u.durSeconds(fmtInt(rounded));
  const minutes = Math.floor(rounded / 60);
  const remainder = rounded % 60;
  if (minutes < 60) {
    return remainder === 0
      ? u.durMinutes(fmtInt(minutes))
      : `${u.durMinutes(fmtInt(minutes))} ${u.durSeconds(fmtInt(remainder))}`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes === 0
    ? u.durHours(fmtInt(hours))
    : `${u.durHours(fmtInt(hours))} ${u.durMinutes(fmtInt(remainingMinutes))}`;
}

/** Display text for a thrown failure: coded protocol errors localize, plain
 *  Errors pass their (English) message through. */
export function localizeError(error: unknown): string {
  if (error instanceof OpticalError) return errorText(msg.errors, error.code, error.params);
  return error instanceof Error ? error.message : String(error);
}

/** What to put on screen for a frame verdict, or null when there is nothing
 *  worth saying. The wording contract that used to live in protocol.ts's
 *  frameVerdictMessage — now per-locale, keyed by verdict kind, so every
 *  client in a given language words the same failure the same way. */
export function verdictMessage(verdict: FrameVerdict): string | null {
  switch (verdict.kind) {
    case "older-sender":
      return msg.verdicts.olderSender(verdict.version);
    case "newer-sender":
      return msg.verdicts.newerSender(verdict.version);
    case "unsupported-flags":
      return msg.verdicts.unsupportedFlags;
    default:
      return null;
  }
}
