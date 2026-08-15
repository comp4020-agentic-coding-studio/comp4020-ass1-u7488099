import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { playerEvents, playEvents, stop } from "./audio.ts";
import { keyboardKeys, withVoiceEnded, withVoiceStarted, type VoiceCounts } from "./keyboard.ts";

describe("keyboardKeys", () => {
  it("spans exactly C3 to C6 inclusive, 37 chromatic keys, all distinct", () => {
    const keys = keyboardKeys();
    expect(keys).toHaveLength(37);
    expect(keys[0].pitchName).toBe("C3");
    expect(keys[keys.length - 1].pitchName).toBe("C6");
    expect(new Set(keys.map((k) => k.pitchName)).size).toBe(37);
  });

  it("marks the real piano's black keys, repeating identically across all 3 octaves", () => {
    const keys = keyboardKeys();
    const blackByOctave = (octave: number) =>
      keys
        .filter((k) => k.pitchName.endsWith(String(octave)) && k.isBlack)
        .map((k) => k.pitchName.replace(String(octave), ""));

    for (const octave of [3, 4, 5]) {
      expect(blackByOctave(octave)).toEqual(["C#", "D#", "F#", "G#", "A#"]);
    }
    // Naturals, including E/B (no black key immediately above either), are never black.
    for (const key of keys) {
      if (["C", "D", "E", "F", "G", "A", "B"].some((letter) => key.pitchName.startsWith(letter) && !key.pitchName.includes("#"))) {
        expect(key.isBlack).toBe(false);
      }
    }
  });
});

describe("withVoiceStarted / withVoiceEnded", () => {
  it("starting a fresh pitch activates it (count 1)", () => {
    const counts = withVoiceStarted({}, "C4");
    expect("C4" in counts).toBe(true);
    expect(counts.C4).toBe(1);
  });

  it("starting twice then ending once leaves the pitch active", () => {
    let counts: VoiceCounts = {};
    counts = withVoiceStarted(counts, "C4");
    counts = withVoiceStarted(counts, "C4");
    counts = withVoiceEnded(counts, "C4");
    expect("C4" in counts).toBe(true);
    expect(counts.C4).toBe(1);
  });

  it("ending until the count reaches 0 deactivates the pitch", () => {
    let counts: VoiceCounts = {};
    counts = withVoiceStarted(counts, "C4");
    counts = withVoiceStarted(counts, "C4");
    counts = withVoiceEnded(counts, "C4");
    counts = withVoiceEnded(counts, "C4");
    expect("C4" in counts).toBe(false);
  });

  it("ending a pitch with no prior start does not throw or go negative", () => {
    expect(() => withVoiceEnded({}, "C4")).not.toThrow();
    const counts = withVoiceEnded({}, "C4");
    expect("C4" in counts).toBe(false);
  });

  it("does not mutate the input map", () => {
    const original: VoiceCounts = { C4: 1 };
    withVoiceStarted(original, "C4");
    withVoiceEnded(original, "C4");
    expect(original).toEqual({ C4: 1 });
  });
});

