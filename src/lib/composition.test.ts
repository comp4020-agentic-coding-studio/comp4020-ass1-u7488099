import { describe, expect, it } from "vitest";
import { BEAT_SECONDS } from "./audio.ts";
import {
  type Composition,
  type CompositionNote,
  createEmptyComposition,
  pitchRowsForComposition,
  pitchRowsForScale,
  renderComposition,
  sequentialToComposition,
  STEPS_PER_BEAT,
  transformCompositionNote,
  transformCompositionNoteToTargetStep,
  transformCompositionToTarget,
} from "./composition.ts";
import { placeNote } from "./editorGrid.ts";
import { isRest, JOY_TO_THE_WORLD, MO_LI_HUA, r, TWINKLE_TWINKLE, type Melody, type MelodyNote } from "./melodies.ts";
import { transformMelody } from "./transform.ts";

const n = (scaleStep: number, duration: number): MelodyNote => ({ type: "note", scaleStep, duration });
const note = (scaleStep: number, startStep: number, lengthSteps: number): CompositionNote => ({
  type: "note",
  scaleStep,
  startStep,
  lengthSteps,
});

describe("createEmptyComposition", () => {
  it("starts with no notes and the given source scale", () => {
    expect(createEmptyComposition("Hijaz")).toEqual({ sourceScale: "Hijaz", notes: [] });
  });
});

describe("pitchRowsForScale", () => {
  it("returns a C3-C6 window (3 * cardinality + 1 rows) for a 7-note scale", () => {
    expect(pitchRowsForScale("Major")).toEqual(Array.from({ length: 22 }, (_, i) => i - 7));
  });

  it("returns a C3-C6 window (3 * cardinality + 1 rows) for a 5-note scale", () => {
    expect(pitchRowsForScale("Major Pentatonic")).toEqual(Array.from({ length: 16 }, (_, i) => i - 5));
  });

  it("throws for an unknown scale name", () => {
    expect(() => pitchRowsForScale("nonexistent")).toThrow(/unknown scale/);
  });

  it("the lowest row is always C3, whatever the scale's cardinality", () => {
    for (const scaleName of ["Major", "Hijaz", "Major Pentatonic", "In Sen"]) {
      const lowestStep = pitchRowsForScale(scaleName)[0];
      expect(transformCompositionNote(note(lowestStep, 0, 1), scaleName, scaleName)).toBe("C3");
    }
  });

  it("the highest row is always C6, whatever the scale's cardinality", () => {
    for (const scaleName of ["Major", "Hijaz", "Major Pentatonic", "In Sen"]) {
      const highestStep = pitchRowsForScale(scaleName).at(-1)!;
      expect(transformCompositionNote(note(highestStep, 0, 1), scaleName, scaleName)).toBe("C6");
    }
  });
});

describe("sequentialToComposition", () => {
  it("converts a monophonic melody into time-positioned notes, skipping rests", () => {
    // do (1 beat), rest (1 beat), mi (2 beats), rest (1 beat) -- a rest
    // mid-phrase and a trailing rest, both must vanish from the result.
    const melody: Melody = {
      name: "test",
      tonic: "C4",
      sourceScale: "Major",
      notes: [n(0, 1), r(1), n(2, 2), r(1)],
    };

    const composition = sequentialToComposition(melody);

    expect(composition.sourceScale).toBe("Major");
    expect(composition.notes).toEqual([
      note(0, 0, STEPS_PER_BEAT),
      note(2, 2 * STEPS_PER_BEAT, 2 * STEPS_PER_BEAT),
    ]);
  });

  it("produces an empty composition for an all-rest melody", () => {
    const melody: Melody = { name: "silent", tonic: "C4", sourceScale: "Major", notes: [r(4)] };
    expect(sequentialToComposition(melody).notes).toEqual([]);
  });
});

