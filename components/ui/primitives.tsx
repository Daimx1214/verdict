import type { ReactNode } from "react";
import { Check, X, Lock, Info, TriangleAlert, CircleCheck, CircleX } from "lucide-react";

export function Badge({ kind, children }: { kind: "control" | "challenger" | "winner" | "passed" | "failed" | "locked" | "real" | "simulated" | "neutral"; children: ReactNode }) {
  const styles: Record<string, string> = {
    control: "bg-ctrl-subtle text-ctrl border border-ctrl/30",
    challenger: "bg-chal-subtle text-chal border border-chal/30",
    winner: "bg-accent text-on-accent",
    passed: "bg-success-subtle text-success",
    failed: "bg-danger-subtle text-danger",
    locked: "bg-surface-2 text-ink border border-border-strong",
    real: "bg-surface-2 text-ink border border-border",
    simulated: "bg-info-subtle text-info border border-border",
    neutral: "bg-surface-2 text-ink-2 border border-border",
  };
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[13px] font-medium leading-[18px] ${styles[kind]}`}>
      {kind === "passed" && <Check size={13} strokeWidth={2} />}
      {kind === "failed" && <X size={13} strokeWidth={2} />}
      {kind === "locked" && <Lock size={12} strokeWidth={1.5} />}
      {children}
    </span>
  );
}
export function StatCard({ label, value, sub, loading }: { label: string; value: string; sub?: string; loading?: boolean }) {
  return (
    <div className="rounded-md border border-border bg-surface p-4">
      <p className="text-[13px] font-medium text-ink-3">{label}</p>
      {loading ? <div className="skeleton mt-2 h-9 w-24 rounded" aria-hidden="true" /> :
        <p className="mt-1 font-mono text-[32px] font-medium leading-9 tracking-[-0.01em] text-ink">{value}</p>}
      {sub && <p className="mt-1 text-[13px] text-ink-3">{sub}</p>}
    </div>
  );
}
export function Alert({ kind, children }: { kind: "info" | "success" | "warning" | "danger"; children: ReactNode }) {
  const map = {
    info: { cls: "bg-info-subtle border-info/40", Icon: Info, role: "status" as const },
    success: { cls: "bg-success-subtle border-success/40", Icon: CircleCheck, role: "status" as const },
    warning: { cls: "bg-warning-subtle border-warning/40", Icon: TriangleAlert, role: "status" as const },
    danger: { cls: "bg-danger-subtle border-danger/40", Icon: CircleX, role: "alert" as const },
  }[kind];
  const Icon = map.Icon;
  return (
    <div role={map.role} className={`flex items-start gap-2.5 rounded border px-3.5 py-3 text-sm text-ink ${map.cls}`}>
      <Icon size={17} strokeWidth={1.5} className="mt-0.5 shrink-0" /> <div>{children}</div>
    </div>
  );
}
export function Segmented<T extends string>({ options, value, onChange, label }: {
  options: { v: T; label: string }[]; value: T; onChange: (v: T) => void; label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded bg-surface-2 p-0.5">
      {options.map((o) => (
        <button key={o.v} role="radio" aria-checked={value === o.v} onClick={() => onChange(o.v)}
          className={`rounded px-3 py-1.5 text-[13px] font-medium transition-colors duration-120 ${value === o.v ? "bg-surface text-ink" : "text-ink-2 hover:text-ink"}`}>
          {o.label}
        </button>
      ))}
    </div>
  );
}
export const btnPrimary = "inline-flex min-h-[44px] items-center justify-center gap-2 rounded bg-accent px-5 py-2.5 text-[15px] font-medium text-on-accent transition-colors duration-120 hover:bg-accent-hover active:bg-accent-active disabled:bg-surface-2 disabled:text-ink-3";
export const btnSecondary = "inline-flex min-h-[44px] items-center justify-center gap-2 rounded border border-border-strong bg-surface px-5 py-2.5 text-[15px] font-medium text-ink transition-colors duration-120 hover:bg-surface-2 disabled:text-ink-3";
export const btnGhost = "inline-flex min-h-[44px] items-center justify-center gap-2 rounded px-3 py-2 text-[15px] font-medium text-accent transition-colors duration-120 hover:bg-accent-subtle";
export function pct(x: number, digits = 1): string { return `${(x * 100).toFixed(digits)}%`; }
