import type { Plugin, ViteDevServer } from "vite";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { LOCALES, DEFAULT_LOCALE, type LocaleInfo } from "../shared/i18n/registry";
import type { Messages } from "../shared/i18n/messages";
import { messages as en } from "../shared/i18n/locales/en";
import { messages as es } from "../shared/i18n/locales/es";
import { messages as ptBr } from "../shared/i18n/locales/pt-br";
import { messages as fr } from "../shared/i18n/locales/fr";
import { messages as de } from "../shared/i18n/locales/de";
import { messages as it } from "../shared/i18n/locales/it";
import { messages as ru } from "../shared/i18n/locales/ru";
import { messages as hi } from "../shared/i18n/locales/hi";
import { messages as zhHans } from "../shared/i18n/locales/zh-hans";
import { messages as ja } from "../shared/i18n/locales/ja";
import { messages as ko } from "../shared/i18n/locales/ko";
import { messages as ar } from "../shared/i18n/locales/ar";
import { messages as tr } from "../shared/i18n/locales/tr";

/**
 * Hosted-site localization: one fully translated page tree per locale.
 *
 * The three source pages stay English with data-i18n="dot.path" markers (see
 * shared/i18n/index.ts for the runtime half of this contract). At build time
 * this plugin:
 *
 *   - VERIFIES the inline English against the en catalog and fails the build
 *     on drift, so the readable-HTML copy and the translatable copy are one
 *     copy (the htmlTokens() rule, applied to prose);
 *   - emits dist/<code>/{,send/,receive/}index.html for every other locale —
 *     translated text and attributes, <html lang/dir>, per-locale canonical
 *     and hreflang alternates, asset URLs re-pointed one directory up, the
 *     service-worker registration re-scoped, and the manifest link aimed at
 *     that locale's manifest;
 *   - emits dist/manifest.<code>.webmanifest with a translated description
 *     and a start_url opening that locale's tree;
 *   - regenerates dist/sitemap.xml with the full locale × page matrix and
 *     xhtml:link alternates;
 *   - strips the data-i18n markers from every hosted page and stamps
 *     data-i18n-static="<code>", which tells the runtime the URL owns the
 *     locale (the switcher navigates rather than retranslating).
 *
 * Standalone builds never register this plugin: the single files keep their
 * markers and translate at open time, because a file on a USB stick cannot
 * know its reader's language at build time.
 *
 * In dev, a middleware serves /<code>/… by transforming the source page on
 * the fly (assets absolutized against the real dev paths), so translated
 * pages are inspectable without a build. The plain dev pages stay unstamped —
 * they exercise the standalone runtime path instead.
 *
 * All emitted pages land before closeBundle, so vite-plugin-pwa's precache
 * glob picks them up and the installed app works offline in every language.
 */

const CATALOGS: Record<string, Messages> = {
  en, es, "pt-br": ptBr, fr, de, it, ru, hi, "zh-hans": zhHans, ja, ko, ar, tr,
};

// Hosted page files, keyed by their path in the bundle.
const PAGES: Record<string, "" | "send/" | "receive/"> = {
  "index.html": "",
  "send/index.html": "send/",
  "receive/index.html": "receive/",
};

const TEXT_RE = /(<([a-zA-Z][\w-]*)\b[^>]*?\sdata-i18n="([^"]+)"[^>]*>)([\s\S]*?)(<\/\2>)/g;
const HTML_RE = /(<([a-zA-Z][\w-]*)\b[^>]*?\sdata-i18n-html="([^"]+)"[^>]*>)([\s\S]*?)(<\/\2>)/g;
const ATTR_TAG_RE = /<[a-zA-Z][\w-]*\b[^>]*\sdata-i18n-attr="([^"]+)"[^>]*>/g;
const STRIP_RE = /\sdata-i18n(?:-html|-attr)?="[^"]*"/g;
const LEFTOVER_TOKEN_RE = /%[A-Z][A-Z0-9_]*%/;

function fillTokens(value: string, tokens: Record<string, string>): string {
  return value.replace(/%([A-Z][A-Z0-9_]*)%/g, (whole, name: string) =>
    name in tokens ? tokens[name]! : whole,
  );
}

function lookup(catalog: Messages, path: string): string {
  let node: unknown = catalog;
  for (const part of path.split(".")) {
    if (node === null || typeof node !== "object" || !(part in node)) {
      throw new Error(`i18n-pages: no catalog entry at "${path}"`);
    }
    node = (node as Record<string, unknown>)[part];
  }
  if (typeof node !== "string") {
    throw new Error(`i18n-pages: catalog entry "${path}" is not a plain string`);
  }
  return node;
}

