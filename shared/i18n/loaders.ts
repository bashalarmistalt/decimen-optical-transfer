// Hosted catalog loading: one dynamic import per locale, so each language is
// its own chunk and the receive entry stays under its CI size tripwire.
//
// The standalone builds swap this module for loaders.inline.ts (see
// build/use-inline-variants.ts): a single file must embed every catalog, and
// inlining THESE dynamic imports put the catalog bindings after the entry's
// top-level await in the bundle — a temporal-dead-zone crash on open. Static
// imports in the inline variant initialize before any entry code runs.
//
// One entry per registry row — tests/i18n.test.ts fails if these drift apart.
// Explicit literals rather than import(`./locales/${c}`) because Vite needs
// static analysis to split them.

import type { Messages } from "./messages";

export const loaders: Record<string, () => Promise<{ messages: Messages }>> = {
  en: () => import("./locales/en"),
  es: () => import("./locales/es"),
  "pt-br": () => import("./locales/pt-br"),
  fr: () => import("./locales/fr"),
  de: () => import("./locales/de"),
  it: () => import("./locales/it"),
  ru: () => import("./locales/ru"),
  hi: () => import("./locales/hi"),
  "zh-hans": () => import("./locales/zh-hans"),
  ja: () => import("./locales/ja"),
  ko: () => import("./locales/ko"),
  ar: () => import("./locales/ar"),
  tr: () => import("./locales/tr"),
};
