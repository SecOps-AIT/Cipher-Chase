import { prisma } from "@/lib/prisma";
import { logAuditEvent } from "@/lib/audit";

// ============================================================
// TIMER MANAGEMENT FUNCTIONS
// ============================================================

/**
 * Start the timer for a purchased question when team first enters
 */
export async function startQuestionTimer({
  assignmentId,
  teamId
}: {
  assignmentId: string;
  teamId: string;
}): Promise<{ 
  success: boolean; 
  message: string; 
  assignment?: {
    id: string;
    status: string;
    startedAt: string;
    deadlineAt: string;
    timeRemaining: number;
  }
}> {
  return await prisma.$transaction(async (tx) => {
    const assignment = await tx.teamChallengeAssignment.findUnique({
      where: { id: assignmentId },
      include: {
        team: { select: { name: true } },
        auctionQuestion: { 
          select: { 
            title: true,
            round: { select: { eventId: true } }
          } 
        }
      }
    });

    if (!assignment) {
      return { success: false, message: "Assignment not found" };
    }

    if (assignment.teamId !== teamId) {
      return { success: false, message: "Assignment does not belong to this team" };
    }

    if (assignment.status === "ACTIVE") {
      // Timer already started, return current state
      const now = new Date();
      const timeRemaining = assignment.deadlineAt 
        ? Math.max(0, Math.floor((assignment.deadlineAt.getTime() - now.getTime()) / 1000))
        : 0;

      return {
        success: true,
        message: "Timer already running",
        assignment: {
          id: assignment.id,
          status: assignment.status,
          startedAt: assignment.startedAt!.toISOString(),
          deadlineAt: assignment.deadlineAt!.toISOString(),
          timeRemaining
        }
      };
    }

    if (assignment.status !== "READY") {
      return { 
        success: false, 
        message: `Question is ${assignment.status.toLowerCase()} and cannot be started` 
      };
    }

    // Start the timer
    const now = new Date();
    const deadline = new Date(now.getTime() + assignment.winningBidSeconds * 1000);

    const updated = await tx.teamChallengeAssignment.update({
      where: { id: assignmentId },
      data: {
        status: "ACTIVE",
        startedAt: now,
        deadlineAt: deadline
      }
    });

    // Log timer start
    await logAuditEvent({
      eventId: assignment.auctionQuestion.round.eventId,
      teamId,
      actor: "TEAM",
      action: "QUESTION_TIMER_STARTED",
      details: `Team "${assignment.team.name}" started timer for "${assignment.auctionQuestion.title}" (${assignment.winningBidSeconds}s deadline)`
    });

    return {
      success: true,
      message: "Timer started successfully",
      assignment: {
        id: updated.id,
        status: updated.status,
        startedAt: updated.startedAt!.toISOString(),
        deadlineAt: updated.deadlineAt!.toISOString(),
        timeRemaining: assignment.winningBidSeconds
      }
    };
  });
}

/**
 * Get timer status for a team's assignment
 */
export async function getTimerStatus(assignmentId: string, teamId: string): Promise<{
  success: boolean;
  message?: string;
  timer?: {
    status: "NOT_STARTED" | "RUNNING" | "EXPIRED";
    startedAt: string | null;
    deadlineAt: string | null;
    timeRemaining: number;
    isExpired: boolean;
  };
}> {
  const assignment = await prisma.teamChallengeAssignment.findUnique({
    where: { id: assignmentId }
  });

  if (!assignment) {
    return { success: false, message: "Assignment not found" };
  }

  if (assignment.teamId !== teamId) {
    return { success: false, message: "Assignment does not belong to this team" };
  }

  const now = new Date();
  
  if (assignment.status === "READY") {
    return {
      success: true,
      timer: {
        status: "NOT_STARTED",
        startedAt: null,
        deadlineAt: null,
        timeRemaining: assignment.winningBidSeconds,
        isExpired: false
      }
    };
  }

  if (assignment.status === "ACTIVE" && assignment.startedAt && assignment.deadlineAt) {
    const timeRemaining = Math.max(0, Math.floor((assignment.deadlineAt.getTime() - now.getTime()) / 1000));
    const isExpired = timeRemaining === 0;

    return {
      success: true,
      timer: {
        status: isExpired ? "EXPIRED" : "RUNNING",
        startedAt: assignment.startedAt.toISOString(),
        deadlineAt: assignment.deadlineAt.toISOString(),
        timeRemaining,
        isExpired
      }
    };
  }

  // Completed or Failed
  return {
    success: true,
    timer: {
      status: "EXPIRED",
      startedAt: assignment.startedAt?.toISOString() || null,
      deadlineAt: assignment.deadlineAt?.toISOString() || null,
      timeRemaining: 0,
      isExpired: true
    }
  };
}

