import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { db } from "@/lib/db/client";
import { questions, feedback, participants, eventsOutbox } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { COOKIE_NAME, decodeCookie, trafficOf } from "@/lib/privacy/cookie";
import { hit } from "@/lib/privacy/rate-limit";

export const runtime = "nodejs";
const schema = z.object({
  questionId: z.string().uuid(),
  value: z.enum(["helpful", "not_helpful"]),
  reason: z.string().max(60).optional(),
  note: z.string().max(200).optional(),
});
export async function POST(req: NextRequest) {
  const store = await cookies();
  const pid = decodeCookie(store.get(COOKIE_NAME)?.value);
  if (!pid) return Response.json({ code: "invalid_input", message: "No participant cookie." }, { status: 400 });
  let body: z.infer<typeof schema>;
  try { body = schema.parse(await req.json()); } catch { return Response.json({ code: "invalid_input", message: "Invalid feedback." }, { status: 400 }); }
  const rl = hit(`fb:${pid}`, 60, 3600_000);
  if (!rl.ok) return Response.json({ code: "rate_limited", message: "Too many feedback actions." }, { status: 429 });
  const d = db(); if (!d) return Response.json({ ok: true });
  const qrows = await d.select().from(questions).where(eq(questions.id, body.questionId));
  const q = qrows[0];
  if (!q || q.participantId !== pid) return Response.json({ code: "invalid_input", message: "Question not found for this participant." }, { status: 400 });
  // Minimum answer-view time: 1 second after the answer completed (3.8).
  const completedAt = new Date(q.askedAt).getTime() + (q.totalMs || 0);
  if (Date.now() - completedAt < 1000) return Response.json({ code: "bot_suspected", message: "We could not process this request." }, { status: 403 });
  await d.insert(feedback).values({
    questionId: body.questionId, participantId: pid, value: body.value, reason: body.reason, note: body.note,
  }).onConflictDoUpdate({ target: feedback.questionId, set: { value: body.value, reason: body.reason, note: body.note } });
  // Conversion: first "Helpful" per exposed participant (3.3).
  if (body.value === "helpful") {
    const prow = await d.select().from(participants).where(eq(participants.id, pid));
    const p = prow[0];
    if (p && p.firstExposedAt && !p.convertedAt && p.variantSource === "flagsmith") {
      await d.update(participants).set({ convertedAt: new Date() }).where(eq(participants.id, pid));
      await d.insert(eventsOutbox).values({
        type: "conversion", participantId: pid,
        payload: { traits: { traffic_type: trafficOf(pid), surface: p.surface || "web" } },
      });
    }
  }
  return Response.json({ ok: true });
}
