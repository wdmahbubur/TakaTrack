import Link from "next/link";
import { Icon, Logo } from "@/components/icons";
export const dynamic = "force-dynamic";
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="auth-screen">
      <header className="auth-header">
        <Link href="/" aria-label="TakaTrack home">
          <Logo />
        </Link>
        <Link href="/" className="back-home">
          <Icon name="back" size={17} /> হোমে ফিরুন
        </Link>
      </header>
      <main className="auth-main">{children}</main>
      <footer className="auth-footer">আপনার দৈনন্দিন হিসাবের সঙ্গী — TakaTrack</footer>
    </div>
  );
}
