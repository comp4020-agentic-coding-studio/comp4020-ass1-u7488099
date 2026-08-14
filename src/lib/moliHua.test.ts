import { describe, expect, it } from "vitest";
import { isRest, MO_LI_HUA, RENDERED_REST } from "./melodies.ts";
import { renderNative, transformMelody } from "./transform.ts";

// Mo Li Hua (茉莉花, "Jasmine Flower") -- the melody that exercises 5->5
// substitution and 5->7 quantization, since it's Major-Pentatonic-sourced
// rather than Major-sourced like Twinkle/Joy. Golden array below is the
// hand-verified transcription from Wikipedia's LilyPond source (the written
// \repeat volta 2 unfolded, two quarter rests + one final half rest kept
// explicit rather than absorbed into a preceding note's duration).
const MO_LI_HUA_TRANSCRIPTION = [
  // Instance 1 of the unfolded opening (measures 1-2)
  "E4", "E4", "G4", "A4", "C5", "C5", "A4", "G4", "G4", "A4", "G4", RENDERED_REST,
  // Instance 2 (repeat of measures 1-2)
  "E4", "E4", "G4", "A4", "C5", "C5", "A4", "G4", "G4", "A4", "G4", RENDERED_REST,
  // Measure 3
  "G4", "G4", "G4", "E4", "G4",
  // Measure 4
  "A4", "A4", "G4",
  // Measure 5
  "E4", "D4", "E4", "G4", "E4", "D4",
  // Measure 6
  "C4", "C4", "D4", "C4",
  // Measure 7
  "E4", "D4", "C4", "E4", "D4", "E4",
  // Measure 8
  "G4", "A4", "C5", "G4",
  // Measure 9
  "D4", "E4", "G4", "D4", "E4", "C4", "A3",
  // Measure 10
  "G3", "A3", "C4",
  // Measure 11
  "D4", "E4", "C4", "D4", "C4", "A3",
  // Measure 12
  "G3", RENDERED_REST,
];

const LETTER_SEMITONE: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

