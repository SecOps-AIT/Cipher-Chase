import { prisma } from "@/lib/prisma";
import { logAuditEvent } from "@/lib/audit";

export async function getRound2StateForTeam(teamId?: string) {
  const now = new Date();

  const round = await prisma.round.findFirst({
    where: { number: 2 },
    include: { event: true },
  });

  if (!round) {
    return { round: null, challenge: null, teamWallet: 0, qualified: false, serverTime: now.toISOString() };
  }

  let teamInfo: { id: string; name: string; wallet: number; qualified: boolean } | null = null;
  if (teamId) {
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      select: { id: true, name: true, wallet: true, qualified: true },
    });
    teamInfo = team;
  }

  // Find active or latest challenge for this team, or the current active auction challenge
  let challenge = await prisma.auctionChallenge.findFirst({
    where: teamId
      ? { winningTeamId: teamId, status: { in: ["LIVE", "READY", "COMPLETED", "FAILED"] } }
      : { status: "LIVE" },
    orderBy: { updatedAt: "desc" },
    include: {
      hints: {
        orderBy: { order: "asc" },
        include: {
          claims: teamId ? { where: { teamId } } : false,
        },
      },
    },
  });

  // If no specific challenge for this team, get the overall live/ready challenge
  if (!challenge) {
    challenge = await prisma.auctionChallenge.findFirst({
      where: { status: { in: ["LIVE", "READY"] } },
      orderBy: { order: "asc" },
      include: {
        hints: {
          orderBy: { order: "asc" },
          include: {
            claims: teamId ? { where: { teamId } } : false,
          },
        },
      },
    });
  }

  const sanitizedChallenge = challenge
    ? {
        id: challenge.id,
        title: challenge.title,
        description: challenge.description,
        basePoints: challenge.basePoints,
        status: challenge.status,
        winningTeamId: challenge.winningTeamId,
        committedSeconds: challenge.committedSeconds,
        startedAt: challenge.startedAt,
        deadlineAt: challenge.deadlineAt,
        completedAt: challenge.completedAt,
        success: challenge.success,
        failurePenalty: challenge.failurePenalty,
        hints: challenge.hints.map((h) => {
          const isClaimed = h.claims && h.claims.length > 0;
          return {
            id: h.id,
            title: h.title,
            cost: h.cost,
            order: h.order,
            isClaimed: !!isClaimed,
            content: isClaimed ? h.content : null, // only send content if claimed!
          };
        }),
      }
    : null;

  return {
    round: {
      id: round.id,
      name: round.name,
      status: round.status,
    },
    challenge: sanitizedChallenge,
    teamWallet: teamInfo?.wallet ?? 0,
    qualified: teamInfo?.qualified ?? false,
    serverTime: now.toISOString(),
  };
}

// 1. Admin sets auction winner and committed time
export async function setAuctionWinner({
  challengeId,
  teamId,
  committedSeconds,
}: {
  challengeId: string;
  teamId: string;
  committedSeconds: number;
}) {
  const challenge = await prisma.auctionChallenge.findUnique({
    where: { id: challengeId },
    include: { round: { include: { event: true } } },
  });
  if (!challenge) throw new Error("Challenge not found.");

  const team = await prisma.team.findUnique({ where: { id: teamId } });
  if (!team) throw new Error("Team not found.");

  const updated = await prisma.auctionChallenge.update({
    where: { id: challengeId },
    data: {
      winningTeamId: teamId,
      committedSeconds,
      status: "READY",
    },
  });

  await logAuditEvent({
    eventId: challenge.round.eventId,
    teamId: team.id,
    actor: "ADMIN",
    action: "AUCTION_WINNER_SET",
    details: `Team ${team.name} won auction for "${challenge.title}" with committed time ${committedSeconds}s`,
  });

  return updated;
}

// 2. Admin starts the challenge timer
export async function startAuctionChallenge(challengeId: string) {
  const now = new Date();
  const challenge = await prisma.auctionChallenge.findUnique({
    where: { id: challengeId },
    include: { round: { include: { event: true } } },
  });

  if (!challenge) throw new Error("Challenge not found.");
  if (!challenge.winningTeamId || !challenge.committedSeconds) {
    throw new Error("Challenge must have a winning team and committed seconds before starting.");
  }

  const deadlineAt = new Date(now.getTime() + challenge.committedSeconds * 1000);

  const updated = await prisma.auctionChallenge.update({
    where: { id: challengeId },
    data: {
      status: "LIVE",
      startedAt: now,
      deadlineAt,
      completedAt: null,
      success: null,
    },
  });

  // Create team challenge attempt
  await prisma.teamChallengeAttempt.create({
    data: {
      teamId: challenge.winningTeamId,
      challengeId: challenge.id,
      startedAt: now,
      deadlineAt,
    },
  });

  await logAuditEvent({
    eventId: challenge.round.eventId,
    teamId: challenge.winningTeamId,
    actor: "ADMIN",
    action: "CHALLENGE_STARTED",
    details: `Challenge "${challenge.title}" started. Deadline: ${deadlineAt.toISOString()}`,
  });

  return updated;
}

