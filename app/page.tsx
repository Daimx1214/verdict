import Link from "next/link";
import { ArrowRight, Lock } from "lucide-react";
import Glyph from "@/components/layout/Glyph";
import { armData, screeningResults } from "@/lib/lab-data";
import { btnPrimary, btnSecondary, pct } from "@/components/ui/primitives";
import { EXAMPLES } from "@/lib/examples";

export const dynamic = "force-dynamic";
export default async function Home() {
  const { control, challenger, totalQuestions, totalParticipants } = await armData("real").catch(() => ({ control: null, challenger: null, totalQuestions: 0, totalParticipants: 0 }));
  const screening = screeningResults() as { candidates?: unknown[] } | null;
  const started = (control?.exposed || 0) + (challenger?.exposed || 0) > 0;
  return (
    <div className="mx-auto w-full max-w-[1120px] px-4 md:px-6">
      <section className="grid items-center gap-10 py-16 md:grid-cols-[1fr_auto] md:py-20">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-accent">A documentation assistant that proves its own improvements</p>
          <h1 className="mt-4 font-display text-[38px] font-semibold leading-[42px] tracking-[-0.02em] md:text-[56px] md:leading-[60px]">Ship the version that earned it.</h1>
          <p className="mt-5 max-w-[560px] text-lg leading-7 text-ink-2">Every change to how answers are found is screened offline, tested on real visitors, and shipped only when the data says so.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/ask" className={btnPrimary}>Ask the Flagsmith docs <ArrowRight size={16} strokeWidth={1.5} /></Link>
            <Link href="/lab/experiment" className={btnSecondary}>See the experiment</Link>
          </div>
        </div>
        <div className="hidden md:block" aria-hidden="true">
          <svg width="200" height="200" viewBox="0 0 24 24"><rect x="5" y="10" width="4" height="10" fill="none" stroke="var(--ctrl)" strokeWidth="0.7" /><rect x="11" y="5" width="4" height="15" fill="none" stroke="var(--chal)" strokeWidth="0.7" /><rect x="3" y="21" width="14" height="0.7" fill="var(--accent)" /></svg>
        </div>
        <div className="md:hidden" aria-hidden="true"><Glyph size={96} line /></div>
      </section>

      <section className="grid gap-4 pb-16 md:grid-cols-3" aria-label="How a decision is made">
        {[
          { n: "01", t: "Screen", d: "Eight candidate pipelines are scored on a fixed set of questions with a written rubric.", href: "/lab/candidates" },
          { n: "02", t: "Test", d: "Two finalists run in a locked 50/50 experiment on real visitors, with one success metric.", href: "/lab/experiment" },
          { n: "03", t: "Ship", d: "The winner goes live from the same flag. No redeploy.", href: "/lab/rollout" },
        ].map((s) => (
          <Link key={s.n} href={s.href} className="rounded-md border border-border bg-surface p-5 transition-colors duration-120 hover:border-border-strong">
            <p className="font-mono text-sm text-ink-3">{s.n}</p>
            <h2 className="mt-2 text-xl font-semibold">{s.t}</h2>
            <p className="mt-1.5 text-sm leading-[22px] text-ink-2">{s.d}</p>
          </Link>
        ))}
      </section>

      <section className="pb-16" aria-label="Live numbers">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-[28px] font-semibold">Live numbers <span className="text-base text-ink-3">(real traffic)</span></h2>
          <span className="rounded-full border border-border bg-surface-2 px-2 py-0.5 text-[13px] font-medium text-ink">Real</span>
        </div>
        {started ? (
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <div className="rounded-md border border-border bg-surface p-4"><p className="text-[13px] font-medium text-ink-3">Questions answered</p><p className="mt-1 font-mono text-[32px] font-medium leading-9">{totalQuestions}</p></div>
            <div className="rounded-md border border-border bg-surface p-4"><p className="text-[13px] font-medium text-ink-3">Participants</p><p className="mt-1 font-mono text-[32px] font-medium leading-9">{totalParticipants}</p></div>
            <div className="rounded-md border border-border bg-surface p-4"><p className="text-[13px] font-medium text-ctrl">A Control helpful share</p><p className="mt-1 font-mono text-[32px] font-medium leading-9">{control ? pct(control.share) : "-"}</p><p className="text-[13px] text-ink-3">{control?.exposed} exposed</p></div>
            <div className="rounded-md border border-border bg-surface p-4"><p className="text-[13px] font-medium text-chal">B Challenger helpful share</p><p className="mt-1 font-mono text-[32px] font-medium leading-9">{challenger ? pct(challenger.share) : "-"}</p><p className="text-[13px] text-ink-3">{challenger?.exposed} exposed</p></div>
          </div>
        ) : (
          <div className="rounded-md border border-border bg-surface p-5 text-ink-2">
            Not started. {screening ? "Offline screening is complete: eight candidates scored, one finalist chosen. " : "Offline screening runs first. "}
            The live experiment begins once the protocol is locked. <Link href="/lab/candidates" className="text-accent underline">See the screening</Link>
          </div>
        )}
        <p className="mt-3 text-[13px] text-ink-3">Live numbers update on page load. Results are only used for the decision at the pre-registered stop point.</p>
      </section>

      <section className="pb-16" aria-label="Decision ledger">
        <div className="rounded-md border border-border bg-surface p-5">
          <h2 className="flex items-center gap-2 text-xl font-semibold">How a decision is made {started && <span className="inline-flex items-center gap-1 rounded-full border border-border-strong bg-surface-2 px-2 py-0.5 text-[13px] font-medium"><Lock size={12} strokeWidth={1.5} /> Locked</span>}</h2>
          <dl className="mt-4 grid gap-4 md:grid-cols-2">
            <div><dt className="text-[13px] font-semibold uppercase tracking-[0.08em] text-ink-3">Hypothesis</dt><dd className="mt-1 text-[15px] text-ink-2">A retrieval pipeline chosen by offline screening makes more visitors mark an answer as helpful than the keyword baseline.</dd></div>
            <div><dt className="text-[13px] font-semibold uppercase tracking-[0.08em] text-ink-3">Metric</dt><dd className="mt-1 font-mono text-[15px] text-ink-2">answer_helpful, once per participant</dd></div>
            <div><dt className="text-[13px] font-semibold uppercase tracking-[0.08em] text-ink-3">Decision rule</dt><dd className="mt-1 text-[15px] text-ink-2">Ship the challenger only at 95 percent win probability in Flagsmith with every guardrail passing. Otherwise keep control, or report inconclusive.</dd></div>
            <div><dt className="text-[13px] font-semibold uppercase tracking-[0.08em] text-ink-3">Status</dt><dd className="mt-1 text-[15px] text-ink-2">{started ? "Collecting" : "Screening"}</dd></div>
          </dl>
          <Link href="/method" className="mt-4 inline-block text-accent hover:underline">Read the method</Link>
        </div>
      </section>

      <section className="grid gap-10 pb-16 md:grid-cols-2">
        <div>
          <h2 className="font-display text-[28px] font-semibold">Why this exists</h2>
          <p className="mt-3 leading-7 text-ink-2">Teams change how their documentation search finds answers and judge the change by feel. Verdict shows the loop done carefully: screen, test, ship. It is a small product so that the whole loop fits on one screen.</p>
        </div>
        <div>
          <h2 className="font-display text-[28px] font-semibold">Try it</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {EXAMPLES.map((ex) => (
              <Link key={ex} href={`/ask?q=${encodeURIComponent(ex)}`} className="rounded border border-border bg-surface px-3 py-1.5 text-[13px] text-ink-2 transition-colors duration-120 hover:border-accent hover:text-ink">{ex}</Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
