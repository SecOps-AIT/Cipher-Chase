import { prisma } from "@/lib/prisma";

export interface LeaderboardEntry {
  rank: number;
  teamId: string;
  teamName: string;
  score: number;
  wallet: number;
  qualified: boolean;
  scoreReachedAt: string | null;
  totalTimeSeconds: number;
  timeFormatted: string;
  solvesCount: number;
  members: string[];
}

export async function getAuthoritativeLeaderboard(): Promise<{
  event: { id: string; name: string; status: string } | null;
  currentRound: { id: string; name: string; number: number; status: string } | null;
  leaderboard: LeaderboardEntry[];
  serverTime: string;
}> {
  const now = new Date();

  // Find active event
  const event = await prisma.event.findFirst({
    orderBy: { createdAt: "desc" },
  });

  if (!event) {
    return {
      event: null,
      currentRound: null,
      leaderboard: [],
      serverTime: now.toISOString(),
    };
  }

  // Find active or latest round
  let currentRound = await prisma.round.findFirst({
    where: { eventId: event.id, status: { in: ["LIVE", "PAUSED", "READY"] } },
    orderBy: { number: "asc" },
  });

  if (!currentRound) {
    currentRound = await prisma.round.findFirst({
      where: { eventId: event.id },
      orderBy: { number: "desc" },
    });
  }

  // Fetch all teams for this event
  const teams = await prisma.team.findMany({
    where: { eventId: event.id },
    include: {
      members: { select: { name: true } },
      submissions: {
        where: { isCorrect: true },
        select: { id: true },
      },
      challengeAttempts: {
        where: { success: true },
        select: { timeUsedSeconds: true },
      },
    },
  });

  const isRound2OrFinished =
    (currentRound && currentRound.number >= 2) || event.status === "FINISHED";

  // Precompute metrics
  const teamsWithMetrics = teams.map((team) => {
    const totalTimeSeconds = team.challengeAttempts.reduce(
      (sum, att) => sum + (att.timeUsedSeconds || 0),
      0
    );

    const minutes = Math.floor(totalTimeSeconds / 60);
    const seconds = totalTimeSeconds % 60;
    const timeFormatted =
      totalTimeSeconds > 0 ? `${minutes}m ${seconds.toString().padStart(2, "0")}s` : "0s";

    return {
      teamId: team.id,
      teamName: team.name,
      score: team.score,
      wallet: team.wallet,
      qualified: team.qualified,
      scoreReachedAt: team.scoreReachedAt ? team.scoreReachedAt.toISOString() : null,
      scoreReachedAtDate: team.scoreReachedAt ?? new Date("2099-01-01"),
      totalTimeSeconds,
      timeFormatted,
      solvesCount: team.submissions.length,
      members: team.members.map((m) => m.name),
    };
  });

  // Sort based on authoritative rules:
  // In Round 2:
  // 1. Highest total score first.
  // 2. Tiebreaker: Shortest total challenge completion time (ascending).
  //
  // In Round 1:
  // 1. Highest total score first.
  // 2. Tiebreaker: Earliest scoreReachedAt (ascending).
  teamsWithMetrics.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }

    if (isRound2OrFinished) {
      // Shorter total challenge completion time ranks higher
      if (a.totalTimeSeconds !== b.totalTimeSeconds) {
        return a.totalTimeSeconds - b.totalTimeSeconds;
      }
    }

    // Default tiebreaker: Earliest scoreReachedAt
    return a.scoreReachedAtDate.getTime() - b.scoreReachedAtDate.getTime();
  });

  const rankedLeaderboard: LeaderboardEntry[] = teamsWithMetrics.map((t, idx) => ({
    rank: idx + 1,
    teamId: t.teamId,
    teamName: t.teamName,
    score: t.score,
    wallet: t.wallet,
    qualified: t.qualified,
    scoreReachedAt: t.scoreReachedAt,
    totalTimeSeconds: t.totalTimeSeconds,
    timeFormatted: t.timeFormatted,
    solvesCount: t.solvesCount,
    members: t.members,
  }));

  return {
    event: {
      id: event.id,
      name: event.name,
      status: event.status,
    },
    currentRound: currentRound
      ? {
          id: currentRound.id,
          name: currentRound.name,
          number: currentRound.number,
          status: currentRound.status,
        }
      : null,
    leaderboard: rankedLeaderboard,
    serverTime: now.toISOString(),
  };
}