function pitchClass(note: string): number {
  const match = note.match(/^([A-G])(#|b)?(-?\d+)$/);
  if (!match) throw new Error(`unparseable note name: "${note}"`);
  const [, letter, accidental] = match;
  const base = LETTER_SEMITONE[letter];
  const offset = accidental === "#" ? 1 : accidental === "b" ? -1 : 0;
  return ((base + offset) % 12 + 12) % 12;
}

const MAJOR_PENTATONIC = [0, 2, 4, 7, 9];
const IN_SEN = [0, 1, 5, 7, 10];
const SCALE_INTERVALS: Record<string, number[]> = {
  Major: [0, 2, 4, 5, 7, 9, 11],
  "Natural Minor": [0, 2, 3, 5, 7, 8, 10],
  Hijaz: [0, 1, 4, 5, 7, 8, 10],
};

const TOTAL_EVENTS = 70;
const TOTAL_NOTES = 67;
const TOTAL_RESTS = 3;
const TOTAL_BEATS = 56;

const restIndexes = () =>
  MO_LI_HUA.notes.reduce<number[]>((acc, event, i) => (isRest(event) ? [...acc, i] : acc), []);

describe("Mo Li Hua", () => {
  it("has the transcribed event/note/rest counts and total duration", () => {
    expect(MO_LI_HUA.notes).toHaveLength(TOTAL_EVENTS);
    expect(MO_LI_HUA.notes.filter((e) => !isRest(e))).toHaveLength(TOTAL_NOTES);
    expect(MO_LI_HUA.notes.filter(isRest)).toHaveLength(TOTAL_RESTS);
    expect(MO_LI_HUA.notes.reduce((sum, e) => sum + e.duration, 0)).toBe(TOTAL_BEATS);
  });

  it("renders natively to exactly the verified transcription", () => {
    expect(renderNative(MO_LI_HUA)).toEqual(MO_LI_HUA_TRANSCRIPTION);
  });

  it("every sounded native note belongs to Major Pentatonic", () => {
    for (const pitch of renderNative(MO_LI_HUA)) {
      if (pitch === RENDERED_REST) continue;
      expect(MAJOR_PENTATONIC, `${pitch} is not in Major Pentatonic`).toContain(pitchClass(pitch));
    }
  });

  describe("rests are preserved across every target scale", () => {
    const targets = ["Major Pentatonic", "In Sen", "Major", "Natural Minor", "Hijaz"];

    it.each(targets)("keeps rest positions and durations unchanged under %s", (scale) => {
      const out = transformMelody(MO_LI_HUA, scale);
      expect(out).toHaveLength(TOTAL_EVENTS);
      expect(out.reduce((acc, pitch, i) => (pitch === RENDERED_REST ? [...acc, i] : acc), [] as number[])).toEqual(
        restIndexes(),
      );
      for (const i of restIndexes()) {
        expect(out[i]).toBe(RENDERED_REST);
      }
    });

    it("preserves note/event count and total duration under every target scale", () => {
      for (const scale of targets) {
        const out = transformMelody(MO_LI_HUA, scale);
        expect(out, scale).toHaveLength(TOTAL_EVENTS);
        expect(MO_LI_HUA.notes.reduce((sum, e) => sum + e.duration, 0), scale).toBe(TOTAL_BEATS);
      }
    });
  });

  it("substitutes 5->5 onto In Sen, keeping the tonic in place", () => {
    const out = transformMelody(MO_LI_HUA, "In Sen");
    expect(out).toHaveLength(TOTAL_EVENTS);
    for (const pitch of out) {
      if (pitch === RENDERED_REST) continue;
      expect(IN_SEN, `${pitch} is not in In Sen`).toContain(pitchClass(pitch));
    }
    // Mo Li Hua's tonic (scaleStep 0) isn't its first note -- locate it by
    // scaleStep rather than assuming index 0, same pattern as scales.test.ts.
    const tonicIndex = MO_LI_HUA.notes.findIndex((e) => !isRest(e) && e.scaleStep === 0);
    expect(out[tonicIndex]).toBe("C4");
  });

  it.each(["Major", "Natural Minor", "Hijaz"])("routes 5->7 onto %s through the canonical bridge", (scale) => {
    const out = transformMelody(MO_LI_HUA, scale);
    expect(out).toHaveLength(TOTAL_EVENTS);
    const allowed = SCALE_INTERVALS[scale];
    for (const pitch of out) {
      if (pitch === RENDERED_REST) continue;
      expect(allowed, `${pitch} under ${scale} is not in {${allowed.join(",")}}`).toContain(pitchClass(pitch));
    }
  });

  // The concrete bug this rewrite fixes: under the old direct-quantization
  // model, splitRepeatedRun couldn't tell a genuinely shared pentatonic
  // degree from an incidental off-scale collision, so it split repeats it
  // should have left alone. The opening "mi mi" became D#4,F4 (a wobble)
  // and measure 4's "la la" became G#4,A#4 -- worse, since A#4 is Natural
  // Minor's *ti*, so the repeat audibly turned into a different scale
  // degree. Both are do/re/mi/sol/la (safe, identity-relabeled) degrees, so
  // the canonical bridge never enters run-splitting logic for them at all.
  describe("repeated-degree regression", () => {
    const REPEATED_MI_INDEX = 0; // opening "mi mi" -- scaleStep 2, 2
    const REPEATED_LA_INDEX = 29; // measure 4 "la la" -- scaleStep 4, 4

    it("locates the repeated mi-mi and la-la pairs this regression targets", () => {
      expect(MO_LI_HUA.notes[REPEATED_MI_INDEX]).toMatchObject({ scaleStep: 2 });
      expect(MO_LI_HUA.notes[REPEATED_MI_INDEX + 1]).toMatchObject({ scaleStep: 2 });
      expect(MO_LI_HUA.notes[REPEATED_LA_INDEX]).toMatchObject({ scaleStep: 4 });
      expect(MO_LI_HUA.notes[REPEATED_LA_INDEX + 1]).toMatchObject({ scaleStep: 4 });
    });

    it.each(["Natural Minor", "Hijaz"])("keeps the opening mi-mi an identical repeated pitch under %s", (scale) => {
      const out = transformMelody(MO_LI_HUA, scale);
      expect(out[REPEATED_MI_INDEX]).toBe(out[REPEATED_MI_INDEX + 1]);
    });

    it.each(["Natural Minor", "Hijaz"])(
      "keeps measure 4's la-la an identical repeated pitch under %s, not a wobble onto a different degree",
      (scale) => {
        const out = transformMelody(MO_LI_HUA, scale);
        expect(out[REPEATED_LA_INDEX]).toBe(out[REPEATED_LA_INDEX + 1]);
      },
    );

    it("matches the exact hand-verified pitches for both repeats under Natural Minor and Hijaz", () => {
      const naturalMinor = transformMelody(MO_LI_HUA, "Natural Minor");
      expect(naturalMinor[REPEATED_MI_INDEX]).toBe("D#4");
      expect(naturalMinor[REPEATED_LA_INDEX]).toBe("G#4");

      const hijaz = transformMelody(MO_LI_HUA, "Hijaz");
      expect(hijaz[REPEATED_MI_INDEX]).toBe("E4");
      expect(hijaz[REPEATED_LA_INDEX]).toBe("G#4");
    });
  });
});
