import Link from "next/link";
import { btnPrimary, btnSecondary } from "@/components/ui/primitives";
export default function NotFound() {
  return (
    <div className="mx-auto flex w-full max-w-[680px] flex-col items-start px-4 py-20 md:px-6">
      <svg width="72" height="72" viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10" width="4" height="10" fill="var(--ctrl)" /><rect x="3" y="21" width="14" height="1.6" fill="var(--accent)" /></svg>
      <h1 className="mt-6 font-display text-[38px] font-semibold">Page not found.</h1>
      <p className="mt-3 text-lg text-ink-2">That address does not exist.</p>
      <div className="mt-8 flex gap-3">
        <Link href="/" className={btnPrimary}>Go home</Link>
        <Link href="/ask" className={btnSecondary}>Ask a question</Link>
      </div>
    </div>
  );
}
