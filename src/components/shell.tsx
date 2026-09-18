"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Icon, Logo } from "./icons";
import { Dialog } from "./dialog";
import { api } from "@/lib/client-api";
const links = [
  ["/dashboard", "Dashboard", "home"],
  ["/transactions", "Transactions", "receipt"],
  ["/budgets", "Budgets", "shield"],
  ["/reports", "Reports", "chart"],
  ["/profile", "Profile", "user"],
];
export function Shell({ name, children }: { name: string; children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const [drawer, setDrawer] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const onFocus = () => router.refresh();
    window.addEventListener("focus", onFocus);
    const channel = "BroadcastChannel" in window ? new BroadcastChannel("takatrack-data") : null;
    if (channel) channel.onmessage = onFocus;
    return () => {
      window.removeEventListener("focus", onFocus);
      channel?.close();
    };
  }, [router]);
  async function logout() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await api("/api/auth/logout", {});
      router.replace("/login");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "লগ আউট করা যায়নি।");
      setBusy(false);
    }
  }
  const navigation = (
    <>
      <p className="workspace-label">WORKSPACE</p>
      <nav aria-label="Workspace">
        {links.map(([href, label, icon]) => (
          <Link
            key={href}
            href={href}
            onClick={() => setDrawer(false)}
            className={`nav-item ${path.startsWith(href) ? "active" : ""}`}
            aria-current={path.startsWith(href) ? "page" : undefined}
          >
            <Icon name={icon} />
            {label}
          </Link>
        ))}
      </nav>
      <div className="sidebar-bottom">
        {error && (
          <p className="text-danger" role="alert">
            {error}
          </p>
        )}
        <button type="button" className="nav-item logout" disabled={busy} onClick={logout}>
          <Icon name="logout" />
          {busy ? "Logging out…" : "Logout"}
        </button>
      </div>
    </>
  );
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        মূল অংশে যান
      </a>
      <header className="app-header">
        <div className="header-brand">
          <button
            type="button"
            className="icon-button menu-toggle"
            aria-label="নেভিগেশন খুলুন"
            aria-expanded={drawer}
            onClick={() => setDrawer(true)}
          >
            <Icon name="menu" />
          </button>
          <Link href="/dashboard" aria-label="TakaTrack dashboard">
            <Logo />
          </Link>
        </div>
        <div className="header-account">
          <Link href="/budgets" className="icon-button bell-link" aria-label="বাজেট সতর্কতা দেখুন">
            <Icon name="bell" />
          </Link>
          <Link href="/profile" className="account-link">
            <span className="avatar">{(name || "U").slice(0, 1).toUpperCase()}</span>
            <span className="account-name">{name || "আপনার প্রোফাইল"}</span>
            <Icon name="down" size={16} />
          </Link>
        </div>
      </header>
      <aside className="sidebar">{navigation}</aside>
      {drawer && (
        <Dialog title="TakaTrack" onClose={() => setDrawer(false)}>
          <div className="mobile-nav">{navigation}</div>
        </Dialog>
      )}
      <main className="app-main" id="main-content">
        <div className="content-wrap">{children}</div>
      </main>
    </div>
  );
}
