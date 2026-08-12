// Scale-degree remapping: the melody's shape (which diatonic letter-step each
// note sits on, relative to the tonic) stays fixed; only the semitone each
// step maps to changes with the scale. This is what keeps the comparison
// controlled — rhythm and note count come from the caller untouched, and the
// tonic (scale degree 0) always maps back to itself by construction.

const NATURAL_SEMITONE: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const LETTER_ORDER = ["C", "D", "E", "F", "G", "A", "B"];
const CHROMATIC_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

const SCALE_INTERVALS: Record<string, number[]> = {
  Major: [0, 2, 4, 5, 7, 9, 11],
  "Natural Minor": [0, 2, 3, 5, 7, 8, 10],
  Hijaz: [0, 1, 4, 5, 7, 8, 10],
};

interface ParsedNote {
  letter: string;
  accidental: "" | "#" | "b";
  octave: number;
}

function parseNote(note: string): ParsedNote {
  const match = note.match(/^([A-G])(#|b)?(-?\d+)$/);
  if (!match) throw new Error(`unparseable note name: "${note}"`);
  const [, letter, accidental, octaveStr] = match;
  return { letter, accidental: (accidental ?? "") as ParsedNote["accidental"], octave: Number(octaveStr) };
}

function noteToSemitone(note: ParsedNote): number {
  const offset = note.accidental === "#" ? 1 : note.accidental === "b" ? -1 : 0;
  return note.octave * 12 + NATURAL_SEMITONE[note.letter] + offset;
}

function semitoneToNoteName(semitone: number): string {
  const octave = Math.floor(semitone / 12);
  const pitchClass = ((semitone % 12) + 12) % 12;
  return `${CHROMATIC_NAMES[pitchClass]}${octave}`;
}

// Diatonic letter-distance from the tonic, unwrapped across octaves — degree
// is this mod 7 (which scale step), octaveShift is this div 7 (how many
// octaves above/below the tonic's octave that step lands in). Only the
// letter matters here, not any accidental on the input note: contour is
// about which step of the original melody's scale a note occupies, not its
// exact chromatic pitch.
function diatonicIndex(note: ParsedNote, tonic: ParsedNote): number {
  const letterDelta = LETTER_ORDER.indexOf(note.letter) - LETTER_ORDER.indexOf(tonic.letter);
  return (note.octave - tonic.octave) * 7 + letterDelta;
}

export function transformMelody(notes: string[], scaleName: string): string[] {
  const intervals = SCALE_INTERVALS[scaleName];
  if (!intervals) throw new Error(`unknown scale: "${scaleName}"`);
  if (notes.length === 0) return [];

  const tonic = parseNote(notes[0]);
  const tonicSemitone = noteToSemitone(tonic);

  return notes.map((rawNote) => {
    const note = parseNote(rawNote);
    const index = diatonicIndex(note, tonic);
    const degree = ((index % 7) + 7) % 7;
    const octaveShift = Math.floor(index / 7);
    return semitoneToNoteName(tonicSemitone + intervals[degree] + 12 * octaveShift);
  });
}
