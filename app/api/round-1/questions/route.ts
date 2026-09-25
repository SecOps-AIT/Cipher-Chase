export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getRound1QuestionsForTeam } from "@/lib/round1";
import { getTeamSession } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getTeamSession();
    const data = await getRound1QuestionsForTeam(session?.teamId);
    
    // Add caching headers for better performance (5 seconds stale-while-revalidate)
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'private, max-age=2, stale-while-revalidate=5',
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to load questions" }, { status: 500 });
  }
}
