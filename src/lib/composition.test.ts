import { describe, expect, it } from "vitest";
import { BEAT_SECONDS } from "./audio.ts";
import {
  type Composition,
  type CompositionNote,
  createEmptyComposition,
  pitchRowsForScale,
  renderComposition,
  sequentialToComposition,
  STEPS_PER_BEAT,
  transformCompositionNote,
} from "./composition.ts";
import { r, type Melody, type MelodyNote } from "./melodies.ts";
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
  it("returns two octaves (2 * cardinality rows), tonic-up, for a 7-note scale", () => {
    expect(pitchRowsForScale("Major")).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]);
  });

  it("returns two octaves (2 * cardinality rows), tonic-up, for a 5-note scale", () => {
    expect(pitchRowsForScale("Major Pentatonic")).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });

  it("throws for an unknown scale name", () => {
    expect(() => pitchRowsForScale("nonexistent")).toThrow(/unknown scale/);
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
