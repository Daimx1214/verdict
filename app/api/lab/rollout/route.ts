import { db } from "@/lib/db/client";
import { decisions } from "@/lib/db/schema";
import { evaluateDefault } from "@/lib/flagsmith/evaluate";
export const runtime = "nodejs"; export const dynamic = "force-dynamic";
const startedAt = (globalThis as unknown as { __vd_startedAt?: number }).__vd_startedAt || Date.now();
export async function GET() {
  const d = db();
  const ds = d ? await d.select().from(decisions).catch(() => []) : [];
  const served = await evaluateDefault();
  return Response.json({
    decisions: ds,
    served: { config: served.config, raw: served.raw },
    build: process.env.BUILD_ID || "dev",
    processStartedAt: new Date(startedAt).toISOString(),
    uptimeSeconds: Math.floor((Date.now() - startedAt) / 1000),
  });
}
