export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { validateTeamAuth } from "@/lib/auth";

export async function GET(
  request: NextRequest,
  { params }: { params: { assignmentId: string } }
) {
  try {
    const teamAuth = await validateTeamAuth(request);
    if (!teamAuth.success) {
      return NextResponse.json({ error: teamAuth.error }, { status: 401 });
    }

    const { assignmentId } = params;

    if (!assignmentId) {
      return NextResponse.json(
        { error: "Assignment ID is required" },
        { status: 400 }
      );
    }

    const { prisma } = await import("@/lib/prisma");

    const assignment = await prisma.teamChallengeAssignment.findUnique({
      where: { id: assignmentId },
      include: {
        auctionQuestion: {
          include: {
            question: {
              select: {
                id: true,
                title: true,
                description: true,
                difficulty: true,
                category: true,
                points: true,
                hints: {
                  orderBy: { order: "asc" },
                  select: {
                    id: true,
                    title: true,
                    content: true,
                    cost: true,
                    order: true
                  }
                }
                // Note: NOT including answer for security
              }
            }
          }
        }
      }
    });

    if (!assignment) {
      return NextResponse.json(
        { error: "Assignment not found" },
        { status: 404 }
      );
    }

    if (assignment.teamId !== teamAuth.teamId) {
      return NextResponse.json(
        { error: "Assignment does not belong to this team" },
        { status: 403 }
      );
    }

    // Get timer status
    const { getTimerStatus } = await import("@/lib/round2-timer");
    const timerResult = await getTimerStatus(assignmentId, teamAuth.teamId);

    // Get claimed hints for this team and question
    const claimedHints = await prisma.hintClaim.findMany({
      where: {
        teamId: teamAuth.teamId,
        questionHintId: {
          in: assignment.auctionQuestion.question.hints.map(h => h.id)
        }
      }
    });

    const claimedHintIds = new Set(claimedHints.map(c => c.questionHintId));

    // Format hints with claim status
    const hintsWithClaimStatus = assignment.auctionQuestion.question.hints.map(hint => ({
      id: hint.id,
      title: hint.title,
      cost: hint.cost,
      order: hint.order,
      isClaimed: claimedHintIds.has(hint.id),
      content: claimedHintIds.has(hint.id) ? hint.content : null,
      claimedAt: claimedHints.find(c => c.questionHintId === hint.id)?.claimedAt.toISOString() || null
    }));

    // Get team's submissions for this question
    const submissions = await prisma.submission.findMany({
      where: {
        teamId: teamAuth.teamId,
        questionId: assignment.auctionQuestion.questionId
      },
      orderBy: { submittedAt: "desc" },
      take: 10,
      select: {
        id: true,
        submittedAnswer: true,
        isCorrect: true,
        submittedAt: true,
        submittedBy: true
      }
    });

    return NextResponse.json({
      success: true,
      assignment: {
        id: assignment.id,
        status: assignment.status,
        winningBidSeconds: assignment.winningBidSeconds,
        bonusPoints: assignment.bonusPoints,
        completedAt: assignment.completedAt?.toISOString() || null,
        failedAt: assignment.failedAt?.toISOString() || null,
        finalScoreChange: assignment.finalScoreChange
      },
      auctionQuestion: {
        title: assignment.auctionQuestion.title,
        topic: assignment.auctionQuestion.topic,
        basePoints: assignment.auctionQuestion.basePoints,
        baseTimeSeconds: assignment.auctionQuestion.baseTimeSeconds
      },
      question: {
        ...assignment.auctionQuestion.question,
        hints: hintsWithClaimStatus
      },
      timer: timerResult.timer,
      submissions
    });
  } catch (error: any) {
    console.error("Get assignment question error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}