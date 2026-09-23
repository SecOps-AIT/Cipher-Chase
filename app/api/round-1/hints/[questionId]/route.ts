import { NextResponse } from "next/server";
import { requireTeamSession } from "@/lib/auth";
import { getQuestionHintData, claimQuestionHint } from "@/lib/round1";

// GET /api/round-1/hints/[questionId] - Get hint data for a question
export async function GET(_req: Request, { params }: { params: { questionId: string } }) {
  try {
    const teamSession = await requireTeamSession();
    
    const hintData = await getQuestionHintData(params.questionId, teamSession.teamId);
    if (!hintData) {
      return NextResponse.json({ error: "Question not found or no hints available" }, { status: 404 });
    }

    return NextResponse.json(hintData);
  } catch (err: any) {
    if (err.message === "UNAUTHORIZED_TEAM") {
      return NextResponse.json({ error: "Unauthorized: Team session required" }, { status: 403 });
    }
    return NextResponse.json(
      { error: err.message || "Failed to load hint data" },
      { status: 500 }
    );
  }
}

// POST /api/round-1/hints/[questionId] - Claim a hint
export async function POST(req: Request, { params }: { params: { questionId: string } }) {
  try {
    const teamSession = await requireTeamSession();
    const body = await req.json();
    const { hintId } = body;

    if (!hintId) {
      return NextResponse.json({ error: "Missing hintId" }, { status: 400 });
    }

    const result = await claimQuestionHint(hintId, teamSession.teamId);
    
    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: result.message,
      hint: result.hint,
      remainingScore: result.remainingScore
    });
  } catch (err: any) {
    if (err.message === "UNAUTHORIZED_TEAM") {
      return NextResponse.json({ error: "Unauthorized: Team session required" }, { status: 403 });
    }
    return NextResponse.json(
      { error: err.message || "Failed to claim hint" },
      { status: 500 }
    );
  }
}