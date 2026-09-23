import { prisma } from "@/lib/prisma";

/**
 * Analytics for Round 2 time auction scoring
 */

export interface TeamScoringStats {
  teamId: string;
  teamName: string;
  totalAssignments: number;
  completed: number;
  failed: number;
  active: number;
  totalPointsEarned: number;
  totalPenalties: number;
  netScore: number;
  avgBonusPercentage: number;
  avgTimeReductionPercentage: number;
  successRate: number;
}

export interface QuestionPerformance {
  questionId: string;
  questionTitle: string;
  topic: string;
  baseTime: number;
  basePoints: number;
  totalAssignments: number;
  completed: number;
  failed: number;
  active: number;
  avgSolveTime: number | null;
  avgBidTime: number;
  successRate: number;
}

export interface AuctionMetrics {
  totalAuctions: number;
  openAuctions: number;
  closedAuctions: number;
  soldAuctions: number;
  totalBids: number;
  avgBidsPerAuction: number;
  totalAssignments: number;
  activeAssignments: number;
  completedAssignments: number;
  failedAssignments: number;
}

/**
 * Get comprehensive scoring statistics for all teams in Round 2
 */
export async function getTeamScoringStats(roundId: string): Promise<TeamScoringStats[]> {
  const assignments = await prisma.teamChallengeAssignment.findMany({
    where: {
      auctionQuestion: {
        roundId
      }
    },
    include: {
      team: {
        select: {
          id: true,
          name: true
        }
      },
      auctionQuestion: {
        select: {
          baseTimeSeconds: true,
          basePoints: true
        }
      }
    }
  });

  const teamStats = new Map<string, TeamScoringStats>();

  for (const assignment of assignments) {
    const teamId = assignment.team.id;
    
    if (!teamStats.has(teamId)) {
      teamStats.set(teamId, {
        teamId: assignment.team.id,
        teamName: assignment.team.name,
        totalAssignments: 0,
        completed: 0,
        failed: 0,
        active: 0,
        totalPointsEarned: 0,
        totalPenalties: 0,
        netScore: 0,
        avgBonusPercentage: 0,
        avgTimeReductionPercentage: 0,
        successRate: 0
      });
    }

    const stats = teamStats.get(teamId)!;
    stats.totalAssignments++;

    if (assignment.status === "COMPLETED") {
      stats.completed++;
      stats.totalPointsEarned += assignment.finalScoreChange || 0;
    } else if (assignment.status === "FAILED") {
      stats.failed++;
      stats.totalPenalties += Math.abs(assignment.finalScoreChange || 0);
    } else if (assignment.status === "ACTIVE") {
      stats.active++;
    }

    // Calculate time reduction percentage
    const timeReduction = assignment.auctionQuestion.baseTimeSeconds - assignment.winningBidSeconds;
    const reductionPercentage = (timeReduction / assignment.auctionQuestion.baseTimeSeconds) * 100;
    stats.avgTimeReductionPercentage += reductionPercentage;

    // Calculate bonus percentage (for completed assignments)
    if (assignment.status === "COMPLETED") {
      const bonusPercentage = (assignment.bonusPoints / assignment.auctionQuestion.basePoints) * 100;
      stats.avgBonusPercentage += bonusPercentage;
    }
  }

  // Calculate averages and net scores
  const results: TeamScoringStats[] = [];
  for (const stats of Array.from(teamStats.values())) {
    stats.netScore = stats.totalPointsEarned - stats.totalPenalties;
    stats.successRate = stats.totalAssignments > 0 
      ? (stats.completed / stats.totalAssignments) * 100 
      : 0;
    stats.avgTimeReductionPercentage = stats.totalAssignments > 0
      ? stats.avgTimeReductionPercentage / stats.totalAssignments
      : 0;
    stats.avgBonusPercentage = stats.completed > 0
      ? stats.avgBonusPercentage / stats.completed
      : 0;
    
    results.push(stats);
  }

  return results.sort((a, b) => b.netScore - a.netScore);
}

/**
 * Get performance metrics for all questions in Round 2
 */
export async function getQuestionPerformance(roundId: string): Promise<QuestionPerformance[]> {
  const auctionQuestions = await prisma.auctionQuestion.findMany({
    where: { roundId },
    include: {
      assignments: {
        include: {
          team: {
            select: { name: true }
          }
        }
      }
    }
  });

  const results: QuestionPerformance[] = auctionQuestions.map(aq => {
    const completed = aq.assignments.filter(a => a.status === "COMPLETED");
    const failed = aq.assignments.filter(a => a.status === "FAILED");
    const active = aq.assignments.filter(a => a.status === "ACTIVE");

    // Calculate average solve time (in seconds)
    const solveTimes = completed
      .filter(a => a.startedAt && a.completedAt)
      .map(a => {
        const start = a.startedAt!.getTime();
        const end = a.completedAt!.getTime();
        return (end - start) / 1000;
      });

    const avgSolveTime = solveTimes.length > 0
      ? solveTimes.reduce((sum, t) => sum + t, 0) / solveTimes.length
      : null;

    // Calculate average bid time
    const avgBidTime = aq.assignments.length > 0
      ? aq.assignments.reduce((sum, a) => sum + a.winningBidSeconds, 0) / aq.assignments.length
      : 0;

    const successRate = aq.assignments.length > 0
      ? (completed.length / aq.assignments.length) * 100
      : 0;

    return {
      questionId: aq.id,
      questionTitle: aq.title,
      topic: aq.topic,
      baseTime: aq.baseTimeSeconds,
      basePoints: aq.basePoints,
      totalAssignments: aq.assignments.length,
      completed: completed.length,
      failed: failed.length,
      active: active.length,
      avgSolveTime,
      avgBidTime,
      successRate
    };
  });

  return results.sort((a, b) => b.totalAssignments - a.totalAssignments);
}

