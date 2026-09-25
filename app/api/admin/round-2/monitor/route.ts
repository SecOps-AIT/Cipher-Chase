export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/admin/round-2/monitor
 * Get comprehensive Round 2 monitoring data for admin
 * Shows all teams, their purchased questions, status, timers, hints
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdminSession();

    // Get all teams with their Round 2 assignments
    const teams = await prisma.team.findMany({
      where: {
        qualified: true, // Only qualified teams
      },
      select: {
        id: true,
        name: true,
        joinCode: true,
        score: true,
        manualHintsR2: true,
        challengeAssignments: {
          include: {
            auctionQuestion: {
              select: {
                id: true,
                title: true,
                topic: true,
                points: true,
                hintPenalty: true,
                baseTimeSeconds: true
              }
            }
          },
          orderBy: {
            createdAt: 'asc'
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    });

    const now = new Date();

    // Format data for monitoring
    const monitoringData = teams.map(team => {
      const assignments = team.challengeAssignments.map(assignment => {
        let timeRemaining: number | null = null;
        let timeElapsed: number | null = null;
        let progress = 0;

        if (assignment.status === 'ACTIVE' && assignment.startedAt && assignment.deadlineAt) {
          const totalDuration = assignment.deadlineAt.getTime() - assignment.startedAt.getTime();
          timeElapsed = now.getTime() - assignment.startedAt.getTime();
          timeRemaining = Math.max(0, Math.floor((assignment.deadlineAt.getTime() - now.getTime()) / 1000));
          progress = Math.min(100, Math.floor((timeElapsed / totalDuration) * 100));
        }

        return {
          id: assignment.id,
          questionId: assignment.auctionQuestion.id,
          questionTitle: assignment.auctionQuestion.title,
          topic: assignment.auctionQuestion.topic,
          points: assignment.auctionQuestion.points,
          hintPenalty: assignment.auctionQuestion.hintPenalty,
          status: assignment.status, // READY, ACTIVE, COMPLETED, FAILED
          bidTimeSeconds: assignment.winningBidSeconds,
          startedAt: assignment.startedAt?.toISOString() || null,
          deadlineAt: assignment.deadlineAt?.toISOString() || null,
          completedAt: assignment.completedAt?.toISOString() || null,
          failedAt: assignment.failedAt?.toISOString() || null,
          timeRemaining, // seconds remaining (for ACTIVE)
          progress, // percentage (for ACTIVE)
          finalScore: assignment.finalScoreChange
        };
      });

      const stats = {
        total: assignments.length,
        ready: assignments.filter(a => a.status === 'READY').length,
        active: assignments.filter(a => a.status === 'ACTIVE').length,
        completed: assignments.filter(a => a.status === 'COMPLETED').length,
        failed: assignments.filter(a => a.status === 'FAILED').length,
        totalPoints: assignments
          .filter(a => a.status === 'COMPLETED')
          .reduce((sum, a) => sum + a.finalScore, 0)
      };

      return {
        teamId: team.id,
        teamName: team.name,
        joinCode: team.joinCode,
        currentScore: team.score,
        hintsUsedR2: team.manualHintsR2,
        assignments,
        stats
      };
    });

    // Overall statistics
    const overallStats = {
      totalQualifiedTeams: teams.length,
      totalAssignments: monitoringData.reduce((sum, t) => sum + t.stats.total, 0),
      readyCount: monitoringData.reduce((sum, t) => sum + t.stats.ready, 0),
      activeCount: monitoringData.reduce((sum, t) => sum + t.stats.active, 0),
      completedCount: monitoringData.reduce((sum, t) => sum + t.stats.completed, 0),
      failedCount: monitoringData.reduce((sum, t) => sum + t.stats.failed, 0)
    };

    return NextResponse.json({
      success: true,
      timestamp: now.toISOString(),
      overallStats,
      teams: monitoringData
    });

  } catch (error: any) {
    if (error.message === "UNAUTHORIZED_ADMIN") {
      return NextResponse.json(
        { error: "Unauthorized: Admin access required" },
        { status: 403 }
      );
    }
    console.error("Round 2 monitoring error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