// Proves the reducer combines correctly with the *real* playerEvents stream
// from audio.ts, not just in isolation -- same fake-AudioContext + fake-timer
// approach as audio.test.ts, since jsdom/node have no real Web Audio.
describe("reference-counting driven by real playerEvents", () => {
  let oscillators: { stop: ReturnType<typeof vi.fn> }[];

  beforeAll(() => {
    class FakeParam {
      value = 0;
      setValueAtTime = vi.fn();
      linearRampToValueAtTime = vi.fn();
      cancelScheduledValues = vi.fn();
    }
    class FakeOscillator {
      type = "";
      frequency = new FakeParam();
      connect = vi.fn();
      start = vi.fn();
      stop = vi.fn();
    }
    class FakeGain {
      gain = new FakeParam();
      connect = vi.fn();
    }
    class FakeAnalyser {
      fftSize = 0;
      connect = vi.fn();
    }
    class FakeAudioContext {
      currentTime = 0;
      destination = {};
      createOscillator() {
        const oscillator = new FakeOscillator();
        oscillators.push(oscillator);
        return oscillator;
      }
      createGain() {
        return new FakeGain();
      }
      createAnalyser() {
        return new FakeAnalyser();
      }
    }
    oscillators = [];
    vi.stubGlobal("AudioContext", FakeAudioContext);
  });

  afterAll(() => {
    vi.unstubAllGlobals();
  });

  afterEach(() => {
    stop();
    vi.useRealTimers();
  });

  function subscribe(): { counts: VoiceCounts; unsubscribe: () => void } {
    const state = { counts: {} as VoiceCounts };
    const onStart = (event: Event) => {
      const { pitchName } = (event as CustomEvent).detail;
      state.counts = withVoiceStarted(state.counts, pitchName);
    };
    const onEnd = (event: Event) => {
      const { pitchName } = (event as CustomEvent).detail;
      state.counts = withVoiceEnded(state.counts, pitchName);
    };
    const onStop = () => {
      state.counts = {};
    };
    playerEvents.addEventListener("noteStart", onStart);
    playerEvents.addEventListener("noteEnd", onEnd);
    playerEvents.addEventListener("stop", onStop);
    return {
      get counts() {
        return state.counts;
      },
      unsubscribe: () => {
        playerEvents.removeEventListener("noteStart", onStart);
        playerEvents.removeEventListener("noteEnd", onEnd);
        playerEvents.removeEventListener("stop", onStop);
      },
    } as unknown as { counts: VoiceCounts; unsubscribe: () => void };
  }

  it("keeps an overlapping same-pitch note active until both voices end", () => {
    const sub = subscribe();
    vi.useFakeTimers();

    playEvents([
      { pitchName: "C4", startSeconds: 0, durationSeconds: 1 },
      { pitchName: "C4", startSeconds: 0.5, durationSeconds: 1 },
    ]);

    vi.advanceTimersByTime(0);
    expect("C4" in sub.counts).toBe(true);

    vi.advanceTimersByTime(1000); // first voice ends at t=1s; second still sounding until t=1.5s
    expect("C4" in sub.counts).toBe(true);

    vi.advanceTimersByTime(600); // past t=1.6s, both voices have ended
    expect("C4" in sub.counts).toBe(false);

    sub.unsubscribe();
  });

  it("lights independent keys for overlapping different pitches, clearing each separately", () => {
    const sub = subscribe();
    vi.useFakeTimers();

    playEvents([
      { pitchName: "C4", startSeconds: 0, durationSeconds: 1 },
      { pitchName: "E4", startSeconds: 0, durationSeconds: 2 },
    ]);

    vi.advanceTimersByTime(0);
    expect(sub.counts).toEqual({ C4: 1, E4: 1 });

    vi.advanceTimersByTime(1000);
    expect("C4" in sub.counts).toBe(false);
    expect("E4" in sub.counts).toBe(true);

    vi.advanceTimersByTime(1000);
    expect(sub.counts).toEqual({});

    sub.unsubscribe();
  });

  it("stop() mid-performance immediately clears every active key", () => {
    const sub = subscribe();
    vi.useFakeTimers();

    playEvents([{ pitchName: "C4", startSeconds: 0, durationSeconds: 5 }]);
    vi.advanceTimersByTime(0);
    expect("C4" in sub.counts).toBe(true);

    stop();
    expect(sub.counts).toEqual({});

    sub.unsubscribe();
  });

  it("a natural finish leaves no active keys", () => {
    const sub = subscribe();
    vi.useFakeTimers();

    playEvents([{ pitchName: "C4", startSeconds: 0, durationSeconds: 1 }]);
    vi.advanceTimersByTime(1000 + 10);
    expect(sub.counts).toEqual({});

    sub.unsubscribe();
  });
});
