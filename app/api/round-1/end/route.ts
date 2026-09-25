export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getTeamSession } from "@/lib/auth";
import { endTeamRound1Timer } from "@/lib/round1";

export async function POST() {
  try {
    const session = await getTeamSession();

    if (!session?.teamId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const result = await endTeamRound1Timer(session.teamId);

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: result.message,
        deadlineAt: result.deadlineAt,
      });
    } else {
      return NextResponse.json({ error: result.message }, { status: 400 });
    }
  } catch (err: any) {
    console.error("Error ending Round 1 timer:", err);
    return NextResponse.json({ error: "Failed to end round" }, { status: 500 });
  }
}
