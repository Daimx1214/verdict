import Flagsmith from "@flagsmith/flagsmith";
// Server-side Flagsmith access. The browser never talks to Flagsmith (Section 4.1),
// so only the server-side key is used and it never leaves the server.
// A fresh SDK instance is created per identity: the JS SDK holds one identity at a
// time, and the docs (Run an Experiment) accept server-side keys for events.
export interface FsApi {
  init: (o: Record<string, unknown>) => Promise<void>;
  identify: (id: string, traits?: Record<string, string | number | boolean>) => Promise<unknown>;
  getAllFlags: () => Record<string, { value: unknown; enabled: boolean; variant?: string; experiment?: { inExperiment?: boolean } }>;
  trackExposureEvent: (flag: string, o: { value: string }) => void;
  trackEvent: (name: string) => void;
  flushEvents: () => Promise<void>;
}
export interface FsInstance { api: FsApi; participantId: string }
export async function createInstance(participantId: string, traits: Record<string, string | number | boolean>): Promise<FsInstance | null> {
  const key = process.env.FLAGSMITH_SERVER_KEY;
  if (!key) return null;
  const Ctor = (Flagsmith as unknown as { constructor: new () => FsApi }).constructor;
  const api = new Ctor();
  await api.init({
    environmentID: key,
    enableEvents: true,
    cacheOptions: { skipAPI: false, ttl: 0 },
    defaultFlagHandler: () => ({ enabled: false, value: undefined, isDefault: true }),
  });
  await api.identify(participantId, traits);
  return { api, participantId };
}
