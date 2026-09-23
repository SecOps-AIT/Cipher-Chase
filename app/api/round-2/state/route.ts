export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getRound2StateForTeam } from "@/lib/round2";
import { getTeamSession } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getTeamSession();
    const data = await getRound2StateForTeam(session?.teamId);
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to load Round 2 state" }, { status: 500 });
  }
}
