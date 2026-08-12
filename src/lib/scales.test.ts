import { describe, expect, it } from "vitest";
import { JOY_TO_THE_WORLD, TWINKLE_TWINKLE, pitches } from "./melodies.ts";
import { transformMelody } from "./scales.ts";

// Encodes the "controlled comparison" rule from CLAUDE.md: switching scales
// must only change pitch, never rhythm, note count, or which absolute pitch
// the tonic (scale degree 0) lands on. transformMelody(notes, scaleName) is
// yours to place/rename; update the import path above if it moves.

// Twinkle never uses ti, so it can't tell apart scales that only differ
// there (Harmonic Minor vs Natural Minor, Dorian vs Melodic Minor). Joy to
// the World's opening phrase is a descending scale that hits every degree
// exactly once, so pairwise-distinctness is checked against it instead.
const TWINKLE = pitches(TWINKLE_TWINKLE);
const JOY = pitches(JOY_TO_THE_WORLD);

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

describe("transformMelody", () => {
  it("is deterministic", () => {
    for (const scale of CORE_SCALES) {
      const a = transformMelody(JOY, scale);
      const b = transformMelody(JOY, scale);
      expect(a, scale).toEqual(b);
    }
  });

  it("preserves note count for every core scale", () => {
    for (const scale of CORE_SCALES) {
      expect(transformMelody(TWINKLE, scale), scale).toHaveLength(TWINKLE.length);
      expect(transformMelody(JOY, scale), scale).toHaveLength(JOY.length);
    }
  });

  it("keeps the tonic in place — the melody's degree-0 note never moves", () => {
    // Twinkle starts on "do", scale degree 0, which is scaleIntervals[0] = 0
    // in every scale by definition of "intervals from the tonic" — so the
    // first note's absolute pitch must be identical across scale choices.
    const firstNotes = CORE_SCALES.map((scale) => transformMelody(TWINKLE, scale)[0]);
    expect(new Set(firstNotes).size, `tonic drifted across scales: ${firstNotes.join(", ")}`).toBe(1);
  });

  it("only emits pitches that are members of the target scale", () => {
    for (const scale of CORE_SCALES) {
      const intervals = EXPECTED_INTERVALS[scale];
      for (const note of [...transformMelody(TWINKLE, scale), ...transformMelody(JOY, scale)]) {
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
    const outputs = CORE_SCALES.map((scale) => transformMelody(JOY, scale).join(" "));
    for (let i = 0; i < CORE_SCALES.length; i++) {
      for (let j = i + 1; j < CORE_SCALES.length; j++) {
        expect(
          outputs[i],
          `${CORE_SCALES[i]} and ${CORE_SCALES[j]} produced identical output on Joy to the World: "${outputs[i]}"`,
        ).not.toBe(outputs[j]);
      }
    }
  });
});
