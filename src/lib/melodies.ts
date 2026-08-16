// Melody data, kept separate from the transform engine (scales.ts,
// quantize.ts, transform.ts) and from any one test's fixture. Each note
// records its scaleStep -- a signed, octave-aware step relative to the
// melody's tonic in its own sourceScale -- rather than an absolute pitch:
// the transform engine derives every pitch from scaleStep, tonic, and
// sourceScale/targetScale, so nothing needs to be inferred from letter
// names. duration is rhythm data the eventual UI/audio layer needs but
// nothing here uses yet.

export interface MelodyNote {
  type: "note";
  scaleStep: number; // signed, octave-aware step relative to the tonic in sourceScale; 0 = tonic
  duration: number; // beats: 1 = quarter note, 2 = half note
}

export interface MelodyRest {
  type: "rest";
  duration: number; // beats, same units as MelodyNote.duration
}

export type MelodyEvent = MelodyNote | MelodyRest;

export function isRest(event: MelodyEvent): event is MelodyRest {
  return event.type === "rest";
}

// Sentinel used wherever a rest is rendered into a pitch-name string[]
// (substituteDegrees/quantizeToScale/transformMelody output). Can never
// collide with a real note name -- note names always start with A-G.
export const RENDERED_REST = "rest";

export interface Melody {
  name: string;
  tonic: string; // absolute anchor note, e.g. "C4" -- scaleStep 0 always renders as this
  sourceScale: string; // key into scales.ts's SCALES -- the melody's genuine home scale
  notes: MelodyEvent[];
}

const n = (scaleStep: number, duration: number): MelodyNote => ({ type: "note", scaleStep, duration });
export const r = (duration: number): MelodyRest => ({ type: "rest", duration });

// Standard 12-measure AABA form in 4/4, tonic-first. Covers do/re/mi/fa/sol/la
// (never ti) -- in particular re and mi, the two degrees where Hijaz and
// Natural Minor respectively diverge from Major, appear repeatedly rather
// than once. A prior 7-note excerpt ("do do sol sol la la sol") only touched
// do/sol/la and made Hijaz sound identical to Natural Minor; this is the fix.
const A_SECTION: MelodyNote[] = [
  n(0, 1), n(0, 1), n(4, 1), n(4, 1),
  n(5, 1), n(5, 1), n(4, 2),
  n(3, 1), n(3, 1), n(2, 1), n(2, 1),
  n(1, 1), n(1, 1), n(0, 2),
];

const B_SECTION: MelodyNote[] = [
  n(4, 1), n(4, 1), n(3, 1), n(3, 1),
  n(2, 1), n(2, 1), n(1, 2),
  n(4, 1), n(4, 1), n(3, 1), n(3, 1),
  n(2, 1), n(2, 1), n(1, 2),
];

export const TWINKLE_TWINKLE: Melody = {
  name: "Twinkle Twinkle Little Star",
  tonic: "C4",
  sourceScale: "Major",
  notes: [...A_SECTION, ...B_SECTION, ...A_SECTION],
};

// Joy to the World's opening phrase ("Joy to the world, the Lord is come"):
// a stepwise descending scale, do-ti-la-sol-fa-mi-re-do, touching every one
// of the seven scale degrees exactly once. Twinkle never uses ti, so it can't
// distinguish scales that differ only there (Harmonic Minor from Natural
// Minor, Dorian from Melodic Minor); this phrase exists to make those pairs
// audibly different. Public-domain hymn tune ("Antioch", 1848 Lowell Mason
// arrangement, melodic material attributed to Handel). The rhythm here is a
// simplified, documented choice -- hymnals vary slightly on it -- what this
// prototype needs is the exact descending degree sequence, not liturgical
// rhythmic fidelity.
//
// The tonic is anchored an octave below the phrase's opening note (C4, not
// C5): the phrase starts on "do" an octave up (scaleStep 7) and descends to
// the tonic itself (scaleStep 0), which is the natural reading of "do-ti-la
// -sol-fa-mi-re-do" as a descent, and lets scaleStep carry that octave
// relationship explicitly instead of leaving it implicit in which note
// happens to come first.
//
// Retained as a test fixture only -- NOT one of the picker's presets. As an
// isolated 8-note excerpt it doesn't stand alone as satisfying listening
// material, but scales.test.ts's cross-scale distinctness check has no other
// melody that touches ti, so removing the data here would silently drop that
// coverage. scales.test.ts and composition.test.ts both import it by name.
const JOY_TO_THE_WORLD_PHRASE: MelodyNote[] = [
  n(7, 1),
  n(6, 1),
  n(5, 1),
  n(4, 1),
  n(3, 1),
  n(2, 1),
  n(1, 1),
  n(0, 2),
];

