// Ingest Flagsmith docs (Docusaurus markdown/mdx) into a clean corpus.
// Usage: node scripts/ingest.mjs [sourceDir]
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = process.argv[2] || process.env.DOCS_SRC || '../flagsmith/docs/docs';
const OUT = path.join(ROOT, 'data', 'corpus');
const BASE_URL = 'https://docs.flagsmith.com/';

function walk(dir, acc = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, acc);
    else if (/\.mdx?$/.test(e.name)) acc.push(p);
  }
  return acc;
}

function parseFrontMatter(raw) {
  if (!raw.startsWith('---')) return { fm: {}, body: raw };
  const end = raw.indexOf('\n---', 3);
  if (end === -1) return { fm: {}, body: raw };
  const fmText = raw.slice(3, end);
  const body = raw.slice(end + 4).replace(/^\r?\n/, '');
  const fm = {};
  for (const line of fmText.split('\n')) {
    const m = line.match(/^([A-Za-z_]+):\s*(.+)$/);
    if (m) fm[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
  }
  return { fm, body };
}

function cleanMarkdown(body) {
  const lines = body.split('\n');
  const out = [];
  let inFence = false;
  for (let line of lines) {
    if (/^\s*```/.test(line)) { inFence = !inFence; out.push(line); continue; }
    if (inFence) { out.push(line); continue; }
    // imports / exports (MDX)
    if (/^\s*(import|export)\s/.test(line)) continue;
    // Docusaurus admonition fences :::tip etc - drop marker lines, keep content
    if (/^\s*:::\s*\w*\s*$/.test(line) || /^\s*:::\w+/.test(line)) continue;
    // images -> alt text
    line = line.replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1');
    // JSX / HTML tags: drop the tags, keep inner text
    line = line.replace(/<\/?[A-Za-z][A-Za-z0-9.-]*(\s[^<>]*)?\/?>/g, '');
    out.push(line);
  }
  // collapse 3+ blank lines
  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n';
}

function humanize(name) {
  return name.replace(/[-_]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

const files = walk(SRC);
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

const entries = [];
for (const srcPath of files) {
  const rel = path.relative(SRC, srcPath);
  const raw = fs.readFileSync(srcPath, 'utf8');
  const { fm, body } = parseFrontMatter(raw);
  const cleaned = cleanMarkdown(body);

  let title = fm.title || null;
  if (!title) {
    const h1 = cleaned.match(/^#\s+(.+)$/m);
    title = h1 ? h1[1].trim() : humanize(path.basename(rel).replace(/\.mdx?$/, ''));
  }

  // canonical URL from file path; index files map to their folder
  const noExt = rel.replace(/\.mdx?$/, '');
  const segs = noExt.split(path.sep);
  if (segs[segs.length - 1] === 'index') segs.pop();
  const url = BASE_URL + segs.join('/');

  const corpusRel = noExt + '.md';
  const dest = path.join(OUT, corpusRel);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, cleaned);

  const sha256 = crypto.createHash('sha256').update(cleaned).digest('hex');
  entries.push({
    source_path: rel.split(path.sep).join('/'),
    corpus_path: corpusRel.split(path.sep).join('/'),
    title,
    url,
    sha256,
    bytes: Buffer.byteLength(cleaned),
  });
}

entries.sort((a, b) => a.sha256.localeCompare(b.sha256));
const corpus_hash = crypto.createHash('sha256')
  .update(entries.map(e => e.sha256).join('\n'))
  .digest('hex');
entries.sort((a, b) => a.corpus_path.localeCompare(b.corpus_path));

const manifest = {
  generated_at: new Date().toISOString(),
  source: 'github.com/Flagsmith/flagsmith docs/docs (BSD-3-Clause)',
  file_count: entries.length,
  corpus_hash,
  files: entries,
};
fs.writeFileSync(path.join(OUT, 'MANIFEST.json'), JSON.stringify(manifest, null, 2));
console.log(`ingested ${entries.length} pages, corpus_hash=${corpus_hash}`);
