// Query-time embeddings + cross-encoder rerank via transformers.js (Section 5.2).
// Same call shapes as the verified offline screening scripts.
type Extractor = (text: string, opts: { pooling: string; normalize: boolean }) => Promise<{ data: Float32Array }>;
let embedder: Extractor | null = null;
let embedderFailed = false;
export async function embedQuery(text: string): Promise<Float32Array | null> {
  if (embedderFailed) return null;
  try {
    if (!embedder) {
      const { pipeline, env } = await import("@xenova/transformers");
      env.cacheDir = process.env.TRANSFORMERS_CACHE || ".transformers-cache";
      embedder = (await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2", { quantized: true })) as unknown as Extractor;
    }
    const out = await embedder(text, { pooling: "mean", normalize: true });
    return out.data;
  } catch { embedderFailed = true; return null; }
}

interface CE { tok: unknown; model: unknown }
let ce: CE | null = null;
let ceFailed = false;
// Cross-encoder scores for (query, passage) pairs; null when unavailable, callers
// then use dense re-ranking behind the same interface (Section 5.2).
export async function rerankScores(query: string, passages: string[]): Promise<Float32Array | null> {
  if (ceFailed) return null;
  try {
    if (!ce) {
      const { AutoTokenizer, AutoModelForSequenceClassification, env } = await import("@xenova/transformers");
      env.cacheDir = process.env.TRANSFORMERS_CACHE || ".transformers-cache";
      const tok = await AutoTokenizer.from_pretrained("Xenova/ms-marco-MiniLM-L-6-v2");
      const model = await AutoModelForSequenceClassification.from_pretrained("Xenova/ms-marco-MiniLM-L-6-v2", { quantized: true });
      ce = { tok, model };
    }
    const tok = ce.tok as (q: string, o: { text_pair: string; padding: boolean; truncation: boolean }) => Promise<unknown>;
    const model = ce.model as (inputs: unknown) => Promise<{ logits: { data: Float32Array } }>;
    const scores = new Float32Array(passages.length);
    for (let i = 0; i < passages.length; i++) {
      const inputs = await tok(query, { text_pair: passages[i].slice(0, 1200), padding: true, truncation: true });
      const out = await model(inputs);
      scores[i] = out.logits.data[0];
    }
    return scores;
  } catch { ceFailed = true; return null; }
}
