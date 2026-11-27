import { z } from "zod";
// Appendix C config schema - validates every flag value before it is used.
export const retrievalConfigSchema = z.object({
  id: z.string().min(1),
  strategy: z.enum(["bm25", "dense", "hybrid"]),
  topK: z.number().int().min(1).max(10),
  pool: z.number().int().min(5).max(100).optional(),
  rrfK: z.number().int().min(1).max(200).optional(),
  rerank: z.boolean(),
  rewrite: z.boolean().optional(),
});
export type RetrievalConfig = z.infer<typeof retrievalConfigSchema>;
export const CONTROL_CONFIG: RetrievalConfig = { id: "bm25_k3", strategy: "bm25", topK: 3, rerank: false };
export function parseConfig(raw: unknown): RetrievalConfig | null {
  if (typeof raw !== "string") return null;
  try {
    const parsed = retrievalConfigSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch { return null; }
}
