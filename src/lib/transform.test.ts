import { describe, expect, it } from "vitest";
import type { Melody } from "./melodies.ts";
import { transformMelody } from "./transform.ts";

// Synthetic, inline fixtures throughout -- these exercise cardinality
// combinations (5-note and 12-note sources, pickup phrases) that neither
// preset melody in melodies.ts covers, so scales.test.ts/quantize.test.ts
// (which do use TWINKLE_TWINKLE/JOY_TO_THE_WORLD) don't duplicate this.

const LETTER_SEMITONE: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

function pitchClass(note: string): number {
  const match = note.match(/^([A-G])(#|b)?(-?\d+)$/);
  if (!match) throw new Error(`unparseable note name: "${note}"`);
  const [, letter, accidental] = match;
  const base = LETTER_SEMITONE[letter];
  const offset = accidental === "#" ? 1 : accidental === "b" ? -1 : 0;
  return ((base + offset) % 12 + 12) % 12;
}

const step = (scaleStep: number) => ({ scaleStep, duration: 1 });

function melody(sourceScale: string, scaleSteps: number[]): Melody {
  return { name: "synthetic fixture", tonic: "C4", sourceScale, notes: scaleSteps.map(step) };
}

describe("transformMelody dispatch", () => {
  it("substitutes 7-note source onto a 7-note target (equal cardinality)", () => {
    const out = transformMelody(melody("Major", [0, 1, 2, 3, 4, 5, 6]), "Natural Minor");
    expect(out).toHaveLength(7);
    const allowed = [0, 2, 3, 5, 7, 8, 10];
    for (const note of out) expect(allowed).toContain(pitchClass(note));
    expect(out[0]).toBe("C4"); // tonic, degree 0, maps to itself in every scale
  });

  it("substitutes 5-note source onto a 5-note target (equal cardinality)", () => {
    const out = transformMelody(melody("Major Pentatonic", [0, 1, 2, 3, 4]), "In Sen");
    expect(out).toHaveLength(5);
    const allowed = [0, 1, 5, 7, 10];
    for (const note of out) expect(allowed).toContain(pitchClass(note));
    expect(out[0]).toBe("C4");
  });

  it("quantizes 5-note source onto a 7-note target (unequal cardinality)", () => {
    const out = transformMelody(melody("In Sen", [0, 1, 2, 3, 4]), "Major");
    expect(out).toHaveLength(5);
    const allowed = [0, 2, 4, 5, 7, 9, 11];
    for (const note of out) expect(allowed).toContain(pitchClass(note));
  });

  it("quantizes 7-note source onto a 5-note target (unequal cardinality)", () => {
    const out = transformMelody(melody("Major", [0, 1, 2, 3, 4, 5, 6]), "In Sen");
    expect(out).toHaveLength(7);
    const allowed = [0, 1, 5, 7, 10];
    for (const note of out) expect(allowed).toContain(pitchClass(note));
  });

  it("quantizes a Chromatic / Free source onto a 7-note target", () => {
    const m = melody("Chromatic / Free", [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
    const out = transformMelody(m, "Major");
    expect(out).toHaveLength(12);
    const allowed = [0, 2, 4, 5, 7, 9, 11];
    for (const note of out) expect(allowed).toContain(pitchClass(note));
    expect(transformMelody(m, "Major")).toEqual(out); // deterministic
  });

  it("quantizes a Chromatic / Free source onto a 5-note target", () => {
    const m = melody("Chromatic / Free", [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
    const out = transformMelody(m, "In Sen");
    expect(out).toHaveLength(12);
    const allowed = [0, 1, 5, 7, 10];
    for (const note of out) expect(allowed).toContain(pitchClass(note));
    expect(transformMelody(m, "In Sen")).toEqual(out); // deterministic
  });

  it("keeps the tonic's absolute pitch fixed even when scaleStep 0 isn't the first note", () => {
    // A pickup phrase: mi-do-sol (scaleStep 2, 0, 4), not do-first. Nothing
    // about the engine should assume array index 0 is the tonic.
    const m = melody("Major", [2, 0, 4]);
    const targets = ["Major", "Natural Minor", "Harmonic Minor", "Dorian", "Phrygian", "Hijaz"];
    const tonicPitches = targets.map((scale) => transformMelody(m, scale)[1]);
    expect(new Set(tonicPitches).size, `tonic drifted across scales: ${tonicPitches.join(", ")}`).toBe(1);
    expect(tonicPitches[0]).toBe("C4");

    // Index 0 (scaleStep 2, "mi") is NOT the tonic and must actually vary --
    // Major's degree 2 (semitone 4) differs from Natural Minor's (semitone 3).
    const firstNotePitches = targets.map((scale) => transformMelody(m, scale)[0]);
    expect(new Set(firstNotePitches).size).toBeGreaterThan(1);
  });
});
