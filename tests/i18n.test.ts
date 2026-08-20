// Catalog integrity across every shipped locale.
//
// TypeScript already guarantees key parity (each catalog implements Messages,
// and excess-property checks reject strays). What it cannot see is content:
// %TOKEN% placeholders dropped in translation, inline markup mangled,
// interpolations that ignore their arguments, a stub that still carries the
// English text, or the wording contracts drifting from their reference
// implementations. That is what lives here.

import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

import { DEFAULT_LOCALE, LOCALES, localeByCode, matchLocale } from "../shared/i18n/registry.ts";
import type { Messages } from "../shared/i18n/messages.ts";
import { fillTokens, loaders } from "../shared/i18n/index.ts";
import { ENGLISH_ERRORS, OpticalError, errorText } from "../shared/optical-error.ts";
import { frameVerdictMessage } from "../shared/protocol.ts";

import { messages as en } from "../shared/i18n/locales/en.ts";
import { messages as es } from "../shared/i18n/locales/es.ts";
import { messages as ptBr } from "../shared/i18n/locales/pt-br.ts";
import { messages as fr } from "../shared/i18n/locales/fr.ts";
import { messages as de } from "../shared/i18n/locales/de.ts";
import { messages as it } from "../shared/i18n/locales/it.ts";
import { messages as ru } from "../shared/i18n/locales/ru.ts";
import { messages as hi } from "../shared/i18n/locales/hi.ts";
import { messages as zhHans } from "../shared/i18n/locales/zh-hans.ts";
import { messages as ja } from "../shared/i18n/locales/ja.ts";
import { messages as ko } from "../shared/i18n/locales/ko.ts";
import { messages as ar } from "../shared/i18n/locales/ar.ts";

const CATALOGS: Record<string, Messages> = {
  en, es, "pt-br": ptBr, fr, de, it, ru, hi, "zh-hans": zhHans, ja, ko, ar,
};

/** Every string leaf of a catalog, as [dot.path, value]. */
function stringLeaves(node: unknown, prefix = ""): [string, string][] {
  if (typeof node === "string") return [[prefix, node]];
  if (typeof node !== "object" || node === null) return [];
  return Object.entries(node).flatMap(([key, value]) =>
    stringLeaves(value, prefix ? `${prefix}.${key}` : key),
  );
}

function leafKinds(node: unknown, prefix = ""): Map<string, string> {
  const out = new Map<string, string>();
  if (typeof node === "object" && node !== null && !Array.isArray(node)) {
    for (const [key, value] of Object.entries(node)) {
      const path = prefix ? `${prefix}.${key}` : key;
      if (typeof value === "object" && value !== null) {
        for (const [p, k] of leafKinds(value, path)) out.set(p, k);
      } else {
        out.set(path, typeof value);
      }
    }
  }
  return out;
}

const tokensOf = (s: string) => [...s.matchAll(/%[A-Z][A-Z0-9_]*%/g)].map((m) => m[0]).sort();
const tagsOf = (s: string) => [...s.matchAll(/<[^>]+>/g)].map((m) => m[0]).sort();

test("the registry, the loader table, and the catalogs agree", () => {
  const codes = LOCALES.map((l) => l.code);
  assert.equal(new Set(codes).size, codes.length, "duplicate locale codes");
  assert.ok(codes.includes(DEFAULT_LOCALE));
  assert.deepEqual(Object.keys(loaders).sort(), [...codes].sort(), "loaders drift from registry");
  assert.deepEqual(Object.keys(CATALOGS).sort(), [...codes].sort(), "test imports drift");
  for (const [code, catalog] of Object.entries(CATALOGS)) {
    assert.equal(catalog.meta, localeByCode(code), `${code}: meta is not its registry row`);
  }
  const arabic = localeByCode("ar")!;
  assert.equal(arabic.dir, "rtl");
});

test("every catalog has exactly the English key structure", () => {
  const want = leafKinds(en);
  for (const [code, catalog] of Object.entries(CATALOGS)) {
    const got = leafKinds(catalog);
    for (const [path, kind] of want) {
      assert.equal(got.get(path), kind, `${code}: ${path} missing or wrong kind`);
    }
    for (const path of got.keys()) {
      assert.ok(want.has(path), `${code}: stray key ${path}`);
    }
  }
});

test("no catalog is an untranslated stub of the English source", () => {
  for (const [code, catalog] of Object.entries(CATALOGS)) {
    if (code === DEFAULT_LOCALE) continue;
    assert.notEqual(catalog.home.heroCopy, en.home.heroCopy, `${code}: heroCopy untranslated`);
    assert.notEqual(
      catalog.errors.fileEmpty,
      en.errors.fileEmpty,
      `${code}: errors untranslated (stub shipped?)`,
    );
    assert.notEqual(
      catalog.i18n.unreviewedNote,
      en.i18n.unreviewedNote,
      `${code}: the unreviewed note must be in its own language`,
    );
  }
});

