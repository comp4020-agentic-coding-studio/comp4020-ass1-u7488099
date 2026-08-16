# Process

## What I built

I built **One Melody, Many Worlds**, an interactive music explainer that lets users hear and see how the same melody changes when it is mapped between different musical scales and traditions. It started as a fairly simple idea where the user would choose a preset melody and a target scale, but it gradually became a much more interactive tool. The final version includes presets from different musical traditions, source-to-target scale transformation, a polyphonic piano-roll editor, sampled instruments, playback, a live keyboard and waveform, and visual themes that change with the selected musical style.

## Moment 1 — The transformation was technically correct, but sounded wrong

My first approach to transforming between scales relied heavily on nearest-note quantisation. It passed the tests and produced valid notes, but when I actually listened to melodies such as Mo Li Hua, repeated notes would sometimes wobble between different pitches. Instead of adding special cases for individual melodies, I changed the architecture so transformations between five-note and seven-note scales go through a canonical Major Pentatonic/Major bridge. This made the lossy part of the transformation explicit and kept the rest of the mapping deterministic. I added regression tests for repeated notes and manually listened to Mo Li Hua under several target scales to verify that the repeated notes remained stable.

[`353c569`](https://github.com/comp4020-agentic-coding-studio/comp4020-ass1-u7488099/commit/353c569989eedc4705c113174b3e122a9094a209)

## Moment 2 — The editor passed tests but looked completely broken

When I first built the piano-roll editor, automated checks said that clicking and dragging were changing the composition correctly. When I opened the site myself, however, clicking appeared to do nothing. The problem turned out not to be the editor state at all. Astro's scoped CSS was not applying to grid elements created dynamically with `document.createElement()`, so the notes existed but were visually indistinguishable from empty cells. I moved the dynamically-created grid styles into a global style block rather than rewriting the interaction system. I then changed the browser verification to check actual computed colours and element dimensions instead of only checking classes and state. This was a useful reminder that passing functional tests does not necessarily mean the interface actually works for a user.

[`81ac9d7`](https://github.com/comp4020-agentic-coding-studio/comp4020-ass1-u7488099/commit/81ac9d72c01c05e01a9739213f6ea191fe5bfc47)

## Moment 3 — Supporting chords changed the data model

I originally considered a monophonic editor, but I decided that a music editor should allow multiple notes at the same time. The existing sequential `MelodyEvent[]` representation could not represent this cleanly. Rather than adding exceptions to it, I introduced a separate composition model where every note has an explicit pitch, start step and length. Playback was also generalised from a shared time cursor to explicitly timed playback events. This allowed chords, overlapping notes and silence without introducing a special rest object into the editor. I tested simultaneous notes, overlapping durations and Stop behaviour, then manually tested creating chords in the piano roll.

[`e75d8b7`](https://github.com/comp4020-agentic-coding-studio/comp4020-ass1-u7488099/commit/e75d8b767df932cf802c93e23c792f41a6e9ebea)

## Moment 4 — Passing tests was not the same as sounding good

One of the biggest lessons came from the instruments. I initially used Web Audio oscillators to synthesise different timbres for each musical style. Structurally it worked, the tests passed, and every style produced a different sound, but when I listened to it the result sounded bad. Instead of accepting something because it was technically correct, I replaced most of the synthesised instruments with appropriately licensed samples such as piano, guitar, oud and Asian plucked-string instruments. I added lazy loading and caching, documented the sources and licences, and kept the samples going through the existing analyser and playback architecture. This was probably the clearest example in the project where manually experiencing the product mattered more than another automated test.

[`f0b7fad`](https://github.com/comp4020-agentic-coding-studio/comp4020-ass1-u7488099/commit/f0b7fadeafb8bfb94382a8b05b0cd1110d20dd72)
