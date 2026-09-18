import type { Metadata, Viewport } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: { default: "TakaTrack — খরচের হিসাব এখন আরও সহজ", template: "%s | TakaTrack" },
  description: "বাংলায় আপনার আয়, খরচ ও মাসিক বাজেটের সহজ হিসাব।",
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#07815b" };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="bn">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Noto+Sans+Bengali:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
