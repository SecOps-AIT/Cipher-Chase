export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit";

export async function GET(req: Request) {
  try {
    await requireAdminSession();
    const { searchParams } = new URL(req.url);
    const roundId = searchParams.get("roundId");

    const round = roundId
      ? await prisma.round.findUnique({ where: { id: roundId } })
      : await prisma.round.findFirst({ where: { number: 1 } });

    if (!round) {
      return NextResponse.json({ error: "Round not found" }, { status: 404 });
    }

    const [teamsCount, questionsCount, solvesCount] = await Promise.all([
      prisma.team.count({ where: { eventId: round.eventId } }),
      prisma.question.count({ where: { roundId: round.id, isActive: true } }),
      prisma.submission.count({
        where: {
          question: { roundId: round.id },
          isCorrect: true,
        },
      }),
    ]);

    return NextResponse.json({
      round: {
        id: round.id,
        number: round.number,
        name: round.name,
        status: round.status,
        startedAt: round.startedAt,
        endedAt: round.endedAt,
      },
      stats: {
        teamsCount,
        questionsCount,
        solvesCount,
      },
    });
  } catch (err: any) {
    if (err.message === "UNAUTHORIZED_ADMIN") {
      return NextResponse.json({ error: "Unauthorized: Admin access required" }, { status: 403 });
    }
    return NextResponse.json({ error: err.message || "Failed to fetch round status" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await requireAdminSession();
    const body = await req.json();
    const { roundId, status } = body;

    if (!roundId || !status) {
      return NextResponse.json({ error: "roundId and status are required" }, { status: 400 });
    }

    const validStatuses = ["DRAFT", "READY", "LIVE", "PAUSED", "FINISHED"];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: "Invalid status value" }, { status: 400 });
    }

    const round = await prisma.round.findUnique({
      where: { id: roundId },
      include: { event: true },
    });

    if (!round) {
      return NextResponse.json({ error: "Round not found" }, { status: 404 });
    }

    // State transition validation (Section 21)
    const validTransitions: Record<string, string[]> = {
      DRAFT: ["READY", "LIVE"],
      READY: ["LIVE", "DRAFT"],
      LIVE: ["PAUSED", "FINISHED"],
      PAUSED: ["LIVE", "FINISHED"],
      FINISHED: [],
    };

    const allowed = validTransitions[round.status] || [];
    if (!allowed.includes(status)) {
      return NextResponse.json(
        {
          error: `Invalid transition: Cannot change round status from ${round.status} to ${status}. Allowed: ${allowed.join(", ") || "none"}`,
        },
        { status: 400 }
      );
    }

    const updateData: any = { status };
    if (status === "LIVE" && !round.startedAt) {
      updateData.startedAt = new Date();
    }
    if (status === "FINISHED") {
      updateData.endedAt = new Date();
    }

    const updated = await prisma.round.update({
      where: { id: roundId },
      data: updateData,
    });

    await logAuditEvent({
      eventId: round.eventId,
      actor: "ADMIN",
      action: `ROUND_${status}`,
      details: `Round "${round.name}" status changed from ${round.status} to ${status}`,
    });

    return NextResponse.json({ success: true, round: updated });
  } catch (err: any) {
    if (err.message === "UNAUTHORIZED_ADMIN") {
      return NextResponse.json({ error: "Unauthorized: Admin access required" }, { status: 403 });
    }
    return NextResponse.json({ error: err.message || "Failed to update round status" }, { status: 500 });
  }
}
