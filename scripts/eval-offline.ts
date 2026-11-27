// Offline screening with judge grading (Specification Section 7).
// Retrieval numbers (hit rate, MRR, latency) come from the verified retrieval
// screening in data/eval/retrieval-results.json (full rankings). This script adds
// answer correctness, faithfulness and decline accuracy per candidate using the
// fixed Appendix A prompt and Appendix B rubric, then applies the gates of 7.3
// and writes data/eval/results.json (the file /api/lab/candidates serves).
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import { retrieve } from "../lib/retrieval/strategies";
import { buildPrompt, NO_ANSWER, JUDGE_SYSTEM } from "../lib/answer/prompt";
import { completeChat, ANSWER_MODEL, JUDGE_MODEL } from "../lib/answer/provider";
import type { RetrievalConfig } from "../lib/flagsmith/config-schema";

const ROOT = process.cwd();
const SEED = 42;
const CANDIDATES: { id: string; name: string; config: RetrievalConfig }[] = [
  { id: "C0", name: "Baseline (control)", config: { id: "bm25_k3", strategy: "bm25", topK: 3, rerank: false } },
  { id: "C1", name: "Keyword wide", config: { id: "bm25_k5", strategy: "bm25", topK: 5, rerank: false } },
  { id: "C2", name: "Dense narrow", config: { id: "dense_k3", strategy: "dense", topK: 3, rerank: false } },
  { id: "C3", name: "Dense wide", config: { id: "dense_k5", strategy: "dense", topK: 5, rerank: false } },
  { id: "C4", name: "Hybrid", config: { id: "hybrid_rrf_k5", strategy: "hybrid", topK: 5, pool: 30, rrfK: 60, rerank: false } },
  { id: "C5", name: "Hybrid + rerank wide", config: { id: "hybrid_rrf_rerank_k5", strategy: "hybrid", topK: 5, pool: 30, rrfK: 60, rerank: true } },
  { id: "C6", name: "Hybrid + rerank narrow", config: { id: "hybrid_rrf_rerank_k3", strategy: "hybrid", topK: 3, pool: 30, rrfK: 60, rerank: true } },
  { id: "C7", name: "Dense + rewrite wide", config: { id: "dense_rewrite_k5", strategy: "dense", topK: 5, rerank: false, rewrite: true } },
];
interface Gold { id: string; question: string; gold_pages: string[]; reference_answer: string; category: string; answerable: boolean }
const gold: Gold[] = JSON.parse(readFileSync(join(ROOT, "data/eval/gold.test.json"), "utf8"));
const retrieval = JSON.parse(readFileSync(join(ROOT, "data/eval/retrieval-results.json"), "utf8"));
const progressPath = join(ROOT, "data/eval/screening-progress.json");
const progress: Record<string, Record<string, unknown>> = existsSync(progressPath) ? JSON.parse(readFileSync(progressPath, "utf8")) : {};

