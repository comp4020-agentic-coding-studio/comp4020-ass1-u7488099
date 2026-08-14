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
