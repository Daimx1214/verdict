"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, FlaskConical, Scale, Rocket, FileText } from "lucide-react";
import { Badge, Segmented, Alert, btnSecondary } from "@/components/ui/primitives";

interface Summary { traffic: string; questions: number; participants: number; exposed: number; control: { exposed: number; share: number }; challenger: { exposed: number; share: number }; corpusHash: string }
interface ExpData { phase: string; srm: { p: number }; guardrails: { pass: boolean }[] }
export default function LabOverview() {
  const [traffic, setTraffic] = useState<"real" | "simulated" | "all">("real");
  const [sum, setSum] = useState<Summary | null>(null);
  const [exp, setExp] = useState<ExpData | null>(null);
  const [mix, setMix] = useState<{ real: number; simulated: number }>({ real: 0, simulated: 0 });
  const [err, setErr] = useState(false);
  useEffect(() => {
    let live = true;
    const load = async () => {
      try {
        const [s, e, sr, ss] = await Promise.all([
          fetch(`/api/lab/summary?traffic=${traffic}`).then((r) => r.json()),
          fetch(`/api/lab/experiment?traffic=${traffic}`).then((r) => r.json()),
          fetch(`/api/lab/summary?traffic=real`).then((r) => r.json()),
          fetch(`/api/lab/summary?traffic=simulated`).then((r) => r.json()),
        ]);
        if (!live) return;
        setSum(s); setExp(e); setMix({ real: sr.participants || 0, simulated: ss.participants || 0 }); setErr(false);
      } catch { if (live) setErr(true); }
    };
    load();
    const t = setInterval(load, 15000);
    return () => { live = false; clearInterval(t); };
  }, [traffic]);
  const totalMix = mix.real + mix.simulated;
  const realPct = totalMix ? Math.round((mix.real / totalMix) * 100) : 0;
  const phase = exp?.phase || "Screening";
  const guardsPass = exp ? exp.guardrails.filter((g) => g.pass).length : 0;
  return (
    <div className="mx-auto w-full max-w-[1120px] px-4 py-10 md:px-6">
      <div className="flex flex-wrap items-center gap-4">
        <h1 className="font-display text-[30px] font-semibold md:text-[38px]">Lab</h1>
        <Badge kind={phase === "Decided" ? "winner" : phase === "Collecting" ? "simulated" : "neutral"}>{phase}</Badge>
        <div className="ml-auto"><Segmented label="Traffic" value={traffic} onChange={setTraffic} options={[{ v: "real", label: "Real" }, { v: "simulated", label: "Simulated" }, { v: "all", label: "All" }]} /></div>
      </div>
      <p className="mt-2 text-ink-2">Everything on these pages is read-only and updates automatically.</p>
      {err && <div className="mt-4"><Alert kind="danger">Lab data is unavailable right now. <button className="underline" onClick={() => location.reload()}>Retry</button></Alert></div>}
      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {[
          { n: "01 SCREEN", icon: FileText, lines: ["8 candidates", "Scored on 40 held-out questions", "1 finalist"], href: "/lab/candidates", label: "View candidates", done: true, active: phase === "Screening" },
          { n: "02 TEST", icon: FlaskConical, lines: ["2 arms, locked", sum ? `${sum.exposed} / 800 exposed` : "...", sum ? `helpful A ${Math.round(sum.control.share * 100)}% · B ${Math.round(sum.challenger.share * 100)}%` : ""], href: "/lab/experiment", label: "View experiment", done: phase === "Decided" || phase === "Stopped", active: phase === "Collecting" },
          { n: "03 SHIP", icon: Rocket, lines: [phase === "Decided" ? "Decision recorded" : "Not decided yet", "Rule: win probability", "at least 95% + guardrails"], href: "/lab/rollout", label: "View rollout", done: phase === "Decided", active: phase === "Decided" },
        ].map((c) => (
          <div key={c.n} className={`rounded-md border border-border bg-surface p-5 ${c.active ? "border-t-2 border-t-accent" : ""}`}>
            <p className="flex items-center gap-2 text-[13px] font-semibold tracking-[0.08em] text-ink-3"><c.icon size={15} strokeWidth={1.5} /> {c.n} {c.done && <Check size={15} className="text-success" strokeWidth={2} />}</p>
            <ul className="mt-3 flex flex-col gap-1">{c.lines.filter(Boolean).map((l) => <li key={l} className="font-mono text-sm text-ink">{l}</li>)}</ul>
            <Link href={c.href} className={btnSecondary + " mt-4"}>{c.label}</Link>
          </div>
        ))}
      </div>
      <div className="mt-8 rounded-md border border-border bg-surface p-5">
        <h2 className="flex items-center gap-2 text-xl font-semibold"><Scale size={19} strokeWidth={1.5} /> Traffic mix</h2>
        <div className="mt-4 flex h-5 w-full overflow-hidden rounded" role="img" aria-label={`Real ${realPct} percent, simulated ${100 - realPct} percent`}>
          <div style={{ width: `${realPct}%`, background: "var(--ink)", opacity: 0.8 }} />
          <div style={{ width: `${100 - realPct}%`, background: "var(--info)" }} />
        </div>
        <p className="mt-2 font-mono text-[13px] text-ink-2">Real {mix.real} ({realPct}%) · Simulated {mix.simulated} ({100 - realPct}%)</p>
        <p className="mt-2 text-sm text-ink-2">Simulated visitors are generated by a public script in the repository. See the <Link href="/data#traffic" className="text-accent underline">traffic disclosure</Link>.</p>
      </div>
      <div className="mt-6 flex flex-wrap gap-3">
        <span className="inline-flex items-center gap-2 rounded border border-border bg-surface px-3 py-2 text-sm">SRM: {exp ? (exp.srm.p >= 0.001 ? <Badge kind="passed">pass, p = {exp.srm.p.toFixed(2)}</Badge> : <Badge kind="failed">fail, p = {exp.srm.p.toFixed(3)}</Badge>) : "..."}</span>
        <span className="inline-flex items-center gap-2 rounded border border-border bg-surface px-3 py-2 text-sm">Guardrails: {exp ? `${guardsPass}/4 within limits` : "..."}</span>
        <span className="inline-flex items-center gap-2 rounded border border-border bg-surface px-3 py-2 text-sm font-mono text-[13px]">Corpus hash {sum?.corpusHash ? sum.corpusHash.slice(0, 8) : "..."}</span>
      </div>
    </div>
  );
}
