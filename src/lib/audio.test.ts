import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { BEAT_SECONDS, getAnalyser, play, playerEvents, playEvents, stop } from "./audio.ts";
import { RENDERED_REST } from "./melodies.ts";

// A fake rather than a real AudioContext -- jsdom/node don't implement Web
// Audio, and the point here is only to prove play()/stop()'s scheduling and
// event-dispatch logic: a rest must skip oscillator creation (no sound)
// while still advancing `time` by its full duration (silence takes up real
// time); stop() must reach every currently-scheduled voice, not just ones
// already sounding.
//
// audio.ts lazily creates its AudioContext once and reuses it across every
// play() call (by design -- see audio.ts), so the stub is installed once for
// the whole file, not per test; each test instead records where in the
// shared `oscillators` array it starts, so it only inspects the oscillators
// its own play() call created.

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

let oscillators: FakeOscillator[];
let gains: FakeGain[];
let analysersCreated: FakeAnalyser[];
let destination: object;

beforeAll(() => {
  oscillators = [];
  gains = [];
  analysersCreated = [];
  destination = {};
  class FakeAudioContext {
    currentTime = 0;
    destination = destination;
    createOscillator(): FakeOscillator {
      const oscillator = new FakeOscillator();
      oscillators.push(oscillator);
      return oscillator;
    }
    createGain(): FakeGain {
      const gain = new FakeGain();
      gains.push(gain);
      return gain;
    }
    createAnalyser(): FakeAnalyser {
      const analyser = new FakeAnalyser();
      analysersCreated.push(analyser);
      return analyser;
    }
  }
  vi.stubGlobal("AudioContext", FakeAudioContext);
});

afterAll(() => {
  vi.unstubAllGlobals();
});

// audio.ts's `analyser` module state is created once, lazily, on the very
// first playEvents() call and never reset by stop() -- unlike
// activeVoices/pendingTimers, which are cleared per-performance. So the
// "not yet created" case can only be observed here, before any other
// describe block below has called play()/playEvents().
describe("shared analyser (must run before any play()/playEvents() call above touches module state)", () => {
  it("is null until the first playEvents() call", () => {
    expect(getAnalyser()).toBeNull();
  });

  it("is created on first play(), connected once to destination, and every voice's gain routes through it", () => {
    play(["C4"], [1]);

    const analyser = getAnalyser();
    expect(analyser).not.toBeNull();
    expect(analysersCreated).toHaveLength(1);
    expect(analyser!.connect).toHaveBeenCalledTimes(1);
    expect(analyser!.connect).toHaveBeenCalledWith(destination);
    expect(gains.at(-1)!.connect).toHaveBeenCalledTimes(1);
    expect(gains.at(-1)!.connect).toHaveBeenCalledWith(analyser);
  });

  it("reuses the same analyser instance across later performances, without reconnecting it", () => {
    const before = getAnalyser();

    play(["D4", "E4"], [1, 1]); // a second, later performance

    expect(getAnalyser()).toBe(before);
    expect(analysersCreated).toHaveLength(1); // still only ever created once
    expect(before!.connect).toHaveBeenCalledTimes(1); // still only ever connected once
    // the new performance's voices still route through the one shared analyser
    for (const gain of gains.slice(-2)) {
      expect(gain.connect).toHaveBeenCalledTimes(1);
      expect(gain.connect).toHaveBeenCalledWith(before);
    }
  });

  it("stop() leaves the analyser instance untouched", () => {
    const before = getAnalyser();
    stop();
    expect(getAnalyser()).toBe(before);
  });
});

