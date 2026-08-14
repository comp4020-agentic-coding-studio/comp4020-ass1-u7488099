// Minimal Web Audio playback — no library, per CLAUDE.md's "no unnecessary
// runtime dependencies": Web Audio is platform-native and covers everything
// this prototype needs. One oscillator per note, scheduled back to back
// using each note's duration; only ever called from the Play button's click
// handler, never on selection change (CLAUDE.md's "no autoplay" rule).

import { RENDERED_REST } from "./melodies.ts";

const NATURAL_SEMITONE: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
export const BEAT_SECONDS = 0.4; // duration 1 (a quarter note) plays for this long
const A4_SEMITONE = 57; // 4 * 12 + 9 — reference pitch for the frequency formula below

function noteToFrequency(note: string): number {
  const match = note.match(/^([A-G])(#|b)?(-?\d+)$/);
  if (!match) throw new Error(`unparseable note name: "${note}"`);
  const [, letter, accidental, octaveStr] = match;
  const offset = accidental === "#" ? 1 : accidental === "b" ? -1 : 0;
  const semitone = Number(octaveStr) * 12 + NATURAL_SEMITONE[letter] + offset;
  return 440 * 2 ** ((semitone - A4_SEMITONE) / 12);
}

export function playNotes(pitchNames: string[], durations: number[]): void {
  const context = new AudioContext();
  let time = context.currentTime;

  pitchNames.forEach((pitchName, i) => {
    const noteSeconds = durations[i] * BEAT_SECONDS;

    if (pitchName === RENDERED_REST) {
      time += noteSeconds;
      return;
    }

    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = noteToFrequency(pitchName);
    oscillator.connect(gain);
    gain.connect(context.destination);

    // Short fade in/out avoids the click of a hard-edged start/stop.
    const fade = Math.min(0.02, noteSeconds / 4);
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(0.2, time + fade);
    gain.gain.linearRampToValueAtTime(0, time + noteSeconds - fade);

    oscillator.start(time);
    oscillator.stop(time + noteSeconds);
    time += noteSeconds;
  });
}
