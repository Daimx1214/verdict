import { NextRequest } from "next/server";
import { z } from "zod";
import { evaluateFor } from "@/lib/flagsmith/evaluate";
import { answerFull } from "@/lib/answer/full";
import { hit, ipHash } from "@/lib/privacy/rate-limit";
import { randomUUID } from "crypto";
// Probe (8.3): one answer through a throwaway probe identity. Never writes to the
// database, never sends events, never counted in the experiment.
export const runtime = "nodejs"; export const dynamic = "force-dynamic";
const schema = z.object({ question: z.string().min(3).max(500) });
export async function POST(req: NextRequest) {
  let body: z.infer<typeof schema>;
  try { body = schema.parse(await req.json()); } catch { return Response.json({ code: "invalid_input", message: "Invalid question." }, { status: 400 }); }
  const rl = hit(`probe:${ipHash(req)}`, 10, 3600_000);
  if (!rl.ok) return Response.json({ code: "rate_limited", message: "Probe limit reached." }, { status: 429 });
  const pid = `probe-${randomUUID()}`;
  const evaluation = await evaluateFor(pid, { traffic_type: "probe", surface: "web" });
  const { text } = await answerFull(body.question, evaluation.config);
  return Response.json({ answer: text, strategyId: evaluation.config.id, source: evaluation.source });
}
