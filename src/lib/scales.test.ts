import { describe, expect, it } from "vitest";
import { JOY_TO_THE_WORLD, TWINKLE_TWINKLE } from "./melodies.ts";
import { substituteDegrees } from "./scales.ts";

// Encodes the "controlled comparison" rule from CLAUDE.md: switching scales
// must only change pitch, never rhythm, note count, or which absolute pitch
// the tonic (scaleStep 0) lands on. substituteDegrees(melody, scaleName) is
// yours to place/rename; update the import path above if it moves.

// Twinkle never uses ti, so it can't tell apart scales that only differ
// there (Harmonic Minor vs Natural Minor, Dorian vs Melodic Minor). Joy to
// the World's opening phrase is a descending scale that hits every degree
// exactly once, so pairwise-distinctness is checked against it instead.

const CORE_SCALES = [
  "Major",
  "Natural Minor",
  "Harmonic Minor",
  "Melodic Minor (ascending)",
  "Dorian",
  "Phrygian",
  "Hijaz",
];

// Semitone intervals from the tonic, duplicated here rather than imported so
// this test doesn't just restate whatever scales.ts happens to define.
const EXPECTED_INTERVALS: Record<string, number[]> = {
  Major: [0, 2, 4, 5, 7, 9, 11],
  "Natural Minor": [0, 2, 3, 5, 7, 8, 10],
  "Harmonic Minor": [0, 2, 3, 5, 7, 8, 11],
  "Melodic Minor (ascending)": [0, 2, 3, 5, 7, 9, 11],
  Dorian: [0, 2, 3, 5, 7, 9, 10],
  Phrygian: [0, 1, 3, 5, 7, 8, 10],
  Hijaz: [0, 1, 4, 5, 7, 8, 10],
};

const LETTER_SEMITONE: Record<string, number> = {
  C: 0,
  D: 2,
  E: 4,
  F: 5,
  G: 7,
  A: 9,
  B: 11,
};

