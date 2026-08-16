// Web Audio playback with Play/Stop control — no library, per CLAUDE.md's
// "no unnecessary runtime dependencies": Web Audio is platform-native and
// covers everything this prototype needs. playEvents() is the scheduling
// core: each PlaybackEvent carries its own start/duration in seconds (rather
// than an implied running cursor), so overlapping start times -- polyphony --
// fall out for free; nothing here assumes one voice at a time. Every event is
// realized through a caller-supplied TimbreDefinition (see timbres.ts) --
// this module never branches on scale/target-style name itself, it only
// asks the timbre to build a voice's node graph and hands back the shared
// analyser as that graph's destination. playEvents()/stop() own the single
// current performance (only one plays at a time, matching the one Play/Stop
// button pair); playerEvents lets future visual components (piano keyboard,
// waveform, melody editor) subscribe to noteStart/noteEnd/stop without
// touching this module's internals. Only ever called from the Play/Stop
// button and select-change handlers, never on their own (CLAUDE.md's
// "no autoplay" rule).

import type { TimbreDefinition, Voice } from "./timbres.ts";

const NATURAL_SEMITONE: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
export const BEAT_SECONDS = 0.4; // duration 1 (a quarter note) plays for this long
const A4_SEMITONE = 57; // 4 * 12 + 9 — reference pitch for the frequency formula below
const FADE_SECONDS = 0.02; // stop-ramp fade on an early Stop, short enough to read as instant, uniform across every timbre

