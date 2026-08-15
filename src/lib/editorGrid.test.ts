import { describe, expect, it } from "vitest";
import type { Composition, CompositionNote } from "./composition.ts";
import { TOTAL_STEPS } from "./composition.ts";
import {
  BLOCKS,
  clampDragEnd,
  commitDrag,
  noteAt,
  pitchLabel,
  placeNote,
  removeNoteAt,
  resizeNote,
  stepForBlockColumn,
  STEPS_PER_BLOCK,
} from "./editorGrid.ts";

const note = (scaleStep: number, startStep: number, lengthSteps: number): CompositionNote => ({
  type: "note",
  scaleStep,
  startStep,
  lengthSteps,
});

const composition = (notes: CompositionNote[]): Composition => ({ sourceScale: "Major", notes });

describe("noteAt", () => {
  it("finds the note whose span contains the given step", () => {
    const c = composition([note(2, 4, 4)]);
    expect(noteAt(c, 2, 4)).toEqual(note(2, 4, 4));
    expect(noteAt(c, 2, 7)).toEqual(note(2, 4, 4));
  });

  it("returns undefined just past a note's span", () => {
    const c = composition([note(2, 4, 4)]);
    expect(noteAt(c, 2, 8)).toBeUndefined();
  });

  it("ignores notes on a different row", () => {
    const c = composition([note(2, 4, 4)]);
    expect(noteAt(c, 3, 4)).toBeUndefined();
  });
});

describe("placeNote", () => {
  it("returns a new composition with the note appended, leaving the input untouched", () => {
    const original = composition([]);
    const result = placeNote(original, 0, 0, 4);

    expect(original.notes).toEqual([]);
    expect(result.notes).toEqual([note(0, 0, 4)]);
  });

  it("supports polyphony: two notes at the same startStep on different rows both survive", () => {
    let c = composition([]);
    c = placeNote(c, 0, 8, 4);
    c = placeNote(c, 4, 8, 4);

    expect(c.notes).toHaveLength(2);
    expect(c.notes).toContainEqual(note(0, 8, 4));
    expect(c.notes).toContainEqual(note(4, 8, 4));
  });
});

describe("removeNoteAt", () => {
  it("removes whichever note occupies that row/step", () => {
    const c = composition([note(2, 4, 4), note(3, 0, 2)]);
    const result = removeNoteAt(c, 2, 6);
    expect(result.notes).toEqual([note(3, 0, 2)]);
  });

  it("is a no-op when no note occupies that row/step", () => {
    const c = composition([note(2, 4, 4)]);
    const result = removeNoteAt(c, 2, 0);
    expect(result.notes).toEqual(c.notes);
  });
});

describe("clampDragEnd", () => {
  it("passes through an unobstructed rightward drag unchanged", () => {
    const c = composition([]);
    expect(clampDragEnd(c, 0, 4, 10)).toBe(10);
  });

  it("passes through an unobstructed leftward drag unchanged", () => {
    const c = composition([]);
    expect(clampDragEnd(c, 0, 10, 4)).toBe(4);
  });

  it("clamps a rightward drag to one column short of the next occupied cell on the same row", () => {
    const c = composition([note(0, 12, 4)]); // occupies steps 12-15
    expect(clampDragEnd(c, 0, 4, 20)).toBe(11);
  });

  it("clamps a leftward drag to one column short of the previous occupied cell on the same row", () => {
    const c = composition([note(0, 0, 4)]); // occupies steps 0-3
    expect(clampDragEnd(c, 0, 20, 0)).toBe(4);
  });

  it("ignores obstacles on a different row", () => {
    const c = composition([note(1, 6, 2)]);
    expect(clampDragEnd(c, 0, 4, 20)).toBe(20);
  });

  it("clamps to the grid bounds when there is no obstacle", () => {
    const c = composition([]);
    expect(clampDragEnd(c, 0, 4, -5)).toBe(0);
    expect(clampDragEnd(c, 0, 4, 99999)).toBe(TOTAL_STEPS - 1);
  });
});

describe("commitDrag", () => {
  it("places a length-1 note for a zero-movement drag (mouse click and keyboard Enter share this path)", () => {
    const c = composition([]);
    const result = commitDrag(c, 2, 5, 5);
    expect(result.notes).toEqual([note(2, 5, 1)]);
  });

  it("places a multi-column note spanning anchor to end, rightward", () => {
    const c = composition([]);
    const result = commitDrag(c, 2, 5, 9);
    expect(result.notes).toEqual([note(2, 5, 5)]);
  });

  it("places a multi-column note spanning anchor to end, leftward, normalising startStep", () => {
    const c = composition([]);
    const result = commitDrag(c, 2, 9, 5);
    expect(result.notes).toEqual([note(2, 5, 5)]);
  });

  it("clamps against an existing same-row note rather than overwriting it", () => {
    const c = composition([note(2, 12, 4)]);
    const result = commitDrag(c, 2, 5, 20);
    expect(result.notes).toContainEqual(note(2, 5, 7)); // 5..11, stopping short of 12
    expect(result.notes).toContainEqual(note(2, 12, 4)); // untouched
  });
});

