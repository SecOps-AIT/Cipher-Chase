export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/auth";
import { QuestionSchema } from "@/lib/validation";
import { logAuditEvent } from "@/lib/audit";

export async function GET() {
  try {
    await requireAdminSession();
    const questions = await prisma.question.findMany({
      include: {
        round: true,
        submissions: {
          select: { id: true, isCorrect: true, teamId: true },
        },
      },
      orderBy: [{ round: { number: "asc" } }, { order: "asc" }],
    });

    return NextResponse.json({
      questions: questions.map((q) => ({
        id: q.id,
        roundId: q.roundId,
        roundName: q.round.name,
        roundNumber: q.round.number,
        title: q.title,
        description: q.description,
        answer: q.answer, // Admin can view the answer!
        points: q.points,
        difficulty: q.difficulty,
        category: q.category,
        answerMode: q.answerMode,
        isActive: q.isActive,
        isCore: q.isCore,
        isReleased: q.isReleased,
        order: q.order,
        totalSolves: q.submissions.filter((s) => s.isCorrect).length,
      })),
    });
  } catch (err: any) {
    if (err.message === "UNAUTHORIZED_ADMIN") {
      return NextResponse.json({ error: "Unauthorized: Admin access required" }, { status: 403 });
    }
    return NextResponse.json({ error: err.message || "Failed to load questions" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await requireAdminSession();
    const body = await req.json();
    const result = QuestionSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.errors[0]?.message || "Invalid question parameters" },
        { status: 400 }
      );
    }

    // Default to Round 1 if not specified
    let roundId = body.roundId;
    if (!roundId) {
      const r1 = await prisma.round.findFirst({ where: { number: 1 } });
      if (!r1) throw new Error("Round 1 not found");
      roundId = r1.id;
    }

    const newQuestion = await prisma.question.create({
      data: {
        roundId,
        title: result.data.title,
        description: result.data.description,
        answer: result.data.answer,
        points: result.data.points,
        difficulty: result.data.difficulty,
        category: result.data.category,
        answerMode: body.answerMode || "TRIMMED",
        isActive: true,
        isCore: body.isCore !== undefined ? body.isCore : (result.data.order <= 20),
        isReleased: body.isReleased !== undefined ? body.isReleased : (result.data.order <= 20),
        order: result.data.order,
      },
      include: { round: true },
    });

    await logAuditEvent({
      eventId: newQuestion.round.eventId,
      actor: "ADMIN",
      action: "QUESTION_CREATED",
      details: `Created challenge "${newQuestion.title}" (Q${newQuestion.order.toString().padStart(2, '0')}, ${newQuestion.points} pts, ${newQuestion.difficulty})`,
    });

    return NextResponse.json({ success: true, question: newQuestion });
  } catch (err: any) {
    if (err.message === "UNAUTHORIZED_ADMIN") {
      return NextResponse.json({ error: "Unauthorized: Admin access required" }, { status: 403 });
    }
    return NextResponse.json({ error: err.message || "Failed to create question" }, { status: 500 });
  }
}
