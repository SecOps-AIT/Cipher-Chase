import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth";
import { manageQuestionHints, getQuestionHintData } from "@/lib/round1";

// GET /api/admin/questions/[id]/hints - Get hints for a question (admin view)
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    await requireAdminSession();
    
    // For admin, get hints without team-specific claim data
    const hintData = await getQuestionHintData(params.id, "dummy-team-id");
    if (!hintData) {
      return NextResponse.json({ error: "Question not found" }, { status: 404 });
    }

    // Remove team-specific data and show all hints
    const adminHintData = {
      questionId: hintData.questionId,
      questionTitle: hintData.questionTitle,
      hints: hintData.availableHints.map(h => ({
        id: h.id,
        title: h.title,
        content: h.content,
        cost: h.cost,
        order: h.order
      }))
    };

    return NextResponse.json(adminHintData);
  } catch (err: any) {
    if (err.message === "UNAUTHORIZED_ADMIN") {
      return NextResponse.json({ error: "Unauthorized: Admin access required" }, { status: 403 });
    }
    return NextResponse.json(
      { error: err.message || "Failed to load hints" },
      { status: 500 }
    );
  }
}

// PUT /api/admin/questions/[id]/hints - Update hints for a question
export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    await requireAdminSession();
    const body = await req.json();
    const { hints } = body;

    if (!Array.isArray(hints)) {
      return NextResponse.json({ error: "hints must be an array" }, { status: 400 });
    }

    // Validate hint structure
    for (const hint of hints) {
      if (!hint.title || !hint.content || typeof hint.cost !== 'number' || typeof hint.order !== 'number') {
        return NextResponse.json({ 
          error: "Each hint must have title, content, cost (number), and order (number)" 
        }, { status: 400 });
      }
    }

    const result = await manageQuestionHints(params.id, hints);
    
    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: result.message,
      hints: result.hints
    });
  } catch (err: any) {
    if (err.message === "UNAUTHORIZED_ADMIN") {
      return NextResponse.json({ error: "Unauthorized: Admin access required" }, { status: 403 });
    }
    return NextResponse.json(
      { error: err.message || "Failed to update hints" },
      { status: 500 }
    );
  }
}