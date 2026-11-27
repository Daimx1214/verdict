import { createInstance } from "./client";
// The ONLY module that calls the Flagsmith event API (Section 3.3 VERIFY note).
// Exposure: manual trackExposureEvent at the point the answer is shown.
// Conversion: trackEvent('answer_helpful'). Both are delivered from the outbox.
export async function recordExposure(participantId: string, variantKey: string, traits: Record<string, string>): Promise<void> {
  const inst = await createInstance(participantId, traits);
  if (!inst) throw new Error("flagsmith unavailable");
  const api = inst.api;
  api.trackExposureEvent("retrieval_strategy", { value: variantKey });
  await api.flushEvents();
}
export async function recordConversion(participantId: string, traits: Record<string, string>): Promise<void> {
  const inst = await createInstance(participantId, traits);
  if (!inst) throw new Error("flagsmith unavailable");
  const api = inst.api;
  api.trackEvent("answer_helpful");
  await api.flushEvents();
}
