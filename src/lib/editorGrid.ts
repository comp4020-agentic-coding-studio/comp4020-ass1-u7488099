// Pure, DOM-free grid-mutation and hit-testing functions for the composition
// editor. Every mouse gesture and every keyboard gesture in editor.astro
// bottoms out in one of these -- there's exactly one code path per mutation
// type regardless of input device. All functions are pure (no Date.now(),
// Math.random(), or hidden state): same inputs always produce the same
// output, and the input Composition is never mutated in place.

import { type Composition, type CompositionNote, transformCompositionNote, TOTAL_STEPS } from "./composition.ts";

// The grid is split into 4 side-by-side blocks of 2 bars each so it fits the
// screen -- this is the one place block-local column and global startStep
// meet, so editor.astro must route through it rather than computing
// `blockIndex * STEPS_PER_BLOCK + col` inline, where a stray off-by-one
// would be invisible to any test that never renders a real page.
export const BLOCKS = 4;
export const STEPS_PER_BLOCK = TOTAL_STEPS / BLOCKS;

export function stepForBlockColumn(blockIndex: number, col: number): number {
  return blockIndex * STEPS_PER_BLOCK + col;
}

export function noteAt(composition: Composition, scaleStep: number, step: number): CompositionNote | undefined {
  return composition.notes.find(
    (note) => note.scaleStep === scaleStep && step >= note.startStep && step < note.startStep + note.lengthSteps,
  );
}

export function placeNote(
  composition: Composition,
  scaleStep: number,
  startStep: number,
  lengthSteps: number,
): Composition {
  return { ...composition, notes: [...composition.notes, { type: "note", scaleStep, startStep, lengthSteps }] };
}

export function removeNoteAt(composition: Composition, scaleStep: number, step: number): Composition {
  const target = noteAt(composition, scaleStep, step);
  if (!target) return composition;
  return { ...composition, notes: composition.notes.filter((note) => note !== target) };
}

// Stops a proposed drag end one column short of the nearest already-occupied
// cell on the same row, in the direction of the drag -- a drag can never
// overwrite an existing note, only run up against it. The anchor cell itself
// is assumed empty (callers only start a drag from an empty cell), so no
// obstacle check is needed there.
export function clampDragEnd(
  composition: Composition,
  scaleStep: number,
  anchorStep: number,
  proposedEnd: number,
): number {
  const boundedEnd = Math.max(0, Math.min(TOTAL_STEPS - 1, proposedEnd));
  const rowNotes = composition.notes.filter((note) => note.scaleStep === scaleStep);

  if (boundedEnd >= anchorStep) {
    const obstacles = rowNotes.filter((note) => note.startStep > anchorStep);
    const nearest = Math.min(...obstacles.map((note) => note.startStep), TOTAL_STEPS);
    return Math.min(boundedEnd, nearest - 1);
  }

  const obstacles = rowNotes.filter((note) => note.startStep + note.lengthSteps - 1 < anchorStep);
  const nearestEnd = Math.max(...obstacles.map((note) => note.startStep + note.lengthSteps - 1), -1);
  return Math.max(boundedEnd, nearestEnd + 1);
}

// Mouse-drag and keyboard Enter/Space (anchorStep === endStep, a zero-
// movement drag degenerating to a length-1 note) both funnel through here --
// one commit path for both input devices.
export function commitDrag(
  composition: Composition,
  scaleStep: number,
  anchorStep: number,
  endStep: number,
): Composition {
  const clampedEnd = clampDragEnd(composition, scaleStep, anchorStep, endStep);
  const startStep = Math.min(anchorStep, clampedEnd);
  const lengthSteps = Math.abs(clampedEnd - anchorStep) + 1;
  return placeNote(composition, scaleStep, startStep, lengthSteps);
}

// The keyboard Shift+Arrow equivalent of dragging: extends/shrinks the note
// that starts exactly at (scaleStep, startStep) by delta columns from its
// right edge. Shrinking to zero or below removes the note entirely rather
// than leaving a degenerate zero-length note.
export function resizeNote(
  composition: Composition,
  scaleStep: number,
  startStep: number,
  delta: number,
): Composition {
  const index = composition.notes.findIndex((note) => note.scaleStep === scaleStep && note.startStep === startStep);
  if (index === -1) return composition;

  const target = composition.notes[index];
  const proposedLength = target.lengthSteps + delta;
  if (proposedLength <= 0) {
    return { ...composition, notes: composition.notes.filter((_, i) => i !== index) };
  }

  const nextNoteStart = Math.min(
    ...composition.notes
      .filter((note) => note.scaleStep === scaleStep && note.startStep > startStep)
      .map((note) => note.startStep),
    TOTAL_STEPS,
  );
  const clampedLength = Math.min(proposedLength, nextNoteStart - startStep);

  const notes = composition.notes.slice();
  notes[index] = { ...target, lengthSteps: clampedLength };
  return { ...composition, notes };
}

// A row's display pitch name -- routed through transformCompositionNote's
// identity transform (source === target) rather than new pitch-mapping code,
// so the row label always agrees with what that scaleStep actually renders as.
export function pitchLabel(scaleStep: number, sourceScale: string): string {
  return transformCompositionNote({ type: "note", scaleStep, startStep: 0, lengthSteps: 1 }, sourceScale, sourceScale);
}
