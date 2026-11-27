import { fsClient } from "./client";
// The ONLY module that calls the Flagsmith event API (Section 3.3 VERIFY note).
// Exposure: manual trackExposureEvent at the point the answer is shown.
// Conversion: trackEvent('answer_helpful'). Both are delivered from the outbox
// and flushed immediately (serverless processes cannot rely on the SDK's
// 10-second batch timer).
export async function recordExposure(participantId: string, variantKey: string, traits: Record<string, string>): Promise<void> {
  const c = fsClient();
  if (!c) throw new Error("flagsmith unavailable");
  c.trackExposureEvent("retrieval_strategy", { identifier: participantId, value: variantKey, traits });
  await c.flushEvents();
}
export async function recordConversion(participantId: string, traits: Record<string, string>): Promise<void> {
  const c = fsClient();
  if (!c) throw new Error("flagsmith unavailable");
  c.trackEvent("answer_helpful", { identifier: participantId, traits });
  await c.flushEvents();
}
