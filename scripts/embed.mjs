// Embed every chunk with Xenova/all-MiniLM-L6-v2 (quantized) via @xenova/transformers.
// Indexing text = page title + heading path prefix + chunk text.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pipeline } from '@xenova/transformers';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const MODEL = 'Xenova/all-MiniLM-L6-v2';
export const indexText = c => `${c.pageTitle}\n${(c.headingPath || []).join(' > ')}\n${c.text}`;

const chunks = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'index', 'chunks.json'), 'utf8'));
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'corpus', 'MANIFEST.json'), 'utf8'));

const extractor = await pipeline('feature-extraction', MODEL, { quantized: true });
const BATCH = 16;
let dim = null;
const all = [];
for (let i = 0; i < chunks.length; i += BATCH) {
  const batch = chunks.slice(i, i + BATCH).map(indexText);
  const out = await extractor(batch, { pooling: 'mean', normalize: true });
  dim = out.dims[out.dims.length - 1];
  all.push(new Float32Array(out.data));
  if (i % (BATCH * 20) === 0) console.log(`embedded ${Math.min(i + BATCH, chunks.length)}/${chunks.length}`);
}
const buf = new Float32Array(chunks.length * dim);
all.forEach((a, j) => buf.set(a, j * a.length));
fs.writeFileSync(path.join(ROOT, 'data', 'index', 'vectors.bin'), Buffer.from(buf.buffer));
fs.writeFileSync(path.join(ROOT, 'data', 'index', 'vectors-meta.json'), JSON.stringify({
  model: MODEL, quantized: true, dim, count: chunks.length, corpus_hash: manifest.corpus_hash,
}, null, 2));
console.log(`vectors: count=${chunks.length} dim=${dim}`);
