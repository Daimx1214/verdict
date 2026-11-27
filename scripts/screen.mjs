// Offline retrieval screening (no LLM): candidates C0-C7 over gold.test.json.
// Metrics per candidate: hitRate, MRR (over answerable questions), retrieval
// latency p50/p95 (all 40 questions). Rerank: tries the ms-marco cross-encoder;
// falls back to dense-cosine re-ranking of the pool and records which was used.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pipeline } from '@xenova/transformers';
import { BM25Index } from './bm25.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MODEL = 'Xenova/all-MiniLM-L6-v2';
const CE_MODEL = 'Xenova/ms-marco-MiniLM-L-6-v2';
const RRF_K = 60, POOL = 30;

const chunks = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'index', 'chunks.json'), 'utf8'));
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'corpus', 'MANIFEST.json'), 'utf8'));
const meta = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'index', 'vectors-meta.json'), 'utf8'));
const gold = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'eval', 'gold.test.json'), 'utf8'));
const byId = new Map(chunks.map((c, i) => [c.id, i]));
const pageOf = c => c.url.split('#')[0];
const indexText = c => `${c.pageTitle}\n${(c.headingPath || []).join(' > ')}\n${c.text}`;

// ---- indexes ----
const bm25 = new BM25Index(chunks.map(c => ({ id: c.id, text: indexText(c) })));
const dim = meta.dim;
const vecBuf = new Float32Array(fs.readFileSync(path.join(ROOT, 'data', 'index', 'vectors.bin')).buffer);
if (vecBuf.length !== chunks.length * dim) throw new Error('vectors.bin size mismatch');

// ---- query embeddings ----
const extractor = await pipeline('feature-extraction', MODEL, { quantized: true });
async function embedQuery(q) {
  const out = await extractor([q], { pooling: 'mean', normalize: true });
  return new Float32Array(out.data);
}
function denseRank(qv) {
  const scores = new Float32Array(chunks.length);
  for (let i = 0; i < chunks.length; i++) {
    let s = 0;
    const off = i * dim;
    for (let d = 0; d < dim; d++) s += qv[d] * vecBuf[off + d];
    scores[i] = s;
  }
  return [...scores.keys()].sort((a, b) => scores[b] - scores[a]).map(i => ({ id: chunks[i].id, score: scores[i] }));
}

// ---- optional cross-encoder reranker ----
let ce = null, rerankMethod = 'dense-cosine re-rank of the hybrid pool (cross-encoder unavailable)';
try {
  const load = (async () => {
    const { AutoTokenizer, AutoModelForSequenceClassification } = await import('@xenova/transformers');
    const tok = await AutoTokenizer.from_pretrained(CE_MODEL);
    const model = await AutoModelForSequenceClassification.from_pretrained(CE_MODEL, { quantized: true });
    return { tok, model };
  })();
  const timeout = new Promise((_, rej) => setTimeout(() => rej(new Error('cross-encoder load timeout 120s')), 120000));
  ce = await Promise.race([load, timeout]);
  rerankMethod = `cross-encoder ${CE_MODEL} over the hybrid pool`;
  console.log('cross-encoder loaded');
} catch (e) {
  console.log('cross-encoder not used:', e.message);
}
async function ceScore(query, texts) {
  const scores = [];
  for (const t of texts) {
    const inputs = await ce.tok(query, { text_pair: t, padding: true, truncation: true });
    const out = await ce.model(inputs);
    scores.push(out.logits.data[0]);
  }
  return scores;
}

// ---- strategy rankings (full ranked lists of chunk ids) ----
async function rankBm25(q) { return bm25.search(q).map(r => r.id); }
async function rankDense(q) { const qv = await embedQuery(q); return denseRank(qv).map(r => r.id); }
function rrfFuse(rankA, rankB) {
  const score = new Map();
  rankA.slice(0, POOL).forEach((id, i) => score.set(id, (score.get(id) || 0) + 1 / (RRF_K + i + 1)));
  rankB.slice(0, POOL).forEach((id, i) => score.set(id, (score.get(id) || 0) + 1 / (RRF_K + i + 1)));
  return [...score.entries()].sort((a, b) => b[1] - a[1]).map(([id]) => id);
}
async function rankHybrid(q) {
  const [a, b] = [await rankBm25(q), await rankDense(q)];
  return rrfFuse(a, b);
}
async function rankHybridRerank(q) {
  const fused = await rankHybrid(q);
  const pool = fused.slice(0, POOL);
  if (ce) {
    const texts = pool.map(id => indexText(chunks[byId.get(id)]).slice(0, 1200));
    const s = await ceScore(q, texts);
    return pool.map((id, i) => [id, s[i]]).sort((x, y) => y[1] - x[1]).map(([id]) => id).concat(fused.slice(POOL));
  }
  const qv = await embedQuery(q);
  const scored = pool.map(id => {
    const i = byId.get(id); let s = 0; const off = i * dim;
    for (let d = 0; d < dim; d++) s += qv[d] * vecBuf[off + d];
    return [id, s];
  });
  return scored.sort((x, y) => y[1] - x[1]).map(([id]) => id).concat(fused.slice(POOL));
}

