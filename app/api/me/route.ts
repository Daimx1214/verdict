import { cookies } from "next/headers";
import { db } from "@/lib/db/client";
import { participants, questions, feedback } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { COOKIE_NAME, decodeCookie } from "@/lib/privacy/cookie";
export const runtime = "nodejs";
export async function GET() {
  const store = await cookies();
  const pid = decodeCookie(store.get(COOKIE_NAME)?.value);
  if (!pid) return Response.json({ participantId: null, questionsAsked: 0, hasData: false });
  const d = db(); if (!d) return Response.json({ participantId: pid.slice(0, 8), questionsAsked: 0, hasData: false });
  const qs = await d.select().from(questions).where(eq(questions.participantId, pid));
  return Response.json({ participantId: pid.slice(0, 8), questionsAsked: qs.length, hasData: qs.length > 0 });
}
export async function DELETE() {
  const store = await cookies();
  const pid = decodeCookie(store.get(COOKIE_NAME)?.value);
  if (!pid) return Response.json({ ok: true });
  const d = db();
  if (d) {
    await d.delete(feedback).where(eq(feedback.participantId, pid)).catch(() => {});
    await d.delete(questions).where(eq(questions.participantId, pid)).catch(() => {});
    // Participant row keeps only the anonymous ID and aggregate flags needed to
    // preserve experiment integrity (13.4); content is erased.
    await d.update(participants).set({ erasedAt: new Date() }).where(eq(participants.id, pid)).catch(() => {});
  }
  store.delete(COOKIE_NAME);
  return Response.json({ ok: true });
}
