import { describe, expect, it } from "vitest";
import { transformMelody } from "./scales.ts";

// Encodes the "controlled comparison" rule from CLAUDE.md: switching scales
// must only change pitch, never rhythm, note count, or which absolute pitch
// the tonic (scale degree 0) lands on. transformMelody(notes, scaleName) is
// yours to place/rename; update the import path above if it moves.

const TWINKLE = ["C4", "C4", "G4", "G4", "A4", "A4", "G4"]; // do do sol sol la la sol, tonic-first
const CORE_SCALES = ["Major", "Natural Minor", "Hijaz"];

// Semitone intervals from the tonic, duplicated here rather than imported so
// this test doesn't just restate whatever scales.ts happens to define.
const EXPECTED_INTERVALS: Record<string, number[]> = {
  Major: [0, 2, 4, 5, 7, 9, 11],
  "Natural Minor": [0, 2, 3, 5, 7, 8, 10],
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
    const a = transformMelody(TWINKLE, "Natural Minor");
    const b = transformMelody(TWINKLE, "Natural Minor");
    expect(a).toEqual(b);
  });

  it("preserves note count for every core scale", () => {
    for (const scale of CORE_SCALES) {
      expect(transformMelody(TWINKLE, scale), scale).toHaveLength(TWINKLE.length);
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
      for (const note of transformMelody(TWINKLE, scale)) {
        expect(intervals, `${note} under ${scale} is not in {${intervals.join(",")}}`).toContain(
          pitchClass(note),
        );
      }
    }
  });
});
