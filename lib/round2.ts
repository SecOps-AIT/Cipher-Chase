import { prisma } from "@/lib/prisma";
import { getTeamActiveAssignments } from "@/lib/round2-auction";
import { processExpiredTimers } from "@/lib/round2-timer";

export async function getRound2StateForTeam(teamId?: string) {
  if (!teamId) {
    return { assignments: [], challenges: [] };
  }
  // No cron is configured to sweep expired Round 2 timers, so piggyback the
  // sweep on team polling — cheap, indexed query, and keeps FAILED status
  // (and any failure penalty) applied close to when the deadline actually passes.
  await processExpiredTimers();
  const assignments = await getTeamActiveAssignments(teamId);
  return { assignments };
}

export async function claimAuctionHint({ teamId, hintId }: { teamId: string; hintId: string }) {
  try {
    const hint = await prisma.hint.findUnique({
      where: { id: hintId },
      include: { challenge: true }
    });

    if (!hint) {
      return { success: false, message: "Hint not found" };
    }

    // Check if already claimed
    const existing = await prisma.hintClaim.findFirst({
      where: { teamId, hintId }
    });

    if (existing) {
      return { success: true, message: "Hint already claimed", hint: { id: hint.id, content: hint.content } };
    }

    // Record claim
    await prisma.hintClaim.create({
      data: {
        teamId,
        hintId,
        cost: hint.cost
      }
    });

    // Deduct cost and log ScoreEvent
    if (hint.cost > 0) {
      await prisma.team.update({
        where: { id: teamId },
        data: { score: { decrement: hint.cost } }
      });

      const team = await prisma.team.findUnique({ where: { id: teamId }, select: { eventId: true } });
      if (team) {
        await prisma.scoreEvent.create({
          data: {
            eventId: team.eventId,
            teamId,
            type: "HINT_PENALTY",
            points: -hint.cost,
            reason: `Unlocked auction hint "${hint.title}" (-${hint.cost} pts)`
          }
        });
      }
    }

    return {
      success: true,
      message: `Hint claimed successfully (-${hint.cost} pts)`,
      hint: { id: hint.id, content: hint.content, title: hint.title }
    };
  } catch (error: any) {
    return { success: false, message: error.message || "Failed to claim hint" };
  }
}

export async function setAuctionWinner(data: { challengeId: string; teamId: string; committedSeconds: number }) {
  const updated = await prisma.auctionChallenge.update({
    where: { id: data.challengeId },
    data: {
      winningTeamId: data.teamId,
      committedSeconds: data.committedSeconds,
      status: "ASSIGNED",
    },
  });
  return updated;
}

export async function startAuctionChallenge({ challengeId }: { challengeId: string }) {
  const challenge = await prisma.auctionChallenge.findUnique({ where: { id: challengeId } });
  if (!challenge || !challenge.committedSeconds) throw new Error("Challenge not found or not assigned");
  const now = new Date();
  const deadline = new Date(now.getTime() + challenge.committedSeconds * 1000);
  const updated = await prisma.auctionChallenge.update({
    where: { id: challengeId },
    data: {
      status: "ACTIVE",
      startedAt: now,
      deadlineAt: deadline,
    },
  });
  return updated;
}

export async function resolveAuctionChallenge(data: { challengeId: string; success: boolean }) {
  const challenge = await prisma.auctionChallenge.findUnique({ where: { id: data.challengeId } });
  if (!challenge) throw new Error("Challenge not found");
  const updated = await prisma.auctionChallenge.update({
    where: { id: data.challengeId },
    data: {
      status: data.success ? "COMPLETED" : "FAILED",
      success: data.success,
      completedAt: new Date(),
    },
  });
  return { success: true, challenge: updated };
}
