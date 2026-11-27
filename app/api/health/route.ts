import { db } from "@/lib/db/client";
import { sql } from "drizzle-orm";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const startedAt = (globalThis as unknown as { __vd_startedAt?: number }).__vd_startedAt || Date.now();
export async function GET() {
  let dbOk = false;
  const d = db();
  if (d) { try { await d.execute(sql`select 1`); dbOk = true; } catch { dbOk = false; } }
  return Response.json({
    build: process.env.BUILD_ID || "dev",
    uptimeSeconds: Math.floor((Date.now() - startedAt) / 1000),
    processStartedAt: new Date(startedAt).toISOString(),
    database: dbOk ? "reachable" : "unreachable",
    flagsmith: process.env.FLAGSMITH_SERVER_KEY ? "configured" : "not configured",
  });
}