async function withRetry<T>(fn: () => Promise<T>, tries = 4): Promise<T> {
  let last: unknown;
  for (let i = 0; i < tries; i++) {
    try { return await fn(); } catch (e) { last = e; await new Promise((r) => setTimeout(r, 2000 * (i + 1))); }
  }
  throw last;
}
async function grade(candidate: (typeof CANDIDATES)[number], q: Gold) {
  const r = await retrieve(q.question, candidate.config);
  const passages = r.passages.map((p) => ({ title: p.chunk.pageTitle, headingPath: p.chunk.headingPath, url: p.chunk.url, text: p.chunk.text }));
  const { system, user } = buildPrompt(q.question, passages);
  const ans = await withRetry(() => completeChat([{ role: "system", content: system }, { role: "user", content: user }], { model: ANSWER_MODEL, maxTokens: 600 }));
  const declined = ans.text.trim().startsWith(NO_ANSWER);
  let correctness = 0, faithfulness = 0, reason = "";
  let declinedCorrectly: boolean | null = null;
  if (!q.answerable) {
    declinedCorrectly = declined;
    correctness = declined ? 1 : 0;
    faithfulness = declined ? 1 : 0;
    reason = declined ? "Declined an unanswerable question." : "Answered an unanswerable question.";
  } else {
    const judgeUser = `QUESTION\n${q.question}\n\nREFERENCE ANSWER\n${q.reference_answer}\n\nPASSAGES\n${passages.map((p, i) => `[${i + 1}] ${p.text}`).join("\n\n")}\n\nANSWER\n${ans.text}`;
    const j = await withRetry(() => completeChat([{ role: "system", content: JUDGE_SYSTEM }, { role: "user", content: judgeUser }], { model: JUDGE_MODEL, maxTokens: 300 }));
    try {
      const parsed = JSON.parse(j.text.slice(j.text.indexOf("{"), j.text.lastIndexOf("}") + 1));
      correctness = Number(parsed.correctness) || 0;
      faithfulness = Number(parsed.faithfulness) || 0;
      reason = String(parsed.reason || "");
    } catch { reason = "Judge output unparsable; scored 0."; }
  }
  const hit = q.answerable ? r.passages.some((p) => q.gold_pages.includes(p.chunk.url.split("#")[0])) : false;
  return {
    id: q.id, question: q.question, goldPages: q.gold_pages, category: q.category,
    hit, correctness, faithfulness, declinedCorrectly,
    retrievedTitles: r.passages.map((p) => p.chunk.pageTitle), judgeReason: reason,
    tokensIn: ans.usage.tokensIn, tokensOut: ans.usage.tokensOut, costUsd: ans.usage.costUsd,
  };
}
async function main() {
  const only = process.argv[2]; // optional candidate id to run just one
  for (const cand of CANDIDATES) {
    if (only && cand.id !== only) continue;
    progress[cand.id] = progress[cand.id] || {};
    const qs = gold.filter((q) => !progress[cand.id][q.id]);
    console.log(`${cand.id}: ${qs.length} questions to grade`);
    // small concurrency pool
    const queue = [...qs];
    const workers = Array.from({ length: 3 }, async () => {
      for (;;) {
        const q = queue.shift(); if (!q) return;
        try {
          progress[cand.id][q.id] = await grade(cand, q);
          writeFileSync(progressPath, JSON.stringify(progress, null, 1));
          console.log(`${cand.id} ${q.id} done`);
        } catch (e) { console.error(`${cand.id} ${q.id} FAILED`, e instanceof Error ? e.message : e); }
      }
    });
    await Promise.all(workers);
  }
  // Aggregate
  const answerable = gold.filter((q) => q.answerable);
  const unanswerable = gold.filter((q) => !q.answerable);
  const rows = CANDIDATES.map((cand) => {
    const per = gold.map((q) => progress[cand.id]?.[q.id] as ReturnType<typeof Object> as never) as unknown as Record<string, { hit: boolean; correctness: number; faithfulness: number; declinedCorrectly: boolean | null; costUsd: number }>[];
    const ret = retrieval.candidates[cand.id];
    const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
    const correctness = mean(answerable.map((q) => (progress[cand.id][q.id] as { correctness: number }).correctness));
    const faithfulness = mean(gold.map((q) => (progress[cand.id][q.id] as { faithfulness: number }).faithfulness));
    const declineAccuracy = unanswerable.length ? unanswerable.filter((q) => (progress[cand.id][q.id] as { declinedCorrectly: boolean }).declinedCorrectly).length / unanswerable.length : 1;
    const costPerAnswer = mean(gold.map((q) => (progress[cand.id][q.id] as { costUsd: number }).costUsd || 0));
    const composite = 0.5 * ret.hitRate + 0.3 * correctness + 0.2 * faithfulness;
    return {
      id: cand.id, name: cand.name, config: cand.config,
      hitRate: ret.hitRate, mrr: ret.mrr, correctness, faithfulness, declineAccuracy,
      retrP50: ret.latency_p50_ms, retrP95: ret.latency_p95_ms, costPerAnswer, composite,
      perQuestion: per, gates: { qualityFloor: false, latency: false, cost: false, improvement: false }, status: "rejected" as string, reason: "",
    };
  });
  const base = rows[0];
  for (const r of rows) {
    r.gates = {
      qualityFloor: r.faithfulness >= base.faithfulness && r.declineAccuracy >= base.declineAccuracy,
      latency: r.retrP95 <= 600,
      cost: r.costPerAnswer <= Math.max(base.costPerAnswer * 1.6, 0.000001),
      improvement: r.composite >= base.composite + 0.03,
    };
  }
  base.status = "baseline";
  const passers = rows.slice(1).filter((r) => r.gates.qualityFloor && r.gates.latency && r.gates.cost && r.gates.improvement);
  passers.sort((a, b) => b.composite - a.composite);
  if (passers.length) { passers[0].status = "finalist"; }
  for (const r of rows.slice(1)) {
    if (r.status === "finalist") continue;
    if (!r.gates.qualityFloor) r.reason = "Below the quality floor";
    else if (!r.gates.latency) r.reason = "Latency gate failed";
    else if (!r.gates.cost) r.reason = "Cost gate failed";
    else if (!r.gates.improvement) r.reason = "Improvement gate failed";
    else r.reason = "Passed gates, lower composite than the finalist";
  }
  const out = {
    generatedAt: new Date().toISOString(), corpusHash: retrieval.corpus_hash, seed: SEED,
    answerModel: ANSWER_MODEL, judgeModel: JUDGE_MODEL, embeddingModel: retrieval.embedding_model, rerankMethod: retrieval.rerank_method,
    gold: { test: gold.length, answerable: answerable.length },
    funnel: {
      candidates: rows.length,
      qualityFloor: rows.filter((r) => r.gates.qualityFloor).length,
      latencyCost: rows.filter((r) => r.gates.qualityFloor && r.gates.latency && r.gates.cost).length,
      finalist: passers.length ? 1 : 0,
    },
    finalist: passers.length ? passers[0].id : null,
    candidates: rows,
    notes: retrieval.notes,
  };
  writeFileSync(join(ROOT, "data/eval/results.json"), JSON.stringify(out, null, 1));
  console.log("results.json written. Finalist:", out.finalist);
}
main().catch((e) => { console.error(e); process.exit(1); });
