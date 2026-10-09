// Standalone variant of loaders.ts — every catalog statically imported, so a
// single downloaded file speaks all thirteen languages and the bindings are
// initialized before the entry's top-level await runs (the dynamic variant,
// inlined, landed after it — a TDZ crash on open). Swapped in at resolve time
// by build/use-inline-variants.ts; the hosted build never parses this file.

import type { Messages } from "./messages";
import * as en from "./locales/en";
import * as es from "./locales/es";
import * as ptBr from "./locales/pt-br";
import * as fr from "./locales/fr";
import * as de from "./locales/de";
import * as it from "./locales/it";
import * as ru from "./locales/ru";
import * as hi from "./locales/hi";
import * as zhHans from "./locales/zh-hans";
import * as ja from "./locales/ja";
import * as ko from "./locales/ko";
import * as ar from "./locales/ar";
import * as tr from "./locales/tr";

export const loaders: Record<string, () => Promise<{ messages: Messages }>> = {
  en: () => Promise.resolve(en),
  es: () => Promise.resolve(es),
  "pt-br": () => Promise.resolve(ptBr),
  fr: () => Promise.resolve(fr),
  de: () => Promise.resolve(de),
  it: () => Promise.resolve(it),
  ru: () => Promise.resolve(ru),
  hi: () => Promise.resolve(hi),
  "zh-hans": () => Promise.resolve(zhHans),
  ja: () => Promise.resolve(ja),
  ko: () => Promise.resolve(ko),
  ar: () => Promise.resolve(ar),
  tr: () => Promise.resolve(tr),
};