function pitchClass(note: string): number {
  const match = note.match(/^([A-G])(#|b)?(-?\d+)$/);
  if (!match) throw new Error(`unparseable note name: "${note}"`);
  const [, letter, accidental] = match;
  const base = LETTER_SEMITONE[letter];
  const offset = accidental === "#" ? 1 : accidental === "b" ? -1 : 0;
  return ((base + offset) % 12 + 12) % 12;
}

// The index of the note whose scaleStep is 0 -- the tonic -- wherever it
// falls in the melody. Not assumed to be index 0: Joy to the World's tonic
// is its last note (index 7), not its first.
function tonicIndex(melody: typeof TWINKLE_TWINKLE): number {
  const index = melody.notes.findIndex((note) => note.type === "note" && note.scaleStep === 0);
  if (index === -1) throw new Error(`${melody.name} has no scaleStep-0 note`);
  return index;
}

// Captured from the pre-migration transformMelody(notes[], scaleName) --
// the byte-identical acceptance criteria for this rewrite. Twinkle's tonic
// was already C4 under the old model, so its output is unchanged; Joy's
// tonic moved from an implicit C5 to an explicit C4 (scaleStep 7 for the
// opening note), which reproduces the same absolute pitches.
const TWINKLE_GOLDEN: Record<string, string[]> = {
  Major: [
    "C4","C4","G4","G4","A4","A4","G4","F4","F4","E4","E4","D4","D4","C4",
    "G4","G4","F4","F4","E4","E4","D4","G4","G4","F4","F4","E4","E4","D4",
    "C4","C4","G4","G4","A4","A4","G4","F4","F4","E4","E4","D4","D4","C4",
  ],
  "Natural Minor": [
    "C4","C4","G4","G4","G#4","G#4","G4","F4","F4","D#4","D#4","D4","D4","C4",
    "G4","G4","F4","F4","D#4","D#4","D4","G4","G4","F4","F4","D#4","D#4","D4",
    "C4","C4","G4","G4","G#4","G#4","G4","F4","F4","D#4","D#4","D4","D4","C4",
  ],
  "Harmonic Minor": [
    "C4","C4","G4","G4","G#4","G#4","G4","F4","F4","D#4","D#4","D4","D4","C4",
    "G4","G4","F4","F4","D#4","D#4","D4","G4","G4","F4","F4","D#4","D#4","D4",
    "C4","C4","G4","G4","G#4","G#4","G4","F4","F4","D#4","D#4","D4","D4","C4",
  ],
  "Melodic Minor (ascending)": [
    "C4","C4","G4","G4","A4","A4","G4","F4","F4","D#4","D#4","D4","D4","C4",
    "G4","G4","F4","F4","D#4","D#4","D4","G4","G4","F4","F4","D#4","D#4","D4",
    "C4","C4","G4","G4","A4","A4","G4","F4","F4","D#4","D#4","D4","D4","C4",
  ],
  Dorian: [
    "C4","C4","G4","G4","A4","A4","G4","F4","F4","D#4","D#4","D4","D4","C4",
    "G4","G4","F4","F4","D#4","D#4","D4","G4","G4","F4","F4","D#4","D#4","D4",
    "C4","C4","G4","G4","A4","A4","G4","F4","F4","D#4","D#4","D4","D4","C4",
  ],
  Phrygian: [
    "C4","C4","G4","G4","G#4","G#4","G4","F4","F4","D#4","D#4","C#4","C#4","C4",
    "G4","G4","F4","F4","D#4","D#4","C#4","G4","G4","F4","F4","D#4","D#4","C#4",
    "C4","C4","G4","G4","G#4","G#4","G4","F4","F4","D#4","D#4","C#4","C#4","C4",
  ],
  Hijaz: [
    "C4","C4","G4","G4","G#4","G#4","G4","F4","F4","E4","E4","C#4","C#4","C4",
    "G4","G4","F4","F4","E4","E4","C#4","G4","G4","F4","F4","E4","E4","C#4",
    "C4","C4","G4","G4","G#4","G#4","G4","F4","F4","E4","E4","C#4","C#4","C4",
  ],
};

const JOY_GOLDEN: Record<string, string[]> = {
  Major: ["C5", "B4", "A4", "G4", "F4", "E4", "D4", "C4"],
  "Natural Minor": ["C5", "A#4", "G#4", "G4", "F4", "D#4", "D4", "C4"],
  "Harmonic Minor": ["C5", "B4", "G#4", "G4", "F4", "D#4", "D4", "C4"],
  "Melodic Minor (ascending)": ["C5", "B4", "A4", "G4", "F4", "D#4", "D4", "C4"],
  Dorian: ["C5", "A#4", "A4", "G4", "F4", "D#4", "D4", "C4"],
  Phrygian: ["C5", "A#4", "G#4", "G4", "F4", "D#4", "C#4", "C4"],
  Hijaz: ["C5", "A#4", "G#4", "G4", "F4", "E4", "C#4", "C4"],
};

describe("substituteDegrees", () => {
  it("is deterministic", () => {
    for (const scale of CORE_SCALES) {
      const a = substituteDegrees(JOY_TO_THE_WORLD, scale);
      const b = substituteDegrees(JOY_TO_THE_WORLD, scale);
      expect(a, scale).toEqual(b);
    }
  });

  it("preserves note count for every core scale", () => {
    for (const scale of CORE_SCALES) {
      expect(substituteDegrees(TWINKLE_TWINKLE, scale), scale).toHaveLength(TWINKLE_TWINKLE.notes.length);
      expect(substituteDegrees(JOY_TO_THE_WORLD, scale), scale).toHaveLength(JOY_TO_THE_WORLD.notes.length);
    }
  });

  it("keeps the tonic in place — the melody's scaleStep-0 note never moves", () => {
    // Every scale in SCALES maps degree 0 to interval 0 by definition, so
    // whichever note carries scaleStep 0 must land on the same absolute
    // pitch regardless of target scale -- checked at that note's actual
    // array position, not assumed to be index 0 (Joy's tonic is index 7).
    for (const melody of [TWINKLE_TWINKLE, JOY_TO_THE_WORLD]) {
      const i = tonicIndex(melody);
      const tonicPitches = CORE_SCALES.map((scale) => substituteDegrees(melody, scale)[i]);
      expect(new Set(tonicPitches).size, `${melody.name} tonic drifted across scales: ${tonicPitches.join(", ")}`).toBe(1);
    }
  });

  it("only emits pitches that are members of the target scale", () => {
    for (const scale of CORE_SCALES) {
      const intervals = EXPECTED_INTERVALS[scale];
      for (const note of [...substituteDegrees(TWINKLE_TWINKLE, scale), ...substituteDegrees(JOY_TO_THE_WORLD, scale)]) {
        expect(intervals, `${note} under ${scale} is not in {${intervals.join(",")}}`).toContain(
          pitchClass(note),
        );
      }
    }
  });

  it("produces a pairwise-distinct result for every scale on Joy to the World", () => {
    // This is the property Twinkle can't demonstrate: Harmonic Minor only
    // differs from Natural Minor at ti, and Dorian only differs from
    // Melodic Minor (ascending) at ti — Twinkle never reaches that degree,
    // so both pairs collapse to identical output there. Joy to the World's
    // descending scale hits every degree once, which is what separates them.
    const outputs = CORE_SCALES.map((scale) => substituteDegrees(JOY_TO_THE_WORLD, scale).join(" "));
    for (let i = 0; i < CORE_SCALES.length; i++) {
      for (let j = i + 1; j < CORE_SCALES.length; j++) {
        expect(
          outputs[i],
          `${CORE_SCALES[i]} and ${CORE_SCALES[j]} produced identical output on Joy to the World: "${outputs[i]}"`,
        ).not.toBe(outputs[j]);
      }
    }
  });

  it("matches the pre-migration transformMelody output exactly, for every core scale", () => {
    for (const scale of CORE_SCALES) {
      expect(substituteDegrees(TWINKLE_TWINKLE, scale), `Twinkle / ${scale}`).toEqual(TWINKLE_GOLDEN[scale]);
      expect(substituteDegrees(JOY_TO_THE_WORLD, scale), `Joy / ${scale}`).toEqual(JOY_GOLDEN[scale]);
    }
  });
});
