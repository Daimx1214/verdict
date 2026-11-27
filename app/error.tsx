"use client";
import { btnPrimary, btnSecondary } from "@/components/ui/primitives";
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto flex w-full max-w-[680px] flex-col items-start px-4 py-20 md:px-6">
      <h1 className="font-display text-[38px] font-semibold">Something went wrong.</h1>
      <p className="mt-3 text-lg text-ink-2">It is our fault, not yours. Nothing you entered was counted.</p>
      {error.digest && <p className="mt-2 font-mono text-[13px] text-ink-3">Error id: {error.digest}</p>}
      <div className="mt-8 flex gap-3">
        <button onClick={reset} className={btnPrimary}>Try again</button>
        <a href="/" className={btnSecondary}>Go home</a>
      </div>
    </div>
  );
}
