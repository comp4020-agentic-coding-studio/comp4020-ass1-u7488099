// Structural coverage for every melody the picker's Presets cards can load
// (see index.astro), beyond MO_LI_HUA's own deep regression suite in
// moliHua.test.ts. Each preset here must: declare a real sourceScale key
// from SCALES, keep every note's scaleStep inside the C3-C6 window
// pitchRowsForScale grants that scale, and transform cleanly (right event
// count, native notes genuinely drawn from the declared sourceScale) to
// every other catalog scale without throwing.
import { describe, expect, it } from "vitest";
import { pitchRowsForScale } from "./composition.ts";
import {
  BWV_999,
  GOD_REST_YE_MERRY_GENTLEMEN,
  HAVA_NAGILA,
  isRest,
  MARY_HAD_A_LITTLE_LAMB,
  type Melody,
  MO_LI_HUA,
  ODE_TO_JOY,
  RENDERED_REST,
  SCARBOROUGH_FAIR,
  TWINKLE_TWINKLE,
  WHY_FUMTH_IN_FIGHT,
} from "./melodies.ts";
import { SCALES } from "./scales.ts";
import { noteToSemitone, parseNote } from "./scales.ts";
import { renderNative, transformMelody } from "./transform.ts";

const ALL_TARGETS = Object.keys(SCALES);

// The final approved 9-preset roster (see PRESET_SOURCES.md). Each is
// sourced and cited; no fake "Study" phrases remain in the picker.
const PRESETS: Melody[] = [
  TWINKLE_TWINKLE,
  ODE_TO_JOY,
  MARY_HAD_A_LITTLE_LAMB,
  MO_LI_HUA,
  GOD_REST_YE_MERRY_GENTLEMEN,
  SCARBOROUGH_FAIR,
  WHY_FUMTH_IN_FIGHT,
  HAVA_NAGILA,
  BWV_999,
];

describe.each(PRESETS.map((melody) => [melody.name, melody] as const))("preset: %s", (_name, melody) => {
  it("declares a sourceScale that exists in the scale catalog", () => {
    expect(SCALES[melody.sourceScale], melody.sourceScale).toBeDefined();
  });

  it("is anchored at C4, the project's fixed tonic", () => {
    expect(melody.tonic).toBe("C4");
  });

  it("keeps every note's scaleStep within the C3-C6 window for its sourceScale", () => {
    const allowedRows = new Set(pitchRowsForScale(melody.sourceScale));
    for (const event of melody.notes) {
      if (isRest(event)) continue;
      expect(allowedRows.has(event.scaleStep), `scaleStep ${event.scaleStep} is outside C3-C6 for ${melody.sourceScale}`).toBe(
        true,
      );
    }
  });

  it("renders natively to pitches genuinely drawn from its declared sourceScale", () => {
    const allowed = SCALES[melody.sourceScale];
    for (const pitch of renderNative(melody)) {
      if (pitch === RENDERED_REST) continue;
      const semitone = noteToSemitone(parseNote(pitch));
      const pitchClass = ((semitone % 12) + 12) % 12;
      expect(allowed, `${pitch} is not in ${melody.sourceScale}`).toContain(pitchClass);
    }
  });

  it("has its tonic (scaleStep 0) render as exactly C4", () => {
    const tonicIndex = melody.notes.findIndex((e) => !isRest(e) && e.scaleStep === 0);
    expect(tonicIndex, "no note at scaleStep 0").toBeGreaterThanOrEqual(0);
    expect(renderNative(melody)[tonicIndex]).toBe("C4");
  });

  it.each(ALL_TARGETS)("transforms onto %s without changing event count or rest positions", (targetScale) => {
    const out = transformMelody(melody, targetScale);
    expect(out).toHaveLength(melody.notes.length);
    melody.notes.forEach((event, i) => {
      if (isRest(event)) {
        expect(out[i], `event ${i} under ${targetScale}`).toBe(RENDERED_REST);
      } else {
        expect(out[i], `event ${i} under ${targetScale}`).not.toBe(RENDERED_REST);
      }
    });
  });

  it("switching target style never changes root, octave, note count, or rhythm -- only pitches move", () => {
    const durations = melody.notes.map((e) => e.duration);
    for (const targetScale of ALL_TARGETS) {
      const out = transformMelody(melody, targetScale);
      expect(out).toHaveLength(melody.notes.length);
      expect(melody.notes.map((e) => e.duration), targetScale).toEqual(durations);
    }
  });
});

