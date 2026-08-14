// The one lossy hop in the canonical-route transformation model: every
// 7-note source maps degree-for-degree into Major, every 5-note source maps
// degree-for-degree into Major Pentatonic, Major Pentatonic embeds into
// Major identically (do/re/mi/sol/la share the same semitones), and this
// module supplies the only non-identity step -- Major -> Major Pentatonic,
// where fa and ti have no pentatonic slot and must bridge to a neighbour.
// Every other hop in the pipeline is unambiguous degree-index substitution
// (scales.ts#substituteDegrees); see transform.ts for how they compose.
//
// Both exported functions work purely in scaleStep/degree/octave space --
// never touching absolute pitch strings or the tonic -- so the bridge stays
// pure, deterministic, and tonic-agnostic like the rest of the engine.

import { isRest, type MelodyEvent, type MelodyNote } from "./melodies.ts";
import { nearestOffsetAbove, nearestOffsetBelow, nearestSignedOffset } from "./quantize.ts";
import { SCALES } from "./scales.ts";

const MAJOR = SCALES.Major;
const MAJOR_PENTATONIC = SCALES["Major Pentatonic"];

// majorDegree -> pentatonicDegree, derived from the SCALES catalog itself
// (not a hardcoded parallel table) so an edit to SCALES.Major/["Major
// Pentatonic"] can't silently desync this module. Only defined for the
// degrees present in both scales -- do/re/mi/sol/la.
const MAJOR_TO_PENTATONIC_DEGREE = new Map<number, number>(
  MAJOR.map((semitone, degree) => [degree, MAJOR_PENTATONIC.indexOf(semitone)] as [number, number]).filter(
    ([, pentatonicDegree]) => pentatonicDegree !== -1,
  ),
);

// Fail fast and loudly if SCALES ever changes under this module's feet --
// the whole bridge design depends on fa (degree 3) and ti (degree 6) being
// exactly the two Major degrees missing from Major Pentatonic.
const missingMajorDegrees = MAJOR.map((_, degree) => degree).filter(
  (degree) => !MAJOR_TO_PENTATONIC_DEGREE.has(degree),
);
if (missingMajorDegrees.length !== 2 || !missingMajorDegrees.includes(3) || !missingMajorDegrees.includes(6)) {
  throw new Error(
    `pentatonicBridge assumes exactly Major's fa (degree 3) and ti (degree 6) are missing from Major ` +
      `Pentatonic; got missing degrees [${missingMajorDegrees.join(",")}] -- SCALES.Major/["Major Pentatonic"] ` +
      `changed underneath this module.`,
  );
}

// pentatonicDegree -> majorDegree, the inverse -- always defined since
// Major Pentatonic is a subset of Major with no gaps on its own side.
const PENTATONIC_TO_MAJOR_DEGREE = MAJOR_PENTATONIC.map((semitone) => MAJOR.indexOf(semitone));

interface PentatonicTarget {
  degree: number;
  octaveOffset: number; // relative to the source Major note's own octave
}

// Resolves a signed semitone offset from a Major pitch class (fa=5 or
// ti=11) into the Major Pentatonic degree it lands on, handling the
// semitone-12 wrap explicitly -- ti's nearest neighbour is an octave up.
function resolveBridgeTarget(pitchClass: number, offset: number): PentatonicTarget {
  const raw = pitchClass + offset;
  const octaveOffset = Math.floor(raw / 12);
  const wrapped = ((raw % 12) + 12) % 12;
  const degree = MAJOR_PENTATONIC.indexOf(wrapped);
  return { degree, octaveOffset };
}

// Single-note (non-repeated) bridge targets -- fixed constants, since fa and
// ti's pitch classes are always 5 and 11 regardless of tonic or octave.
const FA_SINGLE = resolveBridgeTarget(5, nearestSignedOffset(5, MAJOR_PENTATONIC));
const TI_SINGLE = resolveBridgeTarget(11, nearestSignedOffset(11, MAJOR_PENTATONIC));