// 3. Team claims a hint
export async function claimAuctionHint({
  teamId,
  hintId,
}: {
  teamId: string;
  hintId: string;
}): Promise<{ success: boolean; message: string; content?: string; newWallet?: number }> {
  const now = new Date();

  return await prisma.$transaction(async (tx) => {
    const hint = await tx.hint.findUnique({
      where: { id: hintId },
      include: {
        challenge: {
          include: { round: true },
        },
      },
    });

    if (!hint) {
      return { success: false, message: "Hint not found." };
    }

    const team = await tx.team.findUnique({
      where: { id: teamId },
    });

    if (!team) {
      return { success: false, message: "Team not found." };
    }

    // Verify team is qualified
    if (!team.qualified) {
      return { success: false, message: "Team is not qualified for Round 2." };
    }

    // Verify team hasn't already claimed this hint
    const existingClaim = await tx.hintClaim.findUnique({
      where: {
        teamId_hintId: {
          teamId,
          hintId,
        },
      },
    });

    if (existingClaim) {
      return {
        success: true,
        message: "Hint already unlocked.",
        content: hint.content,
        newWallet: team.wallet,
      };
    }

    // Verify team has enough wallet balance
    if (team.wallet < hint.cost) {
      return {
        success: false,
        message: `Insufficient wallet balance. Required: ${hint.cost} pts, Available: ${team.wallet} pts.`,
      };
    }

    // Deduct cost and record claim
    const updatedTeam = await tx.team.update({
      where: { id: teamId },
      data: {
        wallet: { decrement: hint.cost },
      },
    });

    await tx.hintClaim.create({
      data: {
        teamId,
        hintId,
        cost: hint.cost,
        claimedAt: now,
      },
    });

    await tx.scoreEvent.create({
      data: {
        eventId: team.eventId,
        teamId,
        roundId: hint.challenge.roundId,
        type: "HINT_COST",
        points: -hint.cost,
        reason: `Hint claimed: ${hint.title} for ${hint.challenge.title}`,
        createdAt: now,
      },
    });

    await logAuditEvent({
      eventId: team.eventId,
      teamId,
      actor: "TEAM",
      action: "HINT_CLAIMED",
      details: `Team ${team.name} unlocked ${hint.title} (-${hint.cost} wallet pts)`,
    });

    return {
      success: true,
      message: `Hint unlocked! -${hint.cost} pts deducted from wallet.`,
      content: hint.content,
      newWallet: updatedTeam.wallet,
    };
  });
}

// 4. Calculate Speed Bonus Helper
export function calculateSpeedBonus(
  timeUsedSeconds: number,
  committedSeconds: number
): { bonus: number; tier: string } {
  if (committedSeconds <= 0) return { bonus: 25, tier: "> 75% committed time" };
  const fraction = timeUsedSeconds / committedSeconds;

  if (fraction <= 0.25) {
    return { bonus: 100, tier: "<= 25% committed time (+100 pts)" };
  } else if (fraction <= 0.5) {
    return { bonus: 75, tier: "<= 50% committed time (+75 pts)" };
  } else if (fraction <= 0.75) {
    return { bonus: 50, tier: "<= 75% committed time (+50 pts)" };
  } else {
    return { bonus: 25, tier: "> 75% committed time (+25 pts)" };
  }
}

