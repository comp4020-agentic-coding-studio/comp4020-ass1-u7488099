// Web Audio playback with Play/Stop control — no library, per CLAUDE.md's
// "no unnecessary runtime dependencies": Web Audio is platform-native and
// covers everything this prototype needs. playEvents() is the scheduling
// core: each PlaybackEvent carries its own start/duration in seconds (rather
// than an implied running cursor), so overlapping start times -- polyphony --
// fall out for free; nothing here assumes one voice at a time. play(pitchNames,
// durations) is the original sequential/monophonic entry point presets use,
// now a thin wrapper that computes cumulative start times and skips rests
// once, then defers to playEvents. play()/stop() own the single current
// performance (only one plays at a time, matching the one Play/Stop button
// pair); playerEvents lets future visual components (piano keyboard,
// waveform, melody editor) subscribe to noteStart/noteEnd/stop without
// touching this module's internals. Only ever called from the Play/Stop
// button and select-change handlers, never on their own (CLAUDE.md's
// "no autoplay" rule).

import { RENDERED_REST } from "./melodies.ts";

const NATURAL_SEMITONE: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
export const BEAT_SECONDS = 0.4; // duration 1 (a quarter note) plays for this long
const A4_SEMITONE = 57; // 4 * 12 + 9 — reference pitch for the frequency formula below
const FADE_SECONDS = 0.02; // note-boundary and stop-ramp fade, short enough to read as instant

function noteToFrequency(note: string): number {
  const match = note.match(/^([A-G])(#|b)?(-?\d+)$/);
  if (!match) throw new Error(`unparseable note name: "${note}"`);
  const [, letter, accidental, octaveStr] = match;
  const offset = accidental === "#" ? 1 : accidental === "b" ? -1 : 0;
  const semitone = Number(octaveStr) * 12 + NATURAL_SEMITONE[letter] + offset;
  return 440 * 2 ** ((semitone - A4_SEMITONE) / 12);
}

interface Voice {
  oscillator: OscillatorNode;
  gain: GainNode;
}

// A single note to schedule: pitchName plus its own start/duration in
// seconds, relative to whenever playEvents()/play() is called. Explicit
// per-event timing (rather than an implied running cursor) is what makes
// overlapping/simultaneous notes possible -- see composition.ts#renderComposition
// for the polyphonic composition -> PlaybackEvent[] path.
export interface PlaybackEvent {
  pitchName: string;
  startSeconds: number;
  durationSeconds: number;
}

// Fires "noteStart" / "noteEnd" ({ index, pitchName, time }) and "stop"
// ({ reason: "stopped" | "ended" }) for the single current performance.
// Nothing in this module reads its own events -- it exists purely for
// future subscribers (keyboard highlighter, waveform, editor sync). `index`
// is the event's position in the array passed to playEvents -- play()'s
// wrapper never includes rests in that array, so index counts only
// sounding notes, not rests.
export const playerEvents = new EventTarget();

let audioContext: AudioContext | null = null;
let activeVoices: Voice[] = [];
let pendingTimers: ReturnType<typeof setTimeout>[] = [];
let generation = 0;
let isPlaying = false;

function dispatch(type: string, detail: unknown): void {
  playerEvents.dispatchEvent(new CustomEvent(type, { detail }));
}

// setTimeout is what makes noteStart/noteEnd/stop possible at all -- the
// AudioContext's own schedule never calls back into JS. `gen` guards against
// a timer from a superseded performance firing after play()/stop() moved on,
// on top of the explicit clearTimeout in stop().
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
// durationSeconds) ranges," nothing here special-cases it.
export function playEvents(events: PlaybackEvent[]): void {
  stop(); // starting Play mid-performance restarts rather than layering
  generation++;
  const gen = generation;
  audioContext ??= new AudioContext();
  const context = audioContext;
  const origin = context.currentTime;
  isPlaying = true;

  let latestEnd = 0;
  events.forEach(({ pitchName, startSeconds, durationSeconds }, index) => {
    const noteStart = origin + startSeconds;
    const noteEnd = noteStart + durationSeconds;
    latestEnd = Math.max(latestEnd, startSeconds + durationSeconds);

    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = noteToFrequency(pitchName);
    oscillator.connect(gain);
    gain.connect(context.destination);

    const fade = Math.min(FADE_SECONDS, durationSeconds / 4);
    gain.gain.setValueAtTime(0, noteStart);
    gain.gain.linearRampToValueAtTime(0.2, noteStart + fade);
    gain.gain.linearRampToValueAtTime(0, noteEnd - fade);

    oscillator.start(noteStart);
    oscillator.stop(noteEnd);
    activeVoices.push({ oscillator, gain });

    scheduleTimer(startSeconds, gen, () => dispatch("noteStart", { index, pitchName, time: noteStart }));
    scheduleTimer(startSeconds + durationSeconds, gen, () => dispatch("noteEnd", { index, pitchName, time: noteEnd }));
  });

  scheduleTimer(latestEnd, gen, () => {
    isPlaying = false;
    activeVoices = [];
    dispatch("stop", { reason: "ended" });
  });
}

// The original sequential/monophonic entry point: one note starts exactly
// when the previous one ends, rests advance the clock without sounding. A
// thin wrapper over playEvents -- computes each note's cumulative start time
// once and skips rests entirely, then defers all scheduling/fade/stop
// machinery to the shared core above.
export function play(pitchNames: string[], durations: number[]): void {
  const events: PlaybackEvent[] = [];
  let cursor = 0;
  pitchNames.forEach((pitchName, i) => {
    const durationSeconds = durations[i] * BEAT_SECONDS;
    if (pitchName !== RENDERED_REST) {
      events.push({ pitchName, startSeconds: cursor, durationSeconds });
    }
    cursor += durationSeconds;
  });
  playEvents(events);
}

export function stop(): void {
  if (!isPlaying) return;
  generation++;

  const context = audioContext;
  if (context) {
    const now = context.currentTime;
    for (const { oscillator, gain } of activeVoices) {
      gain.gain.cancelScheduledValues(now);
      gain.gain.setValueAtTime(gain.gain.value, now);
      gain.gain.linearRampToValueAtTime(0, now + FADE_SECONDS);
      oscillator.stop(now + FADE_SECONDS);
    }
  }
  activeVoices = [];

  for (const id of pendingTimers) clearTimeout(id);
  pendingTimers = [];

  isPlaying = false;
  dispatch("stop", { reason: "stopped" });
}
