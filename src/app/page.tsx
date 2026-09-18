import Link from "next/link";
import { Icon, Logo } from "@/components/icons";
import { ActionLink } from "@/components/ui";
import { DemoButton } from "@/features/landing/demo-dialog";
import { ProductPreview } from "@/features/landing/product-preview";
export default function LandingPage() {
  return (
    <div className="landing" id="home">
      <a className="skip-link" href="#main-content">
        মূল অংশে যান
      </a>
      <header className="landing-header">
        <Link href="/" aria-label="TakaTrack home">
          <Logo />
        </Link>
        <nav className="landing-nav" aria-label="Main navigation">
          <a href="#home" className="active">
            Home
          </a>
          <a href="#features">Features</a>
          <a href="#how-it-works">How it works</a>
          <a href="#about">About</a>
        </nav>
        <div className="landing-auth">
          <ActionLink href="/login" variant="secondary">
            Log In
          </ActionLink>
          <ActionLink href="/register">Sign Up</ActionLink>
        </div>
      </header>
      <main id="main-content">
        <section className="landing-hero">
          <div className="hero-inner">
            <div className="hero-content">
              <p className="hero-eyebrow">Smart Expense Tracking for a Better Tomorrow</p>
              <h1>
                খরচের হিসাব
                <br />
                এখন <span>আরও সহজ</span>
              </h1>
              <p className="hero-description">
                AI-এর সাহায্যে নিজের আয়, খরচ ও বাজেট পরিচালনা করুন — সহজ, নিরাপদ, আপনার জন্য।
              </p>
              <div className="hero-actions">
                <ActionLink href="/register" icon="arrow">
                  Get Started
                </ActionLink>
                <DemoButton />
              </div>
              <div className="hero-features" id="features">
                {[
                  { icon: "bolt", title: "AI দিয়ে দ্রুত যোগ", body: "সাধারণভাবে লিখুন, খরচ যোগ হয়ে যাবে" },
                  { icon: "target", title: "মাসিক বাজেট", body: "নিয়ন্ত্রণে রাখুন আপনার খরচ" },
                  { icon: "chart", title: "সহজ রিপোর্ট", body: "খরচের ধারা দেখুন চোখের পলকে" },
                ].map((feature) => (
                  <section key={feature.title}>
                    <span className="hero-feature-icon">
                      <Icon name={feature.icon} />
                    </span>
                    <h2>{feature.title}</h2>
                    <p>{feature.body}</p>
                  </section>
                ))}
              </div>
            </div>
            <ProductPreview />
          </div>
        </section>
        <section className="how-section" id="how-it-works">
          <div className="how-inner">
            <div className="section-title">
              <h2>How TakaTrack Works?</h2>
              <p>তিনটি সহজ ধাপে শুরু করুন</p>
            </div>
            <div className="how-steps">
              {[
                {
                  icon: "user",
                  title: "একটি অ্যাকাউন্ট তৈরি করুন",
                  body: "মাত্র কয়েক মিনিটে রেজিস্ট্রেশন করুন।",
                },
                {
                  icon: "wallet",
                  title: "আপনার আয় ও খরচ যোগ করুন",
                  body: "সাধারণভাবে লিখুন। AI থেকে পাওয়া তথ্য যাচাই করুন।",
                },
                {
                  icon: "chart",
                  title: "রিপোর্ট দেখুন ও পরিকল্পনা করুন",
                  body: "মাসিক হিসাব দেখে নিয়ন্ত্রণে রাখুন আপনার ভবিষ্যৎ।",
                },
              ].map((step, i) => (
                <section className="how-step" key={step.title}>
                  <span className="how-icon">
                    <Icon name={step.icon} />
                  </span>
                  <div>
                    <span className="step-number">0{i + 1}</span>
                    <h3>{step.title}</h3>
                    <p>{step.body}</p>
                  </div>
                  {i < 2 && <Icon name="right" className="step-arrow" />}
                </section>
              ))}
            </div>
          </div>
        </section>
        <section className="landing-about" id="about">
          <div className="about-illustration">
            <img
              src="/about-illustration.webp"
              alt="নিজের খরচের হিসাব লিখছেন একজন ব্যক্তি"
              width={365}
              height={248}
              loading="lazy"
            />
            <p className="illustration-speech">
              আজ আমি
              <br />
              আরও সচেতন! <span>♥</span>
            </p>
          </div>
          <div className="about-copy">
            <h2>
              ছোট ছোট পদক্ষেপে
              <br />
              গড়ে উঠুক বড় লক্ষ্য
            </h2>
            <p>TakaTrack আপনার পাশে আছে, যাতে আপনি আরও ভালো আর্থিক অভ্যাস গড়ে তুলতে পারেন।</p>
            <ActionLink href="/register" icon="arrow">
              এখনই শুরু করুন
            </ActionLink>
          </div>
          <div className="trust-features">
            {[
              { icon: "shield", title: "নিরাপদ ও ব্যক্তিগত", body: "আপনার হিসাব, আপনার অ্যাকাউন্টে" },
              { icon: "devices", title: "যেকোনো ডিভাইস থেকে ব্যবহার", body: "মোবাইল, ট্যাব বা কম্পিউটার" },
              { icon: "heart", title: "আপনার আর্থিক সহযাত্রী", body: "একটি ভালো আগামীর জন্য" },
            ].map((item) => (
              <section className="trust-feature" key={item.title}>
                <span className="trust-feature-icon">
                  <Icon name={item.icon} />
                </span>
                <div>
                  <h3>{item.title}</h3>
                  <p>{item.body}</p>
                </div>
              </section>
            ))}
          </div>
        </section>
      </main>
      <footer className="landing-footer">
        <div className="footer-brand">
          <Logo />
          <p>Track Today, Brighter Tomorrow</p>
        </div>
        <nav className="footer-links" aria-label="Footer">
          <a href="#home">Home</a>
          <a href="#features">Features</a>
          <a href="#how-it-works">How it works</a>
          <a href="#about">About</a>
        </nav>
        <p>© {new Date().getFullYear()} TakaTrack. All rights reserved.</p>
      </footer>
    </div>
  );
}
