"use client";
import { useEffect, useState } from "react";
import { Lock, TriangleAlert } from "lucide-react";
import { Badge, Segmented, Alert, pct } from "@/components/ui/primitives";
import { ChartShell, PosteriorChart, SeriesChart } from "@/components/charts/Charts";
import { SimpleTable } from "../candidates/page";

interface Arm { exposed: number; converted: number; share: number; ciLow: number; ciHigh: number }
interface Exp {
  phase: string; control: Arm; challenger: Arm;
  posterior: { pChallengerBetter: number; diffMean: number; diffLow: number; diffHigh: number };
  srm: { chi2: number; p: number };
  guardrails: { id: string; name: string; a: number; b: number; limit: string; pass: boolean }[];
  locked: { control: unknown; challenger: unknown; corpusHash: string; startedAt: string; hypothesis: string } | null;
  series: { n: number; aShare: number | null; bShare: number | null }[];
  corpusHash: string; plannedPerArm: number;
}
export default function ExperimentPage() {
  const [traffic, setTraffic] = useState<"real" | "simulated" | "all">("real");
  const [data, setData] = useState<Exp | null>(null);
  const [dataTraffic, setDataTraffic] = useState(traffic);
  useEffect(() => {
    let live = true;
    const load = () => fetch(`/api/lab/experiment?traffic=${traffic}`).then((r) => r.json()).then((j) => { if (live) { setData(j); setDataTraffic(traffic); } }).catch(() => {});
    load();
    const t = setInterval(load, 15000);
    return () => { live = false; clearInterval(t); };
  }, [traffic]);
  const total = data ? data.control.exposed + data.challenger.exposed : 0;
  const started = total > 0 || (data?.locked != null);
  return (
    <div className="mx-auto w-full max-w-[1120px] px-4 py-10 md:px-6">
      <div className="flex flex-wrap items-center gap-4">
        <h1 className="font-display text-[30px] font-semibold md:text-[38px]">Experiment</h1>
        {data?.locked ? <Badge kind="locked">Locked</Badge> : <Badge kind="neutral">Not started</Badge>}
        <div className="ml-auto"><Segmented label="Traffic" value={traffic} onChange={setTraffic} options={[{ v: "real", label: "Real" }, { v: "simulated", label: "Simulated" }, { v: "all", label: "All" }]} /></div>
      </div>
      {!data || dataTraffic !== traffic ? <div className="skeleton mt-8 h-64 rounded" aria-hidden="true" /> : (
        <>
          <div className="mt-4"><Alert kind="info">Traffic in view: {total} participants ({traffic}). Simulated traffic is disclosed and always shown separately.</Alert></div>
          {data.srm.p < 0.001 && total > 0 && <div className="mt-4"><Alert kind="danger">The split looks unbalanced (p = {data.srm.p.toFixed(4)}). Do not use this result until the cause is found.</Alert></div>}
          {traffic === "real" && data.phase !== "Collecting" && data.locked && total < data.plannedPerArm * 2 && data.phase !== "Screening" && (
            <div className="mt-4"><Alert kind="warning">Underpowered: real traffic is below the plan. Read these numbers as indicative only.</Alert></div>
          )}
          <section className="mt-8 rounded-md border border-border bg-surface p-5" aria-label="Locked protocol">
            <h2 className="flex items-center gap-2 text-xl font-semibold"><Lock size={18} strokeWidth={1.5} /> Locked protocol</h2>
            <dl className="mt-4 grid gap-4 md:grid-cols-2">
              <div><dt className="text-[13px] font-semibold uppercase tracking-[0.08em] text-ink-3">Hypothesis</dt><dd className="mt-1 text-[15px] text-ink-2">The challenger arm has a higher share of participants marking an answer helpful than the control arm.</dd></div>
              <div><dt className="text-[13px] font-semibold uppercase tracking-[0.08em] text-ink-3">Metric · Split · Stop rule</dt><dd className="mt-1 font-mono text-sm text-ink-2">answer_helpful · 50/50 · 400 exposed per arm or the cut-off</dd></div>
              <div><dt className="text-[13px] font-semibold uppercase tracking-[0.08em] text-ink-3">A Control</dt><dd className="mt-1"><pre className="overflow-x-auto rounded bg-surface-2 p-2.5 font-mono text-xs">{JSON.stringify(data.locked?.control || { id: "bm25_k3", strategy: "bm25", topK: 3, rerank: false })}</pre></dd></div>
              <div><dt className="text-[13px] font-semibold uppercase tracking-[0.08em] text-ink-3">B Challenger</dt><dd className="mt-1"><pre className="overflow-x-auto rounded bg-surface-2 p-2.5 font-mono text-xs">{JSON.stringify(data.locked?.challenger || { note: "set by offline screening before the start" })}</pre></dd></div>
              <div><dt className="text-[13px] font-semibold uppercase tracking-[0.08em] text-ink-3">Corpus hash</dt><dd className="mt-1 font-mono text-sm text-ink-2">{(data.locked?.corpusHash || data.corpusHash || "").slice(0, 16)}...</dd></div>
              <div><dt className="text-[13px] font-semibold uppercase tracking-[0.08em] text-ink-3">Decision rule</dt><dd className="mt-1 text-[15px] text-ink-2">Ship challenger at Flagsmith win probability at least 95 percent with all guardrails passing. Otherwise keep control or report inconclusive.</dd></div>
            </dl>
          </section>

          {!started ? (
            <div className="mt-8"><Alert kind="info">Not started. The experiment begins when the protocol above is locked and the first visitor is exposed.</Alert></div>
          ) : (
            <>
              <div className="mt-8 grid gap-4 md:grid-cols-2">
                {[{ arm: data.control, kind: "control" as const, label: "A Control" }, { arm: data.challenger, kind: "challenger" as const, label: "B Challenger" }].map(({ arm, kind, label }) => (
                  <div key={label} className="rounded-md border border-border bg-surface p-5">
                    <Badge kind={kind}>{label}</Badge>
                    <p className="mt-3 font-mono text-sm text-ink-2">{arm.exposed} exposed · {arm.converted} helpful</p>
                    <p className="mt-1 font-mono text-[32px] font-medium leading-9">{pct(arm.share)}</p>
                    <p className="text-[13px] text-ink-3">95% CI {pct(arm.ciLow)} - {pct(arm.ciHigh)}</p>
                    {arm.exposed < 30 && <p className="mt-2 inline-flex items-center gap-1 text-[13px] text-warning"><TriangleAlert size={13} strokeWidth={1.5} /> Too early to read</p>}
                  </div>
                ))}
              </div>

              <div className="mt-6 grid gap-4 lg:grid-cols-2">
                <ChartShell title="Difference (B - A)" summary={`Verdict estimate: P(B > A) = ${data.posterior.pChallengerBetter.toFixed(2)}. Flagsmith result: recorded at the stop point.`}
                  table={<SimpleTable head={["Quantity", "Value"]} rows={[["Mean difference", pct(data.posterior.diffMean)], ["95% credible interval", `${pct(data.posterior.diffLow)} to ${pct(data.posterior.diffHigh)}`], ["P(B > A)", data.posterior.pChallengerBetter.toFixed(3)]]} />}>
                  <PosteriorChart convA={data.control.converted} expA={data.control.exposed} convB={data.challenger.converted} expB={data.challenger.exposed} ciLow={data.posterior.diffLow} ciHigh={data.posterior.diffHigh} />
                </ChartShell>
                <ChartShell title="Cumulative helpful share" summary="Share of exposed participants who marked an answer helpful, in exposure order."
                  table={<SimpleTable head={["Exposed", "A share", "B share"]} rows={data.series.filter((_, i) => i % 10 === 0).map((s) => [String(s.n), s.aShare === null ? "-" : pct(s.aShare), s.bShare === null ? "-" : pct(s.bShare)])} />}>
                  <SeriesChart series={data.series} />
                </ChartShell>
              </div>

              <div className="mt-6 grid gap-4 lg:grid-cols-2">
                <section className="rounded-md border border-border bg-surface p-5" aria-label="Data checks">
                  <h2 className="text-xl font-semibold">Data checks</h2>
                  <p className="mt-3 text-[15px] text-ink-2">Sample ratio mismatch: chi-square = {data.srm.chi2.toFixed(2)}, p = {data.srm.p.toFixed(3)} {data.srm.p >= 0.001 ? <Badge kind="passed">pass</Badge> : <Badge kind="failed">fail</Badge>}</p>
                  <p className="mt-4 text-[13px] font-semibold uppercase tracking-[0.08em] text-ink-3">Sample progress</p>
                  {[{ l: "A", v: data.control.exposed }, { l: "B", v: data.challenger.exposed }].map(({ l, v }) => (
                    <div key={l} className="mt-2 flex items-center gap-3">
                      <span className="w-4 font-mono text-sm">{l}</span>
                      <div className="h-3 flex-1 rounded-sm bg-surface-2" role="progressbar" aria-valuenow={v} aria-valuemin={0} aria-valuemax={data.plannedPerArm} aria-label={`Arm ${l} progress`}>
                        <div className="h-3 rounded-sm" style={{ width: `${Math.min(100, (v / data.plannedPerArm) * 100)}%`, background: l === "A" ? "var(--ctrl)" : "var(--chal)" }} />
                      </div>
                      <span className="font-mono text-[13px]">{v} / {data.plannedPerArm}</span>
                    </div>
                  ))}
                </section>
                <section className="rounded-md border border-border bg-surface p-5" aria-label="Guardrails">
                  <h2 className="text-xl font-semibold">Guardrails</h2>
                  <table className="mt-3 w-full border-collapse">
                    <thead><tr className="text-left"><th scope="col" className="py-1.5 text-[13px] font-semibold text-ink-2">Guardrail</th><th scope="col" className="py-1.5 text-right text-[13px] font-semibold text-ink-2">A</th><th scope="col" className="py-1.5 text-right text-[13px] font-semibold text-ink-2">B</th><th scope="col" className="py-1.5 text-[13px] font-semibold text-ink-2">Limit</th><th scope="col" className="py-1.5 text-[13px] font-semibold text-ink-2">Status</th></tr></thead>
                    <tbody>
                      {data.guardrails.map((g) => (
                        <tr key={g.id} className={`border-t border-border ${!g.pass ? "bg-danger-subtle" : ""}`}>
                          <td className="py-2 text-sm">{g.id} {g.name}</td>
                          <td className="py-2 text-right font-mono text-sm">{typeof g.a === "number" && g.a < 1 && g.a > 0 ? pct(g.a) : Math.round(g.a)}</td>
                          <td className="py-2 text-right font-mono text-sm">{typeof g.b === "number" && g.b < 1 && g.b > 0 ? pct(g.b) : Math.round(g.b)}</td>
                          <td className="py-2 text-[13px] text-ink-2">{g.limit}</td>
                          <td className="py-2">{g.pass ? <Badge kind="passed">pass</Badge> : <Badge kind="failed">fail</Badge>}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </section>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