const escapeText = (s: string) =>
  s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
const escapeAttr = (s: string) => escapeText(s).replaceAll('"', "&quot;");
const normalize = (s: string) => s.replace(/\s+/g, " ").trim();

interface I18nPagesOptions {
  siteUrl: string;
  tokens: Record<string, string>;
  /** The base web manifest (vite.config's), cloned per locale. */
  manifest: Record<string, unknown>;
}

/** Resolve a catalog value for a page, tokens filled, or fail loudly. */
function resolved(catalog: Messages, path: string, tokens: Record<string, string>): string {
  const value = fillTokens(lookup(catalog, path), tokens);
  const leftover = LEFTOVER_TOKEN_RE.exec(value);
  if (leftover) {
    throw new Error(`i18n-pages: unsubstituted token ${leftover[0]} in "${path}"`);
  }
  return value;
}

/**
 * Check the inline English against the en catalog. The HTML stays readable
 * English on purpose; this is what keeps it from quietly diverging from what
 * the other eleven languages actually translate.
 */
function verifyEnglishInline(html: string, page: string, tokens: Record<string, string>): void {
  const fail = (path: string, inline: string, catalog: string): never => {
    throw new Error(
      `i18n-pages: ${page}: inline English for "${path}" drifted from the catalog.\n` +
        `  inline:  ${inline}\n  catalog: ${catalog}\n` +
        `Edit both shared/i18n/locales/en.ts and the HTML — they are one copy.`,
    );
  };
  for (const [, , , path, inner] of html.matchAll(TEXT_RE)) {
    const want = normalize(resolved(CATALOGS[DEFAULT_LOCALE]!, path!, tokens));
    if (normalize(inner!) !== want) fail(path!, normalize(inner!), want);
  }
  for (const [, , , path, inner] of html.matchAll(HTML_RE)) {
    const want = normalize(resolved(CATALOGS[DEFAULT_LOCALE]!, path!, tokens));
    if (normalize(inner!) !== want) fail(path!, normalize(inner!), want);
  }
  for (const [tag, spec] of html.matchAll(ATTR_TAG_RE)) {
    for (const pair of spec!.split(";")) {
      const colon = pair.indexOf(":");
      const attr = pair.slice(0, colon);
      const path = pair.slice(colon + 1);
      const inline = new RegExp(`\\s${attr}="([^"]*)"`).exec(tag)?.[1];
      const want = resolved(CATALOGS[DEFAULT_LOCALE]!, path, tokens);
      if (inline === undefined || normalize(inline) !== normalize(want)) {
        fail(path, inline ?? "(missing)", want);
      }
    }
  }
}

/** Swap every marked node/attribute to `catalog`, markers left in place
 *  (stripping is a separate, final step so dev tooling can keep them). */
function translateMarkup(
  html: string,
  catalog: Messages,
  tokens: Record<string, string>,
): string {
  html = html.replace(TEXT_RE, (_m, open: string, _tag, path: string, _inner, close: string) =>
    `${open}${escapeText(resolved(catalog, path, tokens))}${close}`,
  );
  html = html.replace(HTML_RE, (_m, open: string, _tag, path: string, _inner, close: string) =>
    `${open}${resolved(catalog, path, tokens)}${close}`,
  );
  html = html.replace(ATTR_TAG_RE, (tag: string, spec: string) => {
    for (const pair of spec.split(";")) {
      const colon = pair.indexOf(":");
      if (colon < 1) throw new Error(`i18n-pages: bad data-i18n-attr entry "${pair}"`);
      const attr = pair.slice(0, colon);
      const value = escapeAttr(resolved(catalog, pair.slice(colon + 1), tokens));
      const attrRe = new RegExp(`(\\s${attr}=")[^"]*(")`);
      if (!attrRe.test(tag)) {
        throw new Error(`i18n-pages: data-i18n-attr names "${attr}" but the tag lacks it`);
      }
      tag = tag.replace(attrRe, `$1${value}$2`);
    }
    return tag;
  });
  return html;
}

/** True for relative URLs that point at files (assets), not page directories
 *  — the locale tree mirrors the page structure, so page links stay as-is,
 *  while assets live once at the original depth and need one more "../". */