// Repeated-run brackets: the two Major Pentatonic neighbours bracketing the
// missing degree, ordered nearest-first (same lower-tie-break convention as
// quantize.ts#splitRepeatedRun, though fa/ti never actually tie here).
function bridgeRunOrder(pitchClass: number): [PentatonicTarget, PentatonicTarget] {
  const belowOffset = nearestOffsetBelow(pitchClass, MAJOR_PENTATONIC);
  const aboveOffset = nearestOffsetAbove(pitchClass, MAJOR_PENTATONIC);
  if (belowOffset === null || aboveOffset === null) {
    throw new Error(`no Major Pentatonic neighbour bracketing pitch class ${pitchClass}`);
  }
  const below = resolveBridgeTarget(pitchClass, belowOffset);
  const above = resolveBridgeTarget(pitchClass, aboveOffset);
  return Math.abs(belowOffset) <= Math.abs(aboveOffset) ? [below, above] : [above, below];
}

const FA_RUN_ORDER = bridgeRunOrder(5);
const TI_RUN_ORDER = bridgeRunOrder(11);

function degreeOctave(scaleStep: number, cardinality: number): { degree: number; octave: number } {
  const degree = ((scaleStep % cardinality) + cardinality) % cardinality;
  const octave = Math.floor(scaleStep / cardinality);
  return { degree, octave };
}

function toScaleStep(target: PentatonicTarget, sourceOctave: number): number {
  return target.degree + MAJOR_PENTATONIC.length * (sourceOctave + target.octaveOffset);
}

// Major Pentatonic -> Major: pure relabel, never ambiguous. Major
// Pentatonic embeds into Major with no missing degrees on its own side, so
// there's nothing to bridge or split here.
export function embedPentatonicIntoMajor(notes: MelodyEvent[]): MelodyEvent[] {
  return notes.map((event) => {
    if (isRest(event)) return event;
    const { degree, octave } = degreeOctave(event.scaleStep, MAJOR_PENTATONIC.length);
    return { ...event, scaleStep: PENTATONIC_TO_MAJOR_DEGREE[degree] + MAJOR.length * octave };
  });
}

// Major -> Major Pentatonic: identity for do/re/mi/sol/la; fa and ti bridge
// to their nearest pentatonic neighbour, with repeated-run splitting so a
// genuinely repeated fa/ti doesn't fuse into whatever legal note follows it
// (same phrase-aware motivation as quantize.ts#splitRepeatedRun, rescoped to
// this one bridge instead of an arbitrary target scale). A rest breaks run
// adjacency, matching quantizeToScale's existing rule.
export function bridgeMajorIntoPentatonic(notes: MelodyEvent[]): MelodyEvent[] {
  const result: MelodyEvent[] = Array.from({ length: notes.length });
  let previousPentatonicStep: number | null = null;
  let i = 0;

  while (i < notes.length) {
    const event = notes[i];
    if (isRest(event)) {
      result[i] = event;
      previousPentatonicStep = null;
      i++;
      continue;
    }

    const { degree, octave } = degreeOctave(event.scaleStep, MAJOR.length);
    const identityDegree = MAJOR_TO_PENTATONIC_DEGREE.get(degree);

    if (identityDegree !== undefined) {
      const step = identityDegree + MAJOR_PENTATONIC.length * octave;
      result[i] = { ...event, scaleStep: step };
      previousPentatonicStep = step;
      i++;
      continue;
    }

    // fa (degree 3) or ti (degree 6) -- find the run of consecutive
    // identical Major notes (same scaleStep; a rest breaks the run).
    let j = i;
    while (j + 1 < notes.length) {
      const next = notes[j + 1];
      if (next === undefined || isRest(next) || next.scaleStep !== event.scaleStep) break;
      j++;
    }
    const runLength = j - i + 1;
    const single = degree === 3 ? FA_SINGLE : TI_SINGLE;
    let order = degree === 3 ? FA_RUN_ORDER : TI_RUN_ORDER;

    if (runLength === 1) {
      const step = toScaleStep(single, octave);
      result[i] = { ...event, scaleStep: step };
      previousPentatonicStep = step;
      i++;
      continue;
    }

    if (previousPentatonicStep !== null && toScaleStep(order[0], octave) === previousPentatonicStep) {
      order = [order[1], order[0]];
    }

    for (let k = 0; k < runLength; k++) {
      const original = notes[i + k] as MelodyNote;
      result[i + k] = { type: "note", scaleStep: toScaleStep(order[k % 2], octave), duration: original.duration };
    }
    previousPentatonicStep = toScaleStep(order[(runLength - 1) % 2], octave);
    i = j + 1;
  }

  return result;
}
