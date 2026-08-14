// The one public entry point for turning a melody into a note sequence
// under a different scale. Every non-chromatic cardinality pairing routes
// through the two canonical reference scales, Major (7-note) and Major
// Pentatonic (5-note), with exactly one lossy hop between them
// (pentatonicBridge.ts#bridgeMajorIntoPentatonic, the only place fa/ti need
// adapting -- Major Pentatonic embeds into Major identically the other
// way). Equal-cardinality pairs are pure degree-index substitution
// (scales.ts#substituteDegrees), same as always. `Chromatic / Free` doesn't
// fit either reference scale and keeps using the older direct nearest-pitch
// quantization (quantize.ts#quantizeToScale) as a fallback. Callers never
// need to know which path handled their request.
import type { Melody } from "./melodies.ts";
import { bridgeMajorIntoPentatonic, embedPentatonicIntoMajor } from "./pentatonicBridge.ts";
import { quantizeToScale } from "./quantize.ts";
import { SCALES, substituteDegrees } from "./scales.ts";

export function transformMelody(melody: Melody, targetScaleName: string): string[] {
  const sourceCardinality = SCALES[melody.sourceScale]?.length;
  if (sourceCardinality === undefined) throw new Error(`unknown scale: "${melody.sourceScale}"`);
  const targetCardinality = SCALES[targetScaleName]?.length;
  if (targetCardinality === undefined) throw new Error(`unknown scale: "${targetScaleName}"`);

  if (melody.sourceScale === "Chromatic / Free" || targetScaleName === "Chromatic / Free") {
    return sourceCardinality === targetCardinality
      ? substituteDegrees(melody, targetScaleName)
      : quantizeToScale(melody, targetScaleName);
  }

  if (sourceCardinality === targetCardinality) {
    return substituteDegrees(melody, targetScaleName); // 5->5 / 7->7, unchanged
  }

  if (sourceCardinality === 5 && targetCardinality === 7) {
    const asMajor = embedPentatonicIntoMajor(melody.notes);
    return substituteDegrees({ ...melody, sourceScale: "Major", notes: asMajor }, targetScaleName);
  }

  if (sourceCardinality === 7 && targetCardinality === 5) {
    // melody.notes' scaleStep is already valid Major-degree space --
    // substituteDegrees ignores melody.sourceScale, so no reindex needed here.
    const asPentatonic = bridgeMajorIntoPentatonic(melody.notes);
    return substituteDegrees({ ...melody, sourceScale: "Major Pentatonic", notes: asPentatonic }, targetScaleName);
  }

  throw new Error(`unsupported cardinality pairing: ${melody.sourceScale} -> ${targetScaleName}`);
}

// The melody rendered in its own declared source scale -- "the original,
// unquantized/unsubstituted pitches" as an on-demand render rather than a
// stored array.
export function renderNative(melody: Melody): string[] {
  return transformMelody(melody, melody.sourceScale);
}
