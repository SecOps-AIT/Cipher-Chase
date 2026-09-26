export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/admin/hints/record
 * Manually record that a team received a hint (admin only)
 * Round 1: -10 points per hint (fixed)
 * Round 2: Variable penalty per question (admin-set hintPenalty field)
 */
export async function POST(req: Request) {
  try {
    const session = await requireAdminSession();
    
    const body = await req.json();
    const { teamId, round, questionId, description } = body;

    // Validation
    if (!teamId || !round) {
      return NextResponse.json(
        { error: "Missing required fields: teamId, round" },
        { status: 400 }
      );
    }

    if (round !== 1 && round !== 2) {
      return NextResponse.json(
        { error: "Invalid round. Must be 1 or 2" },
        { status: 400 }
      );
    }

    // Round 2 requires questionId to determine hint penalty
    if (round === 2 && !questionId) {
      return NextResponse.json(
        { error: "questionId is required for Round 2 hints" },
        { status: 400 }
      );
    }

    // Get team details
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      select: { id: true, name: true, eventId: true, manualHintsR1: true, manualHintsR2: true, score: true }
    });

    if (!team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    // Determine hint penalty
    let HINT_PENALTY = 10; // Round 1 default: -10 points
    let questionTitle = "";

    if (round === 2 && questionId) {
      // For Round 2, get the hintPenalty from the AuctionQuestion
      const auctionQuestion = await prisma.auctionQuestion.findFirst({
        where: { questionId: questionId },
        select: { hintPenalty: true, title: true }
      });

      if (!auctionQuestion) {
        return NextResponse.json(
          { error: "Round 2 question not found" },
          { status: 404 }
        );
      }

      // hintPenalty is stored as negative (e.g., -10, -15)
      // Convert to positive for deduction
      HINT_PENALTY = Math.abs(auctionQuestion.hintPenalty);
      questionTitle = auctionQuestion.title;
    }

    const hintDescription = description || 
      (round === 2 
        ? `Hint taken for "${questionTitle}" (Round 2)` 
        : `Hint taken (Round 1)`);

    // Update team: increment hint count and deduct score
    const updateData: any = {
      score: { decrement: HINT_PENALTY },
      hintPenaltyApplied: { increment: HINT_PENALTY }
    };

    if (round === 1) {
      updateData.manualHintsR1 = { increment: 1 };
    } else {
      updateData.manualHintsR2 = { increment: 1 };
    }

    const updatedTeam = await prisma.team.update({
      where: { id: teamId },
      data: updateData
    });

    // Create ScoreEvent for tracking (will show in team dashboard)
    await prisma.scoreEvent.create({
      data: {
        eventId: team.eventId,
        teamId: team.id,
        type: "HINT_PENALTY",
        points: -HINT_PENALTY,
        reason: `${hintDescription} (-${HINT_PENALTY} pts)`,
        metadata: {
          round,
          questionId: questionId || null,
          questionTitle: questionTitle || null,
          manualHint: true,
          penaltyAmount: HINT_PENALTY,
          recordedAt: new Date().toISOString(),
          recordedBy: session.email
        }
      }
    });

    // Log to ActivityLog
    await prisma.activityLog.create({
      data: {
        eventId: team.eventId,
        teamId: team.id,
        actor: "ADMIN",
        action: "HINT_RECORDED",
        target: `Team: ${team.name}`,
        metadata: {
          round,
          questionId: questionId || null,
          questionTitle: questionTitle || null,
          description: hintDescription,
          penalty: -HINT_PENALTY,
          previousScore: team.score,
          newScore: updatedTeam.score,
          recordedBy: session.email
        }
      }
    });

    return NextResponse.json({
      success: true,
      message: `Hint recorded for ${team.name}. -${HINT_PENALTY} points applied.`,
      data: {
        teamId: updatedTeam.id,
        teamName: team.name,
        round,
        questionTitle: questionTitle || null,
        hintsR1: updatedTeam.manualHintsR1,
        hintsR2: updatedTeam.manualHintsR2,
        totalHintPenalty: updatedTeam.hintPenaltyApplied,
        previousScore: team.score,
        newScore: updatedTeam.score,
        penaltyApplied: -HINT_PENALTY,
        description: hintDescription
      }
    });

  } catch (err: any) {
    if (err.message === "UNAUTHORIZED_ADMIN") {
      return NextResponse.json(
        { error: "Unauthorized: Admin access required" },
        { status: 403 }
      );
    }
    console.error("Error recording manual hint:", err);
    return NextResponse.json(
      { error: err.message || "Failed to record hint" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/hints/record
 * Get hint statistics for all teams
 */
export async function GET() {
  try {
    await requireAdminSession();

    const teams = await prisma.team.findMany({
      select: {
        id: true,
        name: true,
        manualHintsR1: true,
        manualHintsR2: true,
        hintPenaltyApplied: true,
        score: true
      },
      orderBy: { name: 'asc' }
    });

    const hintStats = teams.map(team => ({
      teamId: team.id,
      teamName: team.name,
      hintsR1: team.manualHintsR1,
      hintsR2: team.manualHintsR2,
      totalHints: team.manualHintsR1 + team.manualHintsR2,
      totalPenalty: team.hintPenaltyApplied,
      currentScore: team.score
    }));

    const summary = {
      totalTeams: teams.length,
      totalHintsGiven: hintStats.reduce((sum, t) => sum + t.totalHints, 0),
      totalPenaltyPoints: hintStats.reduce((sum, t) => sum + t.totalPenalty, 0),
      averageHintsPerTeam: hintStats.reduce((sum, t) => sum + t.totalHints, 0) / teams.length || 0
    };

    const logEvents = await prisma.scoreEvent.findMany({
      where: { type: "HINT_PENALTY" },
      include: { team: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 200,
    });

    const log = logEvents.map((e) => {
      const meta = (e.metadata as Record<string, any>) || {};
      return {
        id: e.id,
        teamName: e.team.name,
        round: meta.round ?? null,
        questionTitle: meta.questionTitle ?? null,
        penalty: Math.abs(e.points),
        reason: e.reason,
        recordedBy: meta.recordedBy ?? null,
        createdAt: e.createdAt.toISOString(),
      };
    });

    return NextResponse.json({
      success: true,
      summary,
      teams: hintStats,
      log,
    });

  } catch (err: any) {
    if (err.message === "UNAUTHORIZED_ADMIN") {
      return NextResponse.json(
        { error: "Unauthorized: Admin access required" },
        { status: 403 }
      );
    }
    console.error("Error fetching hint stats:", err);
    return NextResponse.json(
      { error: err.message || "Failed to fetch hint stats" },
      { status: 500 }
    );
  }
}