/**
 * Get overall auction metrics for Round 2
 */
export async function getAuctionMetrics(roundId: string): Promise<AuctionMetrics> {
  const auctionQuestions = await prisma.auctionQuestion.findMany({
    where: { roundId },
    include: {
      _count: {
        select: {
          bids: true,
          assignments: true
        }
      },
      assignments: true
    }
  });

  const totalAuctions = auctionQuestions.length;
  const openAuctions = auctionQuestions.filter(aq => aq.status === "OPEN").length;
  const closedAuctions = auctionQuestions.filter(aq => aq.status === "CLOSED").length;
  const soldAuctions = auctionQuestions.filter(aq => aq.status === "SOLD").length;
  
  const totalBids = auctionQuestions.reduce((sum, aq) => sum + aq._count.bids, 0);
  const avgBidsPerAuction = totalAuctions > 0 ? totalBids / totalAuctions : 0;

  const allAssignments = auctionQuestions.flatMap(aq => aq.assignments);
  const totalAssignments = allAssignments.length;
  const activeAssignments = allAssignments.filter(a => a.status === "ACTIVE").length;
  const completedAssignments = allAssignments.filter(a => a.status === "COMPLETED").length;
  const failedAssignments = allAssignments.filter(a => a.status === "FAILED").length;

  return {
    totalAuctions,
    openAuctions,
    closedAuctions,
    soldAuctions,
    totalBids,
    avgBidsPerAuction,
    totalAssignments,
    activeAssignments,
    completedAssignments,
    failedAssignments
  };
}

/**
 * Get detailed score history for a team
 */
export async function getTeamScoreHistory(teamId: string, roundId: string) {
  const scoreEvents = await prisma.scoreEvent.findMany({
    where: {
      teamId,
      roundId,
      type: {
        in: ["ROUND_2_SOLVE", "ROUND_2_TIMEOUT_PENALTY"]
      }
    },
    orderBy: {
      createdAt: "asc"
    }
  });

  let runningTotal = 0;
  const history = scoreEvents.map(event => {
    runningTotal += event.points;
    return {
      timestamp: event.createdAt,
      type: event.type,
      points: event.points,
      reason: event.reason,
      runningTotal
    };
  });

  return history;
}

/**
 * Calculate real-time leaderboard for Round 2 with detailed metrics
 */
export async function getRound2Leaderboard(roundId: string) {
  const teams = await prisma.team.findMany({
    where: {
      qualified: true,
      event: {
        rounds: {
          some: {
            id: roundId
          }
        }
      }
    },
    include: {
      _count: {
        select: {
          challengeAssignments: {
            where: {
              auctionQuestion: {
                roundId
              }
            }
          }
        }
      }
    }
  });

  const teamStats = await getTeamScoringStats(roundId);
  const statsMap = new Map(teamStats.map(s => [s.teamId, s]));

  const leaderboard = teams.map(team => {
    const stats = statsMap.get(team.id);
    return {
      rank: 0, // Will be calculated after sorting
      teamId: team.id,
      teamName: team.name,
      totalScore: team.score,
      round2Points: stats?.netScore || 0,
      completed: stats?.completed || 0,
      failed: stats?.failed || 0,
      active: stats?.active || 0,
      successRate: stats?.successRate || 0,
      avgBonusPercentage: stats?.avgBonusPercentage || 0
    };
  });

  // Sort by total score (descending) and assign ranks
  leaderboard.sort((a, b) => b.totalScore - a.totalScore);
  leaderboard.forEach((team, index) => {
    team.rank = index + 1;
  });

  return leaderboard;
}

/**
 * Export scoring data for analysis
 */
export async function exportScoringData(roundId: string) {
  const [teamStats, questionPerformance, metrics, round] = await Promise.all([
    getTeamScoringStats(roundId),
    getQuestionPerformance(roundId),
    getAuctionMetrics(roundId),
    prisma.round.findUnique({
      where: { id: roundId },
      include: {
        event: {
          select: { name: true }
        }
      }
    })
  ]);

  return {
    metadata: {
      eventName: round?.event.name,
      roundNumber: round?.number,
      roundName: round?.name,
      exportedAt: new Date().toISOString()
    },
    overview: metrics,
    teamStats,
    questionPerformance
  };
}
