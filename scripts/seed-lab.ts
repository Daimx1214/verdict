// Applies the schema and seeds candidates + offline runs from data/eval/results.json.
// Uses Neon's HTTPS SQL endpoint so it works from any network. With --lock it also
// writes the locked decision record for the experiment start.
import { readFileSync } from "fs";
import { join } from "path";
async function sql(query: string, params: unknown[] = []) {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL missing");
  const host = url.replace(/postgresql:\/\/[^@]+@/, "").split("/")[0].replace("-pooler", "");
  const res = await fetch(`https://${host}/sql`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Neon-Connection-String": url },
    body: JSON.stringify({ query, params }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(JSON.stringify(json).slice(0, 300));
  return json;
}
async function main() {
  const sqlText = readFileSync(join(process.cwd(), "drizzle/0000_init.sql"), "utf8");
  for (const st of sqlText.split(";\n").map((s) => s.trim()).filter(Boolean)) await sql(st);
  console.log("schema applied");
  const results = JSON.parse(readFileSync(join(process.cwd(), "data/eval/results.json"), "utf8"));
  for (const c of results.candidates) {
    await sql(`INSERT INTO candidates (id, name, config, is_baseline) VALUES ($1,$2,$3,$4) ON CONFLICT (id) DO UPDATE SET name=$2, config=$3, is_baseline=$4`,
      [c.id, c.name, JSON.stringify(c.config), c.status === "baseline"]);
    await sql(`INSERT INTO offline_runs (candidate_id, corpus_hash, seed, hit_rate, mrr, correctness, faithfulness, decline_accuracy, retr_p50_ms, retr_p95_ms, cost_per_answer, composite, gates, status, reason, per_question) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)`,
      [c.id, results.corpusHash, results.seed, c.hitRate, c.mrr, c.correctness, c.faithfulness, c.declineAccuracy, Math.round(c.retrP50), Math.round(c.retrP95), c.costPerAnswer, c.composite, JSON.stringify(c.gates), c.status, c.reason || null, JSON.stringify(c.perQuestion || [])]);
  }
  console.log("candidates + offline runs seeded");
  if (process.argv.includes("--lock")) {
    const finalist = results.candidates.find((c: { status: string }) => c.status === "finalist");
    if (!finalist) { console.error("no finalist in results.json - cannot lock"); process.exit(1); }
    const control = { id: "bm25_k3", strategy: "bm25", topK: 3, rerank: false };
    await sql(`INSERT INTO decisions (phase, hypothesis, metric, control, challenger, corpus_hash, started_at) VALUES ('locked', $1, 'answer_helpful', $2, $3, $4, now())`,
      ["A retrieval pipeline chosen by offline screening makes more visitors mark an answer as helpful than the keyword baseline.", JSON.stringify(control), JSON.stringify(finalist.config), results.corpusHash]);
    console.log("decision record LOCKED with challenger", finalist.id, JSON.stringify(finalist.config));
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