// 5. Complete or Fail Auction Challenge
export async function resolveAuctionChallenge({
  challengeId,
  success,
  notes,
}: {
  challengeId: string;
  success: boolean;
  notes?: string;
}) {
  const now = new Date();

  return await prisma.$transaction(async (tx) => {
    const challenge = await tx.auctionChallenge.findUnique({
      where: { id: challengeId },
      include: { round: true },
    });

    if (!challenge) throw new Error("Challenge not found.");
    if (!challenge.winningTeamId || !challenge.startedAt || !challenge.deadlineAt) {
      throw new Error("Challenge has not been started properly.");
    }

    const team = await tx.team.findUnique({ where: { id: challenge.winningTeamId } });
    if (!team) throw new Error("Winning team not found.");

    const committedSec = challenge.committedSeconds || 60;
    const timeUsedSeconds = Math.max(
      1,
      Math.round((now.getTime() - challenge.startedAt.getTime()) / 1000)
    );

    // If marked successful AND within deadline (with 5-second grace period for network latency)
    const isWithinDeadline = now.getTime() <= challenge.deadlineAt.getTime() + 5000;
    const isReallySuccess = success && isWithinDeadline;

    if (isReallySuccess) {
      const { bonus } = calculateSpeedBonus(timeUsedSeconds, committedSec);
      const totalAwarded = challenge.basePoints + bonus;

      // Update Team: score and wallet
      await tx.team.update({
        where: { id: team.id },
        data: {
          score: { increment: totalAwarded },
          wallet: { increment: totalAwarded },
          scoreReachedAt: now,
        },
      });

      // Score event: Base points
      await tx.scoreEvent.create({
        data: {
          eventId: team.eventId,
          teamId: team.id,
          roundId: challenge.roundId,
          type: "ROUND2_SUCCESS",
          points: challenge.basePoints,
          reason: `Round 2 Base Reward: ${challenge.title}`,
          createdAt: now,
        },
      });

      // Score event: Speed bonus
      await tx.scoreEvent.create({
        data: {
          eventId: team.eventId,
          teamId: team.id,
          roundId: challenge.roundId,
          type: "SPEED_BONUS",
          points: bonus,
          reason: `Round 2 Speed Bonus (${timeUsedSeconds}s / ${committedSec}s): ${challenge.title}`,
          createdAt: now,
        },
      });

      // Update Auction Challenge
      const updatedChallenge = await tx.auctionChallenge.update({
        where: { id: challengeId },
        data: {
          status: "COMPLETED",
          completedAt: now,
          success: true,
        },
      });

      // Update latest attempt
      const attempt = await tx.teamChallengeAttempt.findFirst({
        where: { challengeId, teamId: team.id },
        orderBy: { startedAt: "desc" },
      });
      if (attempt) {
        await tx.teamChallengeAttempt.update({
          where: { id: attempt.id },
          data: {
            completedAt: now,
            success: true,
            timeUsedSeconds,
            pointsAwarded: totalAwarded,
          },
        });
      }

      await logAuditEvent({
        eventId: team.eventId,
        teamId: team.id,
        actor: "ADMIN",
        action: "CHALLENGE_COMPLETED",
        details: `Team ${team.name} completed "${challenge.title}" in ${timeUsedSeconds}s. +${totalAwarded} pts (Base: ${challenge.basePoints}, Speed: ${bonus})`,
      });

      return {
        success: true,
        challenge: updatedChallenge,
        basePoints: challenge.basePoints,
        speedBonus: bonus,
        totalAwarded,
        timeUsedSeconds,
      };
    } else {
      // Challenge Failed or expired
      const penalty = challenge.failurePenalty || 100;
      // Do not allow wallet to go below 0 unless configured
      const deductiblePenalty = Math.min(team.wallet, penalty);

      await tx.team.update({
        where: { id: team.id },
        data: {
          wallet: { decrement: deductiblePenalty },
        },
      });

      await tx.scoreEvent.create({
        data: {
          eventId: team.eventId,
          teamId: team.id,
          roundId: challenge.roundId,
          type: "ROUND2_FAILURE",
          points: -deductiblePenalty,
          reason: `Round 2 Challenge Failed: ${challenge.title} (${notes || "Time expired or compromise incomplete"})`,
          createdAt: now,
        },
      });

      const updatedChallenge = await tx.auctionChallenge.update({
        where: { id: challengeId },
        data: {
          status: "FAILED",
          completedAt: now,
          success: false,
        },
      });

      const attempt = await tx.teamChallengeAttempt.findFirst({
        where: { challengeId, teamId: team.id },
        orderBy: { startedAt: "desc" },
      });
      if (attempt) {
        await tx.teamChallengeAttempt.update({
          where: { id: attempt.id },
          data: {
            completedAt: now,
            success: false,
            timeUsedSeconds,
            pointsAwarded: 0,
          },
        });
      }

      await logAuditEvent({
        eventId: team.eventId,
        teamId: team.id,
        actor: "ADMIN",
        action: "CHALLENGE_FAILED",
        details: `Team ${team.name} failed "${challenge.title}". Penalty: -${deductiblePenalty} pts deducted from wallet.`,
      });

      return {
        success: false,
        challenge: updatedChallenge,
        penaltyDeducted: deductiblePenalty,
        timeUsedSeconds,
      };
    }
  });
}
