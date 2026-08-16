# Sample sources, licenses, attribution

This project bundles a small set of isolated single-note instrument
recordings under `src/assets/samples/`, used by `src/lib/sampler.ts` to
replace the previous fully-synthesized target-style timbres (see
`src/lib/timbres.ts`). Every source below was chosen because its license
clearly permits redistribution inside a bundled, deployed project like this
one. No file here is a hotlinked runtime fetch, a YouTube rip, a commercial
sample-library preview, or a chunk of a recorded melody repitched into
"notes" — every entry is an isolated instrument note (or, for the oud and
koto, a single continuous recording programmatically segmented into
isolated notes; see those sections).

Total bundled audio: **~12 MB** (`du -sh src/assets/samples`), well under the
"low tens of MB" budget for this assignment.

## Piano — Major, Natural Minor, Harmonic Minor, Melodic Minor (ascending), Dorian

- **Source:** Versilian Community Sample Library (VCSL), "Grand Piano
  (Steinway B)"
- **Project/creator:** Versilian Studios LLC, Christian Budde and
  contributors — VCSL is a community-maintained, fully public-domain sample
  library.
- **Page:** https://versilian-studios.com/vcsl/
- **License:** **CC0 1.0 Universal (Public Domain Dedication)**. VCSL's own
  license file states the entire library is dedicated to the public domain;
  no attribution is legally required.
- **Files used:** a small subset of the `Sus/` (sustain) folder's `vl3`
  (mid) velocity layer, one note roughly every minor third across the
  project's playable range (C3–C6-ish): `C3, D3, E3, Fs3, Gs3, As2, C4, D4,
  E4, Fs4, Gs4, As4, C5, D5, E5, Fs5, Gs5, As5, As6`. Trimmed/re-encoded from
  VCSL's much larger raw multisample files (see "Processing" below) — we do
  **not** bundle the full multisample library, only these ~18 notes.
- **Attribution:** not legally required (CC0), credited here anyway for
  transparency.

## Guitar — Phrygian

- **Source:** Discord-SFZ-GM-Bank, steel-string acoustic guitar patch
  (Martin HD-28, 2017 Vintage Series)
- **Creator:** Jeff Learman
- **Page:** https://github.com/JeffLearman/Discord-SFZ-GM-Bank (SFZ
  instrument bank built for public/community use)
- **License:** **CC0**, stated directly inline in the instrument's `.sfz`
  file header by the creator.
- **Files used:** a subset of isolated notes spanning roughly E2–B5:
  `E2, G2, Bb2, Db3, E3, G3, Bb3, Db4, E4, Ab4, B4, D5, F5, Ab5, B5`.
- **Attribution:** not legally required (CC0), credited here anyway for
  transparency.

## Dan Tranh (Vietnamese zither) — Major Pentatonic

- **Source:** Versilian Community Sample Library (VCSL), "Dan Tranh"
- **Project/creator:** Versilian Studios LLC and contributors (same library
  as the piano above).
- **Page:** https://versilian-studios.com/vcsl/
- **License:** **CC0 1.0 Universal (Public Domain Dedication)**.
- **Files used:** a subset of the `Normal/` playing-technique folder, one
  note roughly every minor third: `B1, Cs2, Ds2, Fs2, Gs2, B2, Cs3, Ds3,
  Fs3, Gs3, B3, Cs4, Ds4, Fs4, Gs4, B4`. Trimmed/re-encoded from VCSL's
  larger raw files (see "Processing" below).
- **Attribution:** not legally required (CC0), credited here anyway.
- **Honesty note (CLAUDE.md's no-cultural-essentialism rule):** this is a
  genuine substitution, not a guzheng recording. No isolated-note,
  clearly-licensed guzheng sample set was found in the time available; the
  dan tranh (a related Vietnamese zither, tuned/played similarly) is used
  as an honest, clearly-labeled stand-in. `timbres.ts`'s id (`dan-tranh`)
  and label ("Zither (dan tranh)") never call this a guzheng.

## Oud — Hijaz

- **Source:** Freesound.org, sound ID 160461
- **Page:** https://freesound.org/people/xserra/sounds/160461/ (part of the
  CompMusic / Freesound "oud" recordings collection)
- **License:** **Creative Commons CC0 1.0** (Freesound sound pages state
  the license per-upload; this recording is marked CC0).
- **Processing:** the source is one continuous recording of multiple
  sustained oud notes, not pre-segmented individual files. We ran a
  one-time offline pitch-detection/segmentation pass (not part of the
  shipped site — a build-time asset-prep step) to cut it into 17 isolated
  single-note clips and measure each clip's *actual* sounding frequency
  (which drifts a few cents from equal temperament in places — see
  `src/assets/samples/oud/manifest.json`, which records each clip's
  measured `freq` rather than relying on its nominal note name).
  `src/lib/sampler.ts#oudSamples()` reads that measured frequency directly
  for accurate `playbackRate` pitching.