describe("resizeNote", () => {
  it("grows a note from its right edge", () => {
    const c = composition([note(2, 4, 2)]);
    const result = resizeNote(c, 2, 4, 3);
    expect(result.notes).toEqual([note(2, 4, 5)]);
  });

  it("shrinks a note from its right edge", () => {
    const c = composition([note(2, 4, 5)]);
    const result = resizeNote(c, 2, 4, -2);
    expect(result.notes).toEqual([note(2, 4, 3)]);
  });

  it("removes the note entirely when shrunk to zero or below", () => {
    const c = composition([note(2, 4, 2)]);
    const result = resizeNote(c, 2, 4, -2);
    expect(result.notes).toEqual([]);
  });

  it("clamps growth at the grid's edge", () => {
    const start = TOTAL_STEPS - 4;
    const c = composition([note(2, start, 2)]);
    const result = resizeNote(c, 2, start, 10);
    expect(result.notes).toEqual([note(2, start, 4)]); // last 4 steps, ending at TOTAL_STEPS - 1
  });

  it("clamps growth against the next same-row note", () => {
    const c = composition([note(2, 4, 2), note(2, 10, 2)]);
    const result = resizeNote(c, 2, 4, 20);
    expect(result.notes).toContainEqual(note(2, 4, 6)); // 4..9, stopping short of 10
    expect(result.notes).toContainEqual(note(2, 10, 2));
  });

  it("is a no-op when no note starts exactly at the given step", () => {
    const c = composition([note(2, 4, 2)]);
    const result = resizeNote(c, 2, 5, 1);
    expect(result.notes).toEqual(c.notes);
  });
});

describe("pitchLabel", () => {
  it("agrees with the identity transform for a known scaleStep", () => {
    expect(pitchLabel(0, "Major")).toBe("C4");
    expect(pitchLabel(2, "Major")).toBe("E4");
  });

  it("respects the given source scale's own note names", () => {
    expect(pitchLabel(0, "Hijaz")).toBe("C4"); // tonic
    expect(pitchLabel(1, "Hijaz")).toBe("C#4"); // Hijaz's raised 2nd (semitone offset 1)
  });
});

// Guards the block-local-column -> global-startStep mapping the editor page
// renders from. A prior bug drew the bar/beat divider CSS on the wrong edge
// of the leading cell, making the grid visually look shifted by one
// sixteenth even though this mapping itself was already correct -- these
// tests pin the mapping down explicitly so a future regression here (as
// opposed to a CSS-only one) can't hide behind that same illusion.
describe("stepForBlockColumn", () => {
  it("maps the first visual playable cell to startStep 0", () => {
    expect(stepForBlockColumn(0, 0)).toBe(0);
  });

  it("maps the second visual playable cell to startStep 1", () => {
    expect(stepForBlockColumn(0, 1)).toBe(1);
  });

  it("maps the final cell of block 1 to the last step before block 2", () => {
    expect(stepForBlockColumn(0, STEPS_PER_BLOCK - 1)).toBe(STEPS_PER_BLOCK - 1);
  });

  it("maps the first cell of block 2 to startStep STEPS_PER_BLOCK", () => {
    expect(stepForBlockColumn(1, 0)).toBe(STEPS_PER_BLOCK);
  });

  it("maps the final playable cell (last block, last column) to TOTAL_STEPS - 1", () => {
    expect(stepForBlockColumn(BLOCKS - 1, STEPS_PER_BLOCK - 1)).toBe(TOTAL_STEPS - 1);
  });

  it("never maps any playable cell to -1 or TOTAL_STEPS", () => {
    for (let blockIndex = 0; blockIndex < BLOCKS; blockIndex++) {
      for (let col = 0; col < STEPS_PER_BLOCK; col++) {
        const step = stepForBlockColumn(blockIndex, col);
        expect(step).not.toBe(-1);
        expect(step).not.toBe(TOTAL_STEPS);
        expect(step).toBeGreaterThanOrEqual(0);
        expect(step).toBeLessThan(TOTAL_STEPS);
      }
    }
  });

  it("produces exactly TOTAL_STEPS distinct playable positions across all blocks", () => {
    const steps = new Set<number>();
    for (let blockIndex = 0; blockIndex < BLOCKS; blockIndex++) {
      for (let col = 0; col < STEPS_PER_BLOCK; col++) {
        steps.add(stepForBlockColumn(blockIndex, col));
      }
    }
    expect(steps.size).toBe(TOTAL_STEPS);
    expect(Math.min(...steps)).toBe(0);
    expect(Math.max(...steps)).toBe(TOTAL_STEPS - 1);
  });

  it("each block covers exactly STEPS_PER_BLOCK consecutive playable columns", () => {
    expect(STEPS_PER_BLOCK).toBe(TOTAL_STEPS / BLOCKS);
    for (let blockIndex = 0; blockIndex < BLOCKS; blockIndex++) {
      expect(stepForBlockColumn(blockIndex, 0)).toBe(blockIndex * STEPS_PER_BLOCK);
      expect(stepForBlockColumn(blockIndex, STEPS_PER_BLOCK - 1)).toBe((blockIndex + 1) * STEPS_PER_BLOCK - 1);
    }
  });

  it("allows placing a note at step 0", () => {
    const c = composition([]);
    const result = commitDrag(c, 0, stepForBlockColumn(0, 0), stepForBlockColumn(0, 0));
    expect(result.notes).toEqual([note(0, 0, 1)]);
  });

  it("allows placing a note at the final semiquaver of the last bar", () => {
    const c = composition([]);
    const lastStep = stepForBlockColumn(BLOCKS - 1, STEPS_PER_BLOCK - 1);
    const result = commitDrag(c, 0, lastStep, lastStep);
    expect(result.notes).toEqual([note(0, TOTAL_STEPS - 1, 1)]);
  });
});
