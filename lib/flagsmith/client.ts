import { Flagsmith } from "@flagsmith/nodejs";
// Server-side Flagsmith access via the official Node.js SDK (@flagsmith/nodejs,
// the events-capable server SDK per the Flagsmith experimentation docs). The
// browser never talks to Flagsmith (Section 4.1); only the server-side key is
// used and it never leaves the server. One singleton client with local
// evaluation: the environment document is fetched once and refreshed in the
// background, so per-request identity evaluation is local and fast.
let client: Flagsmith | null = null;
export function fsClient(): Flagsmith | null {
  const key = process.env.FLAGSMITH_SERVER_KEY;
  if (!key) return null;
  if (!client) {
    client = new Flagsmith({
      environmentKey: key,
      enableEvents: true,
      enableLocalEvaluation: true,
      environmentRefreshIntervalSeconds: 60,
    });
  }
  return client;
}
export interface EvaluatedFlag {
  value: unknown;
  enabled: boolean;
  variant?: string;
  inExperiment?: boolean;
}
// Evaluate both app flags for one identity (records nothing; exposures are
// recorded separately at the point of display, per the docs).
export async function evalIdentityFlags(
  participantId: string,
  traits: Record<string, string>,
): Promise<Record<string, EvaluatedFlag> | null> {
  const c = fsClient();
  if (!c) return null;
  const flags = await c.getIdentityFlags(participantId, traits);
  const out: Record<string, EvaluatedFlag> = {};
  for (const name of ["retrieval_strategy", "assistant_enabled"]) {
    const f = flags.getFlag(name) as { value: unknown; enabled: boolean; variant?: string; experiment?: { inExperiment?: boolean } };
    out[name] = { value: f.value, enabled: f.enabled, variant: f.variant, inExperiment: f.experiment?.inExperiment };
  }
  return out;
}
// Warm the environment document at process start so the first real request
// does not pay the fetch (called from instrumentation register()).
export async function warmFlagsmith(): Promise<void> {
  try {
    const c = fsClient();
    if (c) await c.getEnvironmentFlags();
  } catch { /* evaluation falls back per-request if this fails */ }
}
