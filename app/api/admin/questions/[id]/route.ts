export const dynamic = "force-dynamic";

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

    // Action: Release backup question (if it's a backup question)
    if (body.action === "RELEASE" && !question.isCore) {
      const updated = await prisma.question.update({
        where: { id: params.id },
        data: { isReleased: true },
      });

      await logAuditEvent({
        eventId: question.round.eventId,
        actor: "ADMIN",
        action: "BACKUP_QUESTION_RELEASED",
        details: `Backup question "${question.title}" (Q${question.order.toString().padStart(2, '0')}) released by admin.`,
      });

      return NextResponse.json({ success: true, question: updated });
    }

    // Action: Lock backup question (if it's a backup question)
    if (body.action === "LOCK" && !question.isCore) {
      const updated = await prisma.question.update({
        where: { id: params.id },
        data: { isReleased: false },
      });

      await logAuditEvent({
        eventId: question.round.eventId,
        actor: "ADMIN",
        action: "BACKUP_QUESTION_LOCKED",
        details: `Backup question "${question.title}" (Q${question.order.toString().padStart(2, '0')}) locked by admin.`,
      });

      return NextResponse.json({ success: true, question: updated });
    }

    // Update general fields (for question editing)
    const updateData: any = {};
    if (body.title) updateData.title = body.title.trim();
    if (body.description) updateData.description = body.description.trim();
    if (body.answer) updateData.answer = body.answer.trim();
    if (body.points) updateData.points = Number(body.points);
    if (body.difficulty) updateData.difficulty = body.difficulty;
    if (body.category) updateData.category = body.category.trim();
    if (body.answerMode) updateData.answerMode = body.answerMode;
    if (typeof body.isCore === 'boolean') updateData.isCore = body.isCore;
    if (typeof body.isReleased === 'boolean') updateData.isReleased = body.isReleased;

    const updated = await prisma.question.update({
      where: { id: params.id },
      data: updateData,
    });

    await logAuditEvent({
      eventId: question.round.eventId,
      actor: "ADMIN",
      action: "QUESTION_UPDATED",
      details: `Question "${question.title}" (Q${question.order.toString().padStart(2, '0')}) was updated by admin.`,
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
      details: `Question "${q.title}" (Q${q.order.toString().padStart(2, '0')}) was deleted.`,
    });

    return NextResponse.json({ success: true, message: "Question deleted" });
  } catch (err: any) {
    if (err.message === "UNAUTHORIZED_ADMIN") {
      return NextResponse.json({ error: "Unauthorized: Admin access required" }, { status: 403 });
    }
    return NextResponse.json({ error: err.message || "Failed to delete question" }, { status: 500 });
  }
}
