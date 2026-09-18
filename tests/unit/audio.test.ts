import test from "node:test";
import assert from "node:assert/strict";
import { encodeWav, validateWav, WAV_SAMPLE_RATE } from "../../src/lib/audio/wav.ts";
const tone = (seconds: number) =>
  Float32Array.from(
    { length: Math.floor(WAV_SAMPLE_RATE * seconds) },
    (_, i) => 0.25 * Math.sin((2 * Math.PI * 440 * i) / WAV_SAMPLE_RATE),
  );
test("real PCM WAV header and duration agree", () => {
  const data = new Uint8Array(encodeWav(tone(1)));
  assert.equal(data.byteLength, 32044);
  const result = validateWav(data, 60, 2000000);
  assert.equal(result.durationSeconds, 1);
  assert.ok(result.rms > 0.1);
});
test("60-second PCM recording fits conservative upload limit", () =>
  assert.equal(new Uint8Array(encodeWav(tone(60))).byteLength, 1920044));
test("server detects silence before provider submission", () =>
  assert.throws(
    () => validateWav(new Uint8Array(encodeWav(new Float32Array(16000))), 60, 2000000),
    /AUDIO_SILENCE/,
  ));
test("renamed WebM bytes are rejected as WAV", () =>
  assert.throws(() => validateWav(new Uint8Array(1000), 60, 2000000), /INVALID_AUDIO_FORMAT/));
test("tampered WAV sample rate is rejected", () => {
  const data = new Uint8Array(encodeWav(tone(1)));
  new DataView(data.buffer).setUint32(24, 48000, true);
  assert.throws(() => validateWav(data, 60, 2000000), /INVALID_AUDIO_FORMAT/);
});
test("client duration metadata cannot bypass byte-derived duration", () =>
  assert.throws(
    () => validateWav(new Uint8Array(encodeWav(tone(2))), 1, 2000000),
    /INVALID_AUDIO_DURATION/,
  ));
test("size limits are enforced against actual bytes", () =>
  assert.throws(
    () => validateWav(new Uint8Array(encodeWav(tone(2))), 60, 32044),
    /INVALID_AUDIO_SIZE/,
  ));
test("clipping stays within signed PCM16 range", () => {
  const data = new DataView(encodeWav(new Float32Array([-2, 2])));
  assert.equal(data.getInt16(44, true), -32768);
  assert.equal(data.getInt16(46, true), 32767);
});
