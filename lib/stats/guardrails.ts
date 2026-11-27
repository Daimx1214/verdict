// Guardrails G1-G4 (Section 3.7), computed from stored question rows.
export interface ArmStats { exposed: number; converted: number; p95TotalMs: number; meanCost: number; declineRate: number; errorRate: number; questions: number }
export interface GuardrailResult { id: string; name: string; a: number; b: number; limit: string; pass: boolean }
export function percentile(values: number[], p: number): number {
  if (!values.length) return 0;
  const s = [...values].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(p * s.length))];
}
export function guardrails(a: ArmStats, b: ArmStats): GuardrailResult[] {
  const ratio = (x: number, y: number) => (y === 0 ? (x === 0 ? 1 : Infinity) : x / y);
  return [
    { id: "G1", name: "Latency p95 (challenger vs control)", a: a.p95TotalMs, b: b.p95TotalMs, limit: "at most 1.5x control", pass: ratio(b.p95TotalMs, a.p95TotalMs) <= 1.5 },
    { id: "G2", name: "Mean cost per answer", a: a.meanCost, b: b.meanCost, limit: "at most 1.5x control", pass: ratio(b.meanCost, a.meanCost) <= 1.5 },
    { id: "G3", name: "No-answer rate difference", a: a.declineRate, b: b.declineRate, limit: "at most +10 points", pass: (b.declineRate - a.declineRate) <= 0.10 },
    { id: "G4", name: "Error rate difference", a: a.errorRate, b: b.errorRate, limit: "at most +2 points", pass: (b.errorRate - a.errorRate) <= 0.02 },
  ];
}
