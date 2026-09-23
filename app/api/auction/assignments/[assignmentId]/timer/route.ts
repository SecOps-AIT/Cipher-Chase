export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getTimerStatus } from "@/lib/round2-timer";
import { validateTeamAuth } from "@/lib/auth";

export async function GET(
  request: NextRequest,
  { params }: { params: { assignmentId: string } }
) {
  try {
    const teamAuth = await validateTeamAuth(request);
    if (!teamAuth.success || !teamAuth.teamId) {
      return NextResponse.json({ error: teamAuth.error || "Authentication required" }, { status: 401 });
    }

    const { assignmentId } = params;

    if (!assignmentId) {
      return NextResponse.json(
        { error: "Assignment ID is required" },
        { status: 400 }
      );
    }

    const result = await getTimerStatus(assignmentId, teamAuth.teamId);

    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      timer: result.timer
    });
  } catch (error: any) {
    console.error("Get timer status error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}