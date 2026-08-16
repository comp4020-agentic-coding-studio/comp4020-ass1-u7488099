// Lightweight native-Web-Audio sample player. Each instrument below is a
// small set of isolated single-note recordings (see SAMPLES.md for exact
// sources/licenses/attribution) -- there is no per-scale synthesis here, just
// real recordings retuned to the pitch a note actually needs.
//
// Multisampling, not full-range sampling: our playable range is narrow
// (roughly C3-C6) and one velocity layer is enough for this assignment, so
// each instrument only needs a handful of recorded notes spaced a few
// semitones apart. A requested pitch that falls between two recordings picks
// whichever recorded note is *closest in pitch* (nearestSample, by log2
// frequency distance -- semitone distance, not linear Hz distance, since
// pitch perception is logarithmic) and retunes it with
// AudioBufferSourceNode.playbackRate. A few semitones of retuning is
// inaudible as "pitch-shifted" for a struck/plucked/bowed acoustic
// instrument; it's the same technique real hardware/software samplers use.
//
// Decoding is lazy and cached, split across two maps because of one
// constraint this file cannot relax: audio.ts#playEvents calls
// timbre.createVoice() synchronously for every note (it has to -- see
// audio.ts), so createSampleVoice()'s returned factory must also run
// synchronously. That means every sample a performance might touch has to
// already be decoded *before* playEvents() runs. preloadInstrument() is the
// async half (fetch + decodeAudioData, awaited once by index.astro's Play
// handler -- see timbres.ts#preloadTimbre); createSampleVoice() is the sync
// half, and only ever does a plain Map.get() into buffers preload already
// resolved. If that invariant is ever violated (createSampleVoice() called
// for an instrument that was never preloaded) it throws a descriptive error
// rather than silently doing nothing -- this should never happen given the
// preload-before-play discipline index.astro follows.

import oudManifestData from "../assets/samples/oud/manifest.json";
import kotoManifestData from "../assets/samples/koto/manifest.json";
import type { CreateVoiceParams, Voice } from "./timbres.ts";

export interface SampleEntry {
  frequency: number; // the recording's own native pitch, Hz
  url: string;
}

interface InstrumentManifest {
  samples: SampleEntry[];
}

// Duplicated from audio.ts's private noteToFrequency rather than imported --
// audio.ts's public surface stays exactly as it was before sample support
// existed (see CLAUDE.md's audio-architecture note); this is the same small
// pure equal-temperament formula, just applied to sample filenames instead of
// PlaybackEvent pitch names. Sample filenames use "s" for sharp and "b" for
// flat (e.g. "As2" = A#2, "Bb2" = Bb2) since "#" is awkward in on-disk names
// -- the oud set is the one exception, keyed by manifest.json's own measured
// frequency instead (see below), not by filename.
const NATURAL_SEMITONE: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const A4_SEMITONE = 57; // 4 * 12 + 9

function noteNameToFrequency(name: string): number {
  const match = name.match(/^([A-G])(s|b)?(-?\d+)$/);
  if (!match) throw new Error(`unparseable sample note name: "${name}"`);
  const [, letter, accidental, octaveStr] = match;
  const offset = accidental === "s" ? 1 : accidental === "b" ? -1 : 0;
  const semitone = Number(octaveStr) * 12 + NATURAL_SEMITONE[letter] + offset;
  return 440 * 2 ** ((semitone - A4_SEMITONE) / 12);
}

function globToSamples(glob: Record<string, string>): SampleEntry[] {
  return Object.entries(glob).map(([path, url]) => {
    const fileName = path.slice(path.lastIndexOf("/") + 1).replace(/\.wav$/, "");
    return { frequency: noteNameToFrequency(fileName), url };
  });
}

// query: "?url" (not the deprecated `{ as: "url" }`) resolves each match to
// its final built asset URL -- Astro's configured `base` is applied to these
// automatically, same as any other Vite-handled asset import. The options
// object has to be a literal at each call site (not a shared const) --
// import.meta.glob is a build-time construct that Vite's import-glob plugin
// statically parses out of the source text, and it rejects an options
// argument that isn't an inline object literal.
const pianoGlob = import.meta.glob("../assets/samples/piano/*.wav", {
  eager: true,
  query: "?url",
  import: "default",
}) as Record<string, string>;
const guitarGlob = import.meta.glob("../assets/samples/guitar/*.wav", {
  eager: true,
  query: "?url",
  import: "default",
}) as Record<string, string>;
const dantranhGlob = import.meta.glob("../assets/samples/dantranh/*.wav", {
  eager: true,
  query: "?url",
  import: "default",
}) as Record<string, string>;
const oudGlob = import.meta.glob("../assets/samples/oud/*.wav", {
  eager: true,
  query: "?url",
  import: "default",
}) as Record<string, string>;
const kotoGlob = import.meta.glob("../assets/samples/koto/*.wav", {
  eager: true,
  query: "?url",
  import: "default",
}) as Record<string, string>;

// The oud and koto sets were both segmented from one long recording via
// pitch-detection, so their manifests already carry each note's *measured*
// frequency (which includes real-world tuning drift, a few cents off equal
// temperament) -- using that instead of re-deriving from the note name is
// strictly more accurate for the playbackRate math below.
interface MeasuredManifestEntry {
  freq: string | null;
  file: string;
}

