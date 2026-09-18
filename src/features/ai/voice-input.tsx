"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ProviderCapabilities } from "@/lib/ai/contracts";
import { startCapture, type Capture } from "@/lib/audio/capture";
import { api } from "@/lib/client-api";
import { Button, Message } from "@/components/ui";
import { Icon } from "@/components/icons";
export function VoiceInput({
  capabilities,
  onTranscript,
  disabled = false,
}: {
  capabilities: ProviderCapabilities;
  onTranscript: (text: string) => void;
  disabled?: boolean;
}) {
  const [phase, setPhase] = useState<
    "idle" | "requesting" | "recording" | "encoding" | "ready" | "sending"
  >("idle");
  const [error, setError] = useState("");
  const [seconds, setSeconds] = useState(0);
  const [url, setUrl] = useState("");
  const capture = useRef<Capture | null>(null);
  const blob = useRef<Blob | null>(null);
  const objectUrl = useRef("");
  const controller = useRef<AbortController | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const mounted = useRef(true);
  const busy = useRef(false);
  const clearTimer = () => {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
  };
  const clearAudio = () => {
    if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
    objectUrl.current = "";
    blob.current = null;
  };
  useEffect(() => {
    mounted.current = true;
    const cleanup = () => {
      capture.current?.cancel();
      capture.current = null;
      controller.current?.abort();
      clearTimer();
      clearAudio();
    };
    window.addEventListener("pagehide", cleanup);
    return () => {
      mounted.current = false;
      cleanup();
      window.removeEventListener("pagehide", cleanup);
    };
  }, []);
  const stop = useCallback(async () => {
    if (!capture.current) return;
    const current = capture.current;
    capture.current = null;
    clearTimer();
    setPhase("encoding");
    try {
      const audio = await current.stop();
      if (!mounted.current) return;
      if (audio.size > capabilities.maxAudioBytes)
        throw new Error("অডিওর আকার বেশি। ছোট করে আবার রেকর্ড করুন।");
      clearAudio();
      blob.current = audio;
      objectUrl.current = URL.createObjectURL(audio);
      setUrl(objectUrl.current);
      setPhase("ready");
    } catch (e) {
      if (mounted.current) {
        setError(e instanceof Error ? e.message : "রেকর্ডিং তৈরি হয়নি।");
        setPhase("idle");
      }
    }
  }, [capabilities.maxAudioBytes]);
  async function start() {
    if (busy.current || disabled) return;
    busy.current = true;
    clearAudio();
    setUrl("");
    setError("");
    setSeconds(0);
    setPhase("requesting");
    controller.current = new AbortController();
    const signal = controller.current.signal;
    try {
      const session = await startCapture(capabilities.maxAudioSeconds, () => void stop(), signal);
      if (!mounted.current || signal.aborted) {
        session.cancel();
        return;
      }
      capture.current = session;
      setPhase("recording");
      const started = performance.now();
      timer.current = setInterval(
        () =>
          setSeconds(
            Math.min(
              capabilities.maxAudioSeconds,
              Math.floor((performance.now() - started) / 1000),
            ),
          ),
        250,
      );
    } catch (e) {
      if (mounted.current && !signal.aborted) {
        const denied =
          e instanceof DOMException &&
          (e.name === "NotAllowedError" || e.name === "PermissionDeniedError");
        setError(
          denied
            ? "মাইক্রোফোনের অনুমতি পাওয়া যায়নি। ব্রাউজারের অনুমতি বদলান অথবা লিখে খরচ যোগ করুন।"
            : e instanceof Error
              ? e.message
              : "রেকর্ডিং শুরু করা যায়নি।",
        );
        setPhase("idle");
      }
    } finally {
      busy.current = false;
    }
  }
  function discard() {
    controller.current?.abort();
    capture.current?.cancel();
    capture.current = null;
    clearTimer();
    clearAudio();
    setUrl("");
    setPhase("idle");
    setSeconds(0);
  }
  async function send() {
    if (!blob.current || busy.current) return;
    busy.current = true;
    setPhase("sending");
    setError("");
    controller.current = new AbortController();
    const signal = controller.current.signal;
    const form = new FormData();
    form.set("audio", blob.current, "expense.wav");
    try {
      const result = await api<{ transcript: string }>("/api/ai/transcribe", form, "POST", signal);
      if (mounted.current && !signal.aborted) {
        onTranscript(result.transcript);
        discard();
      }
    } catch (e) {
      if (mounted.current && !signal.aborted) {
        setError(e instanceof Error ? e.message : "অডিও পাঠানো যায়নি। আবার পাঠান অথবা লিখুন।");
        setPhase("ready");
      }
    } finally {
      busy.current = false;
    }
  }
  return (
    <div className="voice-input">
      <div className="voice-controls">
        {phase === "idle" && (
          <Button
            type="button"
            variant="secondary"
            icon="mic"
            disabled={!capabilities.voice.available || disabled}
            onClick={start}
          >
            কথা বলে লিখুন
          </Button>
        )}
        {phase === "requesting" && (
          <>
            <span role="status">মাইক্রোফোনের অনুমতি দিন…</span>
            <Button type="button" variant="secondary" onClick={discard}>
              বাতিল
            </Button>
          </>
        )}
        {phase === "recording" && (
          <>
            <span className="recording-status" role="status">
              <i />
              {String(Math.floor(seconds / 60)).padStart(2, "0")}:
              {String(seconds % 60).padStart(2, "0")} / {capabilities.maxAudioSeconds}s
            </span>
            <Button type="button" variant="secondary" icon="stop" onClick={() => void stop()}>
              থামান
            </Button>
            <Button type="button" variant="ghost" onClick={discard}>
              বাতিল
            </Button>
          </>
        )}
        {phase === "encoding" && <span role="status">অডিও প্রস্তুত হচ্ছে…</span>}
        {(phase === "ready" || phase === "sending") && (
          <>
            <audio controls src={url} aria-label="আপনার রেকর্ডিং শুনুন" />
            <Button type="button" icon="sparkles" disabled={phase === "sending"} onClick={send}>
              {phase === "sending" ? "লেখায় রূপান্তর হচ্ছে…" : "পাঠিয়ে লেখায় রূপান্তর করুন"}
            </Button>
            <button
              type="button"
              className="icon-button danger"
              aria-label="রেকর্ডিং মুছুন"
              onClick={discard}
            >
              <Icon name="trash" />
            </button>
          </>
        )}
      </div>
      <p className="voice-notice">
        {capabilities.voice.available
          ? `সর্বোচ্চ ${capabilities.maxAudioSeconds} সেকেন্ড। পাঠালে অডিও ${capabilities.voice.label}-তে প্রক্রিয়াকৃত হবে; TakaTrack স্থায়ীভাবে অডিও রাখে না।`
          : capabilities.voice.reason}
      </p>
      {error && <Message>{error}</Message>}
    </div>
  );
}
