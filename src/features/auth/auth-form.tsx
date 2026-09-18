"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/icons";
import { Button, Message } from "@/components/ui";
import { api } from "@/lib/client-api";
export type AuthMode = "login" | "register" | "forgot" | "reset" | "resend";
const content: Record<AuthMode, { title: string; subtitle: string; action: string; icon: string }> =
  {
    login: {
      title: "স্বাগতম আবার!",
      subtitle: "আপনার অ্যাকাউন্টে লগ ইন করুন।",
      action: "লগ ইন করুন",
      icon: "lock",
    },
    register: {
      title: "একটি অ্যাকাউন্ট তৈরি করুন",
      subtitle: "আপনার আয়–খরচ গুছিয়ে রাখার শুরু এখানেই।",
      action: "অ্যাকাউন্ট তৈরি করুন",
      icon: "user",
    },
    forgot: {
      title: "পাসওয়ার্ড ভুলে গেছেন?",
      subtitle: "ইমেইল দিন। পাসওয়ার্ড রিসেট করার লিংক পাঠানো হবে।",
      action: "রিসেট লিংক পাঠান",
      icon: "mail",
    },
    reset: {
      title: "নতুন পাসওয়ার্ড দিন",
      subtitle: "আপনার অ্যাকাউন্টের জন্য একটি শক্তিশালী পাসওয়ার্ড দিন।",
      action: "পাসওয়ার্ড পরিবর্তন করুন",
      icon: "lock",
    },
    resend: {
      title: "আপনার ইমেইল যাচাই করুন",
      subtitle: "ইনবক্সের লিংক দিয়ে অ্যাকাউন্ট যাচাই করুন। স্প্যাম ফোল্ডারও দেখুন।",
      action: "আবার ইমেইল পাঠান",
      icon: "mail",
    },
  };
export function AuthForm({
  mode,
  configured,
  googleEnabled = false,
  notice = "",
}: {
  mode: AuthMode;
  configured: boolean;
  googleEnabled?: boolean;
  notice?: string;
}) {
  const router = useRouter();
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const { title, subtitle, action, icon } = content[mode];
  const hasPassword = ["login", "register", "reset"].includes(mode);
  const notices: Record<string, string> = {
    setup: "Supabase এখনো সেটআপ করা হয়নি। README অনুযায়ী পরিবেশের কনফিগারেশন দিন।",
    session: "আপনার সেশন শেষ হয়েছে। আবার লগ ইন করুন।",
    "password-reset": "পাসওয়ার্ড পরিবর্তন হয়েছে। নতুন পাসওয়ার্ড দিয়ে লগ ইন করুন।",
  };
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError("");
    setMessage("");
    const fd = new FormData(e.currentTarget);
    try {
      const result = await api<{ redirect?: string; message?: string }>(`/api/auth/${mode}`, {
        name: fd.get("name"),
        email: fd.get("email"),
        password: fd.get("password"),
        remember: fd.get("remember") === "on",
      });
      if (result.redirect) {
        router.replace(result.redirect);
        router.refresh();
      } else setMessage(result.message ?? "অনুরোধ সম্পন্ন হয়েছে।");
    } catch (e) {
      setError(e instanceof Error ? e.message : "আবার চেষ্টা করুন।");
    } finally {
      setBusy(false);
      inFlight.current = false;
    }
  }
  async function google() {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError("");
    try {
      const result = await api<{ redirect: string }>("/api/auth/google", {});
      window.location.assign(result.redirect);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Google লগ ইন করা যায়নি।");
      setBusy(false);
      inFlight.current = false;
    }
  }
  return (
    <section className={`auth-card auth-${mode}`}>
      <span className="auth-icon">
        <Icon name={icon} size={25} />
      </span>
      <h1>{title}</h1>
      <p className="auth-subtitle">{subtitle}</p>
      {(notice || !configured) && <Message tone="info">{notices[notice] || notices.setup}</Message>}
      <form onSubmit={submit} className="auth-form">
        {mode === "register" && (
          <label htmlFor="name">
            নাম
            <span className="input-icon-wrap">
              <Icon name="user" size={18} />
              <input
                id="name"
                name="name"
                autoComplete="name"
                placeholder="আপনার পুরো নাম"
                required
                maxLength={80}
                disabled={busy}
              />
            </span>
          </label>
        )}
        {mode !== "reset" && (
          <label htmlFor="email">
            ইমেইল
            <span className="input-icon-wrap">
              <Icon name="mail" size={18} />
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                required
                maxLength={254}
                disabled={busy}
              />
            </span>
          </label>
        )}
        {hasPassword && (
          <label htmlFor="password">
            পাসওয়ার্ড
            <span className="input-icon-wrap">
              <Icon name="lock" size={18} />
              <input
                id="password"
                name="password"
                type={show ? "text" : "password"}
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                placeholder="••••••••"
                required
                minLength={mode === "login" ? 1 : 8}
                maxLength={128}
                disabled={busy}
              />
              <button
                type="button"
                className="password-toggle"
                aria-label={show ? "পাসওয়ার্ড লুকান" : "পাসওয়ার্ড দেখান"}
                aria-pressed={show}
                onClick={() => setShow(!show)}
              >
                <Icon name="eye" />
              </button>
            </span>
            {mode !== "login" && <small>কমপক্ষে ৮টি অক্ষর ব্যবহার করুন</small>}
          </label>
        )}
        {mode === "login" && (
          <div className="auth-options">
            <label className="checkbox-label">
              <input type="checkbox" name="remember" defaultChecked /> আমাকে মনে রাখুন
            </label>
            <Link href="/forgot-password">পাসওয়ার্ড ভুলে গেছেন?</Link>
          </div>
        )}
        {error && <Message>{error}</Message>}
        {message && <Message tone="success">{message}</Message>}
        <Button
          type="submit"
          icon={busy ? undefined : "arrow"}
          disabled={busy || !configured}
          className="auth-submit"
        >
          {busy ? "অপেক্ষা করুন…" : action}
        </Button>
      </form>
      {["login", "register"].includes(mode) && (
        <>
          <div className="divider">
            <span>অথবা</span>
          </div>
          <Button
            type="button"
            variant="secondary"
            className="google-button"
            disabled={busy || !googleEnabled || !configured}
            onClick={google}
          >
            <span className="google-g" aria-hidden="true">
              G
            </span>
            Google দিয়ে {mode === "login" ? "লগ ইন" : "সাইন আপ"} করুন
          </Button>
          {!googleEnabled && <p className="oauth-unavailable">Google লগ ইন এখনো সেটআপ করা হয়নি</p>}
        </>
      )}
      <p className="auth-switch">
        {mode === "login" ? (
          <>
            নতুন এখানে? <Link href="/register">অ্যাকাউন্ট তৈরি করুন</Link>
          </>
        ) : mode === "register" ? (
          <>
            ইতিমধ্যে অ্যাকাউন্ট আছে? <Link href="/login">লগ ইন করুন</Link>
          </>
        ) : (
          <Link href="/login">লগ ইন পাতায় ফিরুন</Link>
        )}
      </p>
      {mode === "login" && (
        <Link className="verification-link" href="/verify-email">
          যাচাইকরণ ইমেইল আবার পাঠান
        </Link>
      )}
    </section>
  );
}
