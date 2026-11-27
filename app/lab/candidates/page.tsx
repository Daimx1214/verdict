"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Check, X } from "lucide-react";
import { Badge, Alert } from "@/components/ui/primitives";
import { ChartShell, BarsChart, ScatterChart } from "@/components/charts/Charts";

export interface CandidateRow {
  id: string; name: string; config: Record<string, unknown>;
  hitRate: number; mrr: number; correctness: number; faithfulness: number; declineAccuracy: number;
  retrP50: number; retrP95: number; costPerAnswer: number; composite: number;
  gates: { qualityFloor: boolean; latency: boolean; cost: boolean; improvement: boolean };
  status: "baseline" | "finalist" | "rejected"; reason?: string;
}
interface Results { candidates: CandidateRow[]; funnel: { candidates: number; qualityFloor: number; latencyCost: number; finalist: number }; corpusHash: string; seed: number; answerModel: string; judgeModel: string; generatedAt: string }
type SortKey = "hitRate" | "mrr" | "correctness" | "faithfulness" | "declineAccuracy" | "retrP95" | "costPerAnswer" | "composite";
export default function CandidatesPage() {
  const [data, setData] = useState<Results | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("composite");
  useEffect(() => { fetch("/api/lab/candidates").then((r) => r.json()).then((j) => { if (Array.isArray(j.candidates)) setData(j); }).catch(() => {}); }, []);
  const rows = useMemo(() => data ? [...data.candidates].sort((a, b) => b[sortKey] - a[sortKey]) : [], [data, sortKey]);
  if (!data) return (
    <div className="mx-auto w-full max-w-[1120px] px-4 py-10 md:px-6">
      <h1 className="font-display text-[30px] font-semibold md:text-[38px]">Candidates</h1>
      <div className="mt-6"><Alert kind="info">Screening results are not published yet. The offline run scores eight pipelines on 40 held-out questions first.</Alert></div>
    </div>
  );
  const num = "px-3 py-2 text-right font-mono text-sm";
  const head = "cursor-pointer px-3 py-2 text-right text-[13px] font-semibold text-ink-2 hover:text-ink";
  const cols: { k: SortKey; label: string }[] = [
    { k: "hitRate", label: "Hit rate" }, { k: "mrr", label: "MRR" }, { k: "correctness", label: "Correct." },
    { k: "faithfulness", label: "Faithful." }, { k: "declineAccuracy", label: "Decline acc." },
    { k: "retrP95", label: "p95 ms" }, { k: "costPerAnswer", label: "Cost" }, { k: "composite", label: "Composite" },
  ];
  return (
    <div className="mx-auto w-full max-w-[1120px] px-4 py-10 md:px-6">
      <h1 className="font-display text-[30px] font-semibold md:text-[38px]">Candidates</h1>
      <p className="mt-2 max-w-[680px] text-ink-2">Eight retrieval pipelines scored on 40 held-out test questions with a fixed rubric.</p>

      <div className="mt-8 flex flex-col gap-2" aria-label="Screening funnel">
        {[
          { label: `${data.funnel.candidates} candidates`, passed: true },
          { label: `${data.funnel.qualityFloor} passed quality floor`, passed: true },
          { label: `${data.funnel.latencyCost} passed latency and cost`, passed: true },
          { label: `${data.funnel.finalist} finalist`, passed: true },
        ].map((s, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="rounded border border-accent bg-surface-2 px-4 py-2.5 text-sm font-medium" style={{ width: `${100 - i * 12}%` }}>{s.label}</div>
            <span className="text-[13px] text-ink-3">{i < 3 ? `${data.funnel.candidates - [data.funnel.candidates, data.funnel.qualityFloor, data.funnel.latencyCost][i]} rejected at this stage` : ""}</span>
          </div>
        ))}
      </div>

      <div className="mt-8 overflow-x-auto rounded-md border border-border">
        <table className="w-full min-w-[980px] border-collapse bg-surface">
          <thead><tr className="bg-surface-2 text-left">
            <th scope="col" className="px-3 py-2 text-[13px] font-semibold text-ink-2">ID</th>
            <th scope="col" className="px-3 py-2 text-[13px] font-semibold text-ink-2">Candidate</th>
            {cols.map((c) => <th key={c.k} scope="col" className={head} onClick={() => setSortKey(c.k)} aria-sort={sortKey === c.k ? "descending" : undefined}>{c.label}</th>)}
            <th scope="col" className="px-3 py-2 text-[13px] font-semibold text-ink-2">Gates</th>
            <th scope="col" className="px-3 py-2 text-[13px] font-semibold text-ink-2">Result</th>
          </tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className={`border-t border-border hover:bg-accent-subtle/40 ${r.status === "baseline" ? "border-l-[3px] border-l-ctrl" : r.status === "finalist" ? "border-l-[3px] border-l-chal" : ""}`}>
                <td className="px-3 py-2 font-mono text-sm"><Link href={`/lab/candidates/${r.id}`} className="text-accent underline">{r.id}</Link></td>
                <td className="px-3 py-2 text-sm font-medium">{r.name}<span className="block font-mono text-xs font-normal text-ink-3">{JSON.stringify(r.config)}</span></td>
                <td className={num}>{r.hitRate.toFixed(3)}</td><td className={num}>{r.mrr.toFixed(3)}</td>
                <td className={num}>{r.correctness.toFixed(3)}</td><td className={num}>{r.faithfulness.toFixed(3)}</td>
                <td className={num}>{r.declineAccuracy.toFixed(3)}</td><td className={num}>{Math.round(r.retrP95)}</td>
                <td className={num}>${r.costPerAnswer.toFixed(4)}</td><td className={num}>{r.composite.toFixed(3)}</td>
                <td className="px-3 py-2"><span className="flex gap-1">{(["qualityFloor", "latency", "cost", "improvement"] as const).map((g) => (
                  <span key={g} title={g} className={r.gates[g] ? "text-success" : "text-danger"}>{r.gates[g] ? <Check size={14} strokeWidth={2} /> : <X size={14} strokeWidth={2} />}</span>))}</span></td>
                <td className="px-3 py-2">{r.status === "baseline" ? <Badge kind="control">Baseline</Badge> : r.status === "finalist" ? <Badge kind="challenger">Finalist</Badge> : <span className="text-[13px] text-ink-3" title={r.reason}>Rejected</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        <ChartShell title="Composite by candidate" summary="Composite = 0.5 x hit rate + 0.3 x correctness + 0.2 x faithfulness."
          table={<SimpleTable rows={rows.map((r) => [r.id, r.composite.toFixed(3)])} head={["Candidate", "Composite"]} />}>
          <BarsChart rows={rows.map((r) => ({ label: `${r.id} ${r.name}`, value: r.composite, kind: r.status === "baseline" ? "control" as const : r.status === "finalist" ? "challenger" as const : "other" as const }))} />
        </ChartShell>
        <ChartShell title="Composite against cost" summary="Higher and further left is better."
          table={<SimpleTable rows={rows.map((r) => [r.id, `$${r.costPerAnswer.toFixed(4)}`, r.composite.toFixed(3)])} head={["Candidate", "Cost", "Composite"]} />}>
          <ScatterChart rows={rows.map((r) => ({ label: r.id, x: r.costPerAnswer, y: r.composite, kind: r.status === "baseline" ? "control" as const : r.status === "finalist" ? "challenger" as const : "other" as const }))} />
        </ChartShell>
      </div>

      <details className="mt-8 rounded-md border border-border bg-surface p-5">
        <summary className="cursor-pointer text-base font-semibold">How screening works</summary>
        <div className="mt-3 flex flex-col gap-2 text-[15px] leading-6 text-ink-2">
          <p>Every candidate retrieves passages for the same 40 test questions. An automated judge grades each answer against a reference answer with a fixed rubric: correctness and faithfulness, each 0, 0.5 or 1.</p>
          <p>Gates: faithfulness and decline accuracy at least equal to the baseline; p95 retrieval latency at most 600 ms; cost per answer at most 1.6 times the baseline; composite at least 0.03 above the baseline.</p>
          <p>Dev questions tune thresholds; test questions are used only for these numbers.</p>
        </div>
      </details>
      <p className="mt-6 font-mono text-[13px] text-ink-3">Corpus hash {data.corpusHash.slice(0, 12)}... · seed {data.seed} · answers {data.answerModel} · judge {data.judgeModel} · run {new Date(data.generatedAt).toISOString().slice(0, 10)} · reproduce with <span className="text-ink">pnpm eval:offline</span></p>
    </div>
  );
}
export function SimpleTable({ rows, head }: { rows: string[][]; head: string[] }) {
  return (
    <table className="w-full border-collapse">
      <thead><tr>{head.map((h) => <th key={h} scope="col" className="border-b border-border px-2 py-1.5 text-left text-[13px] font-semibold text-ink-2">{h}</th>)}</tr></thead>
      <tbody>{rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j} className="border-b border-border px-2 py-1.5 font-mono text-[13px]">{c}</td>)}</tr>)}</tbody>
    </table>
  );
}