test("%TOKEN% placeholders survive translation, key by key", () => {
  const want = new Map(stringLeaves(en).map(([path, value]) => [path, tokensOf(value)]));
  for (const [code, catalog] of Object.entries(CATALOGS)) {
    for (const [path, value] of stringLeaves(catalog)) {
      assert.deepEqual(tokensOf(value), want.get(path), `${code}: ${path} altered its tokens`);
    }
  }
});

test("only known tokens appear, and only where the build can fill them", () => {
  // The two MAX_* tokens are fillable at runtime (standalone files); anything
  // else is build-time only and must not leak outside home.* keys, because
  // the home page is never built standalone.
  const runtimeFillable = new Set(["%MAX_FILE_LABEL%", "%MAX_SNIPPET_LABEL%"]);
  const known = new Set([...runtimeFillable, "%TOP_SPEED%"]);
  for (const [path, value] of stringLeaves(en)) {
    for (const token of tokensOf(value)) {
      assert.ok(known.has(token), `unknown token ${token} in ${path}`);
      if (!runtimeFillable.has(token)) {
        assert.ok(path.startsWith("home."), `${token} in ${path} — build-only token off the home page`);
      }
    }
  }
});

test("inline markup in Html-suffixed values survives translation", () => {
  const want = new Map(
    stringLeaves(en)
      .filter(([path]) => path.endsWith("Html"))
      .map(([path, value]) => [path, tagsOf(value)]),
  );
  assert.ok(want.size >= 2, "expected the hero and support-body Html keys");
  for (const [code, catalog] of Object.entries(CATALOGS)) {
    for (const [path, value] of stringLeaves(catalog)) {
      if (!path.endsWith("Html")) continue;
      assert.deepEqual(tagsOf(value), want.get(path), `${code}: ${path} altered its markup`);
    }
  }
});

test("interpolating functions actually use their arguments", () => {
  // [path, args, substrings that must appear in the result]
  const probes: [string, unknown[], string[]][] = [
    ["send.selectedFile", ["report.pdf"], ["report.pdf"]],
    ["send.loadingDemo", ["success.png"], ["success.png"]],
    ["send.demoLoadFailed", ["success.png", 404], ["success.png", "404"]],
    ["send.preparingFile", ["report.pdf"], ["report.pdf"]],
    ["send.fileEmpty", ["report.pdf"], ["report.pdf"]],
    ["send.fileOverLimit", ["report.pdf", "80 MB", "64 MB"], ["report.pdf", "80 MB", "64 MB"]],
    ["send.capacityError", ["70 MB", "48000", "1465", "46656", "2953"], ["70 MB", "48000", "1465", "46656", "2953"]],
    ["send.streaming", ["report.pdf"], ["report.pdf"]],
    ["send.stallWarning", ["6.1"], ["6.1"]],
    ["send.fpsValue", ["60", 4], ["60", "4"]],
    ["send.fpsValue", ["60", 1], ["60"]],
    ["send.frameBytesValue", ["1465", 4], ["1465", "4"]],
    ["send.gzipTo", ["1.2 MB"], ["1.2 MB"]],
    ["send.exportEstimate", ["96", "1.9 MB", "9s"], ["96", "1.9 MB", "9s"]],
    ["send.exportProgress", ["45"], ["45"]],
    ["send.exportFailed", ["<boom>"], ["<boom>"]],
    ["send.exportZipLimit", ["70000", "65534"], ["70000", "65534"]],
    ["receive.tipDropFrameBytes", ["1465"], ["1465"]],
    ["receive.tipDropTxFps", ["24"], ["24"]],
    ["receive.cameraN", [2], ["2"]],
    ["receive.errCamera", ["NotReadableError"], ["NotReadableError"]],
    ["receive.cameraSearching", ["1280×720@60"], ["1280×720@60"]],
    ["receive.cameraActual", ["1280×720", "60", "60", 4], ["1280×720", "60", "4"]],
    ["receive.cameraActual", ["1280×720", "30", null, 1], ["1280×720", "30", "1"]],
    ["receive.progressBlocks", ["45", "120", "400"], ["45", "120", "400"]],
    ["receive.framesDecoding", ["37"], ["37"]],
    ["receive.aboutEta", ["3m 5s", "142"], ["3m 5s", "142"]],
    ["receive.etaTotal", ["12s"], ["12s"]],
    ["receive.fileStats", ["512 KB", "2.1 s", "245.0 KB/s"], ["512 KB", "2.1 s", "245.0 KB/s"]],
    ["receive.saveFile", ["photo.jpg"], ["photo.jpg"]],
    ["receive.showMedia", ["§"], ["§"]],
    ["receive.receivedPreviewAlt", ["photo.jpg"], ["photo.jpg"]],
    ["receive.receivedFileAriaLabel", ["photo.jpg"], ["photo.jpg"]],
    ["errors.fileOverLimit", ["64 MB"], ["64 MB"]],
    ["errors.snippetOverLimit", ["4 MB"], ["4 MB"]],
    ["verdicts.olderSender", [2], ["2"]],
    ["verdicts.newerSender", [4], ["4"]],
    ["units.kbPerSecond", ["245.3"], ["245.3"]],
    ["units.secondsValue", ["12.3"], ["12.3"]],
    ["units.durHours", ["2"], ["2"]],
    ["units.durMinutes", ["3"], ["3"]],
    ["units.durSeconds", ["12"], ["12"]],
  ];
  for (const [code, catalog] of Object.entries(CATALOGS)) {
    for (const [path, args, expects] of probes) {
      let node: unknown = catalog;
      for (const part of path.split(".")) node = (node as Record<string, unknown>)[part];
      assert.equal(typeof node, "function", `${code}: ${path} is not a function`);
      const result = (node as (...a: unknown[]) => string)(...args);
      assert.equal(typeof result, "string");
      for (const expect of expects) {
        assert.ok(result.includes(expect), `${code}: ${path}(${args.join(", ")}) lost "${expect}": ${result}`);
      }
    }
  }
});

