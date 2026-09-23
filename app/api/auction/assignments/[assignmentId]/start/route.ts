import { NextRequest, NextResponse } from "next/server";
import { startQuestionTimer } from "@/lib/round2-timer";
import { validateTeamAuth } from "@/lib/auth";

export async function POST(
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

    const result = await startQuestionTimer({
      assignmentId,
      teamId: teamAuth.teamId
    });

    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: result.message,
      assignment: result.assignment
    });
  } catch (error: any) {
    console.error("Start question timer error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}