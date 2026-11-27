"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import Glyph from "./Glyph";
import ThemeSwitch from "./ThemeSwitch";

const NAV = [
  { href: "/ask", label: "Ask" },
  { href: "/lab", label: "Lab" },
  { href: "/method", label: "Method" },
];
const REPO = process.env.NEXT_PUBLIC_REPO_URL || "https://github.com/Daimx1214/verdict";

export function TopBar() {
  const path = usePathname();
  if (path.startsWith("/embed")) return null;
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-paper">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-2 focus:bg-surface focus:px-3 focus:py-2">Skip to content</a>
      <div className="mx-auto flex h-14 max-w-[1120px] items-center gap-6 px-4 md:px-6">
        <Link href="/" className="flex items-center gap-2.5" aria-label="Verdict home">
          <Glyph size={24} />
          <span className="font-display text-[22px] font-semibold tracking-[-0.01em]">Verdict</span>
        </Link>
        <nav className="ml-2 hidden items-center gap-6 md:flex" aria-label="Main">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href}
              className={`pb-0.5 text-[15px] font-medium transition-colors duration-120 ${path === n.href || (n.href !== "/" && path.startsWith(n.href + "/")) ? "text-ink shadow-[0_2px_0_0_var(--accent)]" : "text-ink-2 hover:text-ink"}`}>
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-3">
          <div className="hidden md:block"><ThemeSwitch /></div>
          <a href={REPO} target="_blank" rel="noopener noreferrer" aria-label="Source code on GitHub"
            className="flex h-9 w-9 items-center justify-center rounded text-ink-2 transition-colors duration-120 hover:bg-surface-2 hover:text-ink">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.55v-2.15c-3.2.7-3.87-1.36-3.87-1.36-.52-1.33-1.28-1.68-1.28-1.68-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.19 1.76 1.19 1.03 1.76 2.69 1.25 3.35.96.1-.75.4-1.25.72-1.54-2.55-.29-5.23-1.28-5.23-5.68 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11.1 11.1 0 0 1 5.8 0c2.21-1.49 3.18-1.18 3.18-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.83 1.19 3.09 0 4.41-2.69 5.38-5.25 1.28 1.06.41.78.41 1.58v2.34c0 .3.21.67.8.55A11.51 11.51 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z"/></svg>
          </a>
          <button className="flex h-10 w-10 items-center justify-center rounded text-ink md:hidden" aria-label="Open menu" onClick={() => setOpen(true)}>
            <Menu size={22} strokeWidth={1.5} />
          </button>
        </div>
      </div>
      {open && (
        <div className="fixed inset-0 z-50 flex flex-col bg-surface md:hidden">
          <div className="flex h-14 items-center justify-between px-4">
            <span className="flex items-center gap-2.5"><Glyph size={24} /><span className="font-display text-[22px] font-semibold">Verdict</span></span>
            <button className="flex h-10 w-10 items-center justify-center" aria-label="Close menu" onClick={() => setOpen(false)}><X size={22} strokeWidth={1.5} /></button>
          </div>
          <nav className="flex flex-col gap-2 px-6 py-6" aria-label="Menu">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} onClick={() => setOpen(false)} className="py-2 text-xl font-medium text-ink">{n.label}</Link>
            ))}
            <Link href="/data" onClick={() => setOpen(false)} className="py-2 text-xl font-medium text-ink">Data and privacy</Link>
          </nav>
          <div className="mt-auto px-6 pb-10"><ThemeSwitch /></div>
        </div>
      )}
    </header>
  );
}

export function ExperimentBanner() {
  const path = usePathname();
  if (path.startsWith("/embed")) return null;
  const [show, setShow] = useState(false);
  useEffect(() => { if (!localStorage.getItem("vd_banner_dismissed")) setShow(true); }, []);
  if (!show) return null;
  return (
    <div className="border-b border-border bg-accent-subtle">
      <div className="mx-auto flex max-w-[1120px] items-center gap-3 px-4 py-2.5 text-sm md:px-6">
        <p className="text-ink">This site runs a public experiment on how answers are found. No account, no tracking beyond one anonymous cookie.{" "}
          <Link href="/data" className="font-medium text-accent underline">Details</Link></p>
        <button className="ml-auto flex h-8 w-8 shrink-0 items-center justify-center rounded text-ink-2 hover:text-ink" aria-label="Dismiss banner"
          onClick={() => { localStorage.setItem("vd_banner_dismissed", "1"); setShow(false); }}>
          <X size={16} strokeWidth={1.5} />
        </button>
      </div>
    </div>
  );
}

export function Footer() {
  const path = usePathname();
  if (path.startsWith("/embed")) return null;
  const col = "flex flex-col gap-2";
  const head = "text-[13px] font-semibold uppercase tracking-[0.08em] text-ink";
  const link = "text-sm text-ink-2 transition-colors duration-120 hover:text-accent hover:underline";
  return (
    <footer className="mt-auto border-t border-border bg-surface-2">
      <div className="mx-auto grid max-w-[1120px] gap-8 px-4 py-10 sm:grid-cols-3 md:px-6">
        <div>
          <p className="flex items-center gap-2.5"><Glyph size={22} /><span className="font-display text-lg font-semibold text-ink">Verdict</span></p>
          <p className="mt-2 text-sm text-ink-2">Ship the version that earned it.</p>
        </div>
        <nav className={col} aria-label="Product">
          <span className={head}>Product</span>
          <Link className={link} href="/ask">Ask the docs</Link>
          <Link className={link} href="/lab">Lab</Link>
          <Link className={link} href="/lab/candidates">Candidates</Link>
          <Link className={link} href="/lab/experiment">Experiment</Link>
          <Link className={link} href="/lab/rollout">Rollout</Link>
        </nav>
        <nav className={col} aria-label="Transparency">
          <span className={head}>Transparency</span>
          <Link className={link} href="/method">Method</Link>
          <Link className={link} href="/data">Data and privacy</Link>
          <Link className={link} href="/data#traffic">Traffic disclosure</Link>
          <a className={link} href={REPO} target="_blank" rel="noopener noreferrer">Source code</a>
        </nav>
      </div>
      <div className="border-t border-border">
        <div className="mx-auto max-w-[1120px] px-4 py-4 text-[13px] leading-5 text-ink-2 md:px-6">
          <p>Built for the Flagsmith Hackathon 2026. Not affiliated with or endorsed by Flagsmith.</p>
          <p>Answers come from the public Flagsmith documentation and may be wrong. Check sources.</p>
        </div>
      </div>
    </footer>
  );
}