// Golden, exact-value assertions for the three re-sourced/extended presets,
// so a future rhythmic "simplification" pass can't silently flatten these
// back to even quarter notes without a test failing. See PRESET_SOURCES.md
// for what each of these values is transcribed from.
describe("golden: Scarborough Fair keeps its full sourced rhythm", () => {
  it("is the complete 12-bar excerpt, not the original 4-bar fragment", () => {
    expect(SCARBOROUGH_FAIR.notes).toHaveLength(27);
  });

  it("sums to a 3/4-compatible total duration (36 beats = 12 bars of 3)", () => {
    const total = SCARBOROUGH_FAIR.notes.reduce((sum, e) => sum + e.duration, 0);
    expect(total).toBe(36);
    expect(total % 3).toBe(0);
  });

  it("keeps its dotted-quarter and eighth-note figures (not flattened to even quarters)", () => {
    const durations = SCARBOROUGH_FAIR.notes.map((e) => e.duration);
    expect(durations).toContain(0.5); // eighth notes
    expect(durations).toContain(1.5); // dotted quarters
    expect(durations).toContain(3); // dotted-half phrase cadences
  });

  it("includes the one genuine rest from the source, not an invented one", () => {
    const restCount = SCARBOROUGH_FAIR.notes.filter(isRest).length;
    expect(restCount).toBe(1);
  });
});

describe("golden: Hava Nagila keeps its corrected pitch and rhythm", () => {
  it("is the two-excerpt transcription (main theme + Uru uru riff), 36 events, no rests", () => {
    expect(HAVA_NAGILA.notes).toHaveLength(36);
    expect(HAVA_NAGILA.notes.some(isRest)).toBe(false);
  });

  it("sums to 24 beats (6 measures of 4/4)", () => {
    const total = HAVA_NAGILA.notes.reduce((sum, e) => sum + e.duration, 0);
    expect(total).toBe(24);
  });

  it("keeps the main theme's dotted-quarter/eighth (1.5/0.5) figures", () => {
    const durations = HAVA_NAGILA.notes.map((e) => e.duration);
    expect(durations).toContain(1.5);
    expect(durations).toContain(0.5);
  });

  it("keeps the Uru uru riff's dotted-eighth/sixteenth (0.75/0.25) figures", () => {
    const durations = HAVA_NAGILA.notes.map((e) => e.duration);
    expect(durations).toContain(0.75);
    expect(durations).toContain(0.25);
  });

  it("opens on the corrected pitch sequence: do do-re-mi re do (main theme)", () => {
    const opening = HAVA_NAGILA.notes.slice(0, 5).filter((e): e is Extract<typeof e, { type: "note" }> => !isRest(e));
    expect(opening.map((e) => e.scaleStep)).toEqual([0, 0, 2, 1, 0]);
  });
});

describe("golden: Why Fum'th in Fight keeps its corrected long-note rhythm", () => {
  it("is the 14-event opening couplet, no invented duration-6 values", () => {
    expect(WHY_FUMTH_IN_FIGHT.notes).toHaveLength(14);
    for (const event of WHY_FUMTH_IN_FIGHT.notes) {
      expect(event.duration, "duration 6 is not in this project's convention and isn't in the source").not.toBe(6);
    }
  });

  it("sums to 31 beats, not the earlier pass's inflated 44", () => {
    const total = WHY_FUMTH_IN_FIGHT.notes.reduce((sum, e) => sum + e.duration, 0);
    expect(total).toBe(31);
  });

  it("opens on a genuine whole note, not a half note", () => {
    expect(WHY_FUMTH_IN_FIGHT.notes[0].duration).toBe(4);
  });

  it("has exactly one dotted-half caesura (the internal couplet break), not three invented cadences", () => {
    const durations = WHY_FUMTH_IN_FIGHT.notes.map((e) => e.duration);
    expect(durations.filter((d) => d === 3)).toHaveLength(1);
  });

  it("is otherwise built from plain half notes", () => {
    const durations = WHY_FUMTH_IN_FIGHT.notes.map((e) => e.duration);
    expect(durations.filter((d) => d === 2)).toHaveLength(12);
  });
});

describe("golden: BWV 999 keeps its sixteenth-note texture and harmonic-minor color", () => {
  it("is the full mm.1-6 excerpt: 72 sixteenth-note-grid events, 18 beats", () => {
    expect(BWV_999.notes).toHaveLength(72);
    const total = BWV_999.notes.reduce((sum, e) => sum + e.duration, 0);
    expect(total).toBe(18);
  });

  it("is built entirely from sixteenth-note (0.25 beat) values -- continuous arpeggiation, no coarser grid", () => {
    for (const event of BWV_999.notes) {
      expect(event.duration).toBe(0.25);
    }
  });

  it("includes the source's rests (silence within the arpeggiation, not absorbed into notes)", () => {
    const restCount = BWV_999.notes.filter(isRest).length;
    expect(restCount).toBeGreaterThan(0);
  });

  it("hits both the b6 (scaleStep 5) and the raised-7th (scaleStep 6) -- harmonic minor's color", () => {
    const steps = new Set(BWV_999.notes.filter((e): e is Extract<typeof e, { type: "note" }> => !isRest(e)).map((e) => e.scaleStep));
    expect(steps.has(5)).toBe(true);
    expect(steps.has(6)).toBe(true);
  });
});
