# Architecture

Three pages, one shared core, a handful of single-purpose build plugins. No framework, no state library — each page is one TypeScript module wiring DOM to the shared code.

## Pages

| dir | page | entry |
|---|---|---|
| `/` | home: cards, share dialog | `home/main.ts` |
| `send/` | file/snippet → fountain-coded QR stream on a canvas | `send/main.ts` |
| `receive/` | camera → WASM QR decode in workers → fountain decoder → file | `receive/main.ts`, `receive/worker.ts` |

## Shared modules (`shared/`)

- `fountain.ts` — LT encoder/decoder, deterministic soliton distribution (see [Protocol](protocol.md)).
- `protocol.ts` — frame header pack/parse, file container, SHA-256 verification, stream identity.
- `frame-capacity.ts` — QR capacity math: payload size → block length / count limits.
- `qr-raster.ts` — QR module matrix → RGBA raster.
- `display.ts` — QR display-size fitting against the viewport.
- `platform.ts` — `isIOS`/`isAndroid` sniffs and camera capability probing (torch, continuous focus, max fps). Policy: probe wherever probeable; sniff only for unprobeable behavior.
- `worker-pool.ts` — decode worker pool; busy workers drop frames, the fountain absorbs it.
- `no-signal.ts` — pure timing policy for the "Nothing happening?" hint (short first delay, longer after dismissal).
- `progress.ts` — frames-collected progress estimation and fountain-overhead model.
- `decode-policy.ts` — pure crop/full-scan downscale and `tryHarder` policy.
- `receiver-session.ts` — completion verification, race claims, and bounded duplicate filtering.
- `send-settings.ts` — canonical tx settings lists; the sender's dropdowns and the no-signal advice both render from it.
- `snippet.ts` — text-snippet container type.
- `dialog.ts` — geometric backdrop-click close for `<dialog>`.
- `share-dialog.ts` — the share dialog both home and sender carry (QR + copy + OS sheet).
- `status-line.ts`, `wake-lock.ts`, `format.ts`, `style.css`.

## Build plugins (`build/`)

One file each, exact-match string surgery that **throws when it misses** — markup drift breaks the build instead of shipping broken output.

- `html-tokens.ts` — `%TOKEN%` substitution (site URL, settings options, version, build id).
- `root-pwa-head.ts` — owns the manifest link and SW registration on every page; validates the URLs resolve to the site root under any subpath.
- `rewrite-standalone-links.ts` — strips/rewrites hosted-site references for the single-file builds.
- `inline-codec-wasm.ts`, `use-inline-variants.ts` — inline the decoder wasm/worker for standalone.
- `standalone-csp.ts`, `emit-as.ts` — standalone CSP and output naming.
- `license-banner.ts` — prepends the version/license/source banner to every built artifact.
- `diagnostics-endpoint.ts` — dev-only `/__diagnostics` collector behind `npm run diagnostics` (see [Diagnostics](diagnostics.md)).
- `make-icons.ts` — regenerates `public/` icons from the logo (`npm run icons`, needs librsvg).
- `benchmarks.ts` — promotes captured diagnostics runs to benchmark records and renders the README "Measured speed" section from `benchmarks/records.json` (see [Diagnostics](diagnostics.md)).

## Vendored decoder (`vendor/decimen-codec/`)

The compiled decode engine — a QR-only zxing-cpp build with a tracked fast
path, released separately as
[decimen-codec](https://github.com/bashalarmistalt/decimen-codec). The
artifacts self-identify (banner + `version()`/`build()` exports); licensing
in `NOTICE.md` alongside them.

Typechecking: `tsconfig.json` covers the pages and `shared/`; `tsconfig.node.json` covers `build/` and `vite.config.ts` (both run in `npm run build`).