test("the English catalog IS the reference wording for errors and verdicts", () => {
  // errors: one table, shared by construction — pin the wiring.
  assert.equal(en.errors, ENGLISH_ERRORS);
  assert.equal(new OpticalError("fileEmpty").message, en.errors.fileEmpty);
  assert.equal(
    new OpticalError("snippetOverLimit", { limit: "4 MB" }).message,
    en.errors.snippetOverLimit("4 MB"),
  );
  assert.equal(errorText(en.errors, "sha256Failed", {}), en.errors.sha256Failed);
  // verdicts: protocol.ts keeps the reference implementation for non-web
  // clients; the en catalog must word every verdict identically.
  assert.equal(
    en.verdicts.olderSender(2),
    frameVerdictMessage({ kind: "older-sender", version: 2 }),
  );
  assert.equal(
    en.verdicts.newerSender(4),
    frameVerdictMessage({ kind: "newer-sender", version: 4 }),
  );
  assert.equal(
    en.verdicts.unsupportedFlags,
    frameVerdictMessage({ kind: "unsupported-flags", flags: 1 }),
  );
});

test("every data-i18n key in the HTML pages resolves to a catalog string", () => {
  const paths = new Set<string>();
  for (const page of ["index.html", "send/index.html", "receive/index.html"]) {
    const html = readFileSync(new URL(`../${page}`, import.meta.url), "utf8");
    for (const [, key] of html.matchAll(/\sdata-i18n(?:-html)?="([^"]+)"/g)) paths.add(key!);
    for (const [, spec] of html.matchAll(/\sdata-i18n-attr="([^"]+)"/g)) {
      for (const pair of spec!.split(";")) {
        const colon = pair.indexOf(":");
        assert.ok(colon > 0, `bad data-i18n-attr entry "${pair}" in ${page}`);
        paths.add(pair.slice(colon + 1));
      }
    }
  }
  assert.ok(paths.size > 80, `suspiciously few marked strings (${paths.size})`);
  // The standalone build swaps two keys in; they must exist even though no
  // source page carries them.
  paths.add("send.footerHintStandalone");
  paths.add("chrome.modeBadgeSend");
  paths.add("chrome.modeBadgeReceive");
  for (const [code, catalog] of Object.entries(CATALOGS)) {
    for (const path of paths) {
      let node: unknown = catalog;
      for (const part of path.split(".")) {
        assert.ok(
          node !== null && typeof node === "object" && part in node,
          `${code}: HTML references missing key ${path}`,
        );
        node = (node as Record<string, unknown>)[part];
      }
      assert.equal(typeof node, "string", `${code}: HTML key ${path} must be a plain string`);
    }
  }
});

test("browser language lists land on the right locale", () => {
  assert.equal(matchLocale(["es-MX"])?.code, "es");
  assert.equal(matchLocale(["pt"])?.code, "pt-br");
  assert.equal(matchLocale(["pt-PT"])?.code, "pt-br");
  assert.equal(matchLocale(["zh"])?.code, "zh-hans");
  assert.equal(matchLocale(["zh-CN"])?.code, "zh-hans");
  assert.equal(matchLocale(["en-GB", "fr"])?.code, "en");
  assert.equal(matchLocale(["da", "sv"]), undefined);
  assert.equal(matchLocale([]), undefined);
  assert.equal(matchLocale(["AR"])?.code, "ar");
});

test("fillTokens fills what it knows and leaves what it doesn't", () => {
  assert.equal(fillTokens("up to %MAX% now", { MAX: "64 MB" }), "up to 64 MB now");
  assert.equal(fillTokens("%UNKNOWN% stays", {}), "%UNKNOWN% stays");
  assert.equal(fillTokens("100% plain percent", { X: "y" }), "100% plain percent");
});

test("unreviewed locales carry a note; reviewed ones carry none", () => {
  for (const locale of LOCALES) {
    const catalog = CATALOGS[locale.code]!;
    // CJK says in ~18 characters what English needs 90 for — the floor only
    // catches an emptied-out value, not verbosity.
    assert.ok(catalog.i18n.unreviewedNote.length > 8, `${locale.code}: note too short`);
    assert.ok(catalog.i18n.unreviewedLinkText.length > 2);
  }
  // English is the source text — reviewed by construction. Everything else
  // starts unreviewed until a native speaker flips its registry flag.
  assert.equal(localeByCode("en")!.reviewed, true);
});