describe("sequentialToComposition on the real presets", () => {
  it("TWINKLE_TWINKLE: converts every non-rest note, none dropped", () => {
    const expectedNoteCount = TWINKLE_TWINKLE.notes.filter((event) => !isRest(event)).length;
    const composition = sequentialToComposition(TWINKLE_TWINKLE);

    expect(composition.sourceScale).toBe("Major");
    expect(composition.notes).toHaveLength(expectedNoteCount);
    expect(composition.notes[0]).toEqual(note(0, 0, STEPS_PER_BEAT));
  });

  it("JOY_TO_THE_WORLD: descends stepwise from scaleStep 7 to 0, one beat apart", () => {
    const composition = sequentialToComposition(JOY_TO_THE_WORLD);

    expect(composition.notes.map((n) => n.scaleStep)).toEqual([7, 6, 5, 4, 3, 2, 1, 0]);
    expect(composition.notes[0]).toEqual(note(7, 0, STEPS_PER_BEAT));
    expect(composition.notes.at(-1)).toEqual(note(0, 7 * STEPS_PER_BEAT, 2 * STEPS_PER_BEAT));
  });

  it("MO_LI_HUA: keeps its below-tonic scaleSteps and leaves every explicit rest as a silent gap", () => {
    const composition = sequentialToComposition(MO_LI_HUA);

    expect(composition.sourceScale).toBe("Major Pentatonic");
    const scaleSteps = composition.notes.map((n) => n.scaleStep);
    expect(Math.min(...scaleSteps)).toBe(-2);
    expect(Math.max(...scaleSteps)).toBe(5);

    // Walk the source melody's own cursor to find each rest's exact window,
    // and assert no composition note sounds during it -- this is the actual
    // invariant sequentialToComposition guarantees, computed from the
    // melody itself rather than a hand-derived step number.
    let cursor = 0;
    for (const event of MO_LI_HUA.notes) {
      const lengthSteps = event.duration * STEPS_PER_BEAT;
      if (isRest(event)) {
        const soundingDuringRest = composition.notes.some(
          (n) => n.startStep < cursor + lengthSteps && n.startStep + n.lengthSteps > cursor,
        );
        expect(soundingDuringRest).toBe(false);
      }
      cursor += lengthSteps;
    }
  });
});

describe("pitchRowsForComposition", () => {
  it("returns the unwidened default for an empty composition", () => {
    expect(pitchRowsForComposition(createEmptyComposition("Major Pentatonic"))).toEqual(
      pitchRowsForScale("Major Pentatonic"),
    );
  });

  it("returns the unwidened default when every note already fits inside it", () => {
    const composition = sequentialToComposition(TWINKLE_TWINKLE);
    expect(pitchRowsForComposition(composition)).toEqual(pitchRowsForScale("Major"));
  });

  it("MO_LI_HUA's below-tonic scaleSteps already fit inside the expanded C3-C6 default -- no widening needed", () => {
    // Before the C3-C6 expansion this widened the (narrower) default; now
    // the default window alone already covers Mo Li Hua's full register.
    const composition = sequentialToComposition(MO_LI_HUA);
    expect(pitchRowsForComposition(composition)).toEqual(pitchRowsForScale("Major Pentatonic"));
  });

  it("still widens for a scaleStep genuinely outside the C3-C6 window", () => {
    const composition: Composition = { sourceScale: "Major Pentatonic", notes: [note(-20, 0, 4)] };
    const rows = pitchRowsForComposition(composition);
    const defaultRows = pitchRowsForScale("Major Pentatonic");

    expect(Math.min(...rows)).toBe(-20);
    expect(Math.max(...rows)).toBe(defaultRows.at(-1));
    expect(rows).toEqual(
      Array.from({ length: Math.max(...rows) - Math.min(...rows) + 1 }, (_, i) => Math.min(...rows) + i),
    );
  });
});

describe("expanded C3-C6 editor range", () => {
  it("a note placed at the lowest row renders as C3, for a 7-note and a 5-note scale", () => {
    for (const scaleName of ["Major", "Major Pentatonic"]) {
      const lowestStep = pitchRowsForScale(scaleName)[0];
      const composition = placeNote(createEmptyComposition(scaleName), lowestStep, 0, 4);
      expect(renderComposition(composition, scaleName, BEAT_SECONDS)[0].pitchName).toBe("C3");
    }
  });

  it("a note placed at the highest row renders as C6, for a 7-note and a 5-note scale", () => {
    for (const scaleName of ["Major", "Major Pentatonic"]) {
      const highestStep = pitchRowsForScale(scaleName).at(-1)!;
      const composition = placeNote(createEmptyComposition(scaleName), highestStep, 0, 4);
      expect(renderComposition(composition, scaleName, BEAT_SECONDS)[0].pitchName).toBe("C6");
    }
  });

  it("supports polyphony at the expanded range: simultaneous notes at C3 and C6 both survive and render together", () => {
    const rows = pitchRowsForScale("Major");
    let composition = createEmptyComposition("Major");
    composition = placeNote(composition, rows[0], 8, 4); // C3
    composition = placeNote(composition, rows.at(-1)!, 8, 4); // C6

    const events = renderComposition(composition, "Major", BEAT_SECONDS);
    expect(events).toHaveLength(2);
    expect(events.map((e) => e.pitchName).sort()).toEqual(["C3", "C6"]);
    expect(events[0].startSeconds).toBe(events[1].startSeconds);
  });

  it("a target-style transform at the new lower extreme still preserves timing -- only pitch is free to differ", () => {
    const lowestStep = pitchRowsForScale("Major")[0];
    const composition: Composition = { sourceScale: "Major", notes: [note(lowestStep, 12, 3)] };

    const asMajor = renderComposition(composition, "Major", BEAT_SECONDS);
    const asHijaz = renderComposition(composition, "Hijaz", BEAT_SECONDS);

    expect(asMajor[0].startSeconds).toBe(asHijaz[0].startSeconds);
    expect(asMajor[0].durationSeconds).toBe(asHijaz[0].durationSeconds);
    expect(asMajor[0].pitchName).toBe("C3");
  });

  it("presets still load with their exact original scaleSteps -- the wider window is editing headroom, not a transposition", () => {
    expect(sequentialToComposition(TWINKLE_TWINKLE).notes[0].scaleStep).toBe(0);
    expect(sequentialToComposition(JOY_TO_THE_WORLD).notes.map((n) => n.scaleStep)).toEqual([
      7, 6, 5, 4, 3, 2, 1, 0,
    ]);
    const moliHuaSteps = sequentialToComposition(MO_LI_HUA).notes.map((n) => n.scaleStep);
    expect(Math.min(...moliHuaSteps)).toBe(-2);
    expect(Math.max(...moliHuaSteps)).toBe(5);
  });
});