export const JOY_TO_THE_WORLD: Melody = {
  name: "Joy to the World (opening phrase)",
  tonic: "C4",
  sourceScale: "Major",
  notes: JOY_TO_THE_WORLD_PHRASE,
};

// Mo Li Hua (茉莉花, "Jasmine Flower"), transcribed from the LilyPond source
// on Wikipedia's "Jasmine Flower" article. Source scale is Major Pentatonic
// (do/re/mi/sol/la only -- fa and ti never appear), unlike Twinkle/Joy which
// are Major-sourced -- this is what makes it the melody that exercises 5->5
// substitution and 5->7 quantization, rather than 7->7/7->5.
//
// The written score has a `\repeat volta 2` around the opening two measures;
// MO_LI_HUA_OPENING is that block, unfolded by spreading it twice below
// rather than writing it out twice literally. Two quarter rests (one per
// opening repeat, end of measure 2) and one final half rest (end of measure
// 12) are written explicitly with r(duration) rather than absorbed into the
// preceding note -- absorbing them would change the audible rhythm by
// turning silence into a sustained pitch.
const MO_LI_HUA_OPENING: MelodyEvent[] = [
  n(2, 1), n(2, 0.5), n(3, 0.5), n(4, 0.5), n(5, 0.5), n(5, 0.5),
  n(4, 0.5), n(3, 1), n(3, 0.5), n(4, 0.5), n(3, 1), r(1),
];

const MO_LI_HUA_BODY: MelodyEvent[] = [
  // Measure 3
  n(3, 1), n(3, 1), n(3, 1), n(2, 0.5), n(3, 0.5),
  // Measure 4
  n(4, 1), n(4, 1), n(3, 2),
  // Measure 5
  n(2, 1), n(1, 0.5), n(2, 0.5), n(3, 1), n(2, 0.5), n(1, 0.5),
  // Measure 6
  n(0, 1), n(0, 0.5), n(1, 0.5), n(0, 2),
  // Measure 7
  n(2, 0.5), n(1, 0.5), n(0, 0.5), n(2, 0.5), n(1, 1.5), n(2, 0.5),
  // Measure 8
  n(3, 1), n(4, 0.5), n(5, 0.5), n(3, 2),
  // Measure 9
  n(1, 1), n(2, 0.5), n(3, 0.5), n(1, 0.5), n(2, 0.5), n(0, 0.5), n(-1, 0.5),
  // Measure 10
  n(-2, 2), n(-1, 1), n(0, 1),
  // Measure 11
  n(1, 1.5), n(2, 0.5), n(0, 0.5), n(1, 0.5), n(0, 0.5), n(-1, 0.5),
  // Measure 12
  n(-2, 2), r(2),
];

export const MO_LI_HUA: Melody = {
  name: "Mo Li Hua (Jasmine Flower)",
  tonic: "C4",
  sourceScale: "Major Pentatonic",
  notes: [...MO_LI_HUA_OPENING, ...MO_LI_HUA_OPENING, ...MO_LI_HUA_BODY],
};

// Ode to Joy (Beethoven, Symphony No. 9, 1824), opening two phrases of the
// "An die Freude" theme. Transcribed from Mrs Peabody's Music Blog's
// beginner solfege transcription, cross-checked against the LilyPond score
// embedded in Wikipedia's "Ode to Joy" article: Mi Mi Fa Sol | Sol Fa Mi Re
// | Do Do Re Mi | Mi Re Re, then the same three measures again ending Re Do
// Do. Long public domain. Major-sourced.
const ODE_TO_JOY_OPENING: MelodyNote[] = [n(2, 1), n(2, 1), n(3, 1), n(4, 1), n(4, 1), n(3, 1), n(2, 1), n(1, 1), n(0, 1), n(0, 1), n(1, 1), n(2, 1)];

export const ODE_TO_JOY: Melody = {
  name: "Ode to Joy",
  tonic: "C4",
  sourceScale: "Major",
  notes: [...ODE_TO_JOY_OPENING, n(2, 1.5), n(1, 0.5), n(1, 2), ...ODE_TO_JOY_OPENING, n(1, 1.5), n(0, 0.5), n(0, 2)],
};

