import { describe, expect, it } from "vitest";
import { RENDERED_REST, type Melody } from "./melodies.ts";
import { bridgeMajorIntoPentatonic, embedPentatonicIntoMajor } from "./pentatonicBridge.ts";
import { substituteDegrees } from "./scales.ts";
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

const step = (scaleStep: number) => ({ type: "note" as const, scaleStep, duration: 1 });

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

  it("routes a 5-note source onto a 7-note target through the Major Pentatonic->Major embedding", () => {
    const out = transformMelody(melody("In Sen", [0, 1, 2, 3, 4]), "Major");
    expect(out).toHaveLength(5);
    const allowed = [0, 2, 4, 5, 7, 9, 11];
    for (const note of out) expect(allowed).toContain(pitchClass(note));
    // Exact values: every 5-note source's degree indices route through the
    // same fixed Major Pentatonic->Major relabel regardless of which 5-note
    // scale it actually names -- do/re/mi/sol/la -> C4/D4/E4/G4/A4.
    expect(out).toEqual(["C4", "D4", "E4", "G4", "A4"]);
  });

  it("routes a 7-note source onto a 5-note target through the Major->Major Pentatonic bridge", () => {
    const out = transformMelody(melody("Major", [0, 1, 2, 3, 4, 5, 6]), "In Sen");
    expect(out).toHaveLength(7);
    const allowed = [0, 1, 5, 7, 10];
    for (const note of out) expect(allowed).toContain(pitchClass(note));
    // Exact values: do-re-mi-fa-sol-la-ti, where fa and ti are the only two
    // bridged (non-identity) degrees -- fa lands on the mi slot (F4), ti
    // lands on the do slot an octave up (C5).
    expect(out).toEqual(["C4", "C#4", "F4", "F4", "G4", "A#4", "C5"]);
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

describe("rests", () => {
  const restMelody = (sourceScale: string): Melody => ({
    name: "rest fixture",
    tonic: "C4",
    sourceScale,
    notes: [
      { type: "note", scaleStep: 0, duration: 1 },
      { type: "rest", duration: 2 },
      { type: "note", scaleStep: 2, duration: 1 },
    ],
  });

  it("passes a rest through equal-cardinality substitution untouched", () => {
    const out = transformMelody(restMelody("Major"), "Natural Minor");
    expect(out).toHaveLength(3);
    expect(out[1]).toBe(RENDERED_REST);
    expect(out[0]).not.toBe(RENDERED_REST);
    expect(out[2]).not.toBe(RENDERED_REST);
  });

  it("passes a rest through unequal-cardinality quantization untouched", () => {
    const out = transformMelody(restMelody("Major"), "In Sen");
    expect(out).toHaveLength(3);
    expect(out[1]).toBe(RENDERED_REST);
  });

  it("a rest between two identical off-scale notes doesn't fuse them into one run", () => {
    // Without the rest, two consecutive F4s (scaleStep 3 in Major) would be
    // treated as a single repeated run and split across E4/G4 by
    // splitRepeatedRun. A rest between them must break that grouping, so
    // each F4 is quantized independently -- both still land on E4 (F4's
    // nearest Major Pentatonic neighbour), but via the single-note path,
    // not the run-splitting path.
    const m: Melody = {
      name: "rest between repeats",
      tonic: "C4",
      sourceScale: "Major",
      notes: [
        { type: "note", scaleStep: 3, duration: 1 },
        { type: "rest", duration: 1 },
        { type: "note", scaleStep: 3, duration: 1 },
      ],
    };
    const out = transformMelody(m, "Major Pentatonic");
    expect(out[1]).toBe(RENDERED_REST);
    expect(out[0]).toBe(out[2]);
    expect(out[0]).toBe("E4");
  });

  it("a preceding rest doesn't crash the run tie-break lookup", () => {
    // Regression case for the precedingSemitone guard in quantizePitches:
    // the note immediately before a repeated run is a rest, not a pitch.
    const m: Melody = {
      name: "repeat after rest",
      tonic: "C4",
      sourceScale: "Major",
      notes: [
        { type: "rest", duration: 1 },
        { type: "note", scaleStep: 3, duration: 1 },
        { type: "note", scaleStep: 3, duration: 1 },
      ],
    };
    expect(() => transformMelody(m, "Major Pentatonic")).not.toThrow();
    const out = transformMelody(m, "Major Pentatonic");
    expect(out[0]).toBe(RENDERED_REST);
    expect(out.slice(1)).toEqual(["E4", "G4"]);
  });

  it("preserves a rest's exact duration alongside its transformed pitch array", () => {
    // transformMelody only returns pitch names; duration lives on the
    // source melody.notes and is read positionally by callers (index.astro,
    // audio.ts). This proves that positional correspondence survives
    // transformation: the rest stays at the same index with the same
    // duration, for both transform families.
    const m = restMelody("Major");
    for (const targetScale of ["Natural Minor", "In Sen"]) {
      const out = transformMelody(m, targetScale);
      const restIndex = out.findIndex((pitch) => pitch === RENDERED_REST);
      expect(restIndex, targetScale).toBe(1);
      expect(m.notes[restIndex].duration, targetScale).toBe(2);
    }
  });
});

// Harness tests that would fail if a future change reintroduced ad-hoc
// quantization into the dispatcher instead of routing through the
// canonical Major/Major Pentatonic bridge (pentatonicBridge.ts).
describe("canonical-route harness", () => {
  it("matches manually composing the bridge functions with substituteDegrees, for representative 5->7 and 7->5 pairs", () => {
    const fiveToSeven = melody("Minor Pentatonic", [0, 1, 2, 3, 4, 2, 0]);
    const expectedFiveToSeven = substituteDegrees(
      { ...fiveToSeven, sourceScale: "Major", notes: embedPentatonicIntoMajor(fiveToSeven.notes) },
      "Hijaz",
    );
    expect(transformMelody(fiveToSeven, "Hijaz")).toEqual(expectedFiveToSeven);

    const sevenToFive = melody("Dorian", [0, 3, 3, 6, 6, 4, 0]);
    const expectedSevenToFive = substituteDegrees(
      { ...sevenToFive, sourceScale: "Major Pentatonic", notes: bridgeMajorIntoPentatonic(sevenToFive.notes) },
      "In Sen",
    );
    expect(transformMelody(sevenToFive, "In Sen")).toEqual(expectedSevenToFive);
  });

  it("never splits a repeated non-fa/non-ti degree from a 7-note source, regardless of target", () => {
    // do/re/mi/sol/la (Major degrees 0,1,2,4,5) are identity-relabeled into
    // Major Pentatonic with no run logic -- only fa (3) and ti (6) can ever
    // be split. This is the concrete property the original Mo Li Hua bug
    // violated (a repeated "la la" turned into two different pitches); a
    // repeated safe degree must stay a repeated identical pitch under every
    // 5-note target.
    const safeDegrees = [0, 1, 2, 4, 5];
    const targets = ["Major Pentatonic", "Minor Pentatonic", "In Sen"];
    for (const degree of safeDegrees) {
      const m = melody("Major", [degree, degree, degree]);
      for (const target of targets) {
        const out = transformMelody(m, target);
        expect(new Set(out).size, `degree ${degree} -> ${target}`).toBe(1);
      }
    }
  });

  it("never splits a repeated degree from a 5-note source, regardless of target", () => {
    // embedPentatonicIntoMajor is a pure relabel with no run logic at all,
    // so this holds for every pentatonic degree, not just a safe subset.
    const targets = ["Major", "Natural Minor", "Hijaz", "Major Pentatonic", "In Sen"];
    for (const degree of [0, 1, 2, 3, 4]) {
      const m = melody("In Sen", [degree, degree, degree]);
      for (const target of targets) {
        const out = transformMelody(m, target);
        expect(new Set(out).size, `degree ${degree} -> ${target}`).toBe(1);
      }
    }
  });
});
