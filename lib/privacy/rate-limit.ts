import { createHash } from "crypto";
// In-memory rate limits (Section 13.2). Network addresses are never stored:
// only a salted hash, held in memory.
const buckets = new Map<string, { count: number; resetAt: number }>();
export function hit(key: string, limit: number, windowMs: number): { ok: boolean; retryMinutes: number } {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || now > b.resetAt) { buckets.set(key, { count: 1, resetAt: now + windowMs }); return { ok: true, retryMinutes: 0 }; }
  if (b.count >= limit) return { ok: false, retryMinutes: Math.max(1, Math.ceil((b.resetAt - now) / 60000)) };
  b.count++;
  return { ok: true, retryMinutes: 0 };
}
export function ipHash(req: Request): string {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  return createHash("sha256").update(ip + (process.env.IP_HASH_SALT || "dev-salt")).digest("hex").slice(0, 16);
}
