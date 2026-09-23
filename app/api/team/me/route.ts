export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTeamSession } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getTeamSession();
    if (!session || !session.teamId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();

    const team = await prisma.team.findUnique({
      where: { id: session.teamId },
      include: {
        members: { select: { name: true } },
        submissions: {
          where: { isCorrect: true },
          select: { id: true },
        },
      },
    });

    if (!team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    let currentRound = await prisma.round.findFirst({
      where: { eventId: team.eventId, status: { in: ["LIVE", "PAUSED", "READY"] } },
      orderBy: { number: "asc" },
    });

    if (!currentRound) {
      currentRound = await prisma.round.findFirst({
        where: { eventId: team.eventId },
        orderBy: { number: "asc" },
      });
    }

    return NextResponse.json({
      team: {
        id: team.id,
        name: team.name,
        joinCode: team.joinCode,
        score: team.score,
        qualified: team.qualified,
        members: team.members.map((m) => m.name),
        memberCount: team.members.length,
        maxMembers: 3,
        currentMember: session.memberName,
        memberId: session.memberId,
        solvesCount: team.submissions.length,
      },
      currentRound: currentRound
        ? {
            id: currentRound.id,
            number: currentRound.number,
            name: currentRound.name,
            status: currentRound.status,
          }
        : null,
      serverTime: now.toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
