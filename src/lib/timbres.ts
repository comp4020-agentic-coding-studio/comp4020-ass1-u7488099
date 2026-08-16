// Scale -> playback timbre registry. Same precedent as themes.ts: a lookup
// keyed by the same 9 scale-name strings index.astro's Target style <select>
// exposes, so audio.ts and index.astro never branch on scale name
// themselves -- index.astro resolves timbreForScale(targetSelect.value) once
// per Play click and passes the resolved definition into playEvents, which
// calls back into createVoice() for every note.
//
// All 9 timbres are real sampled instruments (see sampler.ts, SAMPLES.md for
// sourcing/licenses) played through createSampleVoice() -- Major, Natural
// Minor, Harmonic Minor, Melodic Minor (ascending), and Dorian all share one
// grand piano recording set (the user's own instruction: the four Western
// major/minor styles should share one real piano, not four fake patches --
// Dorian folds into the same piano because no comparably clean, cheaply-
// licensed lightweight folk/acoustic sample set was found, and the
// instruction's own fallback for that case is piano); Phrygian plays a real
// steel-string acoustic guitar; Hijaz plays a real oud; Major Pentatonic
// plays a CC0 dan tranh (Vietnamese zither) recording as an honest related-
// instrument substitute for guzheng, per CLAUDE.md's no-cultural-
// essentialism rule and the explicit substitution this project settled on --
// it is not sold as "guzheng" anywhere in id/label/comments. In Sen plays a
// real CC0 koto recording (Freesound, Vanyamba's "Analog Koto 1 Stereo
// C2-C6" -- see SAMPLES.md), segmented the same way as the oud; the
// source's own description states the notes were "recorded with analog
// synthesizer", not a mic'd acoustic instrument, so the label says
// "analog synth" rather than implying a traditional acoustic 13-string
// koto -- honest about what was actually recorded, per CLAUDE.md's no-
// cultural-essentialism rule.
//
// id/label strings are internal/test metadata only -- nothing in index.astro
// currently renders a timbre's label in the UI -- but they're kept honest
// regardless: no id or label claims a sample is something it isn't (no
// "-like" language for a real recording, and the dan tranh substitute is
// never called "guzheng").
//
// Every timbre is deterministic: same (melody, targetScaleName) always
// produces the same voices, same as transformMelody's own purity
// requirement -- sample selection is a pure function of frequency
// (nearestSample in sampler.ts), no Math.random, no Date.now.

import {
  createSampleVoice,
  preloadInstrument,
} from "./sampler.ts";

export interface Voice {
  sources: AudioScheduledSourceNode[];
  gains: GainNode[];
}

export interface CreateVoiceParams {
  context: BaseAudioContext;
  destination: AudioNode;
  frequency: number;
  noteStart: number; // AudioContext time the note begins
  durationSeconds: number; // written musical duration
}

export interface TimbreDefinition {
  id: string;
  label: string;
  family: "piano" | "plucked-string";
  // sampler.ts instrument id this timbre needs preloaded before playback.
  // Every timbre is sample-backed now, so this is always non-null in
  // practice; still typed nullable since preloadTimbre()'s guard is what
  // actually enforces the preload-before-play contract, not this type. See
  // preloadTimbre() below -- index.astro awaits it before every Play.
  instrumentId: string | null;
  createVoice(params: CreateVoiceParams): Voice;
}

// peakGain per real-sample instrument is a linear multiplier normalizing the
// 5 recordings' very different natural recording levels (measured peak
// sample amplitude on one representative note per instrument: piano 0.54,
// guitar 0.31, dan tranh 0.045, oud 0.97, koto 0.9 -- koto's clips were
// peak-normalized to 0.9 during extraction, see the koto section of
// SAMPLES.md) to a common target peak of ~0.3 -- same loudness-matching goal
// as the old synthesized peakGain constants, so switching Target style still
// doesn't jump in perceived loudness. The shared compressor in audio.ts
// absorbs any single boosted voice comfortably -- see audio.ts's own comment
// on why it exists.
export const TIMBRES: Record<string, TimbreDefinition> = {
  Major: {
    id: "grand-piano",
    label: "Grand piano",
    family: "piano",
    instrumentId: "piano",
    createVoice: createSampleVoice("piano", 0.55),
  },
  "Natural Minor": {
    id: "grand-piano-natural-minor",
    label: "Grand piano (natural minor)",
    family: "piano",
    instrumentId: "piano",
    createVoice: createSampleVoice("piano", 0.55),
  },
  "Harmonic Minor": {
    id: "grand-piano-harmonic-minor",
    label: "Grand piano (harmonic minor)",
    family: "piano",
    instrumentId: "piano",
    createVoice: createSampleVoice("piano", 0.55),
  },
  "Melodic Minor (ascending)": {
    id: "grand-piano-melodic-minor",
    label: "Grand piano (melodic minor)",
    family: "piano",
    instrumentId: "piano",
    createVoice: createSampleVoice("piano", 0.55),
  },
  Dorian: {
    id: "grand-piano-dorian",
    label: "Grand piano (Dorian)",
    family: "piano",
    instrumentId: "piano",
    createVoice: createSampleVoice("piano", 0.55),
  },
  Phrygian: {
    id: "acoustic-guitar",
    label: "Acoustic guitar (steel-string)",
    family: "plucked-string",
    instrumentId: "guitar",
    createVoice: createSampleVoice("guitar", 0.95),
  },
  Hijaz: {
    id: "oud",
    label: "Oud",
    family: "plucked-string",
    instrumentId: "oud",
    createVoice: createSampleVoice("oud", 0.3),
  },
  "Major Pentatonic": {
    id: "dan-tranh",
    label: "Zither (dan tranh)",
    family: "plucked-string",
    instrumentId: "dantranh",
    createVoice: createSampleVoice("dantranh", 6.5),
  },
  "In Sen": {
    id: "koto",
    label: "Koto (analog synth)",
    family: "plucked-string",
    instrumentId: "koto",
    createVoice: createSampleVoice("koto", 0.33),
  },
};

export function timbreForScale(scaleName: string): TimbreDefinition {
  const timbre = TIMBRES[scaleName];
  if (!timbre) throw new Error(`no timbre defined for scale: "${scaleName}"`);
  return timbre;
}

// Awaited once per Play click (see index.astro) before playEvents() runs --
// a no-op for In Sen (the one synthesized holdout), otherwise decodes every
// sample the chosen instrument needs so createVoice() can run synchronously
// for every note in the performance. Safe to call repeatedly/for an
// already-preloaded timbre (see sampler.ts#preloadInstrument).
export async function preloadTimbre(context: BaseAudioContext, timbre: TimbreDefinition): Promise<void> {
  if (timbre.instrumentId) await preloadInstrument(context, timbre.instrumentId);
}
