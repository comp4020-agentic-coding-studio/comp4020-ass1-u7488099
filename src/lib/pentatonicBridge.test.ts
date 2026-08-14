import { describe, expect, it } from "vitest";
import type { MelodyEvent, MelodyNote } from "./melodies.ts";
import { bridgeMajorIntoPentatonic, embedPentatonicIntoMajor } from "./pentatonicBridge.ts";

const note = (scaleStep: number, duration = 1): MelodyNote => ({ type: "note", scaleStep, duration });
const rest = (duration = 1): MelodyEvent => ({ type: "rest", duration });

function scaleSteps(events: MelodyEvent[]): (number | "rest")[] {
  return events.map((e) => (e.type === "rest" ? "rest" : e.scaleStep));
}

describe("embedPentatonicIntoMajor", () => {
  it("relabels every pentatonic degree to its Major equivalent, same octave", () => {
    // do/re/mi/sol/la (pentatonic degrees 0-4) -> Major degrees 0,1,2,4,5.
    const out = embedPentatonicIntoMajor([0, 1, 2, 3, 4].map((s) => note(s)));
    expect(scaleSteps(out)).toEqual([0, 1, 2, 4, 5]);
  });

  it("carries octave shifts through unchanged", () => {
    const out = embedPentatonicIntoMajor([note(-1), note(5), note(9)]);
    // degree 4 (la) at octave -1 -> Major degree 5, octave -1 -> 5 + 7*-1 = -2
    // degree 0 (do) at octave 1 -> Major degree 0, octave 1 -> 7
    // degree 4 (la) at octave 1 -> Major degree 5, octave 1 -> 12
    expect(scaleSteps(out)).toEqual([-2, 7, 12]);
  });

  it("passes rests through untouched", () => {
    const out = embedPentatonicIntoMajor([note(0), rest(2), note(2)]);
    expect(out[1]).toEqual(rest(2));
  });

  it("is a pure relabel with no run-splitting logic — repeats stay repeats", () => {
    const out = embedPentatonicIntoMajor([note(2), note(2), note(2)]);
    expect(scaleSteps(out)).toEqual([2, 2, 2]);
  });
});

describe("bridgeMajorIntoPentatonic", () => {
  it("is the identity for do/re/mi/sol/la — no split, no octave change", () => {
    const out = bridgeMajorIntoPentatonic([0, 1, 2, 4, 5].map((s) => note(s)));
    expect(scaleSteps(out)).toEqual([0, 1, 2, 3, 4]);
  });

  it("bridges a single fa to the mi slot, same octave", () => {
    expect(scaleSteps(bridgeMajorIntoPentatonic([note(3)]))).toEqual([2]);
  });

  it("bridges a single ti to the do slot, one octave up", () => {
    expect(scaleSteps(bridgeMajorIntoPentatonic([note(6)]))).toEqual([5]);
  });

  it("splits a repeated fa run across mi then sol", () => {
    expect(scaleSteps(bridgeMajorIntoPentatonic([note(3), note(3)]))).toEqual([2, 3]);
    expect(scaleSteps(bridgeMajorIntoPentatonic([note(3), note(3), note(3)]))).toEqual([2, 3, 2]);
  });

  it("splits a repeated ti run across do-next-octave then la", () => {
    expect(scaleSteps(bridgeMajorIntoPentatonic([note(6), note(6)]))).toEqual([5, 4]);
  });

  it("keeps run-bracket octave math correct when the run itself is in a non-zero octave", () => {
    // Major degree 6 (ti) at octave 1 -> scaleStep 13.
    expect(scaleSteps(bridgeMajorIntoPentatonic([note(13), note(13)]))).toEqual([10, 9]);
  });

  it("a rest breaks run adjacency, so each side of it bridges independently", () => {
    const out = bridgeMajorIntoPentatonic([note(3), rest(1), note(3)]);
    expect(scaleSteps(out)).toEqual([2, "rest", 2]);
  });

  it("swaps the run's starting bracket if it would repeat the immediately preceding output", () => {
    // mi (identity -> pentatonic degree 2), then a fa run of 2. Without the
    // swap, fa's first bracket (mi-slot, also degree 2) would silently
    // repeat the preceding mi -- the same fusion bug this whole module
    // exists to prevent, just one hop earlier.
    const out = bridgeMajorIntoPentatonic([note(2), note(3), note(3)]);
    expect(scaleSteps(out)).toEqual([2, 3, 2]);
  });

  it("preserves each note's duration through the bridge", () => {
    const out = bridgeMajorIntoPentatonic([note(3, 2), note(3, 0.5)]);
    expect(out.map((e) => e.duration)).toEqual([2, 0.5]);
  });
});
