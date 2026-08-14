# Color channel beta

The optional color channel carries two independent fountain frames in one QR
image. It is a beta because real display-to-camera color behavior cannot be
qualified by synthetic tests alone. The sender control is off by default.

## Compatibility contract

Each module combines a primary bit and an auxiliary bit:

| primary | auxiliary | displayed color |
|---|---|---|
| dark | light | black |
| dark | dark | blue |
| light | light | white |
| light | dark | yellow |

Weighted luminance keeps blue dark and yellow light. The primary plane is
therefore an ordinary QR containing a complete fountain stream. A receiver
without color support reads that stream normally. `FLAG_COLOR_LAYERS` is the
ignorable v3 flag `0x10`, so the flag does not reset or reject an older v3
receiver.

The primary plane retains consecutive fountain sequence IDs (`0, 1, 2, …`).
The auxiliary IDs live in a high, cycle-aligned range and map first to the
complementary half of the systematic sweep, then to repair frames. Interleaving
even and odd IDs between the planes is not compatible with the systematic
carousel: a primary-only receiver would permanently miss half of each sweep.

A color-aware receiver first decodes the primary QR with the normal image
pipeline. For flagged frames it reuses the reported corner quad and module
dimension to sample the chroma plane. Adaptive luminance, blue/black, and
yellow/white splits must all clear a confidence floor before the sampled matrix
is handed to decimen-codec `readMatrix`. Failure to recover the auxiliary plane
only drops that frame; primary decoding continues.

The codec prerequisite is decimen-codec `0.3.0-beta.1`, build `fa67f8d`, from
[decimen-codec PR #1](https://github.com/bashalarmistalt/decimen-codec/pull/1).

## Release gate

Do not enable the setting by default or call it stable until the following
matrix passes with the canonical 1 MiB benchmark payload and final SHA-256
verification:

- iOS Safari and Android Chrome receivers.
- OLED and LCD sending displays, including at least one desktop monitor.
- Low, medium, and maximum sending-screen brightness.
- Straight-on and approximately 25-degree viewing angles.
- Dim indoor, bright indoor, and daylight-adjacent ambient light.
- At least five repeated transfers per device/display condition.

Record `colorAuxAttempts`, `colorAuxDecodes`, total goodput, resyncs, and final
digest result through diagnostics. Every run must verify its digest. A device
pair qualifies only when auxiliary success is at least 90% of attempts and
median verified goodput improves by at least 50% over the same settings with
the color channel off. Any condition that regresses primary-only reliability
fails the gate.
