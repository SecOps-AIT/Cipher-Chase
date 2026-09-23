import { NextRequest, NextResponse } from "next/server";
import { submitQuestionAnswer } from "@/lib/round2-timer";
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
    const body = await request.json();
    const { answer, memberId } = body;

    if (!assignmentId) {
      return NextResponse.json(
        { error: "Assignment ID is required" },
        { status: 400 }
      );
    }

    if (!answer || typeof answer !== "string") {
      return NextResponse.json(
        { error: "Answer is required and must be a string" },
        { status: 400 }
      );
    }

    const result = await submitQuestionAnswer({
      assignmentId,
      teamId: teamAuth.teamId,
      memberId,
      answer: answer.trim()
    });

    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: result.message,
      isCorrect: result.result?.isCorrect,
      scoreChange: result.result?.scoreChange,
      totalPoints: result.result?.scoreChange,
      timeUsed: result.result?.timeUsed,
      status: result.result?.status,
      result: result.result
    });
  } catch (error: any) {
    console.error("Submit question answer error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}