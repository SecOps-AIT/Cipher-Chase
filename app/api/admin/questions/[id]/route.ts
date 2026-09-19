import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit";
import { getQuestionDetailForAdmin } from "@/lib/round1";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    await requireAdminSession();
    const detail = await getQuestionDetailForAdmin(params.id);
    if (!detail) {
      return NextResponse.json({ error: "Question not found" }, { status: 404 });
    }
    return NextResponse.json({ question: detail });
  } catch (err: any) {
    if (err.message === "UNAUTHORIZED_ADMIN") {
      return NextResponse.json({ error: "Unauthorized: Admin access required" }, { status: 403 });
    }
    return NextResponse.json({ error: err.message || "Failed to load question detail" }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    await requireAdminSession();
    const body = await req.json();

    const question = await prisma.question.findUnique({
      where: { id: params.id },
      include: { round: true },
    });
    if (!question) {
      return NextResponse.json({ error: "Question not found" }, { status: 404 });
    }

    // Action: Close question immediately
    if (body.action === "CLOSE") {
      const updated = await prisma.question.update({
        where: { id: params.id },
        data: { closeAt: new Date() },
      });

      await logAuditEvent({
        eventId: question.round.eventId,
        actor: "ADMIN",
        action: "QUESTION_CLOSED",
        details: `Question "${question.title}" manually closed by admin.`,
      });

      return NextResponse.json({ success: true, question: updated });
    }

    // Update general fields
    const updateData: any = {};
    if (body.title) updateData.title = body.title.trim();
    if (body.description) updateData.description = body.description.trim();
    if (body.answer) updateData.answer = body.answer.trim();
    if (body.points) updateData.points = Number(body.points);
    if (body.difficulty) updateData.difficulty = body.difficulty;
    if (body.category) updateData.category = body.category.trim();
    if (body.batchNumber) updateData.batchNumber = Number(body.batchNumber);
    if (body.answerMode) updateData.answerMode = body.answerMode;
    if (body.releaseAt) updateData.releaseAt = new Date(body.releaseAt);
    if (body.closeAt) updateData.closeAt = new Date(body.closeAt);

    const updated = await prisma.question.update({
      where: { id: params.id },
      data: updateData,
    });

    await logAuditEvent({
      eventId: question.round.eventId,
      actor: "ADMIN",
      action: "QUESTION_UPDATED",
      details: `Question "${question.title}" was updated by admin.`,
    });

    return NextResponse.json({ success: true, question: updated });
  } catch (err: any) {
    if (err.message === "UNAUTHORIZED_ADMIN") {
      return NextResponse.json({ error: "Unauthorized: Admin access required" }, { status: 403 });
    }
    return NextResponse.json({ error: err.message || "Failed to update question" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    await requireAdminSession();
    const q = await prisma.question.findUnique({
      where: { id: params.id },
      include: { round: true },
    });
    if (!q) return NextResponse.json({ error: "Question not found" }, { status: 404 });

    await prisma.question.delete({ where: { id: params.id } });

    await logAuditEvent({
      eventId: q.round.eventId,
      actor: "ADMIN",
      action: "QUESTION_DELETED",
      details: `Question "${q.title}" was deleted.`,
    });

    return NextResponse.json({ success: true, message: "Question deleted" });
  } catch (err: any) {
    if (err.message === "UNAUTHORIZED_ADMIN") {
      return NextResponse.json({ error: "Unauthorized: Admin access required" }, { status: 403 });
    }
    return NextResponse.json({ error: err.message || "Failed to delete question" }, { status: 500 });
  }
}
