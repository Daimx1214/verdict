import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { db } from "@/lib/db/client";
import { participants, questions, eventsOutbox, dailySpend } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { COOKIE_NAME, decodeCookie, encodeCookie, newParticipantId, trafficOf } from "@/lib/privacy/cookie";
import { hit, ipHash } from "@/lib/privacy/rate-limit";
import { evaluateFor } from "@/lib/flagsmith/evaluate";
import { retrieve } from "@/lib/retrieval/strategies";
import { NO_ANSWER } from "@/lib/answer/prompt";
import { answerWithCompletion } from "@/lib/answer/complete";
import { randomUUID } from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  question: z.string().min(3).max(500),
  surface: z.enum(["web", "embed"]).optional().default("web"),
  hp: z.string().optional().default(""),
  simId: z.string().optional(),
});

function err(status: number, code: string, message: string) {
  return Response.json({ code, message }, { status });
}

export async function POST(req: NextRequest) {
  let body: z.infer<typeof bodySchema>;
  try { body = bodySchema.parse(await req.json()); }
  catch { return err(400, "invalid_input", "Please enter a question between 3 and 500 characters."); }
  if (body.hp) return err(403, "bot_suspected", "We could not process this request.");

  const store = await cookies();
  // Simulated traffic (Section 15): only with the admin token, only sim- IDs.
  const simOk = !!process.env.ADMIN_TOKEN && req.headers.get("x-admin-token") === process.env.ADMIN_TOKEN && !!body.simId?.startsWith("sim-");
  let pid = simOk ? body.simId! : decodeCookie(store.get(COOKIE_NAME)?.value);
  const d = db();
  let isNew = false;
  if (!pid) { pid = newParticipantId("real"); isNew = true; }
  const traffic = trafficOf(pid);

  // Rate limits (13.2): 20 questions/hour per participant, 60/hour per network hash.
  const rl1 = hit(`p:${pid}`, 20, 3600_000);
  if (!rl1.ok) return err(429, "rate_limited", `You have reached the question limit. Try again in ${rl1.retryMinutes} minutes.`);
  const rl2 = hit(`ip:${ipHash(req)}`, 60, 3600_000);
  if (!rl2.ok) return err(429, "rate_limited", `You have reached the question limit. Try again in ${rl2.retryMinutes} minutes.`);

  // Daily budget (13.2)
  const budget = Number(process.env.DAILY_BUDGET_USD || 5);
  if (d) {
    const day = new Date().toISOString().slice(0, 10);
    const rows = await d.select().from(dailySpend).where(eq(dailySpend.day, day));
    if (rows[0] && Number(rows[0].costUsd) >= budget) {
      return err(503, "budget_reached", "The assistant has reached today's capacity. It resets at 00:00 UTC.");
    }
  }

  if (d && isNew) {
    await d.insert(participants).values({ id: pid, trafficType: traffic, surface: body.surface }).onConflictDoNothing();
  } else if (d) {
    await d.insert(participants).values({ id: pid, trafficType: traffic, surface: body.surface }).onConflictDoNothing();
  }

  const traits = { traffic_type: traffic, surface: body.surface };
  const evaluation = await evaluateFor(pid, traits);
  if (!evaluation.assistantEnabled) {
    return err(503, "assistant_disabled", evaluation.assistantMessage);
  }

  const startedAt = Date.now();
  const encoder = new TextEncoder();
  const questionId = randomUUID();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      try {
        const retrieval = await retrieve(body.question, evaluation.config);
        const sources = retrieval.passages.map((p, i) => ({
          n: i + 1, title: p.chunk.pageTitle, headingPath: p.chunk.headingPath, url: p.chunk.url, text: p.chunk.text,
        }));
        send("meta", { sources, questionId });
        let full = "";
        let usage = { tokensIn: 0, tokensOut: 0, costUsd: 0 };
        try {
          // Buffered generation (completeness pass, 28 November 2026): the
          // finished, validated answer is emitted as deltas below, so the
          // client still renders progressively.
          const answered = await answerWithCompletion(body.question, retrieval.passages.map((p) => ({
            title: p.chunk.pageTitle, headingPath: p.chunk.headingPath, url: p.chunk.url, text: p.chunk.text,
          })));
          full = answered.text;
          usage = answered.usage;
        } catch {
          if (!full) {
            send("error", { code: "internal", message: "Something went wrong on our side. Your question was not counted." });
            if (d) await d.insert(questions).values({
              id: questionId, participantId: pid!, text: body.question, variant: evaluation.variantKey,
              config: evaluation.config, variantSource: evaluation.source, status: "error",
              totalMs: Date.now() - startedAt,
            }).catch(() => {});
            controller.close();
            return;
          }
        }
        // Citation validation (6.6): remove citations that do not exist.
        const maxN = sources.length;
        full = full.replace(/\[(\d+)\]/g, (m, n) => (Number(n) >= 1 && Number(n) <= maxN ? m : ""));
        // Leak guard (13.3): never emit system prompt fragments.
        if (full.includes("You answer questions about Flagsmith using only")) full = NO_ANSWER;
        // Emit the finished answer as deltas so the client renders it
        // progressively, as it did when generation streamed token by token.
        {
          let buf = "";
          for (const piece of full.split(/(?<=\s)/)) {
            buf += piece;
            if (buf.length >= 48) { send("delta", { text: buf }); buf = ""; }
          }
          if (buf) send("delta", { text: buf });
        }
        const declined = full.trim().startsWith(NO_ANSWER);
        const totalMs = Date.now() - startedAt;
        if (d) {
          await d.insert(questions).values({
            id: questionId, participantId: pid!, text: body.question, variant: evaluation.variantKey,
            config: evaluation.config, variantSource: evaluation.source,
            retrieved: retrieval.passages.map((p) => ({ chunk_id: p.chunk.id, rank: p.rank, score: p.score })),
            answer: full, declined, status: "ok", tokensIn: usage.tokensIn, tokensOut: usage.tokensOut,
            retrievalMs: retrieval.retrievalMs, totalMs, costUsd: String(usage.costUsd),
          }).catch(() => {});
          // Exposure: first shown answer for this participant, only when the
          // config truly came from Flagsmith (3.3). Written to the outbox in the
          // same request; delivery is retried by the background loop (8.4).
          const prow = await d.select().from(participants).where(eq(participants.id, pid!)).catch(() => []);
          const p = prow[0];
          if (p && !p.firstExposedAt && !p.botSuspected && evaluation.source === "flagsmith" && evaluation.variantKey) {
            await d.update(participants).set({
              firstExposedAt: new Date(), variant: evaluation.variantKey, variantSource: "flagsmith",
            }).where(eq(participants.id, pid!)).catch(() => {});
            await d.insert(eventsOutbox).values({
              type: "exposure", participantId: pid!,
              payload: { variantKey: evaluation.variantKey, traits },
            }).catch(() => {});
          }
          const day = new Date().toISOString().slice(0, 10);
          await d.insert(dailySpend).values({ day, costUsd: String(usage.costUsd), answers: 1 })
            .onConflictDoUpdate({ target: dailySpend.day, set: {
              costUsd: sql`${dailySpend.costUsd} + ${usage.costUsd}`, answers: sql`${dailySpend.answers} + 1` } }).catch(() => {});
        }
        send("done", { questionId, declined });
        controller.close();
      } catch {
        try { send("error", { code: "internal", message: "Something went wrong on our side. Your question was not counted." }); } catch {}
        controller.close();
      }
    },
  });

  const headers = new Headers({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
  });
  if (isNew || simOk) {
    headers.append("Set-Cookie", `${COOKIE_NAME}=${encodeCookie(pid)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=31536000${process.env.NODE_ENV === "production" ? "; Secure" : ""}`);
  }
  return new Response(stream, { headers });
}

