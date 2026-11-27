import { NextRequest } from "next/server";
import { armData, corpusHash } from "@/lib/lab-data";
import type { TrafficFilter } from "@/lib/lab-data";
export const runtime = "nodejs"; export const dynamic = "force-dynamic";
export async function GET(req: NextRequest) {
  const traffic = (req.nextUrl.searchParams.get("traffic") || "real") as TrafficFilter;
  const { control, challenger, totalParticipants, totalQuestions } = await armData(traffic);
  return Response.json({
    traffic, questions: totalQuestions, participants: totalParticipants,
    exposed: control.exposed + challenger.exposed,
    control: { exposed: control.exposed, converted: control.converted, share: control.share },
    challenger: { exposed: challenger.exposed, converted: challenger.converted, share: challenger.share },
    corpusHash: corpusHash(),
  });
}