- **Files used:** all 17 segmented clips, spanning roughly D2–F4.
- **Attribution:** not legally required (CC0), credited here anyway.

## Koto — In Sen

- **Source:** Freesound.org, sound ID 528744, "Analog Koto 1 Stereo C2-C6"
- **Creator:** Vanyamba
- **Page:** https://freesound.org/people/Vanyamba/sounds/528744/ (part of
  Vanyamba's "QuickSampler" pack)
- **License:** **Creative Commons CC0 1.0** (stated directly on the sound's
  Freesound page).
- **What was actually recorded:** the sound's own description states these
  are "Stereo analog koto notes from C2 to C6 recorded with analog
  synthesizer" — i.e. this is a koto patch played on an analog synthesizer,
  not a mic'd acoustic koto. Per CLAUDE.md's no-cultural-essentialism rule,
  this is stated honestly rather than implied otherwise: `timbres.ts`'s
  label for this timbre is `"Koto (analog synth)"`, not a claim to a
  traditional acoustic 13-string koto.
- **Processing:** like the oud, the source is one continuous recording (a
  single ~6.5-minute ascending chromatic run, C2 to C6) rather than
  pre-segmented files. A one-time offline pass (onset detection via
  short-time RMS envelope, followed by narrow-band autocorrelation pitch
  detection centered on each note's expected chromatic-step frequency, to
  avoid octave errors) segmented it into 49 isolated single notes and
  measured each one's actual sounding frequency (a consistent ~20–25 cents
  flat across the whole recording — a fixed tuning characteristic of the
  source, not per-note drift). See `src/assets/samples/koto/manifest.json`,
  which records each clip's measured `freq`; `src/lib/sampler.ts`'s shared
  `samplesFromManifest()` helper (also used by the oud) reads it directly
  for accurate `playbackRate` pitching.
- **Files used:** 13 of the 49 segmented notes, one roughly every minor
  third spanning this project's expanded C3–C6 editor range: `C3, Ds3, Fs3,
  A3, C4, Ds4, Fs4, A4, C5, Ds5, Fs5, A5, C6`. Each clip was peak-normalized
  to 0.9 during extraction (compensated for via `timbres.ts`'s `peakGain`
  multiplier for this instrument, so it doesn't jump in loudness relative to
  the other 4 real-sample instruments, which keep their natural recording
  level).
- **Attribution:** not legally required (CC0), credited here anyway for
  transparency.

## Processing notes (all instruments)

- Raw VCSL piano/dan tranh files and the oud source recording were
  trimmed to their sounding note (removing excess silence) and re-encoded
  as compact WAV files to keep the final bundle small, using a one-time
  local Playwright/Web-Audio script — not a runtime dependency of the
  shipped site.
- Per-instrument loudness was measured (peak sample amplitude on one
  representative note each) and corrected in `timbres.ts` via a linear
  `peakGain` multiplier per instrument, so switching Target style doesn't
  jump in perceived loudness across very differently-recorded sources. See
  `timbres.ts`'s comment above the `TIMBRES` registry for the exact
  measured values and chosen multipliers.