// Mary Had a Little Lamb, traditional (1830 Sarah Josepha Hale poem, long
// public domain). Transcription (Hoffman Academy / Rockin' Rhythms / Easy
// Piano Class all agree): Mi Re Do Re Mi Mi Mi | Re Re Re | Mi Sol Sol | Mi
// Re Do Re Mi Mi Mi Mi | Re Re Mi Re Do. Major-sourced.
export const MARY_HAD_A_LITTLE_LAMB: Melody = {
  name: "Mary Had a Little Lamb",
  tonic: "C4",
  sourceScale: "Major",
  notes: [
    n(2, 1), n(1, 1), n(0, 1), n(1, 1),
    n(2, 1), n(2, 1), n(2, 2),
    n(1, 1), n(1, 1), n(1, 2),
    n(2, 1), n(4, 1), n(4, 2),
    n(2, 1), n(1, 1), n(0, 1), n(1, 1),
    n(2, 1), n(2, 1), n(2, 1), n(2, 1),
    n(1, 1), n(1, 1), n(2, 1), n(1, 1),
    n(0, 4),
  ],
};

// Scarborough Fair, traditional English ballad (traced to "The Elfin
// Knight", attested from the 17th century; long public domain). Transcribed
// directly from the LilyPond source embedded in Wikipedia's "Scarborough
// Fair (ballad)" article (`\key d \dorian`), the commonly-used modern
// arrangement -- not the older Kidson/Sharp collected versions, which use a
// different mode/key. Full sequence: do do | sol-re'-sol-sol | re-mi-re do
// | (rest) sol te' | do' te' sol la fa | sol do' | do' do' | te' sol sol fa
// | mi, twelve bars ending on the natural phrase cadence at "...lives
// there," in D Dorian (degrees: 0=do,1=re,2=me,3=fa,4=sol,5=la,6=te,
// 7=do an octave up). Real durations (dotted quarters, eighths, one
// genuine quarter rest present in the source) are kept rather than
// flattened to even quarters. See PRESET_SOURCES.md for the full citation.
export const SCARBOROUGH_FAIR: Melody = {
  name: "Scarborough Fair",
  tonic: "C4",
  sourceScale: "Dorian",
  notes: [
    n(0, 2), n(0, 1),
    n(4, 0.5), n(4, 1.5), n(4, 1),
    n(1, 1.5), n(2, 0.5), n(1, 1),
    n(0, 3),
    r(1), n(4, 1), n(6, 1),
    n(7, 2), n(6, 1),
    n(4, 1), n(5, 1), n(3, 1),
    n(4, 2), n(7, 1),
    n(7, 2), n(7, 1),
    n(6, 2), n(4, 1),
    n(4, 1), n(3, 1), n(2, 1),
    n(1, 3),
  ],
};

// Hava Nagila, traditional (melody traced to a 19th-century Sadigurer
// Chasidic niggun; the bare melodic shape used here is public domain). Two
// excerpts transcribed and cross-checked against multiple published
// arrangements: the main theme (do do-re-mi re do | mi mi-sol fa mi fa |
// fa fa-la sol fa mi | re-do re do, in E Hijaz) and the faster "Uru uru"
// dance-riff section that follows it. Represented here through this
// project's simplified 12-TET Hijaz/Freygish-related pitch collection --
// not a claim to model an entire maqam tradition, which involves
// microtonal inflections this project's fixed 12-note scale can't carry.
// See PRESET_SOURCES.md for the full citation.
export const HAVA_NAGILA: Melody = {
  name: "Hava Nagila",
  tonic: "C4",
  sourceScale: "Hijaz",
  notes: [
    // Main theme
    n(0, 1), n(0, 1.5), n(2, 0.5), n(1, 0.5), n(0, 0.5),
    n(2, 1), n(2, 1.5), n(4, 0.5), n(3, 0.5), n(2, 0.5),
    n(3, 1), n(3, 1.5), n(5, 0.5), n(4, 0.5), n(3, 0.5), n(2, 1),
    n(1, 0.25), n(0, 0.25), n(1, 0.5), n(0, 2),
    // "Uru uru" dance riff
    n(3, 0.5), n(3, 0.5), n(5, 0.75), n(4, 0.25), n(3, 0.5),
    n(5, 0.5), n(4, 0.5), n(3, 0.5),
    n(4, 0.5), n(4, 0.5), n(6, 0.75), n(5, 0.25), n(4, 0.5),
    n(6, 0.5), n(5, 0.5), n(4, 0.5),
  ],
};