function samplesFromManifest(
  glob: Record<string, string>,
  manifestData: unknown,
  instrumentLabel: string,
): SampleEntry[] {
  const urlByFile = new Map(Object.entries(glob).map(([path, url]) => [path.slice(path.lastIndexOf("/") + 1), url]));
  return (manifestData as MeasuredManifestEntry[])
    .filter((entry): entry is MeasuredManifestEntry & { freq: string } => entry.freq !== null)
    .map((entry) => {
      const url = urlByFile.get(entry.file);
      if (!url) throw new Error(`${instrumentLabel} manifest references missing file: "${entry.file}"`);
      return { frequency: Number(entry.freq), url };
    });
}

// Registered instrument ids -- these are what a TimbreDefinition's
// instrumentId names (see timbres.ts). Keys are internal, never shown in UI.
export const INSTRUMENTS: Record<string, InstrumentManifest> = {
  piano: { samples: globToSamples(pianoGlob) },
  guitar: { samples: globToSamples(guitarGlob) },
  dantranh: { samples: globToSamples(dantranhGlob) },
  oud: { samples: samplesFromManifest(oudGlob, oudManifestData, "oud") },
  koto: { samples: samplesFromManifest(kotoGlob, kotoManifestData, "koto") },
};

function instrumentFor(instrumentId: string): InstrumentManifest {
  const instrument = INSTRUMENTS[instrumentId];
  if (!instrument) throw new Error(`no sample instrument registered: "${instrumentId}"`);
  return instrument;
}

// Keyed by sample URL (unique across every instrument), not by instrument +
// index -- simpler cache key, and nothing needs cross-instrument buffer
// sharing anyway. Populated only by preloadInstrument(); read only by
// createSampleVoice()'s synchronous lookup.
const resolvedBuffers = new Map<string, AudioBuffer>();
const pendingDecodes = new Map<string, Promise<AudioBuffer>>();

async function decodeSample(context: BaseAudioContext, url: string): Promise<AudioBuffer> {
  const cached = resolvedBuffers.get(url);
  if (cached) return cached;
  const pending =
    pendingDecodes.get(url) ??
    (async () => {
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      const buffer = await context.decodeAudioData(arrayBuffer);
      resolvedBuffers.set(url, buffer);
      pendingDecodes.delete(url);
      return buffer;
    })();
  pendingDecodes.set(url, pending);
  return pending;
}

// Decodes every sample belonging to `instrumentId` (already-decoded/
// in-flight ones are reused, so calling this more than once for the same
// instrument is cheap and safe). Callers await this once per Play click --
// see timbres.ts#preloadTimbre -- before playEvents() runs createVoice().
export async function preloadInstrument(context: BaseAudioContext, instrumentId: string): Promise<void> {
  const instrument = instrumentFor(instrumentId);
  await Promise.all(instrument.samples.map((sample) => decodeSample(context, sample.url)));
}

// Closest recorded note by pitch distance (semitones, i.e. log2 of the
// frequency ratio) rather than raw Hz distance -- a 20Hz gap matters far
// more at C3 than at C6.
function nearestSample(instrument: InstrumentManifest, frequency: number): SampleEntry {
  return instrument.samples.reduce((best, sample) =>
    Math.abs(Math.log2(frequency / sample.frequency)) < Math.abs(Math.log2(frequency / best.frequency)) ? sample : best,
  );
}

// The recording itself already carries the real instrument's natural attack
// and decay -- this envelope's only jobs are (a) a few milliseconds of
// linear fade-in to avoid a digital click at t=0, and (b) a release shortly
// before the *written* note ends, so a sample's own tail (some of these run
// 1-2s) never rings on top of whatever the melody plays next. Mirrors
// timbres.ts's pianoEnvelope/pluckEnvelope design principle -- bound the
// acoustic tail to the notated duration -- just applied on top of a
// recording instead of a synthesized oscillator. Returns noteEnd so the
// caller can schedule source.stop() off the same number.
function applySampleEnvelope(gain: GainNode, noteStart: number, durationSeconds: number, peakGain: number): number {
  const attack = 0.004;
  const release = Math.min(0.05, durationSeconds / 4);
  const noteEnd = noteStart + durationSeconds;
  const releaseStart = Math.max(noteStart + attack, noteEnd - release);
  gain.gain.setValueAtTime(0.0001, noteStart);
  gain.gain.linearRampToValueAtTime(peakGain, noteStart + attack);
  gain.gain.setValueAtTime(peakGain, releaseStart);
  gain.gain.linearRampToValueAtTime(0.0001, noteEnd);
  return noteEnd;
}

// Builds a timbres.ts-compatible createVoice function for a sample-backed
// instrument. peakGain is a plain linear multiplier applied on top of each
// recording's own natural amplitude -- the 5 real-sample instruments were
// recorded at very different levels (a struck grand piano note peaks far
// louder than a plucked dan tranh note), so this is what keeps switching
// Target style from jumping in perceived loudness the way timbres.ts's
// synthesized peakGain constants always did.
export function createSampleVoice(instrumentId: string, peakGain: number): (params: CreateVoiceParams) => Voice {
  return ({ context, destination, frequency, noteStart, durationSeconds }) => {
    const instrument = instrumentFor(instrumentId);
    const sample = nearestSample(instrument, frequency);
    const buffer = resolvedBuffers.get(sample.url);
    if (!buffer) {
      throw new Error(
        `sample not decoded for instrument "${instrumentId}" -- createSampleVoice() requires preloadInstrument() ` +
          `to have already resolved every one of its samples (see timbres.ts#preloadTimbre)`,
      );
    }
    const source = context.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.value = frequency / sample.frequency;
    const gain = context.createGain();
    source.connect(gain);
    gain.connect(destination);
    const noteEnd = applySampleEnvelope(gain, noteStart, durationSeconds, peakGain);
    source.start(noteStart);
    source.stop(noteEnd + 0.05);
    return { sources: [source], gains: [gain] };
  };
}
