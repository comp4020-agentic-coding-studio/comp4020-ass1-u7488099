import { describe, expect, it } from "vitest";
import { TWINKLE_TWINKLE, pitches } from "./melodies.ts";
import { quantizeMelody } from "./quantize.ts";

const TWINKLE = pitches(TWINKLE_TWINKLE);
const QUANTIZE_SCALES = ["Major Pentatonic", "Minor Pentatonic", "In Sen"];

// Duplicated here rather than imported so this test doesn't just restate
// whatever quantize.ts happens to define.
const PITCH_CLASSES: Record<string, number[]> = {
  "Major Pentatonic": [0, 2, 4, 7, 9],
  "Minor Pentatonic": [0, 3, 5, 7, 10],
  "In Sen": [0, 1, 5, 7, 10],
};

const LETTER_SEMITONE: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

function pitchClass(note: string): number {
  const match = note.match(/^([A-G])(#|b)?(-?\d+)$/);
  if (!match) throw new Error(`unparseable note name: "${note}"`);
  const [, letter, accidental] = match;
  const base = LETTER_SEMITONE[letter];
  const offset = accidental === "#" ? 1 : accidental === "b" ? -1 : 0;
  return ((base + offset) % 12 + 12) % 12;
}

describe("quantizeMelody", () => {
  it("is deterministic", () => {
    for (const scale of QUANTIZE_SCALES) {
      const a = quantizeMelody(TWINKLE, scale);
      const b = quantizeMelody(TWINKLE, scale);
      expect(a, scale).toEqual(b);
    }
  });

  it("preserves note count", () => {
    for (const scale of QUANTIZE_SCALES) {
      expect(quantizeMelody(TWINKLE, scale), scale).toHaveLength(TWINKLE.length);
    }
  });

  it("only emits pitches that are members of the target scale", () => {
    for (const scale of QUANTIZE_SCALES) {
      const allowed = PITCH_CLASSES[scale];
      for (const note of quantizeMelody(TWINKLE, scale)) {
        expect(allowed, `${note} under ${scale} is not in {${allowed.join(",")}}`).toContain(pitchClass(note));
      }
    }
  });

  it("leaves already-in-scale notes unchanged", () => {
    // Major Pentatonic already contains do/re/mi/sol/la -- everything
    // Twinkle uses except fa (pitch class 5) -- so every note other than F
    // should pass through untouched.
    const quantized = quantizeMelody(TWINKLE, "Major Pentatonic");
    TWINKLE.forEach((note, i) => {
      if (pitchClass(note) !== 5) {
        expect(quantized[i], `note ${i} (${note}) should be unchanged`).toBe(note);
      }
    });
  });

  it("resolves the documented tie by picking the lower pitch", () => {
    // E(4) is exactly 1 semitone from both D#/Eb(3) and F(5) in Minor
    // Pentatonic {0,3,5,7,10} -- an exact equidistant tie. The documented
    // rule picks the lower one: D#.
    const idx = TWINKLE.findIndex((note) => note === "E4");
    expect(idx, "expected Twinkle to contain E4").toBeGreaterThanOrEqual(0);
    expect(quantizeMelody(TWINKLE, "Minor Pentatonic")[idx]).toBe("D#4");
  });

  it("keeps the tonic in place", () => {
    for (const scale of QUANTIZE_SCALES) {
      expect(quantizeMelody(TWINKLE, scale)[0], scale).toBe(TWINKLE[0]);
    }
  });

  it("splits Twinkle's repeated fa-fa into E G, not a collapsed E E, under Major Pentatonic", () => {
    // The concrete regression case: "F F E E D D C" (fa fa mi mi re re do)
    // under plain nearest-note quantization becomes "E E E E D D C" -- both
    // F's collapse onto E and fuse with the following E E, erasing the
    // boundary between the two original two-note groups. The phrase-aware
    // rule instead splits the repeated F between its two legal Major
    // Pentatonic neighbours (E below, G above), preserving that boundary.
    const segment = ["F4", "F4", "E4", "E4", "D4", "D4", "C4"];
    expect(quantizeMelody(segment, "Major Pentatonic")).toEqual(["E4", "G4", "E4", "E4", "D4", "D4", "C4"]);
  });

  it("does not collapse a repeated missing-note run into one repeated output pitch", () => {
    for (const scale of QUANTIZE_SCALES) {
      const allowed = PITCH_CLASSES[scale];
      const quantized = quantizeMelody(TWINKLE, scale);

      let i = 0;
      while (i < TWINKLE.length) {
        if (allowed.includes(pitchClass(TWINKLE[i]))) {
          i++;
          continue;
        }
        let j = i;
        while (j + 1 < TWINKLE.length && TWINKLE[j + 1] === TWINKLE[i]) j++;
        const runLength = j - i + 1;

        if (runLength >= 2) {
          const outputs = quantized.slice(i, j + 1);
          expect(
            outputs.every((note) => note === outputs[0]),
            `${scale}: run of ${runLength} x ${TWINKLE[i]} at index ${i} collapsed to a single repeated output (${outputs.join(",")})`,
          ).toBe(false);
        }
        i = j + 1;
      }
    }
  });

  it("never starts a substituted run on the pitch immediately preceding it", () => {
    for (const scale of QUANTIZE_SCALES) {
      const allowed = PITCH_CLASSES[scale];
      const quantized = quantizeMelody(TWINKLE, scale);

      let i = 0;
      while (i < TWINKLE.length) {
        if (allowed.includes(pitchClass(TWINKLE[i]))) {
          i++;
          continue;
        }
        let j = i;
        while (j + 1 < TWINKLE.length && TWINKLE[j + 1] === TWINKLE[i]) j++;
        const runLength = j - i + 1;

        if (runLength >= 2 && i > 0) {
          expect(
            quantized[i],
            `${scale}: substituted run at index ${i} repeats the preceding output note (${quantized[i - 1]})`,
          ).not.toBe(quantized[i - 1]);
        }
        i = j + 1;
      }
    }
  });
});
