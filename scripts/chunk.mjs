// Chunk the cleaned corpus: split on headings, then paragraphs.
// Target 200-350 tokens (approx tokens = words * 1.3), 40-token overlap
// inside a section, never split inside a fenced code block.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CORPUS = path.join(ROOT, 'data', 'corpus');
const OUTDIR = path.join(ROOT, 'data', 'index');

const TARGET_MIN = 200, TARGET_MAX = 350, FLUSH_AT = 280;
const OVERLAP_TOKENS = 40;
const estTokens = text => Math.round(text.split(/\s+/).filter(Boolean).length * 1.3);
const overlapWords = Math.round(OVERLAP_TOKENS / 1.3); // ~31 words

function slugify(text, seen) {
  let s = text.toLowerCase().trim()
    .replace(/[^\p{L}\p{N} _-]/gu, '')
    .replace(/\s+/g, '-');
  if (seen.has(s)) { let i = 1; while (seen.has(`${s}-${i}`)) i++; s = `${s}-${i}`; }
  seen.add(s);
  return s;
}

// Split one page into sections: [{headingPath:[..], anchor, blocks:[{text, code}]}]
function parseSections(md) {
  const lines = md.split('\n');
  const sections = [];
  let stack = []; // [{depth, text, anchor}]
  let blocks = [];
  let cur = [];
  let inFence = false;
  let fenceBuf = [];
  const seenSlugs = new Set();
  let anchor = null;

  const flushPara = () => {
    const t = cur.join('\n').trim();
    if (t) blocks.push({ text: t, code: false });
    cur = [];
  };
  const flushSection = () => {
    flushPara();
    if (blocks.length) sections.push({ headingPath: stack.map(s => s.text), anchor, blocks });
    blocks = [];
  };

  for (const line of lines) {
    if (/^\s*```/.test(line)) {
      if (!inFence) { flushPara(); inFence = true; fenceBuf = [line]; }
      else { fenceBuf.push(line); blocks.push({ text: fenceBuf.join('\n'), code: true }); inFence = false; fenceBuf = []; }
      continue;
    }
    if (inFence) { fenceBuf.push(line); continue; }
    const h = line.match(/^(#{1,6})\s+(.+)$/);
    if (h) {
      flushSection();
      const depth = h[1].length;
      const text = h[2].replace(/\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/[*_`]/g, '').trim();
      anchor = slugify(text, seenSlugs);
      stack = stack.filter(s => s.depth < depth);
      stack.push({ depth, text, anchor });
      continue;
    }
    if (line.trim() === '') { flushPara(); continue; }
    cur.push(line);
  }
  if (inFence && fenceBuf.length) blocks.push({ text: fenceBuf.join('\n'), code: true });
  flushSection();
  return sections;
}

function cleanText(t) {
  return t
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1') // links -> text
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// Split an oversized non-code block by words into <=TARGET_MAX pieces.
function splitBigBlock(text) {
  const words = text.split(/\s+/);
  const per = Math.floor(TARGET_MAX / 1.3);
  const parts = [];
  for (let i = 0; i < words.length; i += per) parts.push(words.slice(i, i + per).join(' '));
  return parts;
}

const manifest = JSON.parse(fs.readFileSync(path.join(CORPUS, 'MANIFEST.json'), 'utf8'));
const chunks = [];
let seq = 0;

for (const file of manifest.files) {
  const md = fs.readFileSync(path.join(CORPUS, file.corpus_path), 'utf8');
  const sections = parseSections(md);
  // Flatten the page into blocks tagged with heading path/anchor. Headings are
  // the preferred split points, but small adjacent sections on the same page
  // are merged so chunks can reach the 200-350 token target; a chunk's
  // headingPath/url come from its first block.
  const blocks = [];
  for (const sec of sections) {
    for (const b of sec.blocks) {
      if (!b.code && estTokens(b.text) > TARGET_MAX) {
        for (const p of splitBigBlock(b.text)) blocks.push({ text: p, code: false, headingPath: sec.headingPath, anchor: sec.anchor });
      } else blocks.push({ ...b, headingPath: sec.headingPath, anchor: sec.anchor });
    }
  }
  let curTexts = [];
  let curTokens = 0;
  let curHead = null;
  const flush = () => {
    if (!curTexts.length) return null;
    const text = cleanText(curTexts.join('\n\n'));
    const chunk = {
      id: `c${String(++seq).padStart(4, '0')}`,
      pageTitle: file.title,
      headingPath: curHead ? curHead.headingPath : [],
      url: curHead && curHead.anchor ? `${file.url}#${curHead.anchor}` : file.url,
      text,
      tokenCount: estTokens(text),
    };
    chunks.push(chunk);
    curTexts = []; curTokens = 0; curHead = null;
    return chunk;
  };
  blocks.forEach((b, bi) => {
    const bt = estTokens(b.text);
    const moreBlocks = bi < blocks.length - 1;
    const seedOverlap = done => {
      if (done && moreBlocks) {
        const tail = done.text.split(/\s+/).slice(-overlapWords).join(' ');
        curTexts = [tail]; curTokens = estTokens(tail);
        curHead = { headingPath: b.headingPath, anchor: b.anchor };
      }
    };
    const headingBoundary = curHead && b.anchor !== curHead.anchor;
    if (curTokens > 0 && (curTokens + bt > TARGET_MAX || (headingBoundary && curTokens >= TARGET_MIN))) {
      seedOverlap(flush());
    }
    if (!curHead) curHead = { headingPath: b.headingPath, anchor: b.anchor };
    curTexts.push(b.text); curTokens += bt;
    if (curTokens >= FLUSH_AT) seedOverlap(flush());
  });
  flush();
}

fs.mkdirSync(OUTDIR, { recursive: true });
fs.writeFileSync(path.join(OUTDIR, 'chunks.json'), JSON.stringify(chunks, null, 1));
const counts = chunks.map(c => c.tokenCount).sort((a, b) => a - b);
console.log(`chunks=${chunks.length} tokens min=${counts[0]} median=${counts[Math.floor(counts.length / 2)]} max=${counts[counts.length - 1]}`);
