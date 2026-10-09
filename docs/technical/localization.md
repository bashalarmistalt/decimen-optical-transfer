# Localization

Decimen ships in thirteen languages from one English source. The moving parts,
and the invariants that keep them honest:

## Where the words live

- **`shared/i18n/messages.ts`** — the `Messages` interface: every user-facing
  string, typed. Parameterized messages are functions, because word order
  moves under translation. TypeScript is the completeness check: a locale
  missing a key, or carrying a stray one, fails the build.
- **`shared/i18n/locales/<code>.ts`** — one catalog per language. English
  (`en.ts`) is the source text every other catalog translates.
- **`shared/i18n/registry.ts`** — the control panel: code, BCP 47 tag, native
  name, text direction, and the `reviewed` flag, one row per language.

## Two delivery paths, one contract

The three HTML pages stay readable English, with translatable nodes marked
`data-i18n="dot.path"` (`data-i18n-html` for values carrying inline markup,
`data-i18n-attr="attr:path"` for attributes).

**Hosted** (`npm run build`): `build/i18n-pages.ts` emits a fully translated
page tree per locale — `/es/`, `/es/send/`, `/ar/receive/`, … — with
`<html lang>` (and `dir="rtl"` where the registry says so), per-locale
canonical URLs, hreflang alternates on every page, a per-locale PWA manifest
whose `start_url` opens that tree, and a `sitemap.xml` covering the whole
matrix. Asset references are re-pointed a directory up; page links stay
relative because the tree is mirrored. The markers are stripped and each page
is stamped `data-i18n-static="<code>"`: on hosted pages the **URL owns the
locale**, and the footer switcher navigates between trees.

**Standalone** (`npm run build:standalone`): the single files keep their
markers and embed *all* catalogs (`inlineDynamicImports`), because a file on
a USB stick cannot know its reader's language at build time. At open,
`shared/i18n/index.ts` resolves stored choice → `navigator.languages` →
English, and swaps the text in place.

On the hosted site the catalogs are code-split — each locale is its own
chunk, loaded on demand — which is what keeps the receive entry under its CI
size tripwire.

## Fail-loud invariants

- The inline English in the HTML **must equal** the en catalog, token-filled
  and whitespace-normalized. The build fails naming the key otherwise
  (`verifyEnglishInline`). Edit copy in both places; they are one copy.
- A `data-i18n` path with no catalog entry throws — at build for hosted
  pages, in the console for standalone.
- `%TOKEN%` placeholders (`%MAX_FILE_LABEL%`…) must survive translation
  key-for-key; `tests/i18n.test.ts` diffs the multiset per key, checks inline
  markup survives `…Html` values, and probes every interpolating function
  with sentinel arguments.

## Wording contracts

Two message groups are cross-client contracts, not mere UI copy:

- **Verdicts** (wire-version mismatches): `protocol.ts` keeps
  `frameVerdictMessage()` as the English reference so non-web clients have a
  normative wording; the en catalog is pinned to it by test. The contract is
  now *per language, keyed by verdict kind* — every client in a given
  language words the same failure the same way, from the catalog.
- **Protocol errors**: `shared/optical-error.ts` throws codes, with the
  English text defined once (`ENGLISH_ERRORS`) and re-exported by the en
  catalog, so the thrown message and the catalog cannot drift. The UI
  localizes at display time (`localizeError`); workers and node tests never
  touch the i18n layer.

## Adding a language

1. Add a row to `shared/i18n/registry.ts` (`reviewed: false`).
2. Copy `shared/i18n/locales/en.ts` to `locales/<code>.ts` and translate it.
   Read the translator notes at the top of `shared/i18n/messages.ts` first.
3. Add its loader line in `shared/i18n/index.ts` and its import in
   `build/i18n-pages.ts` and `tests/i18n.test.ts`.
4. `npm test && npm run build:all`. The tests, the English-drift check, and
   the emitted tree are the review scaffolding.

Everything else — the page tree, hreflang, sitemap, manifest, switcher entry,
standalone embedding — falls out of the registry row.

## The `reviewed` flag

Machine-drafted catalogs ship with `reviewed: false`, which renders one quiet
footer line *in that language* saying the translation hasn't had a native
review, linking to the issue tracker. A native speaker's review is a PR that
fixes what needs fixing and flips the flag; the note disappears everywhere —
hosted trees and standalone files — on the next build. English is reviewed by
construction.

## What deliberately isn't translated

The brand ("Decimen", "Decimen Optical Transfer"), license names, "QR",
"SHA-256", "gzip", the version/build footer line, and the GitHub/Releases
links. Screenshots and the OG image remain English for now — the
`og:image:alt` text is translated.
