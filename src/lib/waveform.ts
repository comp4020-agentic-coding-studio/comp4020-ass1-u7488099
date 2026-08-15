// Pure, canvas-free mapping from AnalyserNode.getByteTimeDomainData() bytes to
// drawable points. Kept separate from any actual canvas drawing/styling so a
// later scale-specific visual theme only ever has to change how points are
// painted, never how they're computed.

// AnalyserNode.getByteTimeDomainData() encodes a signed sample in [-1, 1] as
// an unsigned byte via `128 + 128 * sample` -- so 128 is silence (sample 0),
// 0 is the most negative peak, 255 is (nearly) the most positive one. This
// undoes that encoding and maps it onto a canvas y position, center = height/2.
export function sampleToY(byte: number, height: number): number {
  const sample = (byte - 128) / 128;
  return height / 2 - sample * (height / 2);
}

// Maps one time-domain buffer onto `width` evenly spaced x positions,
// nearest-sampling into `data` regardless of whether it's longer or shorter
// than `width`. A constant buffer (e.g. all 128, true silence) always yields
// a flat line at height/2, whatever its length -- see idlePoints below.
export function waveformPoints(
  data: ArrayLike<number>,
  width: number,
  height: number,
): Array<[number, number]> {
  const points: Array<[number, number]> = [];
  const len = data.length;
  for (let x = 0; x < width; x++) {
    const byte = len === 0 ? 128 : data[Math.min(len - 1, Math.floor((x / width) * len))];
    points.push([x, sampleToY(byte, height)]);
  }
  return points;
}

// The calm, flat line shown before the first Play and whenever playback
// stops -- deliberately the exact same shape true silence produces (an
// all-128 buffer through waveformPoints), so "idle" and "actually silent"
// are provably one shape, not two parallel code paths.
export function idlePoints(width: number, height: number): Array<[number, number]> {
  return waveformPoints([128], width, height);
}