function noteToFrequency(note: string): number {
  const match = note.match(/^([A-G])(#|b)?(-?\d+)$/);
  if (!match) throw new Error(`unparseable note name: "${note}"`);
  const [, letter, accidental, octaveStr] = match;
  const offset = accidental === "#" ? 1 : accidental === "b" ? -1 : 0;
  const semitone = Number(octaveStr) * 12 + NATURAL_SEMITONE[letter] + offset;
  return 440 * 2 ** ((semitone - A4_SEMITONE) / 12);
}

// A single note to schedule: pitchName plus its own start/duration in
// seconds, relative to whenever playEvents() is called. Explicit per-event
// timing (rather than an implied running cursor) is what makes overlapping/
// simultaneous notes possible -- see composition.ts#renderComposition for
// the polyphonic composition -> PlaybackEvent[] path (which already skips
// rests when it builds this array).
export interface PlaybackEvent {
  pitchName: string;
  startSeconds: number;
  durationSeconds: number;
}

// Fires "noteStart" / "noteEnd" ({ index, pitchName, time }) and "stop"
// ({ reason: "stopped" | "ended" }) for the single current performance.
// Nothing in this module reads its own events -- it exists purely for
// future subscribers (keyboard highlighter, waveform, editor sync). `index`
// is the event's position in the array passed to playEvents, which only
// ever contains sounding notes (rests are skipped upstream).
export const playerEvents = new EventTarget();

// null until the first playEvents() call, then the same shared node for
// every performance after -- callers (e.g. a waveform visualizer) never
// create or own an AnalyserNode themselves.
export function getAnalyser(): AnalyserNode | null {
  return analyser;
}

let audioContext: AudioContext | null = null;

// Lazily creates (once) and returns the single shared AudioContext --
// exposed so a caller can preload sample-backed timbres (see
// timbres.ts#preloadTimbre) through the exact same context voices will play
// through, before calling playEvents(). playEvents() itself still creates it
// on demand below if nothing preloaded first.
export function getAudioContext(): AudioContext {
  audioContext ??= new AudioContext();
  return audioContext;
}
// Shared by every voice so a single Web Audio tap sees the whole mix --
// polyphony, presets, and transformed target styles all feed this one node.
// Created lazily on first playEvents() (never before user playback) and
// never recreated or disconnected afterward, so a caller can hold a stale
// reference across multiple performances -- see getAnalyser().
let analyser: AnalyserNode | null = null;
// A limiter, not a tone-shaping effect: the composition editor's grid allows
// a note on every row of a two-octave (or wider) window at the same column,
// so simultaneous polyphony is effectively unbounded -- no per-timbre gain
// tuning can rule out clipping against that. Sits before the analyser (not
// after) so the visible waveform reflects what's actually audible, not a
// pre-limit signal the speakers never played. Default compressor settings
// (threshold -24dB, ratio 12) are a standard mix-bus limiter curve and need
// no tuning here.
let compressor: DynamicsCompressorNode | null = null;
let activeVoices: Voice[] = [];
let pendingTimers: ReturnType<typeof setTimeout>[] = [];
let generation = 0;
let isPlaying = false;

function dispatch(type: string, detail: unknown): void {
  playerEvents.dispatchEvent(new CustomEvent(type, { detail }));
}

// setTimeout is what makes noteStart/noteEnd/stop possible at all -- the
// AudioContext's own schedule never calls back into JS. `gen` guards against
// a timer from a superseded performance firing after playEvents()/stop()
// moved on, on top of the explicit clearTimeout in stop().
function scheduleTimer(delaySeconds: number, gen: number, run: () => void): void {
  const id = setTimeout(
    () => {
      if (gen === generation) run();
    },
    Math.max(0, delaySeconds * 1000),
  );
  pendingTimers.push(id);
}

// The scheduling core: each event is scheduled independently off a shared
// `origin` (the AudioContext time playEvents was called), so two events
// with the same startSeconds sound simultaneously -- polyphony is just
// "more than one event with overlapping [startSeconds, startSeconds +
// durationSeconds) ranges," nothing here special-cases it. `timbre` picks
// the node graph/envelope every event in this call uses -- callers resolve
// timbreForScale(targetScaleName) once per Play click (see index.astro) and
// pass the same definition for the whole performance.
export function playEvents(events: PlaybackEvent[], timbre: TimbreDefinition): void {
  // Dispatches "stop" synchronously before anything below schedules a new
  // voice or animation frame -- a visualizer listening for "stop" tears
  // itself down here, then this same call starts a fresh one, so a Play
  // click mid-performance can never leave a stale animation loop running.
  stop(); // starting Play mid-performance restarts rather than layering
  generation++;
  const gen = generation;
  const context = getAudioContext();
  if (!analyser) {
    analyser = context.createAnalyser();
    analyser.fftSize = 2048; // time-domain buffer length; smooth line, cheap per-frame cost
    compressor = context.createDynamicsCompressor();
    compressor.connect(analyser);
    analyser.connect(context.destination);
  }
  const voiceDestination = compressor!;
  const origin = context.currentTime;
  isPlaying = true;

  let latestEnd = 0;
  events.forEach(({ pitchName, startSeconds, durationSeconds }, index) => {
    const noteStart = origin + startSeconds;
    const noteEnd = noteStart + durationSeconds;
    latestEnd = Math.max(latestEnd, startSeconds + durationSeconds);

    const voice = timbre.createVoice({
      context,
      destination: voiceDestination,
      frequency: noteToFrequency(pitchName),
      noteStart,
      durationSeconds,
    });
    activeVoices.push(voice);

    scheduleTimer(startSeconds, gen, () => dispatch("noteStart", { index, pitchName, time: noteStart }));
    scheduleTimer(startSeconds + durationSeconds, gen, () => dispatch("noteEnd", { index, pitchName, time: noteEnd }));
  });

  scheduleTimer(latestEnd, gen, () => {
    isPlaying = false;
    activeVoices = [];
    dispatch("stop", { reason: "ended" });
  });
}

export function stop(): void {
  if (!isPlaying) return;
  generation++;

  const context = audioContext;
  if (context) {
    const now = context.currentTime;
    for (const { sources, gains } of activeVoices) {
      for (const gain of gains) {
        gain.gain.cancelScheduledValues(now);
        gain.gain.setValueAtTime(gain.gain.value, now);
        gain.gain.linearRampToValueAtTime(0, now + FADE_SECONDS);
      }
      for (const source of sources) {
        source.stop(now + FADE_SECONDS);
      }
    }
  }
  activeVoices = [];

  for (const id of pendingTimers) clearTimeout(id);
  pendingTimers = [];

  isPlaying = false;
  dispatch("stop", { reason: "stopped" });
}
