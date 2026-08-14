// Nearest-note quantization: a second transformation family, for target
// scales with a different cardinality than the source melody's scale.
// scales.ts#substituteDegrees's scale-degree substitution assumes matching
// cardinality (each degree maps to one target interval); wrapping a
// 7-degree melody directly around a 5-note scale can turn a step into a
// leap the original never had. This family instead keeps every note's
// absolute register and
// only moves a pitch when it isn't already a member of the target scale --
// to whichever member is nearest in semitones. Two different source
// pitches landing on the same target pitch ("note collapsing") is an
// expected, visible consequence of restricting a melody to a smaller
// palette, not a bug to hide.
//
// One case is worth actively fixing rather than just accepting, though: a
// *repeated* source pitch that isn't legal (e.g. Twinkle's "fa fa" before
// "mi mi") would, under plain nearest-note, route every repetition to the
// same legal tone -- fusing what were two audibly distinct notes into one
// long held note, and often fusing straight into whatever legal run already
// follows. `splitRepeatedRun` below handles exactly that case by spreading
// the run across the two legal tones bracketing the missing pitch instead
// of collapsing it onto one. A single (non-repeated) missing note still
// just takes the nearest legal tone, unchanged.

import { RENDERED_REST, type Melody } from "./melodies.ts";
import { noteToSemitone, parseNote, SCALES, semitoneToNoteName, substituteDegrees } from "./scales.ts";

// Signed semitone offset from `pitchClass` to the nearest member of
// `targetPitchClasses`, in range (-6, 6]. On an exact tie between two
// equally-near members (one above, one below), the lower one wins --
// documented, arbitrary, deterministic.
function nearestSignedOffset(pitchClass: number, targetPitchClasses: number[]): number {
  let bestOffset = Infinity;
  let bestDistance = Infinity;
  for (const target of targetPitchClasses) {
    const up = (((target - pitchClass) % 12) + 12) % 12; // 0..11, distance moving upward
    const offset = up <= 6 ? up : up - 12; // signed equivalent, range (-6, 6]
    const distance = Math.abs(offset);
    if (distance < bestDistance || (distance === bestDistance && offset < bestOffset)) {
      bestDistance = distance;
      bestOffset = offset;
    }
  }
  return bestOffset;
}

// Smallest positive offset (1..11) that lands on a member of
// `targetPitchClasses`, or null if none exists within an octave above.
function nearestOffsetAbove(pitchClass: number, targetPitchClasses: number[]): number | null {
  for (let d = 1; d <= 11; d++) {
    if (targetPitchClasses.includes(((pitchClass + d) % 12 + 12) % 12)) return d;
  }
  return null;
}

// Smallest-magnitude negative offset (-1..-11) that lands on a member of
// `targetPitchClasses`, or null if none exists within an octave below.
function nearestOffsetBelow(pitchClass: number, targetPitchClasses: number[]): number | null {
  for (let d = 1; d <= 11; d++) {
    if (targetPitchClasses.includes(((pitchClass - d) % 12 + 12) % 12)) return -d;
  }
  return null;
}

// Phrase-aware fix for repeated missing pitches: a run of 2+ consecutive
// source notes at the exact same (illegal) pitch would otherwise all route
// to the same nearest legal tone, silently fusing the whole run into
// whatever legal note/run already sits next to it (e.g. Twinkle's "F F E E"
// under Major Pentatonic collapsing to "E E E E"). Instead, split the run
// across the two legal tones bracketing the missing pitch (nearest one
// first, same lower-tie-break convention as the single-note case), and
// alternate between them across the run. If the run's first note would
// otherwise repeat the pitch immediately preceding it -- fusing with
// already-placed material rather than just within the run -- swap the
// order so the run still reads as a change from what came before.
function splitRepeatedRun(
  absoluteSemitone: number,
  pitchClass: number,
  targetPitchClasses: number[],
  runLength: number,
  precedingSemitone: number | null,
): string[] {
  const belowOffset = nearestOffsetBelow(pitchClass, targetPitchClasses);
  const aboveOffset = nearestOffsetAbove(pitchClass, targetPitchClasses);

  if (belowOffset === null || aboveOffset === null) {
    // No bracketing tone on one side -- not expected for the scales this
    // module knows about, but fall back to plain nearest-note rather than
    // guessing.
    const noteName = semitoneToNoteName(absoluteSemitone + nearestSignedOffset(pitchClass, targetPitchClasses));
    return Array.from({ length: runLength }, () => noteName);
  }

  let order: [number, number] =
    Math.abs(belowOffset) <= Math.abs(aboveOffset) ? [belowOffset, aboveOffset] : [aboveOffset, belowOffset];

  if (precedingSemitone !== null && absoluteSemitone + order[0] === precedingSemitone) {
    order = [order[1], order[0]];
  }

  return Array.from({ length: runLength }, (_, k) => semitoneToNoteName(absoluteSemitone + order[k % 2]));
}

// Exported for tests that exercise the core snapping/splitting logic
// against synthetic pitch arrays with no melody or tonic behind them.
export function quantizePitches(notes: string[], targetPitchClasses: number[]): string[] {
  if (notes.length === 0) return [];

  const result: string[] = Array.from({ length: notes.length });
  let i = 0;
  while (i < notes.length) {
    if (notes[i] === RENDERED_REST) {
      result[i] = RENDERED_REST;
      i++;
      continue;
    }

    const absoluteSemitone = noteToSemitone(parseNote(notes[i]));
    const pitchClass = ((absoluteSemitone % 12) + 12) % 12;

    if (targetPitchClasses.includes(pitchClass)) {
      result[i] = notes[i];
      i++;
      continue;
    }

    let j = i;
    while (
      j + 1 < notes.length &&
      notes[j + 1] !== RENDERED_REST &&
      noteToSemitone(parseNote(notes[j + 1])) === absoluteSemitone
    ) {
      j++;
    }
    const runLength = j - i + 1;

    if (runLength === 1) {
      result[i] = semitoneToNoteName(absoluteSemitone + nearestSignedOffset(pitchClass, targetPitchClasses));
    } else {
      const precedingSemitone =
        i > 0 && result[i - 1] !== RENDERED_REST ? noteToSemitone(parseNote(result[i - 1])) : null;
      const run = splitRepeatedRun(absoluteSemitone, pitchClass, targetPitchClasses, runLength, precedingSemitone);
      for (let k = 0; k < runLength; k++) result[i + k] = run[k];
    }

    i = j + 1;
  }

  return result;
}

// --- Unified model (see transform.ts) -------------------------------------
//
// Renders the melody in its own source scale first (so every note has an
// absolute register to quantize from), then snaps each pitch not already
// in targetScaleName onto the nearest member via the shared
// nearestSignedOffset/splitRepeatedRun logic above. Works for any
// cardinality pairing; transform.ts picks this over substituteDegrees
// whenever cardinalities differ.
export function quantizeToScale(melody: Melody, targetScaleName: string): string[] {
  const targetIntervals = SCALES[targetScaleName];
  if (!targetIntervals) throw new Error(`unknown scale: "${targetScaleName}"`);
  const native = substituteDegrees(melody, melody.sourceScale);
  return quantizePitches(native, targetIntervals);
}
