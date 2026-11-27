"use client";
import { useMemo, useState } from "react";
import { diffDensity } from "@/lib/stats/beta";

export function ChartShell({ title, summary, table, children }: { title: string; summary: string; table: React.ReactNode; children: React.ReactNode }) {
  const [asTable, setAsTable] = useState(false);
  return (
    <figure className="rounded-md border border-border bg-surface p-4">
      <figcaption className="flex items-center justify-between gap-3">
        <span className="text-[15px] font-semibold text-ink">{title}</span>
        <button onClick={() => setAsTable(!asTable)} className="text-[13px] font-medium text-accent hover:underline">{asTable ? "View as chart" : "View as table"}</button>
      </figcaption>
      <p className="mt-1 text-[13px] text-ink-3">{summary}</p>
      <div className="mt-3">{asTable ? table : children}</div>
    </figure>
  );
}

export function PosteriorChart({ convA, expA, convB, expB, ciLow, ciHigh }: { convA: number; expA: number; convB: number; expB: number; ciLow: number; ciHigh: number }) {
  const pts = useMemo(() => diffDensity(convA, expA, convB, expB, 81), [convA, expA, convB, expB]);
  const W = 640, H = 220, PAD = 28;
  const maxY = Math.max(...pts.map((p) => p.y), 0.001);
  const X = (x: number) => PAD + ((x + 1) / 2) * (W - 2 * PAD);
  const Y = (y: number) => H - PAD - (y / maxY) * (H - 2 * PAD);
  const area = (from: number, to: number) => {
    const seg = pts.filter((p) => p.x >= from && p.x <= to);
    if (!seg.length) return "";
    return `M ${X(seg[0].x)} ${H - PAD} ` + seg.map((p) => `L ${X(p.x)} ${Y(p.y)}`).join(" ") + ` L ${X(seg[seg.length - 1].x)} ${H - PAD} Z`;
  };
  const line = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${X(p.x)} ${Y(p.y)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Posterior density of the difference between challenger and control helpful share">
      <line x1={PAD} y1={H - PAD} x2={W - PAD} y2={H - PAD} stroke="var(--border)" />
      <line x1={X(0)} y1={PAD / 2} x2={X(0)} y2={H - PAD} stroke="var(--ink-3)" strokeDasharray="4 4" />
      <path d={area(-1, 1)} fill="var(--ink-2)" opacity={0.24} />
      <path d={area(ciLow, ciHigh)} fill="var(--accent)" opacity={0.3} />
      <path d={line} fill="none" stroke="var(--ink-2)" strokeWidth={1.5} />
      <text x={X(0) + 4} y={H - 8} fontSize={11} fill="var(--ink-3)" fontFamily="var(--font-mono)">0</text>
      <text x={X(-0.5)} y={H - 8} fontSize={11} fill="var(--ink-3)" fontFamily="var(--font-mono)">-50 pts</text>
      <text x={X(0.5) - 34} y={H - 8} fontSize={11} fill="var(--ink-3)" fontFamily="var(--font-mono)">+50 pts</text>
    </svg>
  );
}

export function SeriesChart({ series }: { series: { n: number; aShare: number | null; bShare: number | null }[] }) {
  const W = 640, H = 220, PAD = 30;
  const maxN = Math.max(1, series.length ? series[series.length - 1].n : 1);
  const X = (n: number) => PAD + (n / maxN) * (W - 2 * PAD);
  const Y = (v: number) => H - PAD - v * (H - 2 * PAD);
  const lineFor = (key: "aShare" | "bShare") => series.filter((s) => s[key] !== null).map((s, i) => `${i === 0 ? "M" : "L"} ${X(s.n)} ${Y(s[key] as number)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Cumulative helpful share per arm over exposed participants">
      {[0, 0.5, 1].map((g) => (<g key={g}><line x1={PAD} y1={Y(g)} x2={W - PAD} y2={Y(g)} stroke="var(--border)" /><text x={2} y={Y(g) + 4} fontSize={11} fill="var(--ink-3)" fontFamily="var(--font-mono)">{Math.round(g * 100)}</text></g>))}
      <path d={lineFor("aShare")} fill="none" stroke="var(--ctrl)" strokeWidth={1.5} />
      <path d={lineFor("bShare")} fill="none" stroke="var(--chal)" strokeWidth={1.5} />
      <text x={W - PAD - 90} y={Y(0.92)} fontSize={12} fill="var(--ctrl)" fontFamily="var(--font-mono)">A Control</text>
      <text x={W - PAD - 90} y={Y(0.84)} fontSize={12} fill="var(--chal)" fontFamily="var(--font-mono)">B Challenger</text>
    </svg>
  );
}

export function BarsChart({ rows }: { rows: { label: string; value: number; kind: "control" | "challenger" | "other" }[] }) {
  const max = Math.max(0.001, ...rows.map((r) => r.value));
  return (
    <div className="flex flex-col gap-2" role="img" aria-label="Bar chart">
      {rows.map((r) => (
        <div key={r.label} className="flex items-center gap-3">
          <span className="w-40 shrink-0 truncate text-[13px] text-ink-2">{r.label}</span>
          <div className="h-4 flex-1 rounded-sm bg-surface-2">
            <div className="h-4 rounded-sm" style={{ width: `${(r.value / max) * 100}%`, background: r.kind === "control" ? "var(--ctrl)" : r.kind === "challenger" ? "var(--chal)" : "var(--ink-3)" }} />
          </div>
          <span className="w-14 text-right font-mono text-[13px] text-ink">{r.value.toFixed(3)}</span>
        </div>
      ))}
    </div>
  );
}

export function ScatterChart({ rows }: { rows: { label: string; x: number; y: number; kind: "control" | "challenger" | "other" }[] }) {
  const W = 640, H = 240, PAD = 36;
  const maxX = Math.max(0.0001, ...rows.map((r) => r.x)) * 1.15;
  const maxY = Math.max(0.001, ...rows.map((r) => r.y)) * 1.15;
  const X = (v: number) => PAD + (v / maxX) * (W - 2 * PAD);
  const Y = (v: number) => H - PAD - (v / maxY) * (H - 2 * PAD);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Composite score against cost per answer">
      <line x1={PAD} y1={H - PAD} x2={W - PAD} y2={H - PAD} stroke="var(--border)" />
      <line x1={PAD} y1={PAD / 2} x2={PAD} y2={H - PAD} stroke="var(--border)" />
      {rows.map((r) => (
        <g key={r.label}>
          <circle cx={X(r.x)} cy={Y(r.y)} r={5} fill={r.kind === "control" ? "var(--ctrl)" : r.kind === "challenger" ? "var(--chal)" : "var(--ink-3)"} />
          <text x={X(r.x) + 8} y={Y(r.y) + 4} fontSize={11} fill="var(--ink-2)" fontFamily="var(--font-mono)">{r.label}</text>
        </g>
      ))}
      <text x={W - PAD - 110} y={H - 8} fontSize={11} fill="var(--ink-3)" fontFamily="var(--font-mono)">cost per answer</text>
      <text x={6} y={16} fontSize={11} fill="var(--ink-3)" fontFamily="var(--font-mono)">composite</text>
    </svg>
  );
}
