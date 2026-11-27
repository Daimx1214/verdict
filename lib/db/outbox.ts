import { db } from "./client";
import { eventsOutbox } from "./schema";
import { recordExposure, recordConversion } from "../flagsmith/events";
import { and, isNull, lte, lt, eq } from "drizzle-orm";
// Event delivery (Section 8.4): database outbox, retries with exponential
// backoff, max 12 attempts. On a long-running server a 5s loop flushes it; on
// serverless hosts the loop cannot persist, so request handlers also call
// flushOutboxOnce() opportunistically (feedback flushes its own conversion).
export async function flushOutboxOnce(): Promise<void> {
  try {
    const d = db(); if (!d) return;
    const rows = await d.select().from(eventsOutbox)
      .where(and(isNull(eventsOutbox.sentAt), lte(eventsOutbox.nextAttemptAt, new Date()), lt(eventsOutbox.attempts, 12)))
      .limit(20);
    for (const row of rows) {
      try {
        const payload = (row.payload || {}) as { variantKey?: string; traits?: Record<string, string> };
        if (row.type === "exposure") await recordExposure(row.participantId, payload.variantKey || "control", payload.traits || {});
        else await recordConversion(row.participantId, payload.traits || {});
        await d.update(eventsOutbox).set({ sentAt: new Date() }).where(eq(eventsOutbox.id, row.id));
      } catch (e) {
        const attempts = row.attempts + 1;
        const backoffMs = Math.min(3600_000, 1000 * 2 ** attempts);
        await d.update(eventsOutbox)
          .set({ attempts, lastError: e instanceof Error ? e.message.slice(0, 300) : "error", nextAttemptAt: new Date(Date.now() + backoffMs) })
          .where(eq(eventsOutbox.id, row.id));
      }
    }
  } catch { /* db down: try again later */ }
}
let running = false;
export function startOutboxLoop() {
  if (running) return; running = true;
  const tick = async () => {
    await flushOutboxOnce();
    setTimeout(tick, 5000).unref?.();
  };
  tick();
}