const CANDIDATES = {
  C0: { name: 'Baseline (control)', config: { strategy: 'bm25', topK: 3 }, rank: rankBm25 },
  C1: { name: 'Keyword wide', config: { strategy: 'bm25', topK: 5 }, rank: rankBm25 },
  C2: { name: 'Dense narrow', config: { strategy: 'dense', topK: 3 }, rank: rankDense },
  C3: { name: 'Dense wide', config: { strategy: 'dense', topK: 5 }, rank: rankDense },
  C4: { name: 'Hybrid', config: { strategy: 'hybrid', pool: POOL, rrfK: RRF_K, topK: 5 }, rank: rankHybrid },
  C5: { name: 'Hybrid + rerank wide', config: { strategy: 'hybrid', pool: POOL, rrfK: RRF_K, rerank: true, topK: 5 }, rank: rankHybridRerank },
  C6: { name: 'Hybrid + rerank narrow', config: { strategy: 'hybrid', pool: POOL, rrfK: RRF_K, rerank: true, topK: 3 }, rank: rankHybridRerank },
  C7: { name: 'Dense + rewrite (rewrite skipped: evaluated as dense k5)', config: { strategy: 'dense', topK: 5, rewrite: 'skipped' }, rank: rankDense },
};

const pct = (arr, p) => { const s = [...arr].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; };
const answerable = gold.filter(q => q.answerable);
const results = {};

for (const [cid, cand] of Object.entries(CANDIDATES)) {
  const lat = [];
  let hits = 0, rrSum = 0;
  for (const q of gold) {
    const t0 = performance.now();
    const ranking = await cand.rank(q.question);
    lat.push(performance.now() - t0);
    if (!q.answerable) continue;
    const topPages = ranking.slice(0, cand.config.topK).map(id => pageOf(chunks[byId.get(id)]));
    if (topPages.some(u => q.gold_pages.includes(u))) hits++;
    const firstGold = ranking.findIndex(id => q.gold_pages.includes(pageOf(chunks[byId.get(id)])));
    if (firstGold >= 0) rrSum += 1 / (firstGold + 1);
  }
  results[cid] = {
    name: cand.name, config: cand.config,
    hitRate: +(hits / answerable.length).toFixed(4),
    mrr: +(rrSum / answerable.length).toFixed(4),
    latency_p50_ms: +pct(lat, 0.5).toFixed(1),
    latency_p95_ms: +pct(lat, 0.95).toFixed(1),
  };
  console.log(cid, results[cid]);
}

// challenger pick: best hitRate, tie-break MRR, excluding C0
let pick = null;
for (const [cid, r] of Object.entries(results)) {
  if (cid === 'C0') continue;
  if (!pick || r.hitRate > results[pick].hitRate || (r.hitRate === results[pick].hitRate && r.mrr > results[pick].mrr)) pick = cid;
}

const out = {
  generated_at: new Date().toISOString(),
  corpus_hash: manifest.corpus_hash,
  embedding_model: MODEL,
  rerank_method: rerankMethod,
  notes: [
    'Retrieval metrics only; no LLM was run, so correctness/faithfulness/decline-accuracy from spec section 7.2 are not part of this screening.',
    'hitRate and MRR are computed over the 35 answerable test questions; latency over all 40 test questions.',
    'MRR uses the full candidate ranking (pool order before the topK cut-off), per spec 7.2.',
    'C7: the rewrite modifier was skipped as instructed; C7 numbers are identical to C3 (dense k5) by construction.',
  ],
  questions_total: gold.length,
  questions_answerable: answerable.length,
  candidates: results,
  challenger_pick: { id: pick, ...results[pick], rule: 'highest hitRate, tie-break MRR, among C1-C7 (C0 baseline excluded)' },
};
fs.writeFileSync(path.join(ROOT, 'data', 'eval', 'retrieval-results.json'), JSON.stringify(out, null, 2));
console.log('challenger pick:', pick);
