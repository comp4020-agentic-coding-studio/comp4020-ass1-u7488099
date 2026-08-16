# Preset melody sources, licenses, attribution

This project's Presets picker (`data-testid="editor-preset-*"` in
`src/pages/index.astro`, data in `src/lib/melodies.ts`) offers nine
preset melodies, each rendered natively under its own declared Source
Style. Every one is a real, citable, public-domain (or long-out-of-
copyright) melody, mechanically transcribed from a primary or clearly
sourced secondary reference rather than invented to fit a scale. This
file documents, for each preset: composer/attribution, the exact source
used, license status, original key/excerpt information, and any
rhythmic or scope simplification made.

Two scales this project supports as Source/Target styles -- **In Sen**
and **Melodic Minor (ascending)** -- have no preset here. A prior pass
would have filled those slots with project-authored "Study" phrases;
after review, those were removed rather than presented as if they were
real melodies. Both scales remain fully selectable in the editor's
Source/Target controls; only the preset picker omits them, since no
clean, unambiguous, easily-citable public-domain melody genuinely built
on either scale was found in the time available for this pass.

## Twinkle Twinkle Little Star -- Major

- **Attribution:** melody traditionally attributed to the French folk
  tune "Ah! vous dirai-je, maman" (18th century); English lyrics by
  Jane Taylor, 1806. Long public domain.
- **Transcription:** standard AABA form, do do sol sol la la sol | fa
  fa mi mi re re do | sol sol fa fa mi mi re | sol sol fa fa mi mi re |
  (A section repeats). Kept unchanged from the prior pass -- this
  melody's pitches/rhythm are unambiguous across every published
  source.

## Ode to Joy -- Major

- **Composer:** Ludwig van Beethoven, Symphony No. 9 (1824), "An die
  Freude" theme. Long public domain.
- **Source:** Mrs Peabody's Music Blog's beginner solfege
  transcription, cross-checked against the LilyPond score embedded in
  Wikipedia's "Ode to Joy" article.
- **Excerpt:** opening two phrases (mi mi fa sol | sol fa mi re | do do
  re mi | mi-re re, then repeated ending re do do).

## Mary Had a Little Lamb -- Major

- **Attribution:** traditional, melody commonly attributed to the tune
  underlying Sarah Josepha Hale's 1830 poem. Long public domain.
- **Transcription:** cross-checked across Hoffman Academy, Rockin'
  Rhythms, and Easy Piano Class beginner transcriptions, which agree:
  mi re do re | mi mi mi | re re re | mi sol sol | mi re do re mi mi mi
  mi | re re mi re do.

## Mo Li Hua / 茉莉花 (Jasmine Flower) -- Major Pentatonic

- **Attribution:** traditional Chinese folk melody, long public domain.
- **Source:** the LilyPond score embedded in Wikipedia's "Jasmine
  Flower" article.
