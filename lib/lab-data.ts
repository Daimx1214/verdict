import { db } from "./db/client";
import { participants, questions, decisions } from "./db/schema";
import { wilsonInterval, posteriorDiff, srmTest } from "./stats/beta";
import { percentile, guardrails, type ArmStats } from "./stats/guardrails";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

export type TrafficFilter = "real" | "simulated" | "all";
export interface ArmData extends ArmStats { share: number; ciLow: number; ciHigh: number; variant: string }

function emptyArm(variant: string): ArmData {
  return { variant, exposed: 0, converted: 0, share: 0, ciLow: 0, ciHigh: 0, p95TotalMs: 0, meanCost: 0, declineRate: 0, errorRate: 0, questions: 0 };
}
export async function armData(traffic: TrafficFilter): Promise<{ control: ArmData; challenger: ArmData; totalParticipants: number; totalQuestions: number }> {
  const d = db();
  const control = emptyArm("control"), challenger = emptyArm("challenger");
  if (!d) return { control, challenger, totalParticipants: 0, totalQuestions: 0 };
  const ps = await d.select().from(participants);
  const qs = await d.select().from(questions);
  const inTraffic = (t: string) => traffic === "all" ? t !== "probe" : t === traffic;
  let totalP = 0, totalQ = 0;
  for (const p of ps) {
    if (!inTraffic(p.trafficType)) continue;
    totalP++;
    const arm = p.variant === "challenger" ? challenger : p.variant === "control" ? control : null;
    if (!arm) continue;
    if (p.firstExposedAt) { arm.exposed++; if (p.convertedAt) arm.converted++; }
  }
  for (const q of qs) {
    const owner = ps.find((p) => p.id === q.participantId);
    if (!owner || !inTraffic(owner.trafficType)) continue;
    totalQ++;
    const arm = q.variant === "challenger" ? challenger : q.variant === "control" ? control : null;
    if (!arm) continue;
    arm.questions++;
  }
  // Latency / cost / decline / error per arm need question-level values:
  const lat: Record<string, number[]> = { control: [], challenger: [] };
  const cost: Record<string, number[]> = { control: [], challenger: [] };
  const dec: Record<string, number> = { control: 0, challenger: 0 };
  const err: Record<string, number> = { control: 0, challenger: 0 };
  const ok: Record<string, number> = { control: 0, challenger: 0 };
  for (const q of qs) {
    if (q.variant !== "control" && q.variant !== "challenger") continue;
    const owner = ps.find((p) => p.id === q.participantId);
    if (!owner || !inTraffic(owner.trafficType)) continue;
    const v = q.variant;
    if (q.status === "ok") { ok[v]++; if (q.totalMs) lat[v].push(q.totalMs); cost[v].push(Number(q.costUsd || 0)); if (q.declined) dec[v]++; }
    else if (q.status === "error") err[v]++;
  }
  for (const arm of [control, challenger]) {
    const v = arm.variant;
    arm.p95TotalMs = percentile(lat[v], 0.95);
    arm.meanCost = cost[v].length ? cost[v].reduce((a, b) => a + b, 0) / cost[v].length : 0;
    arm.declineRate = ok[v] ? dec[v] / ok[v] : 0;
    arm.errorRate = ok[v] + err[v] ? err[v] / (ok[v] + err[v]) : 0;
    const ci = wilsonInterval(arm.converted, arm.exposed);
    arm.share = arm.exposed ? arm.converted / arm.exposed : 0;
    arm.ciLow = ci.low; arm.ciHigh = ci.high;
  }
  return { control, challenger, totalParticipants: totalP, totalQuestions: totalQ };
}

export async function experimentData(traffic: TrafficFilter) {
  const { control, challenger } = await armData(traffic);
  const post = posteriorDiff(control.converted, control.exposed, challenger.converted, challenger.exposed);
  const srm = srmTest(control.exposed, challenger.exposed);
  const guards = guardrails(control, challenger);
  const d = db();
  let phase = "Screening";
  let locked: Record<string, unknown> | null = null;
  if (d) {
    const ds = await d.select().from(decisions);
    if (ds.length) {
      const last = ds[ds.length - 1];
      phase = last.phase === "locked" ? "Collecting" : last.phase === "shipped" ? "Decided" : last.phase === "result" ? "Stopped" : phase;
      locked = ds.find((x) => x.phase === "locked") as unknown as Record<string, unknown> || null;
    } else if (control.exposed + challenger.exposed > 0) phase = "Collecting";
  }
  // Cumulative helpful share over exposed-participant order (10.6 time series).
  let series: { n: number; aShare: number | null; bShare: number | null }[] = [];
  if (d) {
    const ps = (await d.select().from(participants)).filter((p) => p.firstExposedAt && (p.variant === "control" || p.variant === "challenger") && (traffic === "all" ? p.trafficType !== "probe" : p.trafficType === traffic));
    ps.sort((a, b) => new Date(a.firstExposedAt!).getTime() - new Date(b.firstExposedAt!).getTime());
    let ea = 0, ca = 0, eb = 0, cb = 0;
    series = ps.map((p, i) => {
      if (p.variant === "control") { ea++; if (p.convertedAt) ca++; } else { eb++; if (p.convertedAt) cb++; }
      return { n: i + 1, aShare: ea ? ca / ea : null, bShare: eb ? cb / eb : null };
    });
    if (series.length > 60) series = series.filter((_, i) => i % Math.ceil(series.length / 60) === 0 || i === series.length - 1);
  }
  return { control, challenger, posterior: post, srm, guardrails: guards, phase, locked, series };
}

export function screeningResults(): Record<string, unknown> | null {
  const p = join(process.cwd(), "data", "eval", "results.json");
  if (!existsSync(p)) return null;
  return JSON.parse(readFileSync(p, "utf8"));
}
export function corpusHash(): string {
  try {
    const meta = JSON.parse(readFileSync(join(process.cwd(), "data", "index", "vectors-meta.json"), "utf8"));
    return meta.corpus_hash || meta.corpusHash || "";
  } catch { return ""; }
}
