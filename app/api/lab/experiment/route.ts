import { NextRequest } from "next/server";
import { experimentData, corpusHash } from "@/lib/lab-data";
import type { TrafficFilter } from "@/lib/lab-data";
export const runtime = "nodejs"; export const dynamic = "force-dynamic";
export async function GET(req: NextRequest) {
  const traffic = (req.nextUrl.searchParams.get("traffic") || "real") as TrafficFilter;
  const data = await experimentData(traffic);
  return Response.json({ traffic, ...data, corpusHash: corpusHash(), plannedPerArm: 400 });
}
