export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { validateTeamAuth } from "@/lib/auth";
import { startQuestionTimer } from "@/lib/round2-timer";

/**
 * POST /api/auction/assignments/:assignmentId/start
 * 
 * Start the timer for a Round 2 assignment (READY -> ACTIVE)
 * 
 * As per specification:
 * "Timer does NOT start when admin sells question. 
 *  Timer starts when FIRST MEMBER OF THE WINNING TEAM OPENS/ENTERS THE QUESTION"
 * 
 * This endpoint transitions the assignment from READY to ACTIVE status
 * and sets startedAt and deadlineAt based on the winning bid time.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { assignmentId: string } }
) {
  try {
    const authResult = await validateTeamAuth(req);
    if (!authResult.success || !authResult.teamId) {
      return NextResponse.json(
        { error: authResult.error || "Unauthorized" },
        { status: 401 }
      );
    }

    const { assignmentId } = params;
    const teamId = authResult.teamId!;

    const result = await startQuestionTimer({
      assignmentId,
      teamId,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.message },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: result.message,
      assignment: result.assignment,
    });

  } catch (error: any) {
    console.error("Error starting assignment timer:", error);
    return NextResponse.json(
      { error: "Failed to start timer" },
      { status: 500 }
    );
  }
}
