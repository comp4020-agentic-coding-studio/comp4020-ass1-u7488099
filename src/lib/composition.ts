// Time-positioned, polyphonic composition model for the custom melody
// editor. Distinct from Melody/MelodyEvent[] (melodies.ts), which is
// sequential and monophonic by design (a piano-roll grid needs explicit
// start times and simultaneous notes, neither of which a running-cursor
// sequence can express) -- presets keep using that model unchanged;
// sequentialToComposition below is the one-way bridge between them.

import type { PlaybackEvent } from "./audio.ts";
import { isRest, type Melody } from "./melodies.ts";
import { noteToSemitone, parseNote, SCALES } from "./scales.ts";
import { transformMelody } from "./transform.ts";

export const BARS = 16;
export const STEPS_PER_BAR = 16; // 4/4, sixteenth-note resolution
export const STEPS_PER_BEAT = 4;
export const TOTAL_STEPS = BARS * STEPS_PER_BAR; // 128

// The whole project is locked to C -- see CLAUDE.md's "canonical-route
// transformation model" (no transpose/key support anywhere) -- so every
// per-note transform below anchors here rather than reading a tonic off
// any particular melody.
const CANONICAL_TONIC = "C4";

export interface CompositionNote {
  type: "note";
  scaleStep: number; // same meaning as MelodyNote.scaleStep -- signed, relative to the tonic
  startStep: number; // 0..TOTAL_STEPS-1, absolute sixteenth-note position
  lengthSteps: number; // duration in sixteenth-note units, >= 1
}

export interface Composition {
  sourceScale: string; // key into scales.ts SCALES; fixes which scaleStep rows are legal
  notes: CompositionNote[]; // sparse and possibly overlapping -- absence is silence, overlap is polyphony
}

export function createEmptyComposition(sourceScale: string): Composition {
  return { sourceScale, notes: [] };
}

// The grid's available pitch rows for a source style, derived from the
// fixed C3-C6 editing range rather than a hardcoded row count. Every entry
// in SCALES starts with 0 (its own tonic sits 0 semitones from the scale's
// root), and CANONICAL_TONIC ("C4") is always scaleStep 0 -- so C is a
// valid scale degree at *every* octave, for every scale, meaning C3 always
// sits at exactly scaleStep -cardinality and C6 always sits at exactly
// scaleStep 2*cardinality. That gives a clean, cardinality-driven window
// with no special-casing: a 7-note scale gets 3*7+1 = 22 rows, a 5-note
// scale gets 3*5+1 = 16 rows, and both span exactly C3 to C6 -- matching
// the visual piano keyboard's own fixed C3-C6 range (see keyboard.ts) so
// the editor and the keyboard always represent the same pitch bounds. This
// is editing headroom, not a transposition: root/octave-register/note-
// count/rhythm are untouched by any of this (see CLAUDE.md's controlled-
// comparison rule) -- widening the row window only changes which rows a
// user *could* place a note on, never what an existing note means.
const EDITOR_LOW_OCTAVE_SHIFT = -1; // C3: one octave below the canonical C4 tonic
const EDITOR_HIGH_OCTAVE_SHIFT = 2; // C6: two octaves above the canonical C4 tonic

export function pitchRowsForScale(sourceScale: string): number[] {
  const cardinality = SCALES[sourceScale]?.length;
  if (cardinality === undefined) throw new Error(`unknown scale: "${sourceScale}"`);
  const start = EDITOR_LOW_OCTAVE_SHIFT * cardinality;
  const end = EDITOR_HIGH_OCTAVE_SHIFT * cardinality;
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}

// The grid's row window for a *specific* composition: pitchRowsForScale's
// C3-C6 default, widened (never narrowed) just enough to include every
// scaleStep the composition actually uses. Every hand-drawn composition
// stays within the default window by construction (the editor UI can only
// place a note on a row it renders), so this only ever matters for a
// transformed target-scale view (transformCompositionToTarget) whose
// mapped scaleSteps might otherwise fall outside that target scale's own
// default C3-C6 window.
export function pitchRowsForComposition(composition: Composition): number[] {
  const base = pitchRowsForScale(composition.sourceScale);
  if (composition.notes.length === 0) return base;
  const steps = composition.notes.map((note) => note.scaleStep);
  const start = Math.min(base[0], ...steps);
  const end = Math.max(base[base.length - 1], ...steps);
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}