function isRelativeAssetUrl(url: string): boolean {
  if (!/^\.\.?\//.test(url)) return false;
  const path = url.split(/[?#]/)[0]!;
  const last = path.split("/").pop()!;
  return last.includes(".");
}

const deepen = (url: string) => `../${url.replace(/^\.\//, "")}`;

/** hreflang alternates for one page, every locale plus x-default. */
function hreflangBlock(siteUrl: string, pagePart: string): string {
  const links = LOCALES.map((l) => {
    const prefix = l.code === DEFAULT_LOCALE ? "" : `${l.code}/`;
    return `    <link rel="alternate" hreflang="${l.lang}" href="${siteUrl}${prefix}${pagePart}" />`;
  });
  links.push(
    `    <link rel="alternate" hreflang="x-default" href="${siteUrl}${pagePart}" />`,
  );
  return links.join("\n");
}

function stampHtmlElement(html: string, locale: LocaleInfo): string {
  const open = `<html lang="${locale.lang}"${locale.dir === "rtl" ? ' dir="rtl"' : ""} data-i18n-static="${locale.code}">`;
  if (!html.includes('<html lang="en">')) {
    throw new Error('i18n-pages: expected the source page to open with <html lang="en">');
  }
  return html.replace('<html lang="en">', open);
}

function insertBeforeHead(html: string, block: string): string {
  if (!html.includes("</head>")) throw new Error("i18n-pages: page has no </head>");
  return html.replace("</head>", `${block}\n  </head>`);
}

/**
 * A built English page → the same page for `locale`, one directory deeper.
 */
function localizeBuiltPage(
  html: string,
  locale: LocaleInfo,
  pagePart: "" | "send/" | "receive/",
  opts: I18nPagesOptions,
): string {
  let out = translateMarkup(html, CATALOGS[locale.code]!, opts.tokens);

  // Assets sit one directory further up from the locale tree. Page links
  // (no file extension) stay relative — the tree is mirrored.
  out = out.replace(/(\s(?:href|src)=")([^"]+)(")/g, (m, pre: string, url: string, post: string) =>
    isRelativeAssetUrl(url) ? `${pre}${deepen(url)}${post}` : m,
  );

  // The service-worker registration (build/root-pwa-head.ts) resolves against
  // the page; re-point it one level up, same as the assets.
  out = out.replace(
    /register\("((?:\.\.\/)*(?:\.\/)?sw\.js)", \{ scope: "([^"]*)" \}\)/,
    (_m, sw: string, scope: string) => `register("${deepen(sw)}", { scope: "${deepen(scope)}" })`,
  );

  // Locale manifest: same directory as the root one, per-locale file.
  out = out.replace("manifest.webmanifest", `manifest.${locale.code}.webmanifest`);

  // The share dialog's baked URL follows the locale: a Spanish sender hands
  // the receiver a Spanish page (the QR is drawn from this same input).
  out = out.replace(
    /(<input id="share-url" readonly value=")([^"]*?)((?:receive\/)?")/,
    (_m, pre: string, base: string, tail: string) =>
      `${pre}${base.endsWith("/") ? base : `${base}/`}${locale.code}/${tail}`,
  );

  // Canonical (all pages) and og:url (home) name this locale's URL.
  const localeUrl = `${opts.siteUrl}${locale.code}/${pagePart}`;
  out = out.replace(/(<link rel="canonical" href=")[^"]*(")/, `$1${localeUrl}$2`);
  out = out.replace(/(<meta property="og:url" content=")[^"]*(")/, `$1${localeUrl}$2`);
  out = out.replace(
    /(<meta property="og:locale" content=")[^"]*(")/,
    `$1${locale.lang.replace("-", "_")}$2`,
  );

  out = stampHtmlElement(out, locale);
  out = insertBeforeHead(out, hreflangBlock(opts.siteUrl, pagePart));
  return out.replace(STRIP_RE, "");
}

function localeManifest(locale: LocaleInfo, opts: I18nPagesOptions): string {
  const catalog = CATALOGS[locale.code]!;
  return JSON.stringify(
    {
      ...opts.manifest,
      lang: locale.lang,
      dir: locale.dir,
      description: catalog.home.metaDescription,
      start_url: `./${locale.code}/`,
      // Scope stays the site root: one service worker serves every tree, and
      // an installed app may follow links across locales.
      scope: "./",
    },
    null,
    2,
  );
}

function sitemap(siteUrl: string): string {
  const urlFor = (code: string, page: string) =>
    `${siteUrl}${code === DEFAULT_LOCALE ? "" : `${code}/`}${page}`;
  const entries = Object.values(PAGES).map((page) => {
    const alternates = [
      ...LOCALES.map(
        (l) =>
          `    <xhtml:link rel="alternate" hreflang="${l.lang}" href="${urlFor(l.code, page)}"/>`,
      ),
      `    <xhtml:link rel="alternate" hreflang="x-default" href="${urlFor(DEFAULT_LOCALE, page)}"/>`,
    ].join("\n");
    return LOCALES.map(
      (l) => `  <url><loc>${urlFor(l.code, page)}</loc>\n${alternates}\n  </url>`,
    ).join("\n");
  });
  return (
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" ' +
    'xmlns:xhtml="http://www.w3.org/1999/xhtml">\n' +
    entries.join("\n") +
    "\n</urlset>\n"
  );
}

export function i18nPages(opts: I18nPagesOptions): Plugin {
  let outDir = "dist";
  return {
    name: "i18n-pages",
    enforce: "post",

    configResolved(config) {
      outDir = config.build.outDir;
    },

    // Dev: serve /<code>/… by transforming the source page on the fly.
    configureServer(server: ViteDevServer) {
      server.middlewares.use((req, res, next) => {
        void (async () => {
          const url = (req.url ?? "/").split(/[?#]/)[0]!;
          const m = /^\/([a-z-]+)(\/(?:send|receive)?\/?)?$/.exec(url);
          const locale = m ? LOCALES.find((l) => l.code === m[1] && l.code !== DEFAULT_LOCALE) : undefined;
          if (!m || !locale) return next();
          if (!url.endsWith("/")) {
            res.statusCode = 301;
            res.setHeader("location", `${url}/`);
            return res.end();
          }
          const pagePart = (m[2] ?? "/").replace(/^\//, "") as "" | "send/" | "receive/";
          const sourcePath = pagePart === "" ? "index.html" : `${pagePart}index.html`;
          const { readFileSync } = await import("node:fs");
          const raw = readFileSync(resolve(server.config.root, sourcePath), "utf8");
          let html = await server.transformIndexHtml(`/${sourcePath}`, raw, req.originalUrl);
          html = translateMarkup(html, CATALOGS[locale.code]!, opts.tokens);
          // Dev assets live at their real dev paths; absolutize anything that
          // looks like a file so it resolves from under /<code>/.
          html = html.replace(
            /(\s(?:href|src)=")([^"]+)(")/g,
            (whole, pre: string, u: string, post: string) =>
              isRelativeAssetUrl(u)
                ? `${pre}${new URL(u, `http://dev/${pagePart}`).pathname}${post}`
                : whole,
          );
          html = stampHtmlElement(html, locale).replace(STRIP_RE, "");
          res.setHeader("content-type", "text/html");
          res.end(html);
        })().catch(next);
      });
    },

    // Build: verify English, emit every locale tree + manifest.
    writeBundle(options, bundle) {
      const dir = options.dir ?? outDir;
      for (const [fileName, pagePart] of Object.entries(PAGES)) {
        const asset = bundle[fileName];
        if (!asset || asset.type !== "asset") {
          throw new Error(`i18n-pages: expected ${fileName} in the bundle`);
        }
        const html =
          typeof asset.source === "string" ? asset.source : new TextDecoder().decode(asset.source);
        verifyEnglishInline(html, fileName, opts.tokens);

        // The English pages get their own stamp, hreflang set, and marker
        // strip — written straight over the file vite just emitted.
        let enPage = stampHtmlElement(html, LOCALES.find((l) => l.code === DEFAULT_LOCALE)!);
        enPage = insertBeforeHead(enPage, hreflangBlock(opts.siteUrl, pagePart));
        writeFileSync(resolve(dir, fileName), enPage.replace(STRIP_RE, ""));

        for (const locale of LOCALES) {
          if (locale.code === DEFAULT_LOCALE) continue;
          const target = resolve(dir, locale.code, fileName);
          mkdirSync(dirname(target), { recursive: true });
          writeFileSync(target, localizeBuiltPage(html, locale, pagePart, opts));
        }
      }
      for (const locale of LOCALES) {
        if (locale.code === DEFAULT_LOCALE) continue;
        writeFileSync(
          resolve(dir, `manifest.${locale.code}.webmanifest`),
          localeManifest(locale, opts),
        );
      }
    },

    // After everything (including the public/ copy): the real sitemap.
    closeBundle() {
      writeFileSync(resolve(outDir, "sitemap.xml"), sitemap(opts.siteUrl));
    },
  };
}
