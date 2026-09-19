import { prisma } from "@/lib/prisma";
import { getAuthoritativeLeaderboard } from "@/lib/leaderboard";
import { logAuditEvent } from "@/lib/audit";

export async function qualifyTopTeams(topCount: number) {
  const { event, leaderboard } = await getAuthoritativeLeaderboard();
  if (!event) throw new Error("No active event found.");

  const topTeams = leaderboard.slice(0, topCount);
  const topTeamIds = new Set(topTeams.map((t) => t.teamId));

  return await prisma.$transaction(async (tx) => {
    // 1. Mark non-qualifiers
    await tx.team.updateMany({
      where: {
        eventId: event.id,
        id: { notIn: Array.from(topTeamIds) },
      },
      data: {
        qualified: false,
      },
    });

    // 2. Qualify top teams and set wallet = Round 1 score
    for (const t of topTeams) {
      await tx.team.update({
        where: { id: t.teamId },
        data: {
          qualified: true,
          wallet: t.score, // Round 2 wallet initialized from Round 1 score!
        },
      });

      await tx.scoreEvent.create({
        data: {
          eventId: event.id,
          teamId: t.teamId,
          type: "QUALIFICATION_CONFIRMED",
          points: 0,
          reason: `Qualified Top ${topCount} for Round 2. Wallet initialized to ${t.score} pts.`,
        },
      });
    }

    // 3. Mark Round 1 as FINISHED and Round 2 as LIVE
    const r1 = await tx.round.findFirst({ where: { eventId: event.id, number: 1 } });
    if (r1) {
      await tx.round.update({
        where: { id: r1.id },
        data: { status: "FINISHED", endedAt: new Date() },
      });
    }

    const r2 = await tx.round.findFirst({ where: { eventId: event.id, number: 2 } });
    if (r2) {
      await tx.round.update({
        where: { id: r2.id },
        data: { status: "LIVE", startedAt: new Date() },
      });
    }

    await logAuditEvent({
      eventId: event.id,
      actor: "ADMIN",
      action: "QUALIFICATION_CONFIRMED",
      details: `Admin qualified Top ${topCount} teams: ${topTeams.map((t) => t.teamName).join(", ")}. Round 1 FINISHED, Round 2 LIVE.`,
    });

    return {
      qualifiedCount: topTeams.length,
      qualifiedTeams: topTeams.map((t) => ({ id: t.teamId, name: t.teamName, wallet: t.score })),
    };
  });
}

export async function adjustTeamScoreManually({
  teamId,
  points,
  reason,
}: {
  teamId: string;
  points: number;
  reason: string;
}) {
  const now = new Date();

  return await prisma.$transaction(async (tx) => {
    const team = await tx.team.findUnique({ where: { id: teamId } });
    if (!team) throw new Error("Team not found.");

    const newScore = Math.max(0, team.score + points);
    const newWallet = Math.max(0, team.wallet + points);

    const updated = await tx.team.update({
      where: { id: teamId },
      data: {
        score: newScore,
        wallet: newWallet,
        scoreReachedAt: points > 0 ? now : team.scoreReachedAt,
      },
    });

    await tx.scoreEvent.create({
      data: {
        eventId: team.eventId,
        teamId: team.id,
        type: "MANUAL_ADJUSTMENT",
        points,
        reason: `Manual Admin Adjustment: ${reason}`,
        createdAt: now,
      },
    });

    await logAuditEvent({
      eventId: team.eventId,
      teamId: team.id,
      actor: "ADMIN",
      action: "MANUAL_SCORE_CHANGE",
      details: `Manual score adjustment for ${team.name}: ${points > 0 ? `+${points}` : points} pts. Reason: ${reason}`,
    });

    return updated;
  });
}
