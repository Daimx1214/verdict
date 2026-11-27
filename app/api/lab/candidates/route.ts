import { screeningResults } from "@/lib/lab-data";
export const runtime = "nodejs";
export async function GET() {
  const r = screeningResults();
  if (!r) return Response.json({ candidates: [], funnel: null }, { status: 200 });
  return Response.json(r);
}
