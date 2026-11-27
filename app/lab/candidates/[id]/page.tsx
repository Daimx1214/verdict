"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Check, X } from "lucide-react";
import { Badge, Alert } from "@/components/ui/primitives";
import type { CandidateRow } from "../page";

interface PerQ { id: string; question: string; goldPages: string[]; category: string; hit: boolean; correctness: number; faithfulness: number; declinedCorrectly: boolean | null; retrievedTitles: string[]; judgeReason: string }
interface Results { candidates: (CandidateRow & { perQuestion: PerQ[] })[] }
export default function CandidateDetail() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<Results | null>(null);
  const [filter, setFilter] = useState<"all" | "misses" | "declined">("all");
  useEffect(() => { fetch("/api/lab/candidates").then((r) => r.json()).then(setData).catch(() => {}); }, []);
  const cand = data?.candidates.find((c) => c.id === id);
  const base = data?.candidates.find((c) => c.status === "baseline");
  if (data && !cand) return (
    <div className="mx-auto w-full max-w-[1120px] px-4 py-10 md:px-6">
      <h1 className="font-display text-[30px] font-semibold">No candidate with that ID.</h1>
      <p className="mt-3 text-ink-2">The candidate <span className="font-mono">{id}</span> does not exist in the stored screening run.</p>
      <Link href="/lab/candidates" className="mt-4 inline-block text-accent underline">Back to candidates</Link>
    </div>
  );
  if (!cand) return <div className="mx-auto w-full max-w-[1120px] px-4 py-10 md:px-6"><div className="skeleton h-40 rounded" /></div>;
  const metrics: { label: string; v: number; fmt?: (n: number) => string }[] = [
    { label: "Hit rate", v: cand.hitRate }, { label: "MRR", v: cand.mrr }, { label: "Correctness", v: cand.correctness },
    { label: "Faithfulness", v: cand.faithfulness }, { label: "Decline accuracy", v: cand.declineAccuracy },
    { label: "p95 retrieval ms", v: cand.retrP95, fmt: (n) => String(Math.round(n)) }, { label: "Cost per answer", v: cand.costPerAnswer, fmt: (n) => `$${n.toFixed(4)}` },
  ];
  const cats = ["setup", "concepts", "sdk", "troubleshooting"];
  const catLabel: Record<string, string> = { setup: "Setup", concepts: "Concepts", sdk: "SDK usage", troubleshooting: "Troubleshooting" };
  const rows = (cand.perQuestion || []).filter((q) => filter === "all" ? true : filter === "misses" ? !q.hit && q.declinedCorrectly === null : q.declinedCorrectly !== null);
  return (
    <div className="mx-auto w-full max-w-[1120px] px-4 py-10 md:px-6">
      <p className="font-mono text-sm text-ink-3"><Link href="/lab/candidates" className="text-accent underline">Candidates</Link> / {cand.id}</p>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <h1 className="font-display text-[30px] font-semibold md:text-[38px]">{cand.id} - {cand.name}</h1>
        {cand.status === "baseline" ? <Badge kind="control">Baseline</Badge> : cand.status === "finalist" ? <Badge kind="challenger">Finalist</Badge> : <Badge kind="neutral">Rejected{cand.reason ? `: ${cand.reason}` : ""}</Badge>}
      </div>
      <pre className="mt-4 overflow-x-auto rounded bg-surface-2 p-3 font-mono text-[13px]">{JSON.stringify(cand.config, null, 2)}</pre>
      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {metrics.map((m) => {
          const bv = base ? (base as unknown as Record<string, number>)[{ "Hit rate": "hitRate", "MRR": "mrr", "Correctness": "correctness", "Faithfulness": "faithfulness", "Decline accuracy": "declineAccuracy", "p95 retrieval ms": "retrP95", "Cost per answer": "costPerAnswer" }[m.label]!] : 0;
          return (
            <div key={m.label} className="rounded-md border border-border bg-surface p-4">
              <p className="text-[13px] font-medium text-ink-3">{m.label}</p>
              <p className="mt-1 font-mono text-2xl font-medium">{m.fmt ? m.fmt(m.v) : m.v.toFixed(3)}</p>
              {base && cand.id !== base.id && <p className="text-[13px] text-ink-3">baseline {m.fmt ? m.fmt(bv) : bv.toFixed(3)} ({m.v - bv >= 0 ? "+" : ""}{(m.v - bv).toFixed(3)})</p>}
            </div>
          );
        })}
      </div>
      <h2 className="mt-10 font-display text-2xl font-semibold">By category (hit rate)</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cats.map((c) => {
          const qs = (cand.perQuestion || []).filter((q) => q.category === c && q.declinedCorrectly === null);
          const hr = qs.length ? qs.filter((q) => q.hit).length / qs.length : 0;
          return (
            <div key={c} className="rounded-md border border-border bg-surface p-4">
              <p className="text-[13px] font-medium text-ink-3">{catLabel[c]}</p>
              <div className="mt-2 h-3 rounded-sm bg-surface-2"><div className="h-3 rounded-sm bg-accent" style={{ width: `${hr * 100}%` }} /></div>
              <p className="mt-1.5 font-mono text-[13px]">{hr.toFixed(2)} ({qs.length} questions)</p>
            </div>
          );
        })}
      </div>
      <h2 className="mt-10 font-display text-2xl font-semibold">Questions</h2>
      <div className="mt-3 flex gap-2">
        {(["all", "misses", "declined"] as const).map((f) => (
          <button key={f} aria-pressed={filter === f} onClick={() => setFilter(f)}
            className={`rounded border px-3 py-1.5 text-[13px] font-medium ${filter === f ? "border-accent bg-accent-subtle text-accent" : "border-border bg-surface text-ink-2"}`}>
            {f === "all" ? "All" : f === "misses" ? "Misses only" : "Declined"}
          </button>
        ))}
      </div>
      <div className="mt-4 overflow-x-auto rounded-md border border-border">
        <table className="w-full min-w-[760px] border-collapse bg-surface">
          <thead><tr className="bg-surface-2 text-left">
            <th scope="col" className="px-3 py-2 text-[13px] font-semibold text-ink-2">Question</th>
            <th scope="col" className="px-3 py-2 text-[13px] font-semibold text-ink-2">Gold page</th>
            <th scope="col" className="px-3 py-2 text-[13px] font-semibold text-ink-2">Hit</th>
            <th scope="col" className="px-3 py-2 text-[13px] font-semibold text-ink-2">Correct.</th>
            <th scope="col" className="px-3 py-2 text-[13px] font-semibold text-ink-2">Faithful.</th>
          </tr></thead>
          <tbody>
            {rows.map((q) => (
              <tr key={q.id} className="border-t border-border align-top">
                <td className="px-3 py-2 text-sm">{q.question}<span className="block text-xs text-ink-3">{q.judgeReason}</span></td>
                <td className="px-3 py-2 font-mono text-xs text-ink-2">{q.goldPages[0]?.replace("https://docs.flagsmith.com", "") || "(unanswerable)"}</td>
                <td className="px-3 py-2">{q.declinedCorrectly !== null ? <span className="text-[13px] text-ink-3">declined {q.declinedCorrectly ? "correctly" : "wrongly"}</span> : q.hit ? <Check size={15} className="text-success" strokeWidth={2} /> : <X size={15} className="text-danger" strokeWidth={2} />}</td>
                <td className="px-3 py-2 font-mono text-sm">{q.correctness}</td>
                <td className="px-3 py-2 font-mono text-sm">{q.faithfulness}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length === 0 && <div className="mt-4"><Alert kind="info">No questions match this filter.</Alert></div>}
    </div>
  );
}
