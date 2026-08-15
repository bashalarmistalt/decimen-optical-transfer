# Wire versioning and compatibility

This is the format contract, independent of any one implementation. The web app
in this repo is the reference implementation; a native client (iOS, Android) is
correct when it agrees with [golden vectors](golden-vectors.md).

## The rule that produced this design

A silent failure is worse than a loud one, and versioning exists to buy the loud
one.

Decimen v1 → v2 spent a format break on a magic bump (`0x0C` → `0x0D`) and
bought no version field with it. A mismatched receiver returned null and showed
nothing, so "the sender is too old" looked exactly like bad lighting. That is
survivable for a web app, which reconverges on a service-worker refresh within
days of a release. It is not survivable once installed binaries are in the
field: those update on the user's schedule — weeks, or never — and a silent
break strands real installs with no way to tell the user why.

So from v3 on, **a receiver that cannot decode a Decimen frame must say which
of these is true**, and must be able to tell them apart from a QR code that was
never Decimen's:

| verdict | means | receiver behaviour |
|---|---|---|
| `ok` | decodable | decode |
| `foreign` | not a Decimen frame | **silent** — the camera sees every code in view |
| `older-sender` | Decimen, older format | "Update the sending device." |
| `newer-sender` | Decimen, newer format | "Update this app to receive it." |
| `unsupported-flags` | Decimen, feature we can't honour | "Update this app to receive it." |
| `malformed` | ours, but not self-consistent | **silent** — indistinguishable from a bad read |

`foreign` and `malformed` are silent on purpose. The receiver decodes every QR
code in the frame, including ones from shop windows and product packaging, and
narrating those would be noise. Worse, the message *latches* until a real frame
clears it, so a wrong guess stays on screen indefinitely.

## Header fields that carry the contract

```
0  u8  magic 0xD1   ┐ "is this ours at all"
1  u8  magic 0xC3   ┘ magic1 is fixed for every version from v3 on
2  u8  version      gates parsing wholesale
3  u8  flags        0x0F must-understand · 0xF0 safe to ignore
```

### Why two magic bytes

The magic must answer "is this ours" before any version is named, and one byte
cannot answer it well enough to speak. Gated on `0xD1` alone, ~1 binary QR
payload in 256 reaches the version branches and is told to update a device that
has never run Decimen. Over 500k random payloads the second magic byte moves
that from **0.402% to 0.006%** — and the residue is the two legacy markers,
which are supposed to speak.

`0x0C` and `0x0D` are reserved as magic1 values **forever**. They are how a
current receiver names a v1/v2 sender instead of shrugging at it. They are not
version numbers: v1 and v2 had no version field, and the bytes `01`/`02` have
never appeared in that position on the wire.

### Version

A `u8` at byte 2. `0` is reserved as "ours, but no such version" (→ `malformed`).
254 generations remain after v3; the point is not the ceiling but that the next
break is a *number*, not a break.

Bump `version` when the header layout changes, the fountain code changes, the
container changes, or anything else makes an old receiver's parse wrong rather
than merely incomplete.

### Flags

A `u8` at byte 3, split into two halves that behave differently:

- **`0x0F` — must-understand.** An unknown bit here is a hard reject with a
  message. Use for anything that changes how the payload must be interpreted.
  `FLAG_ENCRYPTED` (`0x01`) is reserved here so encrypted payloads cost a flag
  bit rather than wire v4.
- **`0xF0` — safe to ignore.** An unknown bit here is parsed straight through.
  Use for anything that *describes* a stream an older receiver still decodes
  correctly. `FLAG_COLOR_LAYERS` (`0x10`) marks an auxiliary QR carried in
  chroma; its luminance plane is still a complete ordinary stream, so an older
  receiver safely reads the primary frames at half the enhanced throughput.

**The split ships with the first versioned build because it cannot be added
later.** A receiver already told "every unknown bit is fatal" can only be
corrected by another format break — so declaring the ignorable half now is the
whole point, even though nothing sets those bits yet.

**Ignorable bits are excluded from stream identity.** If flipping one mid-stream
reset the decoder, it would discard every block recovered so far — strictly
worse than rejecting the frame, and proof the bit was never ignorable. Critical
bits *are* included: a change there is a genuinely different stream.

### No reserved byte

An earlier v3 draft carried a reserved byte at 3 and paid for it with magic1.
That had it backwards. A reserved byte only duplicates what a must-understand
flag bit already does, and four of those is more headroom than this format will
need; magic1 duplicates nothing. That draft also classified a nonzero reserved
byte as `malformed`, which is silent — so the one mechanism it was spent on
could never have been used without reintroducing the exact failure v3 exists to
abolish.

If a future field needs a byte, it takes trailing bytes behind a flag, or it
takes a version bump — which frees the whole header anyway.

## Release compatibility

**Wire v3 ships in Decimen 0.5.0.** It is not backward compatible: a transfer
between 0.4.x and 0.5.0 fails in both directions. Both ends must be on 0.5.0
or later.

Who says so depends on which end is newer, because the verdict machinery is
itself new in 0.5.0 (since 0.6.0 the verdict wording is localized: the
receiver says it in its own language, from the locale catalog — see
[localization](localization.md); `frameVerdictMessage()` in protocol.ts
remains the English reference wording, pinned to the catalog by test):

- **0.5.0 receiver, 0.4.x sender** — the receiver names the mismatch: "That
  screen is sending an older Decimen format. Update the sending device."
- **0.4.x receiver, 0.5.0 sender** — the old receiver predates the version
  field and stays **silent**; all the user sees is the no-signal hint. Nothing
  can retrofit deployed 0.4.x builds — this silence is exactly the failure v3
  exists to end, and 0.5.0 is the last release that can strand a receiver this
  way. From 0.5.0 on, every build names any Decimen format it cannot read, so
  a future break speaks on the receiving side no matter which end is older.

This is mostly invisible on [decimen.app](https://decimen.app/), which updates
itself. It is visible for:

- **Standalone files** — `decimen-sender.html` / `decimen-receiver.html` saved
  from an earlier release keep working with each other forever, but not with a
  0.5.0 peer — and whether anyone explains the failure follows the rule above:
  a 0.5.0 receiver names the old sender; a pre-0.5.0 receiver aimed at a 0.5.0
  sender just sits at "no signal". Re-download both.
- **Installed PWAs** that have not refreshed their service worker yet.

A version bump is a release-notes event. Say which side to update.

## History

| wire | byte 0 | byte 1 | header | releases | notes |
|---|---|---|---|---|---|
| v1 | `0xD1` | `0x0C` | 20 B | 0.1.0 – 0.3.0 | no version field |
| v2 | `0xD1` | `0x0D` | 20 B | 0.4.0 | systematic-carousel fountain; still no version field |
| v3 | `0xD1` | `0xC3` | 22 B | 0.5.0 | version + flags at bytes 2–3 |
