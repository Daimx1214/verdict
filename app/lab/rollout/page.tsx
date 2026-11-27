"use client";
import { useEffect, useState } from "react";
import { Check, Rocket } from "lucide-react";
import { Badge, Alert, btnPrimary } from "@/components/ui/primitives";

interface Decision { id: string; phase: string; createdAt: string; decision: string | null; rationale: string | null; flagsmithWinProb: string | null; result: unknown; guardrails: unknown }
interface Rollout { decisions: Decision[]; served: { config: { id: string } | null; raw: string | null }; build: string; processStartedAt: string; uptimeSeconds: number }
export default function RolloutPage() {
  const [data, setData] = useState<Rollout | null>(null);
  const [probe, setProbe] = useState<{ answer: string; strategyId: string } | null>(null);
  const [probing, setProbing] = useState(false);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const load = () => fetch("/api/lab/rollout").then((r) => r.json()).then(setData).catch(() => {});
    load();
    const t = setInterval(() => { load(); setTick((x) => x + 1); }, 5000);
    return () => clearInterval(t);
  }, []);
  async function runProbe() {
    setProbing(true);
    try {
      const r = await fetch("/api/lab/probe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question: "What is an identity in Flagsmith?" }) });
      const j = await r.json();
      if (r.ok) setProbe({ answer: j.answer, strategyId: j.strategyId });
    } finally { setProbing(false); }
  }
  const latest = data?.decisions[data.decisions.length - 1];
  const decided = data?.decisions.find((x) => x.phase === "shipped" || x.phase === "result");
  const steps = ["Locked", "Collecting", "Analysed", "Shipped"];
  const stepIdx = !data?.decisions.length ? 0 : decided ? (decided.phase === "shipped" ? 3 : 2) : 1;
  const up = data ? data.uptimeSeconds + tick * 0 : 0;
  return (
    <div className="mx-auto w-full max-w-[1120px] px-4 py-10 md:px-6">
      <h1 className="font-display text-[30px] font-semibold md:text-[38px]">Rollout</h1>
      <ol className="mt-8 flex flex-wrap gap-0" aria-label="Rollout stages">
        {steps.map((s, i) => (
          <li key={s} className="flex items-center">
            <span className={`flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm font-medium ${i < stepIdx ? "border-accent bg-accent-subtle text-accent" : i === stepIdx ? "border-border-strong bg-surface text-ink" : "border-border bg-surface text-ink-3"}`}>
              {i < stepIdx ? <Check size={14} strokeWidth={2} /> : null}{s}
            </span>
            {i < steps.length - 1 && <span className="mx-1.5 h-px w-6 bg-border-strong" aria-hidden="true" />}
          </li>
        ))}
      </ol>

      <section className="mt-8 rounded-md border border-border bg-surface p-5" aria-label="Decision record">
        <h2 className="text-xl font-semibold">Decision record</h2>
        {decided ? (
          <div className="mt-3 flex flex-col gap-2 text-[15px] text-ink-2">
            <p><Badge kind="winner">{decided.decision || "Recorded"}</Badge></p>
            {decided.flagsmithWinProb && <p className="font-mono text-sm">Flagsmith win probability: {decided.flagsmithWinProb}</p>}
            {decided.rationale && <p>{decided.rationale}</p>}
            <p className="font-mono text-[13px] text-ink-3">{new Date(decided.createdAt).toISOString()}</p>
          </div>
        ) : (
          <p className="mt-3 text-[15px] text-ink-2">No decision yet. The rule is fixed: ship the challenger only at a Flagsmith win probability of at least 95 percent with every guardrail passing.</p>
        )}
      </section>

      <section className="mt-6 rounded-md border border-border bg-surface p-5" aria-label="Live proof">
        <h2 className="flex items-center gap-2 text-xl font-semibold"><Rocket size={18} strokeWidth={1.5} /> What is being served right now</h2>
        <dl className="mt-4 grid gap-3 font-mono text-sm">
          <div className="flex flex-wrap gap-2"><dt className="w-40 text-ink-3">Served config</dt><dd className="min-w-0 break-all">{data?.served.raw || "unavailable (fallback)"}</dd></div>
          <div className="flex gap-2"><dt className="w-40 text-ink-3">Build</dt><dd>{data?.build}</dd></div>
          <div className="flex gap-2"><dt className="w-40 text-ink-3">Process started</dt><dd>{data?.processStartedAt}</dd></div>
          <div className="flex gap-2"><dt className="w-40 text-ink-3">Uptime (s)</dt><dd>{up}</dd></div>
        </dl>
        <button onClick={runProbe} disabled={probing} className={btnPrimary + " mt-5"}>{probing ? "Asking..." : "Run a probe question"}</button>
        {probe && (
          <div className="mt-4 rounded border border-border bg-surface-2 p-4">
            <p className="font-mono text-[13px] text-ink-3">Served by strategy: {probe.strategyId}</p>
            <p className="mt-2 whitespace-pre-wrap text-[15px] leading-6 text-ink">{probe.answer.slice(0, 600)}</p>
          </div>
        )}
        <p className="mt-4 text-sm text-ink-2">After the winner is promoted in Flagsmith, the served config changes while the build and process start time stay the same: no redeploy.</p>
      </section>

      <section className="mt-6" aria-label="Ledger of decisions">
        <h2 className="font-display text-2xl font-semibold">Ledger of decisions</h2>
        {!data?.decisions.length ? <div className="mt-3"><Alert kind="info">No entries yet. The first entry is written when the protocol is locked.</Alert></div> : (
          <ul className="mt-4 flex flex-col gap-2">
            {[...data.decisions].reverse().map((x) => (
              <li key={x.id} className="rounded-md border border-border bg-surface p-4">
                <p className="flex flex-wrap items-center gap-2"><Badge kind="locked">{x.phase}</Badge><span className="font-mono text-[13px] text-ink-3">{new Date(x.createdAt).toISOString()}</span></p>
                {x.decision && <p className="mt-2 font-medium">{x.decision}</p>}
                {x.rationale && <p className="mt-1 text-sm text-ink-2">{x.rationale}</p>}
              </li>
            ))}
          </ul>
        )}
        {latest && latest.phase === "note" && <p className="mt-3 text-sm text-ink-3">Latest entry is a note; see the ledger above.</p>}
      </section>
    </div>
  );
}
