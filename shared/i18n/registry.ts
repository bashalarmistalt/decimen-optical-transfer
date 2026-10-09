// The locale control panel: every language Decimen ships, in one table.
//
// This file is deliberately tiny and dependency-free — it rides in every
// entry chunk (the language switcher needs each locale's native name without
// loading thirteen catalogs), and the build imports it to know which page trees
// to emit. The catalogs themselves load on demand (see index.ts loaders).
//
// To add a language: add a row here, add shared/i18n/locales/<code>.ts
// (copy en.ts and translate it), and add its loader in index.ts. The build
// emits its /<code>/ page tree, sitemap entries, hreflang links, and PWA
// manifest from this table; nothing else needs touching.
//
// `reviewed` is the one flag a native-speaker review flips: while false, the
// pages carry a small footer note in that language saying the translation is
// machine-drafted and inviting a GitHub issue (see unreviewed-notice in
// index.ts). English is reviewed by construction — it is the source text.

export interface LocaleInfo {
  /** Registry key and URL path segment (lowercase): decimen.app/<code>/ */
  code: string;
  /** BCP 47 tag for <html lang> and every Intl formatter. */
  lang: string;
  /** The language's own name for itself — switcher entries never translate. */
  nativeName: string;
  dir: "ltr" | "rtl";
  /** Confirmed by a native speaker. false shows the unreviewed footer note. */
  reviewed: boolean;
}

export const DEFAULT_LOCALE = "en";

export const LOCALES: readonly LocaleInfo[] = [
  { code: "en", lang: "en", nativeName: "English", dir: "ltr", reviewed: true },
  { code: "es", lang: "es", nativeName: "Español", dir: "ltr", reviewed: false },
  { code: "pt-br", lang: "pt-BR", nativeName: "Português (Brasil)", dir: "ltr", reviewed: false },
  { code: "fr", lang: "fr", nativeName: "Français", dir: "ltr", reviewed: false },
  { code: "de", lang: "de", nativeName: "Deutsch", dir: "ltr", reviewed: false },
  { code: "it", lang: "it", nativeName: "Italiano", dir: "ltr", reviewed: false },
  { code: "ru", lang: "ru", nativeName: "Русский", dir: "ltr", reviewed: false },
  { code: "hi", lang: "hi", nativeName: "हिन्दी", dir: "ltr", reviewed: false },
  { code: "zh-hans", lang: "zh-Hans", nativeName: "简体中文", dir: "ltr", reviewed: false },
  { code: "ja", lang: "ja", nativeName: "日本語", dir: "ltr", reviewed: false },
  { code: "ko", lang: "ko", nativeName: "한국어", dir: "ltr", reviewed: false },
  { code: "ar", lang: "ar", nativeName: "العربية", dir: "rtl", reviewed: false },
  { code: "tr", lang: "tr", nativeName: "Türkçe", dir: "ltr", reviewed: false },
];

export function localeByCode(code: string): LocaleInfo | undefined {
  return LOCALES.find((l) => l.code === code);
}

/**
 * Best shipped locale for a browser's language list, or undefined.
 *
 * Exact tag first ("pt-BR" → pt-br), then the bare language ("pt" → pt-br
 * would be wrong, so bare matches only map to a locale whose own language
 * subtag equals it — "es-MX" → es, "zh" → zh-hans via the alias table).
 */
const BARE_LANGUAGE_ALIASES: Record<string, string> = {
  // Chinese needs script disambiguation the bare tag doesn't carry; Simplified
  // is what we ship, so bare "zh" (and the mainland/Singapore tags) land there.
  zh: "zh-hans",
  "zh-cn": "zh-hans",
  "zh-sg": "zh-hans",
  // Only Brazilian Portuguese ships today; European Portuguese readers get the
  // nearest thing rather than English.
  pt: "pt-br",
};

export function matchLocale(preferred: readonly string[]): LocaleInfo | undefined {
  for (const raw of preferred) {
    const tag = raw.toLowerCase();
    const exact = localeByCode(tag) ?? localeByCode(BARE_LANGUAGE_ALIASES[tag] ?? "");
    if (exact) return exact;
    const bare = tag.split("-")[0]!;
    const byBare =
      localeByCode(bare) ?? localeByCode(BARE_LANGUAGE_ALIASES[bare] ?? "");
    if (byBare) return byBare;
  }
  return undefined;
}
