import { afterEach, describe, expect, it, vi } from "vitest";
import { BEAT_SECONDS, playNotes } from "./audio.ts";
import { RENDERED_REST } from "./melodies.ts";

// Fakes rather than a real AudioContext -- jsdom/node don't implement Web
// Audio, and the point here is only to prove playNotes' scheduling logic:
// a rest must skip oscillator creation (no sound) while still advancing
// `time` by its full duration (silence takes up real time).

class FakeParam {
  setValueAtTime = vi.fn();
  linearRampToValueAtTime = vi.fn();
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

function stubFakeAudioContext() {
  const oscillators: FakeOscillator[] = [];
  class FakeAudioContext {
    currentTime = 0;
    destination = {};
    createOscillator(): FakeOscillator {
      const oscillator = new FakeOscillator();
      oscillators.push(oscillator);
      return oscillator;
    }
    createGain(): FakeGain {
      return new FakeGain();
    }
  }
  vi.stubGlobal("AudioContext", FakeAudioContext);
  return oscillators;
}

describe("playNotes", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("skips oscillator creation for a rest but still advances scheduling time", () => {
    const oscillators = stubFakeAudioContext();

    playNotes(["C4", RENDERED_REST, "D4"], [1, 2, 1]);

    // Not 3 -- no oscillator is ever created for the rest.
    expect(oscillators).toHaveLength(2);
    expect(oscillators[0].start).toHaveBeenCalledWith(0);
    // C4 (1 beat) + rest (2 beats) = 3 beats must elapse before D4 starts.
    expect(oscillators[1].start).toHaveBeenCalledWith(3 * BEAT_SECONDS);
  });

  it("advances scheduling time correctly when a rest is the first event", () => {
    const oscillators = stubFakeAudioContext();

    playNotes([RENDERED_REST, "C4"], [1.5, 1]);

    expect(oscillators).toHaveLength(1);
    expect(oscillators[0].start).toHaveBeenCalledWith(1.5 * BEAT_SECONDS);
  });
});
