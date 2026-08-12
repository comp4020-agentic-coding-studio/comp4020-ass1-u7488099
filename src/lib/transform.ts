// The one public entry point for turning a melody into a note sequence
// under a different scale. Dispatches between the two transform families by
// comparing cardinality: equal-cardinality scales (e.g. two 7-note diatonic
// scales) get degree-preserving substitution (scales.ts#substituteDegrees);
// unequal cardinality (e.g. a 7-note melody onto a 5-note pentatonic, or a
// 12-note chromatic melody onto either) gets nearest-pitch quantization
// (quantize.ts#quantizeToScale). Callers never need to know which family
// handled their request.
import type { Melody } from "./melodies.ts";
import { SCALES, substituteDegrees } from "./scales.ts";
import { quantizeToScale } from "./quantize.ts";

export function transformMelody(melody: Melody, targetScaleName: string): string[] {
  const sourceCardinality = SCALES[melody.sourceScale]?.length;
  if (sourceCardinality === undefined) throw new Error(`unknown scale: "${melody.sourceScale}"`);
  const targetCardinality = SCALES[targetScaleName]?.length;
  if (targetCardinality === undefined) throw new Error(`unknown scale: "${targetScaleName}"`);

  return sourceCardinality === targetCardinality
    ? substituteDegrees(melody, targetScaleName)
    : quantizeToScale(melody, targetScaleName);
}

// The melody rendered in its own declared source scale -- "the original,
// unquantized/unsubstituted pitches" as an on-demand render rather than a
// stored array.
export function renderNative(melody: Melody): string[] {
  return transformMelody(melody, melody.sourceScale);
}