describe("transformCompositionNote", () => {
  it("is deterministic: the same inputs always produce the same output", () => {
    const target = note(3, 0, 4);
    const first = transformCompositionNote(target, "Major", "Hijaz");
    const second = transformCompositionNote(target, "Major", "Hijaz");
    expect(second).toBe(first);
  });

  it("matches transformMelody's single-note output for a plain, non-repeated degree", () => {
    const target = note(2, 0, 4);
    const viaComposition = transformCompositionNote(target, "Major", "Natural Minor");

    const asMelody: Melody = { name: "", tonic: "C4", sourceScale: "Major", notes: [n(2, 1)] };
    const viaMelody = transformMelody(asMelody, "Natural Minor")[0];

    expect(viaComposition).toBe(viaMelody);
  });

  it("diverges from transformMelody's phrase-aware run-splitting for a repeated fa (documented tradeoff)", () => {
    // Two repeated "fa" notes (Major scaleStep 3) bridged into Major
    // Pentatonic. transformMelody sees an adjacent run and alternates
    // between the two bracketing pentatonic neighbours
    // (pentatonicBridge.ts); each composition note is transformed alone, so
    // both always land on the same single nearest neighbour instead. This
    // pins the documented limitation down as a real, tested behaviour
    // rather than an unverified comment.
    const repeatedFaMelody: Melody = { name: "", tonic: "C4", sourceScale: "Major", notes: [n(3, 1), n(3, 1)] };
    const viaMelody = transformMelody(repeatedFaMelody, "Major Pentatonic");
    expect(viaMelody[0]).not.toBe(viaMelody[1]); // the sequential path alternates

    const target = note(3, 0, 4);
    const first = transformCompositionNote(target, "Major", "Major Pentatonic");
    const second = transformCompositionNote(target, "Major", "Major Pentatonic");
    expect(first).toBe(second); // the independent path always lands on the same neighbour
  });
});