// God Rest Ye Merry, Gentlemen -- traditional English carol, long public
// domain. Transcribed from the standard/London tune lineage (Chappell
// 1855), not the Cornish/Holst-arranged Dorian variant that shares this
// title. Pickup note plus four bars, degrees 0=do,1=re,2=me,3=fa,4=sol,
// -1=te below the tonic: do do sol sol fa me re do te do re me fa (dotted
// half). Stays within the natural (unaltered) 6th/7th degrees throughout --
// exactly what distinguishes Natural Minor from Harmonic/Melodic Minor.
// See PRESET_SOURCES.md for the full citation.
export const GOD_REST_YE_MERRY_GENTLEMEN: Melody = {
  name: "God Rest Ye Merry, Gentlemen",
  tonic: "C4",
  sourceScale: "Natural Minor",
  notes: [
    n(0, 1), n(0, 1), n(4, 1), n(4, 1), n(3, 1), n(2, 1), n(1, 1), n(0, 1),
    n(-1, 1), n(0, 1), n(1, 1), n(2, 1), n(3, 1), n(4, 3),
  ],
};

// Why Fum'th in Fight -- Thomas Tallis's "Third Mode Melody" (1567, from
// Archbishop Parker's Psalter; long public domain). Uses the historical
// tune itself, not Vaughan Williams's later "Fantasia on a Theme by Thomas
// Tallis" arrangement. Rhythm transcribed from the York Early Music Press
// critical edition of Parker's Psalter (2025, ed. Benjamin Maloney), read
// directly off the rendered "Third Tune" score page: a whole note on the
// first syllable, then plain half notes throughout, with a single dotted-
// half at the internal caesura ("...fight:") -- not the mostly-even mix of
// half notes and invented dotted-whole cadences an earlier pass had here.
// Opening couplet, degrees 0=do,2=me,3=fa,4=sol,5=le, no key signature
// (natural Phrygian): do(whole) sol sol sol(dotted-half) sol fa fa sol sol
// sol sol sol le sol. This couplet doesn't touch the do-ra half step
// (Phrygian's signature color); that appears later in the full tune. See
// PRESET_SOURCES.md for the full citation.
export const WHY_FUMTH_IN_FIGHT: Melody = {
  name: "Why Fum'th in Fight (Tallis's Third Mode Melody)",
  tonic: "C4",
  sourceScale: "Phrygian",
  notes: [
    n(0, 4), n(2, 2), n(2, 2), n(2, 3), n(2, 2), n(3, 2), n(3, 2), n(4, 2),
    n(4, 2), n(4, 2), n(4, 2), n(4, 2), n(5, 2), n(4, 2),
  ],
};

// Prelude in D minor, BWV 999 (J.S. Bach), measures 1-6 -- stops before the
// piece's later modulation. Transcribed from the Mutopia Project's public-
// domain LilyPond edition. Continuous sixteenth-note arpeggiation with
// rests, three repeated two-bar patterns (degrees 0=do,1=re,3=fa,5=le,
// 6=raised-7): do-re-fa-re-do-re-do-(rest)-do-(rest)-do, then the same
// rhythm on fa-le-fa-do-fa-do-(rest)-do-(rest)-do, then on raised7-re-fa-
// re-raised7-re-raised7-(rest)-raised7-(rest)-raised7. Hits both the b6
// (le) and the raised 7th -- harmonic minor's characteristic augmented-
// second color -- and gives the preset roster an instrumental/keyboard
// texture rather than only vocal/folk melodies. See PRESET_SOURCES.md for
// the full citation.
const BWV_999_BAR_A: MelodyEvent[] = [
  r(0.25), n(0, 0.25), n(2, 0.25), n(4, 0.25), n(2, 0.25), n(0, 0.25),
  n(2, 0.25), n(0, 0.25), r(0.25), n(0, 0.25), r(0.25), n(0, 0.25),
];

const BWV_999_BAR_B: MelodyEvent[] = [
  r(0.25), n(0, 0.25), n(3, 0.25), n(5, 0.25), n(3, 0.25), n(0, 0.25),
  n(3, 0.25), n(0, 0.25), r(0.25), n(0, 0.25), r(0.25), n(0, 0.25),
];

const BWV_999_BAR_C: MelodyEvent[] = [
  r(0.25), n(6, 0.25), n(1, 0.25), n(3, 0.25), n(1, 0.25), n(6, 0.25),
  n(1, 0.25), n(6, 0.25), r(0.25), n(6, 0.25), r(0.25), n(6, 0.25),
];

export const BWV_999: Melody = {
  name: "Prelude in D minor, BWV 999 (J.S. Bach)",
  tonic: "C4",
  sourceScale: "Harmonic Minor",
  notes: [
    ...BWV_999_BAR_A, ...BWV_999_BAR_A,
    ...BWV_999_BAR_B, ...BWV_999_BAR_B,
    ...BWV_999_BAR_C, ...BWV_999_BAR_C,
  ],
};
