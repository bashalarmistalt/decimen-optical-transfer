# Diagnostics

Two separate things share the name:

- **Live diagnostics panel** — the collapsible capture/decode fps, goodput,
  frames, and K readout in the receiver UI. Always shipped; documented in
  [Receiving](../user/receiving.md).
- **The diagnostics run rig** (`npm run diagnostics`) — a dev-server mode
  that turns every completed transfer into one structured JSON report in
  your terminal, so A/B tuning runs are comparable without squinting at a
  phone. This page is about the rig.

## Running it

```bash
npm run diagnostics    # vite --mode diagnostics
```

The mode loads `.env.diagnostics` (`VITE_DIAGNOSTICS=1`). Open the sender
and receiver from this dev server as usual, run a transfer, and the report
prints in the terminal when the transfer completes.

## Never ships — and why that's structural

Client-side reporting sits behind
`import.meta.env.DEV && import.meta.env.VITE_DIAGNOSTICS === "1"`.
`DEV` is statically false in every build, so the whole branch is compiled
out of the static site, the GitHub Pages deploy, and the standalone files —
the guard is load-bearing, not cosmetic. The server half
(`build/diagnostics-endpoint.ts`) is `apply: "serve"`, so it exists only in
the dev server. Neither half can leak into anything a user runs.

## What gets reported

All reports POST to `/__diagnostics` and carry a `sessionId`; the stream's
session id is what pairs a sender's announcement with the receiver's
end-of-run report in the log.

**Sender — stream announcement** (`role: "sender"`, on stream start): the
knobs that produced the stream — payload name/size, container and
transmitted bytes, tx settings. The receiver only ever learns `k` and
`blockLen` from the wire, never the settings that produced them; this is
how the log knows what was actually being tested.

**Sender — stall events** (`event: "stall"`): emitted when the display loop
froze for >1 s (window hidden/backgrounded), with the stall duration. A bad
receiver run with sender stalls in the log is the sender's fault.

**Receiver — run report** (`role: "receiver"`, one per completed transfer,
sent from `finish()` while camera settings and pool size are still real):

- **Outcome**: `ok` (hash verified), `seconds`, `acquisitionSeconds`
  (camera start → first decode), `payloadBytes`, `goodputKBs`.
- **Fountain**: `k`, `blockLen`, `framesNew/Dup/Redundant`, `overhead`,
  `usefulOverhead`, `seqSpan`, `catchRate`. The attribution logic: `seqSpan`
  is what the sender emitted while we watched; parsed frames over that span
  is the **catch rate**. Low catch rate → the receiver missed displayed
  frames (capacity or tracking). High overhead *with* a high catch rate →
  blame the fountain, not the pipeline.
- **Pipeline**: captures, drops from a busy pool, crops vs full scans,
  downscaled crop/full-scan counts, decodes,
  `trackedAttempts`/`trackedDecodes` (hits/attempts is the
  decimen-codec fast path's real hit rate — zero attempts means the
  quad/dim plumbing broke, not the decoder), `resyncs` and machine-readable
  `resyncReasons`, `zeroRegionMs`/`degradedMs`
  (time spent with tracking collapsed / below the expected code count).
- **Environment**: worker count, requested vs actual camera settings,
  probed camera capabilities, device cores and UA.
- **Timeline**: one sample per 500 ms stats tick — elapsed, new frames,
  solved blocks, live regions, capture fps, decode fps (capped at 10 min).
  Run totals can't show *where* a run went bad; the timeline is the shape
  of the failure — when tracking collapsed, when it stalled.

## Reading a bad run

1. Sender stalls in the log? Sender-side; fix the environment first.
2. `catchRate` low? The receiver missed frames: check `capturesDroppedPoolBusy`
   (pool too small / frames too big), `zeroRegionMs`/`degradedMs` (tracking
   lost the codes), and capture fps in the timeline.
3. `catchRate` high but `overhead` high? Fountain-side: check
   `framesRedundant` and `usefulOverhead`.
4. `trackedDecodes/trackedAttempts` low? The fast path is missing — camera
   drift or quad quality; the crop pipeline is falling back to full decodes.
5. `resyncs > 0`? A completed assembly failed FNV, container parsing, or
   SHA-256 verification. The receiver replaced the spent fountain decoder and
   kept capturing the same stream; inspect `resyncReasons` before blaming the
   fountain.

## Benchmark records

Records are only meaningful if every run measures the same thing, so there
is a **canonical payload**: `public/benchmark.png`, exactly 1 MiB, its
sha-256 pinned in `benchmarks/records.json`. Regenerating that file breaks
comparability — don't.

```bash
npm run benchmark    # dev server, capture on, sender locked to the payload
```

Benchmark mode presets the sender to 4 codes (2×2); the sender's stream
announcement records the actual settings, and the promoted record carries
the receiver's observed code count — a record always says how many codes
it was set with.

Run the transfer as many times as you like; every report the rig receives
is stamped (`_meta`: app version, receipt time) and saved to the gitignored
`scratch/diagnostics-runs/`. Then:

```bash
npm run benchmark:promote
```

No arguments. Promotion scans the captured runs, keeps only successful
transfers of the canonical payload (checked via the container's embedded
file digest, `payloadSha256`), and groups the survivors by device-pair
category ("desktop → phone", "phone → phone", …) derived from the device
registry's types. **A category's record is one run** — the best
whole-transfer goodput wins, and the peak column is that same run's best
≥1 s timeline window — so every table row describes a single transfer with
a single receipt, by construction. Whatever beats its category's record is
taken; a specific run file can still be passed explicitly.

For each record taken, promote asks which hardware was on each end —
pick from the device registry (gitignored `scratch/benchmark-devices.json`,
remembered per user agent so the usual pair is a double-Enter) or type a
new label plus notes (model numbers). UAs alone can't name hardware —
every iPhone says just "iPhone", and the sender's UA says nothing about
the emitting display, which is half the optical channel. The chosen labels
and notes are committed with the record; non-interactive runs fall back to
the remembered mapping or a UA guess.

Each taken record copies its full report to `benchmarks/runs/` as the
receipt and updates `benchmarks/records.json` (the authoritative file —
the README badge reads it directly), then regenerates the README's
"Measured speed" section (`npm run benchmark:readme` re-renders it on its
own; CI diffs the regenerated section so prose can never drift from the
data). Records are declared by a human, never auto-committed — the rig
measures, you decide when to promote.
