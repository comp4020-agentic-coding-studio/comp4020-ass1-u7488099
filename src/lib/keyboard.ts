// Pure, DOM-free support for the editor's visual piano keyboard: the
// chromatic key layout it renders, and a reference-counted voice tracker
// for deciding which keys are lit. Driven entirely by audio.ts's existing
// playerEvents noteStart/noteEnd/stop events (see editor.astro's wiring) --
// nothing here talks to Web Audio or the DOM.

import { noteToSemitone, parseNote, semitoneToNoteName } from "./scales.ts";

// C3-C6 inclusive comfortably covers every pitch this app can currently
// produce (verified worst case across all presets/scales: G3-C6), with
// headroom to spare and clean octave-boundary framing.
const KEYBOARD_LOW = "C3";
const KEYBOARD_HIGH = "C6";

export interface KeyboardKey {
  pitchName: string; // e.g. "C4", "C#4"
  isBlack: boolean;
}

export function keyboardKeys(): KeyboardKey[] {
  const low = noteToSemitone(parseNote(KEYBOARD_LOW));
  const high = noteToSemitone(parseNote(KEYBOARD_HIGH));
  const keys: KeyboardKey[] = [];
  for (let semitone = low; semitone <= high; semitone++) {
    const pitchName = semitoneToNoteName(semitone);
    keys.push({ pitchName, isBlack: pitchName.includes("#") });
  }
  return keys;
}

// Voice count per pitch name -- a key is active exactly when its pitchName
// is a key of this record. Overlapping notes at the same pitch increment
// past 1; the key only goes dark once every overlapping voice has ended,
// not on the first noteEnd for that pitch.
export type VoiceCounts = Record<string, number>;

export function withVoiceStarted(counts: VoiceCounts, pitchName: string): VoiceCounts {
  return { ...counts, [pitchName]: (counts[pitchName] ?? 0) + 1 };
}

// Clamps at 0/deletes rather than going negative, so a noteEnd with no
// matching prior noteStart (shouldn't happen, but cheap to guard) can't
// leave the counter in a state where two subsequent noteEnds are needed to
// clear a key that only ever had one voice.
export function withVoiceEnded(counts: VoiceCounts, pitchName: string): VoiceCounts {
  const next = { ...counts };
  const remaining = (next[pitchName] ?? 0) - 1;
  if (remaining <= 0) delete next[pitchName];
  else next[pitchName] = remaining;
  return next;
}
