import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTeamSession } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit";

/**
 * POST /api/round-1/start
 * 
 * Starts the per-team Round 1 timer atomically.
 * Only the first call from any team member sets the timer.
 * Subsequent calls return the existing timer.
 */
export async function POST() {
  try {
    const session = await requireTeamSession();
    const now = new Date();

    // Atomic timer start transaction
    const result = await prisma.$transaction(async (tx) => {
      // Fetch team with fresh data inside transaction
      const team = await tx.team.findUnique({
        where: { id: session.teamId },
        select: {
          id: true,
          name: true,
          eventId: true,
          round1StartedAt: true,
          round1DeadlineAt: true,
          round1Duration: true,
        },
      });

      if (!team) {
        throw new Error("Team not found");
      }

      // If timer already started, return existing deadline
      if (team.round1StartedAt && team.round1DeadlineAt) {
        return {
          started: false,
          startedAt: team.round1StartedAt,
          deadlineAt: team.round1DeadlineAt,
          duration: team.round1Duration,
        };
      }

      // Start timer now
      const deadlineAt = new Date(now.getTime() + team.round1Duration * 1000);

      await tx.team.update({
        where: { id: team.id },
        data: {
          round1StartedAt: now,
          round1DeadlineAt: deadlineAt,
        },
      });

      await logAuditEvent({
        eventId: team.eventId,
        teamId: team.id,
        actor: "TEAM",
        action: "ROUND1_STARTED",
        details: `${session.memberName} started Round 1 for team "${team.name}". Timer: ${team.round1Duration}s (${Math.floor(team.round1Duration / 60)} minutes).`,
      });

      return {
        started: true,
        startedAt: now,
        deadlineAt: deadlineAt,
        duration: team.round1Duration,
      };
    });

    const secondsRemaining = Math.max(
      0,
      Math.floor((result.deadlineAt.getTime() - now.getTime()) / 1000)
    );

    return NextResponse.json({
      success: true,
      message: result.started ? "Round 1 timer started!" : "Round 1 already in progress.",
      timer: {
        startedAt: result.startedAt.toISOString(),
        deadlineAt: result.deadlineAt.toISOString(),
        duration: result.duration,
        secondsRemaining,
        status: secondsRemaining > 0 ? "ACTIVE" : "EXPIRED",
      },
    });
  } catch (err: any) {
    if (err.message === "UNAUTHORIZED_TEAM") {
      return NextResponse.json(
        { error: "Unauthorized. Please join a team first." },
        { status: 401 }
      );
    }
    return NextResponse.json(
      { error: err.message || "Failed to start Round 1 timer" },
      { status: 500 }
    );
  }
}