/**
 * Check for expired timers and mark them as failed
 */
export async function processExpiredTimers(): Promise<{
  processedCount: number;
  expiredAssignments: string[];
}> {
  const now = new Date();
  
  // Find all active assignments with expired deadlines
  const expiredAssignments = await prisma.teamChallengeAssignment.findMany({
    where: {
      status: "ACTIVE",
      deadlineAt: {
        lte: now
      }
    },
    include: {
      team: { select: { name: true } },
      auctionQuestion: { 
        select: { 
          title: true,
          basePoints: true,
          round: { select: { eventId: true, id: true } }
        } 
      }
    }
  });

  const results: string[] = [];

  for (const assignment of expiredAssignments) {
    try {
      await prisma.$transaction(async (tx) => {
        // Mark as failed
        await tx.teamChallengeAssignment.update({
          where: { id: assignment.id },
          data: {
            status: "FAILED",
            failedAt: now,
            finalScoreChange: assignment.bonusPoints * -1 // Apply negative penalty
          }
        });

        // Apply score penalty
        await tx.team.update({
          where: { id: assignment.teamId },
          data: {
            score: { increment: assignment.bonusPoints * -1 } // Negative bonus
          }
        });

        // Create score event
        await tx.scoreEvent.create({
          data: {
            eventId: assignment.auctionQuestion.round.eventId,
            teamId: assignment.teamId,
            roundId: assignment.auctionQuestion.round.id,
            type: "ROUND_2_TIMEOUT_PENALTY",
            points: assignment.bonusPoints * -1,
            reason: `Time auction failure penalty for "${assignment.auctionQuestion.title}"`
          }
        });

        // Log the timeout
        await logAuditEvent({
          eventId: assignment.auctionQuestion.round.eventId,
          teamId: assignment.teamId,
          actor: "SYSTEM",
          action: "QUESTION_TIMEOUT",
          details: `Team "${assignment.team.name}" timed out on "${assignment.auctionQuestion.title}" (penalty: ${assignment.bonusPoints * -1})`
        });
      }, { timeout: 20000, maxWait: 10000 });

      results.push(assignment.id);
    } catch (error) {
      console.error(`Failed to process expired timer for assignment ${assignment.id}:`, error);
    }
  }

  return {
    processedCount: results.length,
    expiredAssignments: results
  };
}

// ============================================================
// QUESTION SUBMISSION AND SCORING
// ============================================================

/**
 * Submit answer for an active question
 */
