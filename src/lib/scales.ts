// Scale-degree remapping: a melody's shape (which scaleStep each note sits
// on, relative to the tonic, in the melody's declared sourceScale) stays
// fixed; only the semitone each step maps to changes with the target scale.
// This is what keeps the comparison controlled -- rhythm and note count
// come from the caller untouched, and the tonic (scale step 0) always maps
// back to itself by construction. See transform.ts for the dispatcher that
// picks this substitution family over quantize.ts's nearest-pitch family.

import type { Melody } from "./melodies.ts";

const NATURAL_SEMITONE: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const CHROMATIC_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

interface ParsedNote {
  letter: string;
  accidental: "" | "#" | "b";
  octave: number;
}

// Exported alongside SCALES so quantize.ts's nearest-note family can share
// the same note parsing/naming instead of duplicating it.
export function parseNote(note: string): ParsedNote {
  const match = note.match(/^([A-G])(#|b)?(-?\d+)$/);
  if (!match) throw new Error(`unparseable note name: "${note}"`);
  const [, letter, accidental, octaveStr] = match;
  return { letter, accidental: (accidental ?? "") as ParsedNote["accidental"], octave: Number(octaveStr) };
}

export function noteToSemitone(note: ParsedNote): number {
  const offset = note.accidental === "#" ? 1 : note.accidental === "b" ? -1 : 0;
  return note.octave * 12 + NATURAL_SEMITONE[note.letter] + offset;
}

export function semitoneToNoteName(semitone: number): string {
  const octave = Math.floor(semitone / 12);
  const pitchClass = ((semitone % 12) + 12) % 12;
  return `${CHROMATIC_NAMES[pitchClass]}${octave}`;
}

// A single catalog spanning every scale either transform family uses, keyed
// by name, valued by ascending semitone offsets from the tonic. Cardinality
// (SCALES[name].length) is what transform.ts's dispatcher compares to
// choose substitution vs. quantization -- there's no separate "which family
// is this scale for" list anywhere.
//
// Melodic Minor is defined using its ascending form only (raised 6th and
// 7th). Traditionally the scale differs ascending vs descending, but
// substituteDegrees has no notion of melodic direction -- this is a
// documented simplification (the same one modern jazz theory makes with the
// "jazz minor scale"), not the full traditional definition.
export const SCALES: Record<string, number[]> = {
  Major: [0, 2, 4, 5, 7, 9, 11],
  "Natural Minor": [0, 2, 3, 5, 7, 8, 10],
  "Harmonic Minor": [0, 2, 3, 5, 7, 8, 11],
  "Melodic Minor (ascending)": [0, 2, 3, 5, 7, 9, 11],
  Dorian: [0, 2, 3, 5, 7, 9, 10],
  Phrygian: [0, 1, 3, 5, 7, 8, 10],
  Hijaz: [0, 1, 4, 5, 7, 8, 10],
  "Major Pentatonic": [0, 2, 4, 7, 9],
  "Minor Pentatonic": [0, 3, 5, 7, 10],
  "In Sen": [0, 1, 5, 7, 10],
  "Chromatic / Free": [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
};

// Degree-preserving substitution against a melody's own recorded scaleStep
// (signed, octave-aware) rather than a letter distance inferred from
// notes[0]. Requires equal cardinality between melody.sourceScale and
// targetScaleName; transform.ts is what enforces that by choosing this
// function only when cardinalities match.
export function substituteDegrees(melody: Melody, targetScaleName: string): string[] {
  const targetIntervals = SCALES[targetScaleName];
  if (!targetIntervals) throw new Error(`unknown scale: "${targetScaleName}"`);
  const tonicSemitone = noteToSemitone(parseNote(melody.tonic));
  const cardinality = targetIntervals.length;

  return melody.notes.map(({ scaleStep }) => {
    const degree = ((scaleStep % cardinality) + cardinality) % cardinality;
    const octaveShift = Math.floor(scaleStep / cardinality);
    return semitoneToNoteName(tonicSemitone + targetIntervals[degree] + 12 * octaveShift);
  });
}
