export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getTeamActiveAssignments } from "@/lib/round2-auction";
import { validateTeamAuth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const teamAuth = await validateTeamAuth(request);
    if (!teamAuth.success || !teamAuth.teamId) {
      return NextResponse.json({ error: teamAuth.error || "Authentication required" }, { status: 401 });
    }

    const assignments = await getTeamActiveAssignments(teamAuth.teamId);

    return NextResponse.json({
      success: true,
      assignments
    });
  } catch (error: any) {
    console.error("Get team assignments error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}