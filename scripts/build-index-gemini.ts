// Builds a Gemini-embedding variant of the index (vectors-gemini.bin) for
// serverless deployment, where the local MiniLM model cannot be bundled.
// Same chunks, same corpus hash, same dimension (384); only the embedding
// backend differs. Selected at runtime with EMBED_BACKEND=gemini.
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
const ROOT = process.cwd();
const BASE = process.env.LLM_BASE_URL || "https://generativelanguage.googleapis.com/v1beta/openai";
const KEY = process.env.LLM_API_KEY || "";
const MODEL = process.env.EMBED_MODEL || "gemini-embedding-001";
const DIM = 384;
interface Chunk { id: string; pageTitle: string; headingPath: string[]; text: string }
async function embedBatch(texts: string[]): Promise<number[][]> {
  for (let attempt = 0; attempt < 8; attempt++) {
    const res = await fetch(`${BASE}/embeddings`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${KEY}` },
      body: JSON.stringify({ model: MODEL, input: texts, dimensions: DIM }),
    });
    if (res.ok) {
      const json = await res.json();
      return (json.data as { embedding: number[] }[]).map((d) => d.embedding);
    }
    await new Promise((r) => setTimeout(r, Math.min(30000, 3000 * (attempt + 1))));
  }
  throw new Error("embedding batch failed after retries");
}
async function main() {
  if (!KEY) throw new Error("LLM_API_KEY missing");
  const chunks = JSON.parse(readFileSync(join(ROOT, "data/index/chunks.json"), "utf8")) as Chunk[];
  const meta = JSON.parse(readFileSync(join(ROOT, "data/index/vectors-meta.json"), "utf8"));
  const out = new Float32Array(chunks.length * DIM);
  const B = 50;
  for (let i = 0; i < chunks.length; i += B) {
    const slice = chunks.slice(i, i + B);
    const texts = slice.map((c) => `${c.pageTitle} ${(c.headingPath || []).join(" ")} ${c.text}`.slice(0, 8000));
    const vecs = await embedBatch(texts);
    vecs.forEach((v, j) => {
      let n = 0; for (const x of v) n += x * x; n = Math.sqrt(n) || 1;
      for (let d = 0; d < DIM; d++) out[(i + j) * DIM + d] = v[d] / n;
    });
    console.log(`embedded ${Math.min(i + B, chunks.length)}/${chunks.length}`);
  }
  writeFileSync(join(ROOT, "data/index/vectors-gemini.bin"), Buffer.from(out.buffer));
  writeFileSync(join(ROOT, "data/index/vectors-gemini-meta.json"), JSON.stringify({ model: MODEL, quantized: false, dim: DIM, count: chunks.length, corpus_hash: meta.corpus_hash }, null, 1));
  console.log("wrote vectors-gemini.bin + vectors-gemini-meta.json");
}
main().catch((e) => { console.error(e); process.exit(1); });
