import { prisma } from "@/lib/prisma";

export interface LeaderboardEntry {
  rank: number;
  teamId: string;
  teamName: string;
  joinCode: string;
  score: number;
  qualified: boolean;
  scoreReachedAt: string | null;
  totalTimeSeconds: number;
  timeFormatted: string;
  solvesCount: number;
  members: string[];
  // Round 1 specific data
  round1TimerStatus?: "NOT_STARTED" | "ACTIVE" | "EXPIRED";
  round1TimeRemaining?: number;
  round1Progress?: string;
  recentActivity?: {
    type: "SOLVE" | "HINT_CLAIM" | "TIMER_START";
    timestamp: string;
    description: string;
  }[];
}

export async function getAuthoritativeLeaderboard(): Promise<{
  event: { id: string; name: string; status: string } | null;
  currentRound: { id: string; name: string; number: number; status: string } | null;
  leaderboard: LeaderboardEntry[];
  roundStats?: {
    totalQuestions: number;
    coreQuestions: number;
    backupQuestions: number;
    releasedBackupQuestions: number;
    totalSolves: number;
    teamsActive: number;
  };
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

  // Get Round 1 for timer data
  const round1 = await prisma.round.findFirst({
    where: { eventId: event.id, number: 1 },
    include: {
      questions: {
        select: {
          id: true,
          isCore: true,
          isReleased: true,
          submissions: {
            where: { isCorrect: true },
            select: { id: true }
          }
        }
      }
    }
  });

  // Fetch all teams for this event (optimized query)
  const teams = await prisma.team.findMany({
    where: { eventId: event.id },
    select: {
      id: true,
      name: true,
      joinCode: true,
      score: true,
      qualified: true,
      scoreReachedAt: true,
      round1StartedAt: true,
      round1DeadlineAt: true,
      round1Duration: true,
      members: { 
        select: { name: true },
        take: 10 // Limit member names
      },
      _count: {
        select: {
          submissions: { where: { isCorrect: true } },
          challengeAttempts: { where: { success: true } },
          hintClaims: true
        }
      }
    },
  });

  // Get challenge attempts time separately if needed for Round 2
  const challengeAttemptsMap = new Map<string, number>();
  if (isRound2OrFinished) {
    const attempts = await prisma.teamChallengeAttempt.groupBy({
      by: ['teamId'],
      where: {
        teamId: { in: teams.map(t => t.id) },
        success: true
      },
      _sum: {
        timeUsedSeconds: true
      }
    });
    attempts.forEach(a => {
      challengeAttemptsMap.set(a.teamId, a._sum.timeUsedSeconds || 0);
    });
  }

  const isRound2OrFinished =
    (currentRound && currentRound.number >= 2) || event.status === "FINISHED";

  // Calculate Round 1 stats if available
  let roundStats;
  if (round1) {
    const coreQuestions = round1.questions.filter(q => q.isCore).length;
    const backupQuestions = round1.questions.filter(q => !q.isCore).length;
    const releasedBackupQuestions = round1.questions.filter(q => !q.isCore && q.isReleased).length;
    const totalSolves = round1.questions.reduce((sum, q) => sum + q.submissions.length, 0);
    const teamsActive = teams.filter(t => 
      t.round1StartedAt && 
      (!t.round1DeadlineAt || new Date(t.round1DeadlineAt) > now)
    ).length;

    roundStats = {
      totalQuestions: round1.questions.length,
      coreQuestions,
      backupQuestions,
      releasedBackupQuestions,
      totalSolves,
      teamsActive
    };
  }

  // Precompute metrics with Round 1 timer data (optimized)
  const teamsWithMetrics = teams.map((team) => {
    const totalTimeSeconds = isRound2OrFinished 
      ? (challengeAttemptsMap.get(team.id) || 0)
      : 0;
      0
    );

    const minutes = Math.floor(totalTimeSeconds / 60);
    const seconds = totalTimeSeconds % 60;
    const timeFormatted =
      totalTimeSeconds > 0 ? `${minutes}m ${seconds.toString().padStart(2, "0")}s` : "0s";

    // Calculate Round 1 timer status
    let round1TimerStatus: "NOT_STARTED" | "ACTIVE" | "EXPIRED" | undefined;
    let round1TimeRemaining: number | undefined;
    let round1Progress: string | undefined;

    if (round1 && currentRound?.number === 1) {
      if (!team.round1StartedAt) {
        round1TimerStatus = "NOT_STARTED";
        round1Progress = "Ready to start";
      } else if (team.round1DeadlineAt && new Date(team.round1DeadlineAt) > now) {
        round1TimerStatus = "ACTIVE";
        round1TimeRemaining = Math.max(0, Math.floor((new Date(team.round1DeadlineAt).getTime() - now.getTime()) / 1000));
        const timeMin = Math.floor(round1TimeRemaining / 60);
        const timeSec = round1TimeRemaining % 60;
        round1Progress = `${timeMin}:${timeSec.toString().padStart(2, '0')} remaining`;
      } else {
        round1TimerStatus = "EXPIRED";
        round1Progress = "Time expired";
      }
    }

    // Build recent activity (simplified - removed for performance)
    const recentActivity: { type: "SOLVE" | "HINT_CLAIM" | "TIMER_START"; timestamp: string; description: string; }[] = [];
    
    // Add timer start only
    if (team.round1StartedAt) {
      recentActivity.push({
        type: "TIMER_START",
        timestamp: team.round1StartedAt.toISOString(),
        description: "Started Round 1"
      });
    }

    return {
      teamId: team.id,
      teamName: team.name,
      joinCode: team.joinCode,
      score: team.score,
      qualified: team.qualified,
      scoreReachedAt: team.scoreReachedAt ? team.scoreReachedAt.toISOString() : null,
      scoreReachedAtDate: team.scoreReachedAt ?? new Date("2099-01-01"),
      totalTimeSeconds,
      timeFormatted,
      solvesCount: team._count.submissions,
      members: team.members.map((m) => m.name),
      round1TimerStatus,
      round1TimeRemaining,
      round1Progress,
      recentActivity: recentActivity.slice(0, 1) // Just timer start
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
    joinCode: t.joinCode,
    score: t.score,
    qualified: t.qualified,
    scoreReachedAt: t.scoreReachedAt,
    totalTimeSeconds: t.totalTimeSeconds,
    timeFormatted: t.timeFormatted,
    solvesCount: t.solvesCount,
    members: t.members,
    round1TimerStatus: t.round1TimerStatus,
    round1TimeRemaining: t.round1TimeRemaining,
    round1Progress: t.round1Progress,
    recentActivity: t.recentActivity
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
    roundStats,
    serverTime: now.toISOString(),
  };
}