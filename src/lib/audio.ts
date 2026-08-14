// Web Audio playback with Play/Stop control — no library, per CLAUDE.md's
// "no unnecessary runtime dependencies": Web Audio is platform-native and
// covers everything this prototype needs. One oscillator per note, scheduled
// back to back using each note's duration. play()/stop() own the single
// current performance (only one plays at a time, matching the one Play/Stop
// button pair); playerEvents lets future visual components (piano keyboard,
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

// Fires "noteStart" / "noteEnd" ({ index, pitchName, time }) and "stop"
// ({ reason: "stopped" | "ended" }) for the single current performance.
// Nothing in this module reads its own events -- it exists purely for
// future subscribers (keyboard highlighter, waveform, editor sync).
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

export function play(pitchNames: string[], durations: number[]): void {
  stop(); // starting Play mid-performance restarts rather than layering
  generation++;
  const gen = generation;
  audioContext ??= new AudioContext();
  const context = audioContext;
  const startTime = context.currentTime;
  let time = startTime;
  isPlaying = true;

  pitchNames.forEach((pitchName, index) => {
    const noteSeconds = durations[index] * BEAT_SECONDS;
    const noteStart = time;
    const noteEnd = time + noteSeconds;

    if (pitchName !== RENDERED_REST) {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = "sine";
      oscillator.frequency.value = noteToFrequency(pitchName);
      oscillator.connect(gain);
      gain.connect(context.destination);

      const fade = Math.min(FADE_SECONDS, noteSeconds / 4);
      gain.gain.setValueAtTime(0, noteStart);
      gain.gain.linearRampToValueAtTime(0.2, noteStart + fade);
      gain.gain.linearRampToValueAtTime(0, noteEnd - fade);

      oscillator.start(noteStart);
      oscillator.stop(noteEnd);
      activeVoices.push({ oscillator, gain });

      scheduleTimer(noteStart - startTime, gen, () => dispatch("noteStart", { index, pitchName, time: noteStart }));
      scheduleTimer(noteEnd - startTime, gen, () => dispatch("noteEnd", { index, pitchName, time: noteEnd }));
    }

    time = noteEnd;
  });

  scheduleTimer(time - startTime, gen, () => {
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