describe("transformCompositionNoteToTargetStep / transformCompositionToTarget", () => {
  it("7->7: a same-cardinality substitution keeps the note on its own scaleStep row, only its pitch differs", () => {
    // Major mi (scaleStep 2, semitone 4) vs Natural Minor's scaleStep 2
    // (semitone 3, a minor third) -- different pitch, but substituteDegrees
    // preserves the degree index across equal cardinalities, so the target
    // row is unchanged.
    const target = note(2, 0, 4);
    const pitch = transformCompositionNote(target, "Major", "Natural Minor");
    const step = transformCompositionNoteToTargetStep(target, "Major", "Natural Minor");

    expect(pitch).toBe("D#4");
    expect(step).toBe(2);
  });

  it("5->5: a same-cardinality substitution keeps the note on its own scaleStep row", () => {
    // Major Pentatonic re (scaleStep 1, semitone 2) vs In Sen's scaleStep 1
    // (semitone 1) -- different pitch, same row.
    const target = note(1, 0, 4);
    const pitch = transformCompositionNote(target, "Major Pentatonic", "In Sen");
    const step = transformCompositionNoteToTargetStep(target, "Major Pentatonic", "In Sen");

    expect(pitch).toBe("C#4");
    expect(step).toBe(1);
  });

  it("7->5 canonical bridge: a do/re/mi/sol/la degree maps to its identical pentatonic row", () => {
    // Major sol (scaleStep 4, semitone 7) sits at Major Pentatonic degree 3.
    const step = transformCompositionNoteToTargetStep(note(4, 0, 4), "Major", "Major Pentatonic");
    expect(step).toBe(3);
  });

  it("7->5 canonical bridge: fa and ti bridge to their documented nearest-neighbour pentatonic row", () => {
    // Matches pentatonicBridge.test.ts's single-note fa/ti expectations:
    // fa (scaleStep 3) -> the mi slot (pentatonic scaleStep 2), same octave;
    // ti (scaleStep 6) -> the do slot one octave up (pentatonic scaleStep 5).
    expect(transformCompositionNoteToTargetStep(note(3, 0, 4), "Major", "Major Pentatonic")).toBe(2);
    expect(transformCompositionNoteToTargetStep(note(6, 0, 4), "Major", "Major Pentatonic")).toBe(5);
  });

  it("5->7 canonical bridge: pure relabel, matching embedPentatonicIntoMajor's degree table", () => {
    // Major Pentatonic la (scaleStep 3, semitone 9) embeds into Major's
    // sol (scaleStep 4, semitone 9 too -- Major degree 4).
    const step = transformCompositionNoteToTargetStep(note(3, 0, 4), "Major Pentatonic", "Major");
    expect(step).toBe(4);
  });

  it("preserves startStep/lengthSteps exactly across a 7->5 bridge -- transformation only ever moves pitch", () => {
    const composition: Composition = {
      sourceScale: "Major",
      notes: [note(4, 0, 4), note(3, 8, 2)],
    };
    const transformed = transformCompositionToTarget(composition, "Major Pentatonic");

    expect(transformed.notes.map((n) => [n.startStep, n.lengthSteps])).toEqual(
      composition.notes.map((n) => [n.startStep, n.lengthSteps]),
    );
  });

  it("preserves polyphony: two notes sharing a startStep on different rows both survive with independent target rows", () => {
    const composition: Composition = {
      sourceScale: "Major",
      notes: [note(4, 8, 4), note(3, 8, 4)], // sol and fa, simultaneous
    };
    const transformed = transformCompositionToTarget(composition, "Major Pentatonic");

    expect(transformed.notes).toHaveLength(2);
    expect(transformed.notes).toContainEqual(note(3, 8, 4)); // sol -> pentatonic degree 3
    expect(transformed.notes).toContainEqual(note(2, 8, 4)); // fa -> pentatonic mi slot
  });

  it("is pure: the input composition and its notes array are left untouched", () => {
    const original: Composition = { sourceScale: "Major", notes: [note(4, 0, 4), note(3, 8, 2)] };
    const originalNotesCopy = original.notes.map((n) => ({ ...n }));

    transformCompositionToTarget(original, "Hijaz");

    expect(original.notes).toEqual(originalNotesCopy);
  });

  it("identity when target === source: every note's scaleStep is reproduced unchanged", () => {
    const composition: Composition = {
      sourceScale: "Major",
      notes: [note(0, 0, 4), note(4, 8, 2), note(3, 12, 1)],
    };
    const transformed = transformCompositionToTarget(composition, composition.sourceScale);
    expect(transformed.notes).toEqual(composition.notes);
  });
});

describe("renderComposition", () => {
  it("preserves each note's start time and duration across a target-scale change -- only pitch is free to differ", () => {
    const composition: Composition = {
      sourceScale: "Major",
      notes: [note(0, 0, 4), note(2, 8, 2)],
    };

    const asMajor = renderComposition(composition, "Major", BEAT_SECONDS);
    const asHijaz = renderComposition(composition, "Hijaz", BEAT_SECONDS);

    expect(asMajor.map((e) => [e.startSeconds, e.durationSeconds])).toEqual(
      asHijaz.map((e) => [e.startSeconds, e.durationSeconds]),
    );
    expect(asMajor[0].startSeconds).toBe(0);
    expect(asMajor[1].startSeconds).toBe((8 / STEPS_PER_BEAT) * BEAT_SECONDS);
  });

  it("keeps simultaneous notes simultaneous: two notes sharing a startStep render to the same startSeconds", () => {
    const composition: Composition = {
      sourceScale: "Major",
      notes: [note(0, 4, 4), note(4, 4, 4)],
    };

    const events = renderComposition(composition, "Major", BEAT_SECONDS);

    expect(events).toHaveLength(2);
    expect(events[0].startSeconds).toBe(events[1].startSeconds);
    expect(events[0].pitchName).not.toBe(events[1].pitchName);
  });
});