// One-way: a preset's sequential MelodyEvent[] -> the editor's
// time-positioned model. Rests have no representation in Composition --
// they're skipped, advancing the cursor without emitting a note, since an
// unlisted time position already reads as silence.
export function sequentialToComposition(melody: Melody): Composition {
  const notes: CompositionNote[] = [];
  let cursor = 0;
  for (const event of melody.notes) {
    const lengthSteps = event.duration * STEPS_PER_BEAT;
    if (!isRest(event)) {
      notes.push({ type: "note", scaleStep: event.scaleStep, startStep: cursor, lengthSteps });
    }
    cursor += lengthSteps;
  }
  return { sourceScale: melody.sourceScale, notes };
}

// Each composition note transforms independently by wrapping it as a
// one-note Melody and calling the existing, unmodified transformMelody --
// no new pitch-mapping logic, per CLAUDE.md's canonical-route rule.
//
// Intentional limitation: because every note is wrapped alone,
// pentatonicBridge's repeated-run alternation (which needs to see adjacent
// identical scaleSteps within one sequential melody) never triggers here --
// a repeated fa/ti always takes the single-note nearest-neighbour bridge
// target, even if two grid notes happen to share a pitch. A polyphonic grid
// has no principled notion of "phrase" for run-splitting to hang off, so
// this doesn't try to invent one; presets are unaffected since they still
// go through transformMelody on their full sequential array.
export function transformCompositionNote(
  note: CompositionNote,
  sourceScale: string,
  targetScaleName: string,
): string {
  const singleton: Melody = {
    name: "",
    tonic: CANONICAL_TONIC,
    sourceScale,
    notes: [{ type: "note", scaleStep: note.scaleStep, duration: 1 }],
  };
  return transformMelody(singleton, targetScaleName)[0];
}

// Inverts substituteDegrees' degree -> semitone formula (tonicSemitone +
// targetIntervals[degree] + 12*octaveShift), reading it backwards from a
// pitch name transformCompositionNote already produced. Not new pitch-
// mapping logic -- same SCALES table, same formula, just read the other
// direction -- and always well-defined because that pitch name is a
// target-scale member by construction (that's the whole point of
// substituteDegrees/the pentatonic bridge).
function scaleStepFromPitchName(pitchName: string, targetScaleName: string): number {
  const targetIntervals = SCALES[targetScaleName];
  if (!targetIntervals) throw new Error(`unknown scale: "${targetScaleName}"`);
  const tonicSemitone = noteToSemitone(parseNote(CANONICAL_TONIC));
  const relative = noteToSemitone(parseNote(pitchName)) - tonicSemitone;
  const octaveShift = Math.floor(relative / 12);
  const pitchClass = relative - 12 * octaveShift;
  const degree = targetIntervals.indexOf(pitchClass);
  if (degree === -1) {
    throw new Error(
      `pitch "${pitchName}" is not a member of "${targetScaleName}" -- transformCompositionNote invariant violated`,
    );
  }
  return degree + targetIntervals.length * octaveShift;
}

// The editor grid's row index for a note once rendered under targetScaleName
// -- lets the piano roll place a transformed note on the row that actually
// matches its target pitch, whatever that scale's cardinality is.
export function transformCompositionNoteToTargetStep(
  note: CompositionNote,
  sourceScale: string,
  targetScaleName: string,
): number {
  return scaleStepFromPitchName(transformCompositionNote(note, sourceScale, targetScaleName), targetScaleName);
}

// A synthetic, display-only Composition: same startStep/lengthSteps as the
// source, each note's scaleStep replaced by its target-scale-space row. This
// exists purely so the editor grid's existing render helpers (noteAt,
// pitchLabel, both in editorGrid.ts) can be reused unchanged for a read-only
// "transformed" row-group -- never assign this to the canonical, editable
// Composition a page holds.
export function transformCompositionToTarget(composition: Composition, targetScaleName: string): Composition {
  return {
    sourceScale: targetScaleName,
    notes: composition.notes.map((note) => ({
      type: "note",
      scaleStep: transformCompositionNoteToTargetStep(note, composition.sourceScale, targetScaleName),
      startStep: note.startStep,
      lengthSteps: note.lengthSteps,
    })),
  };
}

// Renders every note in a composition against targetScaleName, preserving
// each note's own startStep/lengthSteps untouched -- timing is a property
// of the CompositionNote, never of the transform, so a target-style change
// can only ever move pitches, never positions or durations. beatSeconds is
// a parameter (rather than importing BEAT_SECONDS from audio.ts) so this
// module's own runtime dependency on audio.ts stays type-only.
export function renderComposition(
  composition: Composition,
  targetScaleName: string,
  beatSeconds: number,
): PlaybackEvent[] {
  return composition.notes.map((note) => ({
    pitchName: transformCompositionNote(note, composition.sourceScale, targetScaleName),
    startSeconds: (note.startStep / STEPS_PER_BEAT) * beatSeconds,
    durationSeconds: (note.lengthSteps / STEPS_PER_BEAT) * beatSeconds,
  }));
}