describe("play/stop", () => {
  afterEach(() => {
    stop(); // reset module-level playback state between tests, whatever a test left mid-flight
    vi.useRealTimers();
  });

  it("skips oscillator creation for a rest but still advances scheduling time", () => {
    const startIndex = oscillators.length;

    play(["C4", RENDERED_REST, "D4"], [1, 2, 1]);
    const created = oscillators.slice(startIndex);

    // Not 3 -- no oscillator is ever created for the rest.
    expect(created).toHaveLength(2);
    expect(created[0].start).toHaveBeenCalledWith(0);
    // C4 (1 beat) + rest (2 beats) = 3 beats must elapse before D4 starts.
    expect(created[1].start).toHaveBeenCalledWith(3 * BEAT_SECONDS);
  });

  it("advances scheduling time correctly when a rest is the first event", () => {
    const startIndex = oscillators.length;

    play([RENDERED_REST, "C4"], [1.5, 1]);
    const created = oscillators.slice(startIndex);

    expect(created).toHaveLength(1);
    expect(created[0].start).toHaveBeenCalledWith(1.5 * BEAT_SECONDS);
  });

  it("stop() immediately stops every currently scheduled voice, not just the one already sounding", () => {
    const startIndex = oscillators.length;

    play(["C4", "D4", "E4"], [1, 1, 1]);
    stop();
    const created = oscillators.slice(startIndex);

    expect(created).toHaveLength(3);
    for (const oscillator of created) {
      // Fake AudioContext.currentTime is fixed at 0, so the fade-out stop
      // time is exactly the fade constant past "now".
      expect(oscillator.stop).toHaveBeenCalledWith(0.02);
    }
  });

  it("calling play() while already playing stops the previous performance before scheduling the new one", () => {
    const startIndex = oscillators.length;

    play(["C4", "D4"], [1, 1]);
    const firstBatch = oscillators.slice(startIndex);
    expect(firstBatch).toHaveLength(2);

    play(["E4"], [1]);
    const secondBatch = oscillators.slice(startIndex + firstBatch.length);

    // The first performance's voices were stopped (faded out), not left running.
    for (const oscillator of firstBatch) {
      expect(oscillator.stop).toHaveBeenCalledWith(0.02);
    }
    expect(secondBatch).toHaveLength(1);
    expect(secondBatch[0].start).toHaveBeenCalledWith(0);
  });

  it("stop() is a harmless no-op when nothing is playing", () => {
    const stopHandler = vi.fn();
    playerEvents.addEventListener("stop", stopHandler);

    expect(() => stop()).not.toThrow();
    expect(stopHandler).not.toHaveBeenCalled();

    playerEvents.removeEventListener("stop", stopHandler);
  });

  it("dispatches noteStart/noteEnd for each note and a final stop (reason: ended) after the last one", () => {
    vi.useFakeTimers();
    const events: { type: string; detail: unknown }[] = [];
    const record = (event: Event) => events.push({ type: event.type, detail: (event as CustomEvent).detail });
    for (const type of ["noteStart", "noteEnd", "stop"]) playerEvents.addEventListener(type, record);

    play(["C4", "D4"], [1, 1]);
    vi.advanceTimersByTime(2 * BEAT_SECONDS * 1000 + 10);

    expect(events).toEqual([
      { type: "noteStart", detail: { index: 0, pitchName: "C4", time: 0 } },
      { type: "noteEnd", detail: { index: 0, pitchName: "C4", time: BEAT_SECONDS } },
      { type: "noteStart", detail: { index: 1, pitchName: "D4", time: BEAT_SECONDS } },
      { type: "noteEnd", detail: { index: 1, pitchName: "D4", time: 2 * BEAT_SECONDS } },
      { type: "stop", detail: { reason: "ended" } },
    ]);

    for (const type of ["noteStart", "noteEnd", "stop"]) playerEvents.removeEventListener(type, record);
  });

  it("firing stop() mid-performance dispatches stop with reason 'stopped', and no later 'ended' follows", () => {
    vi.useFakeTimers();
    const stopEvents: unknown[] = [];
    const record = (event: Event) => stopEvents.push((event as CustomEvent).detail);
    playerEvents.addEventListener("stop", record);

    play(["C4", "D4", "E4"], [1, 1, 1]);
    vi.advanceTimersByTime(BEAT_SECONDS * 1000); // let the first note start
    stop();
    vi.advanceTimersByTime(10 * BEAT_SECONDS * 1000); // well past the original performance's natural end

    expect(stopEvents).toEqual([{ reason: "stopped" }]);

    playerEvents.removeEventListener("stop", record);
  });
});

// playEvents is the generalized scheduling core play() now wraps -- these
// tests exercise the property play()'s one-running-cursor loop could never
// have: two events with the same (or overlapping) startSeconds must both
// sound, neither merged nor dropped.
describe("playEvents (polyphony)", () => {
  afterEach(() => {
    stop();
    vi.useRealTimers();
  });

  it("schedules simultaneous notes at the same start time without merging or dropping either", () => {
    const startIndex = oscillators.length;

    playEvents([
      { pitchName: "C4", startSeconds: 0, durationSeconds: BEAT_SECONDS },
      { pitchName: "E4", startSeconds: 0, durationSeconds: BEAT_SECONDS },
    ]);
    const created = oscillators.slice(startIndex);

    expect(created).toHaveLength(2);
    expect(created[0].start).toHaveBeenCalledWith(0);
    expect(created[1].start).toHaveBeenCalledWith(0);
  });

  it("preserves each event's own start/duration when events overlap partially", () => {
    const startIndex = oscillators.length;

    playEvents([
      { pitchName: "C4", startSeconds: 0, durationSeconds: 2 * BEAT_SECONDS },
      { pitchName: "E4", startSeconds: BEAT_SECONDS, durationSeconds: BEAT_SECONDS },
    ]);
    const created = oscillators.slice(startIndex);

    expect(created[0].start).toHaveBeenCalledWith(0);
    expect(created[0].stop).toHaveBeenCalledWith(2 * BEAT_SECONDS);
    expect(created[1].start).toHaveBeenCalledWith(BEAT_SECONDS);
    expect(created[1].stop).toHaveBeenCalledWith(2 * BEAT_SECONDS);
  });

  it("stop() silences every simultaneous voice, not just one", () => {
    const startIndex = oscillators.length;

    playEvents([
      { pitchName: "C4", startSeconds: 0, durationSeconds: BEAT_SECONDS },
      { pitchName: "E4", startSeconds: 0, durationSeconds: BEAT_SECONDS },
      { pitchName: "G4", startSeconds: 0, durationSeconds: BEAT_SECONDS },
    ]);
    stop();
    const created = oscillators.slice(startIndex);

    expect(created).toHaveLength(3);
    for (const oscillator of created) {
      expect(oscillator.stop).toHaveBeenCalledWith(0.02);
    }
  });

  it("dispatches a final stop (reason: ended) at the latest event's end, not the first", () => {
    vi.useFakeTimers();
    const stopEvents: unknown[] = [];
    const record = (event: Event) => stopEvents.push((event as CustomEvent).detail);
    playerEvents.addEventListener("stop", record);

    playEvents([
      { pitchName: "C4", startSeconds: 0, durationSeconds: BEAT_SECONDS },
      { pitchName: "E4", startSeconds: 0, durationSeconds: 3 * BEAT_SECONDS },
    ]);
    vi.advanceTimersByTime(3 * BEAT_SECONDS * 1000 + 10);

    expect(stopEvents).toEqual([{ reason: "ended" }]);
    playerEvents.removeEventListener("stop", record);
  });
});
