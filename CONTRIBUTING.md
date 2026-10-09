# Contributing

Pull requests are considered — selectively, and with a CLA. This is a small
project with a deliberately small surface and one maintainer, so two rules
keep it workable:

**Open an issue before writing code.** Small, focused fixes are the easiest
to take. Large features may be declined regardless of quality — reviewing
them properly costs more bandwidth than exists — so check first.

**Every merged contribution requires a signed CLA.** See [CLA.md](CLA.md)
(or [CLA-ENTITY.md](CLA-ENTITY.md) if you contribute on an employer's time —
your employer likely owns that code, so the company signs). The CLA bot
prompts on your first pull request; signing is a single comment.

Why the CLA, plainly: this project is dual-licensed. It is AGPL-3.0-or-later
for everyone, and commercial licenses are available to organizations that
can't use the AGPL — that's the funding model. Commercial and Entity-CLA
contact: <bashalarmistcontact@gmail.com>. The model only works if the
maintainer holds relicensing rights to every line. The CLA keeps your
copyright, and it contains a binding promise in return: your contribution
always remains available under the AGPL.

## What else is welcome

**Bug reports**, especially device/browser/camera combinations where the
receiver fails to decode. Include browser, OS, device model, and capture
resolution — screen-to-camera behavior varies enormously across hardware.

**Questions** about how it works. Open an issue.

**Forks.** AGPL-3.0-or-later. Build something better on top of it — just keep
it open under the same terms.

## Translations

The interface ships in thirteen languages; every non-English catalog was
machine-drafted and carries an on-page note saying so until a native speaker
reviews it. **Translation review is the single most useful small
contribution this project can take.** Reviewing a language means reading
`shared/i18n/locales/<code>.ts` against the English source (`en.ts`), fixing
what reads wrongly, and flipping that language's `reviewed` flag in
`shared/i18n/registry.ts` — one PR, and the note disappears. Adding a new
language is one catalog file plus a registry row; the exact steps are in
[docs/technical/localization.md](docs/technical/localization.md). Both are
code contributions like any other: open an issue first, and the CLA applies.

## Existing pull requests

[#2](https://github.com/bashalarmistalt/decimen-optical-transfer/pull/2)
predates this policy. Like every other PR, it needs a signed CLA before it
can merge — the CLA bot goes live when v0.4.0 lands on `main`; sign after
that (or comment `recheck` if you signed early and the check missed it).
