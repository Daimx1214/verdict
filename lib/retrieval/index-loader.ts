import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { BM25Index } from "./bm25";
import type { Chunk } from "./types";
// In-memory index loaded at boot from data/index (Section 5.1). Refuses to serve
// if the corpus hash in the manifest and the vectors meta disagree (6.3).
export interface LoadedIndex {
  chunks: Chunk[];
  bm25: BM25Index;
  vectors: Float32Array;
  dim: number;
  corpusHash: string;
  embeddingModel: string;
}
let cached: LoadedIndex | null = null;
export function loadIndex(): LoadedIndex {
  if (cached) return cached;
  const base = join(process.cwd(), "data", "index");
  const chunks = JSON.parse(readFileSync(join(base, "chunks.json"), "utf8")) as Chunk[];
  const meta = JSON.parse(readFileSync(join(base, "vectors-meta.json"), "utf8"));
  const manifest = JSON.parse(readFileSync(join(process.cwd(), "data", "corpus", "MANIFEST.json"), "utf8"));
  const corpusHash: string = meta.corpus_hash || meta.corpusHash;
  if (manifest.corpus_hash && corpusHash && manifest.corpus_hash !== corpusHash) {
    throw new Error("corpus/index hash mismatch");
  }
  const buf = readFileSync(join(base, "vectors.bin"));
  const vectors = new Float32Array(buf.buffer, buf.byteOffset, buf.byteLength / 4);
  const bm25 = new BM25Index(chunks.map((c) => ({ id: c.id, text: `${c.pageTitle} ${c.headingPath} ${c.text}` })));
  cached = { chunks, bm25, vectors, dim: meta.dim, corpusHash, embeddingModel: meta.model };
  return cached;
}
export function indexExists(): boolean {
  return existsSync(join(process.cwd(), "data", "index", "chunks.json"));
}