- **Notes:** genuinely Major Pentatonic-sourced (do/re/mi/sol/la only --
  fa and ti never appear), unlike the Major-sourced presets above; this
  is what exercises this project's 5-note substitution and 5-to-7
  quantization paths rather than 7-to-7/7-to-5. The score's `\repeat
  volta 2` around the opening two measures is unfolded (played twice) in
  code rather than written out twice literally. Cultural framing: named
  and described by its music-theory scale (Major Pentatonic) first; any
  cultural association is stated as historical/associative context, per
  this project's no-cultural-essentialism rule, never as a claim that
  the scale alone makes the melody "sound Chinese."

## God Rest Ye Merry, Gentlemen -- Natural Minor

- **Attribution:** traditional English Christmas carol, long public
  domain.
- **Source:** the standard/London tune lineage (as printed in William
  Chappell's "Popular Music of the Olden Time," 1855), transcribed from
  the LilyPond source in Wikipedia's article on the carol.
- **Note on which tune:** this carol has two commonly-published tunes.
  This preset uses the standard/London tune, **not** the Cornish tune
  arranged by Gustav Holst (which is Dorian-sourced, not Natural
  Minor) -- using the Holst arrangement here would misrepresent the
  scale this preset claims to demonstrate.
- **Excerpt:** pickup note plus four bars (do do sol sol | fa me re do
  | te do re me | fa, dotted-half cadence). Stays within the natural
  (unaltered) 6th/7th throughout -- no raised 6th or 7th appears, which
  is exactly what distinguishes Natural Minor from Harmonic/Melodic
  Minor.

## Scarborough Fair -- Dorian

- **Attribution:** traditional English ballad, traced to "The Elfin
  Knight" (attested from the 17th century). Long public domain.
- **Source:** the LilyPond score embedded in Wikipedia's "Scarborough
  Fair (ballad)" article, explicitly headed `\key d \dorian` -- the
  commonly-used modern Dorian transcription, **not** the older
  Kidson/Sharp collected versions (which use a different mode/key and
  would misrepresent this preset's Dorian claim).
- **Excerpt:** the first twelve bars, extended in this pass from an
  earlier 4-bar fragment to a full phrase ending on a natural cadence
  ("...Remember me to one who lives there,"). Real durations kept from
  the source: dotted quarters, eighths, a genuine quarter rest at the
  start of bar 5 (present in the score, not invented), and the phrase-
  ending dotted-half/dotted-quarter holds -- not flattened to even
  quarter notes.
- **Transposition:** D Dorian in the original score is represented via
  this project's C-anchored scaleStep system (tonic always renders as
  C4); this is solely to serve the project's fixed-tonic comparison
  model, not a claim about the ballad's historical key.

## Why Fum'th in Fight (Tallis's Third Mode Melody) -- Phrygian

- **Composer:** Thomas Tallis, 1567, written for Archbishop Matthew
  Parker's metrical Psalter (Psalm 2, "Third Mode Melody"). Long public
  domain.
- **Source:** rhythm transcribed from the York Early Music Press critical
  edition of *Tunes from Archbishop Parker's Psalter (1567)* (ed. Benjamin
  Maloney, 2025), read directly off the rendered "Third Tune" score page
  (note values there: unstemmed diamond = whole note, stemmed diamond =
  half note, dotted stemmed diamond = dotted half). Pitches unchanged from
  the prior pass's cross-check against IMSLP/mfiles.co.uk/hymnary.org/CPDL.
- **Note on which piece:** this preset transcribes the historical Tudor
  psalm tune itself, **not** Ralph Vaughan Williams's later (1910)
  "Fantasia on a Theme by Thomas Tallis," which is a different,
  much-expanded orchestral work built on this melody.
- **Excerpt:** the opening couplet, in natural Phrygian (no key
  signature): a whole note on the first syllable, then even half notes
  throughout, with one dotted-half at the internal caesura ("...fight:").
  **Corrected in this pass:** an earlier version of this preset opened on
  a half note (too short) and had three invented "dotted-whole" (6-beat)
  cadences that don't appear anywhere in the source -- neither is a
  duration this project's convention even names (sixteenth through whole,
  0.25-4). The real tune is much more isometric than that: one long
  opening note, one genuine dotted-half caesura mid-couplet, and otherwise
  plain half notes straight through, phrase-ending length included. This
  couplet doesn't happen to touch the do-ra half-step (Phrygian's
  signature color, the minor 2nd above the tonic) -- that interval
  appears later in the full tune, outside this excerpt.
- **Open question:** the source score shows a rest mark after the
  couplet's final note, before the next line of text begins, but its
  exact value (half rest vs. whole rest) wasn't confirmed with full
  confidence from the rendered image alone. Since this preset's excerpt
  ends there anyway (playback has nothing to continue into), no trailing
  rest was added -- there's no audible difference between "note ends,
  rest, then playback stops" and "note ends, then playback stops." If a
  future pass extends this excerpt further into the tune, that rest's
  exact length should be pinned down first.

## Hava Nagila -- Hijaz

- **Attribution:** traditional; melody traced to a 19th-century
  Sadigurer Chasidic niggun. The bare melodic shape used here is public
  domain, though the specific 1918 Abraham Zvi Idelsohn
  arrangement/lyrics carry some separate authorship history not relied
  on for this instrumental-pitch transcription.
- **Source:** two excerpts cross-checked against multiple published
  lead-sheet transcriptions: the main theme, and the faster "Uru uru"
  dance-riff section that follows it.
- **Corrected from a prior pass:** an earlier version of this preset
  used an 8-note fragment with flattened, even-quarter rhythm and
  approximate pitches. This pass replaces it with the fuller two-
  excerpt transcription (36 events across 6 measures), including the
  dotted-quarter/eighth figures of the main theme and the dotted-
  eighth/sixteenth figures of the dance riff.
- **Honesty note:** represented through this project's simplified
  12-TET Hijaz/Freygish-related pitch collection. This is **not** a
  claim to model an entire maqam tradition, which involves microtonal
  pitch inflections a fixed 12-note equal-tempered scale can't carry --
  named and described by its music-theory scale (Hijaz) first, per this
  project's no-cultural-essentialism rule.

## Prelude in D minor, BWV 999 -- Harmonic Minor

- **Composer:** Johann Sebastian Bach. Long public domain.
- **Source:** the Mutopia Project's public-domain (CC0) plain-text
  LilyPond edition.
- **Excerpt:** measures 1-6 only -- stops before the piece's later
  modulation, which would take it outside a single fixed Harmonic Minor
  reading.
- **Notes:** continuous sixteenth-note arpeggiation with rests, three
  repeated two-bar patterns. Included specifically because it hits both
  the b6 and the raised 7th degree -- the augmented-second color that
  is Harmonic Minor's defining characteristic -- and because it gives
  the preset roster an instrumental/arpeggiated keyboard texture, distinct
  from the vocal/folk-melody character of the other eight presets.
- **Transposition:** D minor in the original is represented via this
  project's C-anchored scaleStep system, solely to serve the fixed-
  tonic comparison model, not a claim about the piece's historical key.

## General notes

- All transpositions to this project's C-centered scaleStep
  representation exist only to serve the controlled-comparison model
  described in `CLAUDE.md` (fixed tonic, no transpose/key controls) --
  none of them are a claim about a piece's historical or canonical key.
- Where a source's rhythm was genuinely ambiguous across the references
  checked, durations were simplified to even note values and that
  simplification is stated in the code comment above the relevant
  `Melody` constant in `melodies.ts`. Where a source's rhythm was
  confirmed (Scarborough Fair, Hava Nagila, BWV 999), it is transcribed
  in full, including dotted values and rests, and is covered by golden
  exact-value tests in `src/lib/presets.test.ts` so it can't be silently
  re-flattened later.
