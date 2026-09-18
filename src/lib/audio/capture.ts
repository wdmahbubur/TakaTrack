"use client";
import { encodeWav, WAV_SAMPLE_RATE } from "./wav";
export type Capture = { stop: () => Promise<Blob>; cancel: () => void };
export async function startCapture(
  maxSeconds: number,
  onLimit: () => void,
  signal: AbortSignal,
): Promise<Capture> {
  if (!navigator.mediaDevices?.getUserMedia || !window.AudioContext || !window.AudioWorkletNode)
    throw new Error("এই ব্রাউজারে রেকর্ডিং চালু নেই। আধুনিক ব্রাউজারে HTTPS ব্যবহার করুন অথবা লিখুন।");
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true },
    video: false,
  });
  const stopTracks = () => stream.getTracks().forEach((t) => t.stop());
  if (signal.aborted) {
    stopTracks();
    throw new DOMException("Cancelled", "AbortError");
  }
  let context: AudioContext;
  try {
    context = new AudioContext();
  } catch (error) {
    stopTracks();
    throw error;
  }
  const chunks: Float32Array[] = [];
  let frames = 0,
    closed = false;
  let source: MediaStreamAudioSourceNode | undefined,
    node: AudioWorkletNode | undefined,
    mute: GainNode | undefined;
  const clean = () => {
    stopTracks();
    source?.disconnect();
    node?.disconnect();
    mute?.disconnect();
    if (context.state !== "closed") void context.close();
  };
  const cancel = () => {
    closed = true;
    chunks.length = 0;
    clean();
  };
  signal.addEventListener("abort", cancel, { once: true });
  try {
    await context.audioWorklet.addModule("/recorder.worklet.js");
    if (signal.aborted) throw new DOMException("Cancelled", "AbortError");
    await context.resume();
    source = context.createMediaStreamSource(stream);
    node = new AudioWorkletNode(context, "takatrack-recorder", {
      processorOptions: { maxSeconds },
      numberOfInputs: 1,
      numberOfOutputs: 1,
      outputChannelCount: [1],
    });
    node.port.onmessage = (event: MessageEvent<{ samples?: Float32Array; limit?: boolean }>) => {
      if (closed) return;
      if (event.data.samples) {
        chunks.push(event.data.samples);
        frames += event.data.samples.length;
      }
      if (event.data.limit) onLimit();
    };
    mute = context.createGain();
    mute.gain.value = 0;
    source.connect(node);
    node.connect(mute);
    mute.connect(context.destination);
  } catch (error) {
    cancel();
    signal.removeEventListener("abort", cancel);
    throw error;
  }
  return {
    cancel: () => {
      cancel();
      signal.removeEventListener("abort", cancel);
    },
    stop: async () => {
      if (closed) throw new Error("রেকর্ডিং শেষ হয়েছে। আবার রেকর্ড করুন।");
      closed = true;
      clean();
      signal.removeEventListener("abort", cancel);
      if (frames / context.sampleRate < 0.25)
        throw new Error("রেকর্ডিং খুব ছোট। একটু সময় নিয়ে আবার বলুন।");
      const sourceSamples = new Float32Array(frames);
      let offset = 0;
      for (const chunk of chunks) {
        sourceSamples.set(chunk, offset);
        offset += chunk.length;
      }
      chunks.length = 0;
      const targetFrames = Math.min(
        Math.floor(maxSeconds * WAV_SAMPLE_RATE),
        Math.floor((frames / context.sampleRate) * WAV_SAMPLE_RATE),
      );
      // Actual PCM resampling through Web Audio; never rename WebM/MP4 to WAV.
      const offline = new OfflineAudioContext(1, targetFrames, WAV_SAMPLE_RATE);
      const buffer = offline.createBuffer(1, frames, context.sampleRate);
      buffer.copyToChannel(sourceSamples, 0);
      const player = offline.createBufferSource();
      player.buffer = buffer;
      player.connect(offline.destination);
      player.start();
      const rendered = await offline.startRendering();
      return new Blob([encodeWav(rendered.getChannelData(0))], { type: "audio/wav" });
    },
  };
}
