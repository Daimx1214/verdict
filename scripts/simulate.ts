// Simulated traffic (Specification Section 15). NOT part of the build.
// Judge-graded feedback: the rubric grades the actual answer; the press is then
// sampled from the pre-registered probabilities, never from the arm.
// Usage: BASE_URL=https://your-verdict-url ADMIN_TOKEN=... N=100 tsx scripts/simulate.ts
import { writeFileSync } from "fs";
import { randomUUID } from "crypto";
import { completeChat } from "../lib/answer/provider";
import { JUDGE_SYSTEM } from "../lib/answer/prompt";
const BASE = process.env.BASE_URL || "http://localhost:3000";
const TOKEN = process.env.ADMIN_TOKEN || "";
const N = Number(process.env.N || 100);
const QUESTIONS = [
  "How do I create a multivariate flag?", "What is an identity in Flagsmith?", "How do segments work?",
  "How do I use the JavaScript SDK?", "What is a trait?", "How do I self-host Flagsmith with Docker?",
  "How do I run an A/B experiment?", "What is remote config?", "How do I roll out to a percentage of users?",
  "How do I set up environments?", "What is the difference between flags and remote config?",
  "How do I use the Python SDK?", "How do I archive a flag?", "What are stale flags?",
  "How do I integrate Flagsmith with Slack?", "What pricing plans does Flagsmith offer for time travel?",
];
function mulberry(seed: number) { let a = seed >>> 0; return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const rng = mulberry(Number(process.env.SEED || 7));
let simCookie = "";
async function askOnce(simId: string, question: string): Promise<{ questionId: string; answer: string } | null> {
  const res = await fetch(`${BASE}/api/ask`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-admin-token": TOKEN },
    body: JSON.stringify({ question, surface: "web", hp: "", simId }),
  });
  if (!res.ok || !res.body) return null;
  const sc = res.headers.get("set-cookie");
  if (sc) simCookie = sc.split(";")[0];
  const reader = res.body.getReader(); const dec = new TextDecoder();
  let buf = "", answer = "", questionId = "";
  for (;;) {
    const { done, value } = await reader.read(); if (done) break;
    buf += dec.decode(value, { stream: true });
    const parts = buf.split("\n\n"); buf = parts.pop() || "";
    for (const part of parts) {
      const ev = part.match(/^event: (\w+)/)?.[1];
      const dl = part.split("\n").find((l) => l.startsWith("data: "));
      if (!ev || !dl) continue;
      const data = JSON.parse(dl.slice(6));
      if (ev === "delta") answer += data.text;
      if (ev === "done") questionId = data.questionId;
    }
  }
  return questionId ? { questionId, answer } : null;
}
async function main() {
  if (!TOKEN) { console.error("ADMIN_TOKEN required"); process.exit(1); }
  const started = new Date().toISOString();
  let exposed = 0, pressed = 0, helpful = 0;
  const sessions = Math.ceil(N / 2);
  for (let s = 0; s < sessions; s++) {
    const simId = `sim-${randomUUID()}`;
    const qs = 1 + Math.floor(rng() * 2);
    for (let i = 0; i < qs; i++) {
      const q = QUESTIONS[Math.floor(rng() * QUESTIONS.length)];
      const got = await askOnce(simId, q);
      if (!got) continue;
      exposed++;
      if (rng() < 0.35) continue; // never press
      const judge = await completeChat([
        { role: "system", content: JUDGE_SYSTEM },
        { role: "user", content: `QUESTION\n${q}\n\nREFERENCE ANSWER\n(grade against the passages in the answer's citations; if the answer declines, correctness is 0 unless the question is unanswerable)\n\nPASSAGES\n(see answer citations)\n\nANSWER\n${got.answer}` },
      ], { maxTokens: 200 }).catch(() => null);
      let correct = false;
      try { const p = JSON.parse(judge!.text.slice(judge!.text.indexOf("{"), judge!.text.lastIndexOf("}") + 1)); correct = Number(p.correctness) >= 1; } catch {}
      const pHelpful = correct ? 0.75 : 0.10;
      const value = rng() < pHelpful ? "helpful" : "not_helpful";
      pressed++;
      if (value === "helpful") helpful++;
      await new Promise((r) => setTimeout(r, 1200)); // respect the 1s minimum view time
      await fetch(`${BASE}/api/feedback`, {
        method: "POST", headers: { "Content-Type": "application/json", Cookie: simCookie },
        body: JSON.stringify({ questionId: got.questionId, value }),
      }).catch(() => {});
    }
    console.log(`session ${s + 1}/${sessions} done`);
  }
  const block = `# Simulation run\n\n- Started: ${started}\n- Script: scripts/simulate.ts\n- Seed: ${process.env.SEED || 7}\n- Configured visitors: ${N}\n- Exposed (answers shown): ${exposed}\n- Feedback pressed: ${pressed} (helpful ${helpful})\n- Helpful rule: correctness 1 -> P(helpful) 0.75; otherwise 0.10; 35 percent never press.\n- Simulated traffic is labelled and never merged into headline claims.\n`;
  writeFileSync("SIMULATION.md", block);
  console.log(block);
}
main().catch((e) => { console.error(e); process.exit(1); });
