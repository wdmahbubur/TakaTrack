"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ActionLink, Button, Message, PageHeading } from "@/components/ui";
import { api } from "@/lib/client-api";
export function ProfileForm({ name, email }: { name: string; email: string }) {
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [error, setError] = useState("");
  const flight = useRef(false),
    router = useRouter();
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (flight.current) return;
    flight.current = true;
    setBusy(true);
    setMessage("");
    setError("");
    const fd = new FormData(e.currentTarget);
    try {
      await api("/api/profile", { display_name: fd.get("display_name") }, "PATCH");
      router.refresh();
      setMessage("আপনার নাম আপডেট হয়েছে।");
    } catch (e) {
      setError(e instanceof Error ? e.message : "আপডেট হয়নি।");
    } finally {
      flight.current = false;
      setBusy(false);
    }
  }
  return (
    <>
      <PageHeading title="আপনার প্রোফাইল" subtitle="অ্যাকাউন্টের সাধারণ তথ্য দেখুন ও পরিবর্তন করুন।" />
      <section className="panel profile-panel">
        <form onSubmit={submit} className="form-stack">
          <label>
            নাম
            <input
              name="display_name"
              defaultValue={name}
              maxLength={80}
              required
              autoComplete="name"
            />
          </label>
          <label>
            ইমেইল
            <input value={email} readOnly type="email" />
          </label>
          {error && <Message>{error}</Message>}
          {message && <Message tone="success">{message}</Message>}
          <Button type="submit" disabled={busy}>
            {busy ? "সেভ হচ্ছে…" : "পরিবর্তন সেভ করুন"}
          </Button>
        </form>
        <div className="profile-password">
          <h2>পাসওয়ার্ড</h2>
          <p>ইমেইলের সাহায্যে আপনার পাসওয়ার্ড রিসেট করুন।</p>
          <ActionLink href="/forgot-password" variant="secondary" icon="lock">
            পাসওয়ার্ড রিসেট করুন
          </ActionLink>
        </div>
      </section>
    </>
  );
}
