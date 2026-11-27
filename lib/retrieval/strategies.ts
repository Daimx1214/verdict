import { loadIndex } from "./index-loader";
import { embedQuery, rerankScores } from "./embed";
import { completeChat } from "../answer/provider";
import type { RetrievalConfig } from "../flagsmith/config-schema";
import type { ScoredChunk } from "./types";
// Retrieval strategies - Specification 6.4.
export interface RetrievalResult {
  passages: ScoredChunk[];
  retrievalMs: number;
  bestScore: number;
  usedDense: boolean;
  usedRerank: boolean;
}
function denseRank(qv: Float32Array): { idx: number; score: number }[] {
  const { vectors, dim, chunks } = loadIndex();
  const out: { idx: number; score: number }[] = [];
  for (let i = 0; i < chunks.length; i++) {
    let s = 0; const off = i * dim;
    for (let d = 0; d < dim; d++) s += qv[d] * vectors[off + d];
    out.push({ idx: i, score: s });
  }
  return out.sort((a, b) => b.score - a.score);
}
// Non-Latin-script questions (for example Urdu script) cannot match an
// English corpus with keyword retrieval. Translate such a question to
// English for ranking only; the answer prompt still receives the original
// question, so the reply stays in the visitor's language. Post-experiment
// product fix (28 November 2026): all experiment traffic was English, so
// nothing the experiment measured changes. Falls back to the original
// question on any translation failure.
const NON_LATIN = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\u0900-\u097F\u4E00-\u9FFF\u0400-\u04FF]/;
async function rankQuestionFor(question: string): Promise<string> {
  if (!NON_LATIN.test(question)) return question;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const { text } = await completeChat(
        [
          { role: "system", content: "Translate the user's question into English. Output only the translated question, nothing else." },
          { role: "user", content: question },
        ],
        { maxTokens: 150, timeoutMs: 8000 },
      );
      const t = text.trim();
      if (t.length >= 3) return t;
    } catch { /* retry once after a short pause, then fall back */ }
    if (attempt === 0) await new Promise((r) => setTimeout(r, 2500));
  }
  return question;
}
export async function retrieve(question: string, cfg: RetrievalConfig): Promise<RetrievalResult> {
  const started = performance.now();
  const index = loadIndex();
  const byId = new Map(index.chunks.map((c, i) => [c.id, i]));
  const rankQuestion = await rankQuestionFor(question);
  const bm = index.bm25.search(rankQuestion) as { id: string; score: number }[];
  const bmIds = bm.map((r) => r.id);
  let usedDense = false, usedRerank = false;
  let rankedIds: string[] = bmIds;
  let scoreOf = new Map(bm.map((r) => [r.id, r.score]));

  if (cfg.strategy === "dense" || cfg.strategy === "hybrid") {
    const qv = await embedQuery(rankQuestion);
    if (qv) {
      usedDense = true;
      const dense = denseRank(qv);
      const denseIds = dense.map((r) => index.chunks[r.idx].id);
      if (cfg.strategy === "dense") {
        rankedIds = denseIds;
        scoreOf = new Map(dense.map((r) => [index.chunks[r.idx].id, r.score]));
      } else {
        const pool = cfg.pool || 30, k = cfg.rrfK || 60;
        const fused = new Map<string, number>();
        bmIds.slice(0, pool).forEach((id, i) => fused.set(id, (fused.get(id) || 0) + 1 / (k + i + 1)));
        denseIds.slice(0, pool).forEach((id, i) => fused.set(id, (fused.get(id) || 0) + 1 / (k + i + 1)));
        rankedIds = [...fused.entries()].sort((a, b) => b[1] - a[1]).map(([id]) => id);
        scoreOf = fused;
        if (cfg.rerank) {
          const poolIds = rankedIds.slice(0, pool);
          const texts = poolIds.map((id) => index.chunks[byId.get(id)!].text);
          const ceScores = await rerankScores(question, texts);
          if (ceScores) {
            usedRerank = true;
            const rescored = poolIds.map((id, i) => ({ id, s: ceScores[i] })).sort((a, b) => b.s - a.s);
            rankedIds = [...rescored.map((r) => r.id), ...rankedIds.slice(pool)];
            scoreOf = new Map(rescored.map((r) => [r.id, r.s]));
          } else {
            // Dense re-rank of the pool behind the same interface (5.2 fallback).
            const rescored = poolIds.map((id) => {
              const i = byId.get(id)!; let s = 0; const off = i * index.dim;
              for (let d = 0; d < index.dim; d++) s += qv[d] * index.vectors[off + d];
              return { id, s };
            }).sort((a, b) => b.s - a.s);
            rankedIds = [...rescored.map((r) => r.id), ...rankedIds.slice(pool)];
          }
        }
      }
    }
  }
  const top = rankedIds.slice(0, cfg.topK);
  const rawPassages: ScoredChunk[] = top.map((id, i) => ({
    chunk: index.chunks[byId.get(id)!],
    score: scoreOf.get(id) || 0,
    rank: i + 1,
  }));
  // Context assembly (post-experiment product fixes, 27 Nov 2026): sections
  // are often split across chunks mid-sentence, which left the answer model
  // with a fragment and caused borderline declines. Each retrieved passage
  // is widened with same-page context only: the page's opening chunk (where
  // definitions and introductions live) when the passage sits deeper in the
  // page, the previous chunk, and the following chunk. Retrieval ranking is
  // unchanged; the experiment record was produced before these fixes and is
  // unaffected.
  const passages: ScoredChunk[] = rawPassages.map((p) => {
    const i = byId.get(p.chunk.id)!;
    const pageBase = p.chunk.url.split("#")[0];
    const samePage = (j: number) =>
      j >= 0 && j < index.chunks.length && index.chunks[j].url.split("#")[0] === pageBase;
    let pageFirst = i;
    while (samePage(pageFirst - 1)) pageFirst--;
    const parts: string[] = [];
    if (i - pageFirst > 1) parts.push(index.chunks[pageFirst].text);
    if (samePage(i - 1) && i - 1 !== pageFirst) parts.push(index.chunks[i - 1].text);
    else if (samePage(i - 1) && parts.length === 0) parts.push(index.chunks[i - 1].text);
    parts.push(p.chunk.text);
    if (samePage(i + 1)) parts.push(index.chunks[i + 1].text);
    if (parts.length === 1) return p;
    return { ...p, chunk: { ...p.chunk, text: parts.join("\n") } };
  });
  return {
    passages,
    retrievalMs: Math.round(performance.now() - started),
    bestScore: passages[0]?.score || 0,
    usedDense, usedRerank,
  };
}
// No-answer threshold support (6.6): BM25 scores are not comparable across
// strategies, so decline is decided by the answer model returning the exact
// no-answer string, plus a BM25 floor calibrated on the dev split for the
// control arm only. Kept deliberately simple and documented on /method.
export const BM25_FLOOR = 2.0;
