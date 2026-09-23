import { NextRequest, NextResponse } from "next/server";
import { validateTeamAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAuditEvent } from "@/lib/audit";

/**
 * GET /api/auction/assignments/:assignmentId/hints
 * Get all hints for a Round 2 challenge assignment
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { assignmentId: string } }
) {
  try {
    const authResult = await validateTeamAuth(req);
    if (!authResult.success || !authResult.teamId) {
      return NextResponse.json({ error: authResult.error || "Unauthorized" }, { status: 401 });
    }

    const { assignmentId } = params;
    const teamId = authResult.teamId!;

    // Get assignment with question hints
    const assignment = await prisma.teamChallengeAssignment.findUnique({
      where: { id: assignmentId },
      include: {
        auctionQuestion: {
          include: {
            question: {
              include: {
                hints: {
                  orderBy: { order: "asc" }
                }
              }
            }
          }
        }
      }
    });

    if (!assignment) {
      return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
    }

    if (assignment.teamId !== teamId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Get claimed hints for this team
    const claimedHints = await prisma.hintClaim.findMany({
      where: {
        teamId,
        questionHintId: {
          in: assignment.auctionQuestion.question.hints.map(h => h.id)
        }
      }
    });

    const claimedHintIds = new Set(claimedHints.map(c => c.questionHintId));

    // Format hints with claim status
    const hints = assignment.auctionQuestion.question.hints.map(hint => ({
      id: hint.id,
      title: hint.title,
      cost: hint.cost,
      order: hint.order,
      isClaimed: claimedHintIds.has(hint.id),
      content: claimedHintIds.has(hint.id) ? hint.content : null,
      claimedAt: claimedHints.find(c => c.questionHintId === hint.id)?.claimedAt || null
    }));

    return NextResponse.json({ hints });
  } catch (error: any) {
    console.error("Get hints error:", error);
    return NextResponse.json(
      { error: "Failed to fetch hints" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/auction/assignments/:assignmentId/hints
 * Claim a hint for a Round 2 challenge (costs score points)
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { assignmentId: string } }
) {
  try {
    const authResult = await validateTeamAuth(req);
    if (!authResult.success || !authResult.teamId) {
      return NextResponse.json({ error: authResult.error || "Unauthorized" }, { status: 401 });
    }

    const { assignmentId } = params;
    const teamId = authResult.teamId!;
    const { hintId } = await req.json();

    if (!hintId) {
      return NextResponse.json(
        { error: "hintId is required" },
        { status: 400 }
      );
    }

    return await prisma.$transaction(async (tx) => {
      // Get assignment with question
      const assignment = await tx.teamChallengeAssignment.findUnique({
        where: { id: assignmentId },
        include: {
          auctionQuestion: {
            include: {
              question: {
                include: {
                  hints: true
                }
              },
              round: {
                select: { eventId: true }
              }
            }
          },
          team: {
            select: { name: true, score: true, eventId: true }
          }
        }
      });

      if (!assignment) {
        return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
      }

      if (assignment.teamId !== teamId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
      }

      // Check assignment is active
      if (assignment.status !== "ACTIVE") {
        return NextResponse.json(
          { error: "Challenge must be active to claim hints" },
          { status: 400 }
        );
      }

      // Find the hint
      const hint = assignment.auctionQuestion.question.hints.find(h => h.id === hintId);
      if (!hint) {
        return NextResponse.json({ error: "Hint not found" }, { status: 404 });
      }

      // Check if already claimed
      const existingClaim = await tx.hintClaim.findUnique({
        where: {
          teamId_questionHintId: {
            teamId,
            questionHintId: hintId
          }
        }
      });

      if (existingClaim) {
        return NextResponse.json(
          { error: "Hint already claimed" },
          { status: 400 }
        );
      }

      // Check team has enough score
      if (assignment.team.score < hint.cost) {
        return NextResponse.json(
          { 
            error: `Insufficient score. Need ${hint.cost} points, have ${assignment.team.score}` 
          },
          { status: 400 }
        );
      }

      // Deduct score
      const updatedTeam = await tx.team.update({
        where: { id: teamId },
        data: {
          score: { decrement: hint.cost }
        }
      });

      // Create hint claim
      const claim = await tx.hintClaim.create({
        data: {
          teamId,
          questionHintId: hintId,
          cost: hint.cost
        }
      });

      // Create score event
      await tx.scoreEvent.create({
        data: {
          eventId: assignment.team.eventId,
          teamId,
          roundId: assignment.auctionQuestion.round.eventId,
          type: "HINT_PURCHASE",
          points: -hint.cost,
          reason: `Purchased hint "${hint.title}" for "${assignment.auctionQuestion.title}"`
        }
      });

      // Log audit event
      await logAuditEvent({
        eventId: assignment.team.eventId,
        teamId,
        actor: "TEAM",
        action: "HINT_CLAIMED",
        details: `Team "${assignment.team.name}" claimed hint "${hint.title}" for Round 2 challenge "${assignment.auctionQuestion.title}" (-${hint.cost} pts)`
      });

      return NextResponse.json({
        success: true,
        message: `Hint claimed! ${hint.cost} points deducted.`,
        hint: {
          id: hint.id,
          title: hint.title,
          content: hint.content,
          cost: hint.cost,
          order: hint.order,
          isClaimed: true,
          claimedAt: claim.claimedAt
        },
        remainingScore: updatedTeam.score
      });
    });
  } catch (error: any) {
    console.error("Claim hint error:", error);
    return NextResponse.json(
      { error: "Failed to claim hint" },
      { status: 500 }
    );
  }
}
