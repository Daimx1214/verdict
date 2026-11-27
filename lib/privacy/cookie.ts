import { createHmac, randomUUID, timingSafeEqual } from "crypto";
// vd_pid: signed anonymous participant cookie (Sections 3.4, 13.2)
export const COOKIE_NAME = "vd_pid";
function sign(id: string): string {
  const secret = process.env.COOKIE_SECRET || "dev-only-secret-change-me";
  return createHmac("sha256", secret).update(id).digest("hex").slice(0, 32);
}
export function encodeCookie(id: string): string { return `${id}.${sign(id)}`; }
export function decodeCookie(raw: string | undefined): string | null {
  if (!raw) return null;
  const [id, sig] = raw.split(".");
  if (!id || !sig) return null;
  const expected = sign(id);
  try {
    if (!timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  } catch { return null; }
  return id;
}
export function newParticipantId(traffic: "real" | "simulated" | "probe"): string {
  if (traffic === "simulated") return `sim-${randomUUID()}`;
  if (traffic === "probe") return `probe-${randomUUID()}`;
  return randomUUID();
}
export function trafficOf(id: string): "real" | "simulated" | "probe" {
  if (id.startsWith("sim-")) return "simulated";
  if (id.startsWith("probe-")) return "probe";
  return "real";
}
