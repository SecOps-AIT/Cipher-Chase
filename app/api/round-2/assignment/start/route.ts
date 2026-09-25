export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { requireTeamSession } from "@/lib/auth";
import { startQuestionTimer } from "@/lib/round2-timer";

/**
 * POST /api/round-2/assignment/start
 * 
 * Start the timer for a Round 2 assignment (READY -> ACTIVE)
 * Timer starts when FIRST team member opens/enters the question
 */
export async function POST(request: Request) {
  try {
    const teamSession = await requireTeamSession();
    const body = await request.json();
    const { assignmentId } = body;

    if (!assignmentId) {
      return NextResponse.json(
        { error: "assignmentId is required" },
        { status: 400 }
      );
    }

    const result = await startQuestionTimer({
      assignmentId,
      teamId: teamSession.teamId,
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

  } catch (err: any) {
    if (err.message === "UNAUTHORIZED_TEAM") {
      return NextResponse.json(
        { error: "Unauthorized: Team session required" },
        { status: 403 }
      );
    }
    console.error("Error starting assignment timer:", err);
    return NextResponse.json(
      { error: err.message || "Failed to start timer" },
      { status: 500 }
    );
  }
}
