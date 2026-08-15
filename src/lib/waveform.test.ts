import { describe, expect, it } from "vitest";
import { idlePoints, sampleToY, waveformPoints } from "./waveform.ts";

describe("sampleToY", () => {
  it("maps silence (128) to vertical center", () => {
    expect(sampleToY(128, 100)).toBe(50);
  });

  it("maps the most negative byte (0) to the bottom", () => {
    expect(sampleToY(0, 100)).toBe(100);
  });

  it("maps the most positive byte (255) close to the top", () => {
    expect(sampleToY(255, 100)).toBeCloseTo(0, 0);
    expect(sampleToY(255, 100)).toBeLessThan(sampleToY(128, 100));
  });
});

describe("waveformPoints", () => {
  it("produces exactly `width` points, one per x position", () => {
    const data = new Uint8Array(2048).fill(128);
    const points = waveformPoints(data, 300, 100);
    expect(points).toHaveLength(300);
    expect(points.map((p) => p[0])).toEqual(Array.from({ length: 300 }, (_, x) => x));
  });

  it("a constant (silent) buffer produces a flat line at center, whatever its length", () => {
    const short = waveformPoints(new Uint8Array(4).fill(128), 50, 80);
    const long = waveformPoints(new Uint8Array(4096).fill(128), 50, 80);
    expect(short).toEqual(long);
    expect(short.every(([, y]) => y === 40)).toBe(true);
  });

  it("is pure: identical input always produces identical output", () => {
    const data = new Uint8Array([10, 200, 128, 60, 240]);
    expect(waveformPoints(data, 40, 60)).toEqual(waveformPoints(data, 40, 60));
  });

  it("handles a buffer longer than the requested width by nearest-sampling", () => {
    const data = new Uint8Array(1000).fill(0).map((_, i) => (i % 2 === 0 ? 0 : 255));
    const points = waveformPoints(data, 10, 100);
    expect(points).toHaveLength(10);
  });
});

describe("idlePoints", () => {
  it("is the same shape a true-silence buffer produces through waveformPoints", () => {
    expect(idlePoints(120, 80)).toEqual(waveformPoints(new Uint8Array(64).fill(128), 120, 80));
  });

  it("is flat at vertical center", () => {
    const points = idlePoints(120, 80);
    expect(points.every(([, y]) => y === 40)).toBe(true);
  });
});
