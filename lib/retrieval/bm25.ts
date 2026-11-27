// @ts-nocheck - standalone BM25 module (Specification 6.3), behaviour covered by unit tests.
// Standalone BM25 module (k1=1.2, b=0.75) with lowercase tokenisation,
// simple stopword removal and light suffix stemming. No dependencies.
export const STOPWORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'of', 'to', 'in', 'on', 'for', 'with', 'by',
  'at', 'from', 'is', 'are', 'was', 'were', 'be', 'been', 'it', 'its', 'this',
  'that', 'these', 'those', 'as', 'if', 'then', 'than', 'so', 'such', 'into',
  'over', 'under', 'you', 'your', 'we', 'our', 'they', 'their', 'can', 'will',
  'would', 'should', 'do', 'does', 'did', 'have', 'has', 'had', 'not', 'no',
  'yes', 'when', 'where', 'which', 'who', 'what', 'how', 'all', 'any', 'each',
]);

export function stem(word: string): string {
  let w = word;
  if (w.length > 4 && w.endsWith('ies')) w = w.slice(0, -3) + 'y';
  else if (w.length > 5 && w.endsWith('ing')) w = w.slice(0, -3);
  else if (w.length > 4 && w.endsWith('ed')) w = w.slice(0, -2);
  else if (w.length > 4 && w.endsWith('es')) w = w.slice(0, -2);
  else if (w.length > 3 && w.endsWith('s') && !w.endsWith('ss')) w = w.slice(0, -1);
  if (w.length > 4 && w.endsWith('ly')) w = w.slice(0, -2);
  // undouble trailing consonant left by ing/ed stripping (runn -> run)
  if (w.length > 3 && /([bcdfghjklmnpqrtvwz])\1$/.test(w)) w = w.slice(0, -1);
  return w;
}

export function tokenize(text: string): string[] {
  const raw = String(text).toLowerCase().match(/[a-z0-9][a-z0-9._-]*/g) || [];
  const out = [];
  for (const t of raw) {
    const w = t.replace(/[._-]+$/g, '');
    if (w.length < 2) continue;
    if (STOPWORDS.has(w)) continue;
    out.push(stem(w));
  }
  return out;
}

export class BM25Index {
  constructor(docs, { k1 = 1.2, b = 0.75 } = {}) {
    this.k1 = k1;
    this.b = b;
    this.ids = [];
    this.docLen = [];
    this.tf = []; // per-doc Map term -> freq
    const df = new Map();
    docs.forEach((d, i) => {
      this.ids.push(d.id);
      const toks = tokenize(d.text);
      this.docLen.push(toks.length);
      const m = new Map();
      for (const t of toks) m.set(t, (m.get(t) || 0) + 1);
      this.tf.push(m);
      for (const t of m.keys()) df.set(t, (df.get(t) || 0) + 1);
    });
    this.N = docs.length;
    this.avgdl = this.docLen.reduce((a, x) => a + x, 0) / Math.max(1, this.N);
    this.idf = new Map();
    for (const [t, n] of df) {
      this.idf.set(t, Math.log(1 + (this.N - n + 0.5) / (n + 0.5)));
    }
  }

  // Returns full ranking: [{id, score}] sorted desc.
  search(query) {
    const q = [...new Set(tokenize(query))];
    const scores = new Float64Array(this.N);
    for (const t of q) {
      const idf = this.idf.get(t);
      if (idf === undefined) continue;
      for (let i = 0; i < this.N; i++) {
        const f = this.tf[i].get(t);
        if (!f) continue;
        const denom = f + this.k1 * (1 - this.b + (this.b * this.docLen[i]) / this.avgdl);
        scores[i] += (idf * (f * (this.k1 + 1))) / denom;
      }
    }
    const ranked = [];
    for (let i = 0; i < this.N; i++) if (scores[i] > 0) ranked.push({ id: this.ids[i], score: scores[i] });
    ranked.sort((a, b) => b.score - a.score);
    return ranked;
  }
}
