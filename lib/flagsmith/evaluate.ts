import { evalIdentityFlags } from "./client";
import { parseConfig, CONTROL_CONFIG, type RetrievalConfig } from "./config-schema";
// Request-time evaluation with fallback + circuit breaker (Sections 4.4, 4.5).
// Evaluation uses the plain identity flag call, which records NOTHING. Exposure
// is recorded separately through the events outbox once an answer is actually
// shown (3.3, 8.4).
let consecutiveFailures = 0;
let breakerOpenUntil = 0;
export interface Evaluation {
  config: RetrievalConfig;
  source: "flagsmith" | "fallback";
  assistantEnabled: boolean;
  assistantMessage: string;
  variantKey: string | null; // 'control' | 'challenger' | null
}
const FALLBACK: Evaluation = { config: CONTROL_CONFIG, source: "fallback", assistantEnabled: true, assistantMessage: "", variantKey: null };

export async function evaluateFor(participantId: string, traits: Record<string, string>): Promise<Evaluation> {
  if (Date.now() < breakerOpenUntil) return FALLBACK;
  const timeout = new Promise<null>((r) => setTimeout(() => r(null), 800));
  try {
    const work = (async (): Promise<Evaluation> => {
      const flags = await evalIdentityFlags(participantId, traits);
      if (!flags) return FALLBACK;
      const kill = flags["assistant_enabled"];
      const assistantEnabled = kill ? !!kill.enabled : true;
      const assistantMessage = "We are making a change and will be back shortly.";
      const flag = flags["retrieval_strategy"];
      if (!flag) return { ...FALLBACK, assistantEnabled, assistantMessage };
      const cfg = parseConfig(flag.value);
      if (!cfg) return { ...FALLBACK, assistantEnabled, assistantMessage };
      const inExp = flag.inExperiment !== false;
      return {
        config: cfg,
        source: "flagsmith",
        assistantEnabled,
        assistantMessage,
        variantKey: inExp ? (flag.variant || (cfg.id === CONTROL_CONFIG.id ? "control" : "challenger")) : null,
      };
    })();
    const result = await Promise.race([work, timeout]);
    if (result === null) throw new Error("flagsmith timeout");
    consecutiveFailures = 0;
    return result;
  } catch {
    consecutiveFailures++;
    if (consecutiveFailures >= 5) { breakerOpenUntil = Date.now() + 30000; consecutiveFailures = 0; }
    return FALLBACK;
  }
}

export async function evaluateDefault(): Promise<{ config: RetrievalConfig | null; raw: string | null }> {
  try {
    const flags = await evalIdentityFlags(`probe-${Date.now()}`, { traffic_type: "probe", surface: "web" });
    if (!flags) return { config: null, raw: null };
    const flag = flags["retrieval_strategy"];
    if (!flag) return { config: null, raw: null };
    return { config: parseConfig(flag.value), raw: typeof flag.value === "string" ? flag.value : JSON.stringify(flag.value) };
  } catch {
    return { config: null, raw: null };
  }
}
