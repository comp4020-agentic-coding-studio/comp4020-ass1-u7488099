// Melody data, kept separate from the transform engine (scales.ts) and from
// any one test's fixture. `degree` and `duration` are recorded explicitly
// even though transformMelody only consumes `pitch` today — degree makes it
// legible which of the two scale-divergence points (re, mi; see CLAUDE.md's
// "Guaranteed scales" note) a melody actually exercises, and duration is
// rhythm data the eventual UI/audio layer will need but nothing here uses
// yet.

export interface MelodyNote {
  pitch: string; // absolute note name, e.g. "C4" — what transformMelody consumes
  degree: number; // scale degree relative to the tonic: do=0 re=1 mi=2 fa=3 sol=4 la=5 ti=6
  duration: number; // beats: 1 = quarter note, 2 = half note
}

export interface Melody {
  name: string;
  notes: MelodyNote[];
}

export function pitches(melody: Melody): string[] {
  return melody.notes.map((note) => note.pitch);
}

const n = (pitch: string, degree: number, duration: number): MelodyNote => ({ pitch, degree, duration });

// Standard 12-measure AABA form in 4/4, tonic-first. Covers do/re/mi/fa/sol/la
// (never ti) — in particular re and mi, the two degrees where Hijaz and
// Natural Minor respectively diverge from Major, appear repeatedly rather
// than once. A prior 7-note excerpt ("do do sol sol la la sol") only touched
// do/sol/la and made Hijaz sound identical to Natural Minor; this is the fix.
const A_SECTION: MelodyNote[] = [
  n("C4", 0, 1), n("C4", 0, 1), n("G4", 4, 1), n("G4", 4, 1),
  n("A4", 5, 1), n("A4", 5, 1), n("G4", 4, 2),
  n("F4", 3, 1), n("F4", 3, 1), n("E4", 2, 1), n("E4", 2, 1),
  n("D4", 1, 1), n("D4", 1, 1), n("C4", 0, 2),
];

const B_SECTION: MelodyNote[] = [
  n("G4", 4, 1), n("G4", 4, 1), n("F4", 3, 1), n("F4", 3, 1),
  n("E4", 2, 1), n("E4", 2, 1), n("D4", 1, 2),
  n("G4", 4, 1), n("G4", 4, 1), n("F4", 3, 1), n("F4", 3, 1),
  n("E4", 2, 1), n("E4", 2, 1), n("D4", 1, 2),
];

export const TWINKLE_TWINKLE: Melody = {
  name: "Twinkle Twinkle Little Star",
  notes: [...A_SECTION, ...B_SECTION, ...A_SECTION],
};
