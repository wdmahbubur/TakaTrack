// Canonical format shared by browser encoder and server validator. No MIME relabelling.
export const WAV_SAMPLE_RATE = 16000;
export function encodeWav(samples: Float32Array): ArrayBuffer {
  const result = new ArrayBuffer(44 + samples.length * 2),
    view = new DataView(result);
  const ascii = (offset: number, value: string) => {
    for (let i = 0; i < value.length; i++) view.setUint8(offset + i, value.charCodeAt(i));
  };
  ascii(0, "RIFF");
  view.setUint32(4, result.byteLength - 8, true);
  ascii(8, "WAVE");
  ascii(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, WAV_SAMPLE_RATE, true);
  view.setUint32(28, WAV_SAMPLE_RATE * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  ascii(36, "data");
  view.setUint32(40, samples.length * 2, true);
  samples.forEach((sample, i) => {
    const s = Math.max(-1, Math.min(1, sample));
    view.setInt16(44 + i * 2, Math.round(s < 0 ? s * 32768 : s * 32767), true);
  });
  return result;
}
export function validateWav(
  bytes: Uint8Array,
  maxSeconds: number,
  maxBytes: number,
): { durationSeconds: number; rms: number } {
  if (bytes.byteLength < 46 || bytes.byteLength > maxBytes) throw new Error("INVALID_AUDIO_SIZE");
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const ascii = (offset: number, length: number) =>
    new TextDecoder().decode(bytes.subarray(offset, offset + length));
  if (
    ascii(0, 4) !== "RIFF" ||
    ascii(8, 4) !== "WAVE" ||
    ascii(12, 4) !== "fmt " ||
    ascii(36, 4) !== "data" ||
    view.getUint32(4, true) !== bytes.byteLength - 8 ||
    view.getUint32(16, true) !== 16 ||
    view.getUint16(20, true) !== 1 ||
    view.getUint16(22, true) !== 1 ||
    view.getUint32(24, true) !== WAV_SAMPLE_RATE ||
    view.getUint32(28, true) !== WAV_SAMPLE_RATE * 2 ||
    view.getUint16(32, true) !== 2 ||
    view.getUint16(34, true) !== 16 ||
    view.getUint32(40, true) !== bytes.byteLength - 44 ||
    (bytes.byteLength - 44) % 2 !== 0
  )
    throw new Error("INVALID_AUDIO_FORMAT");
  const frames = (bytes.byteLength - 44) / 2,
    durationSeconds = frames / WAV_SAMPLE_RATE;
  if (durationSeconds > maxSeconds || durationSeconds < 0.25)
    throw new Error("INVALID_AUDIO_DURATION");
  let squareSum = 0;
  for (let i = 0; i < frames; i++) {
    const value = view.getInt16(44 + 2 * i, true) / 32768;
    squareSum += value * value;
  }
  const rms = Math.sqrt(squareSum / frames);
  if (rms < 0.001) throw new Error("AUDIO_SILENCE");
  return { durationSeconds, rms };
}