export async function submitQuestionAnswer({
  assignmentId,
  teamId,
  memberId,
  answer
}: {
  assignmentId: string;
  teamId: string;
  memberId?: string;
  answer: string;
}): Promise<{
  success: boolean;
  message: string;
  result?: {
    isCorrect: boolean;
    scoreChange: number;
    timeUsed: number;
    status: string;
  };
}> {
  return await prisma.$transaction(async (tx) => {
    const assignment = await tx.teamChallengeAssignment.findUnique({
      where: { id: assignmentId },
      include: {
        team: { select: { name: true } },
        auctionQuestion: { 
          include: { 
            question: { select: { answer: true, answerMode: true } },
            round: { select: { eventId: true, id: true } }
          } 
        }
      }
    });

    if (!assignment) {
      return { success: false, message: "Assignment not found" };
    }

    if (assignment.teamId !== teamId) {
      return { success: false, message: "Assignment does not belong to this team" };
    }

    if (assignment.status !== "ACTIVE") {
      return { success: false, message: `Question is ${assignment.status.toLowerCase()} and cannot accept submissions` };
    }

    // Check if timer has expired
    const now = new Date();
    if (assignment.deadlineAt && now > assignment.deadlineAt) {
      return { success: false, message: "Time has expired for this question" };
    }

    // Normalize answers for comparison
    const correctAnswer = assignment.auctionQuestion.question.answer;
    const answerMode = assignment.auctionQuestion.question.answerMode || "TRIMMED";
    
    let normalizedSubmitted = answer;
    let normalizedCorrect = correctAnswer;
    
    if (answerMode === "TRIMMED") {
      normalizedSubmitted = answer.trim().toLowerCase();
      normalizedCorrect = correctAnswer.trim().toLowerCase();
    }

    const isCorrect = normalizedSubmitted === normalizedCorrect;

    // Calculate time used
    const timeUsedSeconds = assignment.startedAt 
      ? Math.floor((now.getTime() - assignment.startedAt.getTime()) / 1000)
      : 0;

    // Create submission record
    await tx.submission.create({
      data: {
        teamId,
        questionId: assignment.auctionQuestion.questionId,
        submittedAnswer: answer,
        isCorrect,
        submittedBy: memberId
      }
    });

    let scoreChange = 0;
    let status = assignment.status;

    if (isCorrect) {
      // Calculate successful completion score
      const basePoints = assignment.auctionQuestion.basePoints;
      const bonusPoints = assignment.bonusPoints;
      scoreChange = basePoints + bonusPoints;
      status = "COMPLETED";

      // Update assignment
      await tx.teamChallengeAssignment.update({
        where: { id: assignmentId },
        data: {
          status: "COMPLETED",
          completedAt: now,
          finalScoreChange: scoreChange
        }
      });

      // Award points to team
      await tx.team.update({
        where: { id: teamId },
        data: {
          score: { increment: scoreChange },
          scoreReachedAt: now
        }
      });

      // Create score event
      await tx.scoreEvent.create({
        data: {
          eventId: assignment.auctionQuestion.round.eventId,
          teamId,
          roundId: assignment.auctionQuestion.round.id,
          type: "ROUND_2_SOLVE",
          points: scoreChange,
          reason: `Solved "${assignment.auctionQuestion.title}" in ${timeUsedSeconds}s`
        }
      });

      // Log successful solve
      await logAuditEvent({
        eventId: assignment.auctionQuestion.round.eventId,
        teamId,
        actor: "TEAM",
        action: "QUESTION_SOLVED",
        details: `Team "${assignment.team.name}" solved "${assignment.auctionQuestion.title}" in ${timeUsedSeconds}s (+${scoreChange} pts)`
      });
    } else {
      // Log incorrect attempt
      await logAuditEvent({
        eventId: assignment.auctionQuestion.round.eventId,
        teamId,
        actor: "TEAM",
        action: "INCORRECT_SUBMISSION",
        details: `Team "${assignment.team.name}" submitted incorrect answer for "${assignment.auctionQuestion.title}"`
      });
    }

    return {
      success: true,
      message: isCorrect ? "Correct answer! Question completed." : "Incorrect answer. Keep trying!",
      result: {
        isCorrect,
        scoreChange,
        timeUsed: timeUsedSeconds,
        status
      }
    };
  }, { timeout: 20000, maxWait: 10000 });
}

// ============================================================
// ADMIN MONITORING FUNCTIONS
// ============================================================

/**
 * Get all active challenge assignments for admin monitoring
 */
export async function getActiveAssignmentsForAdmin(roundId: string) {
  const assignments = await prisma.teamChallengeAssignment.findMany({
    where: {
      auctionQuestion: {
        roundId
      },
      status: { in: ["READY", "ACTIVE"] }
    },
    include: {
      team: { select: { name: true } },
      auctionQuestion: { 
        select: { 
          title: true,
          topic: true,
          basePoints: true,
          baseTimeSeconds: true
        } 
      }
    },
    orderBy: [
      { status: "desc" }, // ACTIVE first, then READY
      { startedAt: "asc" }
    ]
  });

  const now = new Date();

  return assignments.map(assignment => {
    let timeRemaining = null;
    let outcome = "PENDING";
    
    if (assignment.status === "ACTIVE" && assignment.deadlineAt) {
      timeRemaining = Math.max(0, Math.floor((assignment.deadlineAt.getTime() - now.getTime()) / 1000));
      if (timeRemaining === 0) {
        outcome = "EXPIRED";
      }
    }

    return {
      id: assignment.id,
      teamName: assignment.team.name,
      questionTitle: assignment.auctionQuestion.title,
      topic: assignment.auctionQuestion.topic,
      status: assignment.status,
      bidTime: assignment.winningBidSeconds,
      startedAt: assignment.startedAt?.toISOString() || null,
      deadlineAt: assignment.deadlineAt?.toISOString() || null,
      timeRemaining,
      potentialBonus: assignment.bonusPoints,
      outcome
    };
  });
}