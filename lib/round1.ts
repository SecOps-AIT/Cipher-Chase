import { prisma } from "@/lib/prisma";
import { logAuditEvent } from "@/lib/audit";

export interface QuestionView {
  id: string;
  roundId: string;
  title: string;
  description: string;
  points: number;
  difficulty: string;
  category: string;
  order: number;
  globalStatus: "CORE_RELEASED" | "BACKUP_LOCKED" | "BACKUP_RELEASED";
  teamStatus: "SOLVED" | "UNSOLVED";
  status: "LOCKED" | "LIVE" | "CLOSED" | "SOLVED";
  solvedAt?: Date | null;
  serverTime: string;
  solvesCount: number;
  recentSolves?: {
    teamId: string;
    teamName: string;
    solvedAt: Date;
  }[];
  hints?: {
    id: string;
    title: string;
    cost: number;
    order: number;
    claimed: boolean;
  }[];
}

export interface Round1TeamResponse {
  round: {
    id: string;
    name: string;
    status: string;
    startedAt: Date | null;
    endedAt: Date | null;
  } | null;
  teamTimer: {
    started: boolean;
    startedAt: Date | null;
    deadlineAt: Date | null;
    duration: number;
    secondsRemaining: number;
    status: "NOT_STARTED" | "ACTIVE" | "EXPIRED";
  };
  questions: QuestionView[];
  coreCount: number;
  backupCount: number;
  releasedBackupCount: number;
  serverTime: string;
}

export async function getRound1QuestionsForTeam(
  teamId?: string
): Promise<Round1TeamResponse> {
  const now = new Date();

  // Get team timer data if teamId provided
  let team: { round1StartedAt: Date | null; round1DeadlineAt: Date | null; round1Duration: number } | null = null;
  if (teamId) {
    team = await prisma.team.findUnique({
      where: { id: teamId },
      select: {
        round1StartedAt: true,
        round1DeadlineAt: true,
        round1Duration: true,
      },
    });
  }

  // Calculate team timer status
  const teamTimerNotStarted = !team || !team.round1StartedAt || !team.round1DeadlineAt;
  const teamTimerSecondsRemaining = teamTimerNotStarted || !team
    ? 0
    : Math.max(0, Math.floor((team.round1DeadlineAt!.getTime() - now.getTime()) / 1000));
  const teamTimerExpired = !teamTimerNotStarted && teamTimerSecondsRemaining <= 0;
  const teamTimerStatus: "NOT_STARTED" | "ACTIVE" | "EXPIRED" = teamTimerNotStarted
    ? "NOT_STARTED"
    : teamTimerExpired
    ? "EXPIRED"
    : "ACTIVE";

  // Find Round 1
  const round = await prisma.round.findFirst({
    where: { number: 1 },
    include: { event: true },
  });

  if (!round) {
    return {
      round: null,
      teamTimer: {
        started: false,
        startedAt: null,
        deadlineAt: null,
        duration: 1800,
        secondsRemaining: 0,
        status: "NOT_STARTED",
      },
      questions: [],
      coreCount: 0,
      backupCount: 0,
      releasedBackupCount: 0,
      serverTime: now.toISOString(),
    };
  }

  // Get all active questions for Round 1
  const questions = await prisma.question.findMany({
    where: { roundId: round.id, isActive: true },
    orderBy: [{ isCore: "desc" }, { order: "asc" }],
    include: {
      hints: {
        orderBy: { order: "asc" },
        include: {
          claims: teamId ? {
            where: { teamId: teamId },
            select: { id: true }
          } : false
        }
      }
    }
  });

  const questionIds = questions.map((q) => q.id);

  // Get all correct solves for these questions (ordered by time)
  const allSolves = await prisma.submission.findMany({
    where: {
      questionId: { in: questionIds },
      isCorrect: true,
    },
    include: {
      team: { select: { id: true, name: true } },
    },
    orderBy: { submittedAt: "asc" },
  });

  // Group solves by questionId and track team solves
  const questionSolvesMap = new Map<string, { teamId: string; teamName: string; solvedAt: Date }[]>();
  const solvedQuestionIds = new Set<string>();
  const solvedDateMap = new Map<string, Date>();

  for (const s of allSolves) {
    const list = questionSolvesMap.get(s.questionId) || [];
    // Ensure 1 solve per team recorded in list
    if (!list.some((item) => item.teamId === s.teamId)) {
      list.push({
        teamId: s.teamId,
        teamName: s.team.name,
        solvedAt: s.submittedAt,
      });
      questionSolvesMap.set(s.questionId, list);
    }

    if (teamId && s.teamId === teamId) {
      solvedQuestionIds.add(s.questionId);
      solvedDateMap.set(s.questionId, s.submittedAt);
    }
  }

  // Count questions
  const coreCount = questions.filter(q => q.isCore).length;
  const backupCount = questions.filter(q => !q.isCore).length;
  const releasedBackupCount = questions.filter(q => !q.isCore && q.isReleased).length;

  // Map to client-safe question views (answers stripped!)
  const questionViews: QuestionView[] = questions.map((q) => {
    let globalStatus: "CORE_RELEASED" | "BACKUP_LOCKED" | "BACKUP_RELEASED" = "CORE_RELEASED";
    if (q.isCore) {
      globalStatus = "CORE_RELEASED";
    } else if (q.isReleased) {
      globalStatus = "BACKUP_RELEASED";
    } else {
      globalStatus = "BACKUP_LOCKED";
    }

    const isSolved = solvedQuestionIds.has(q.id);
    const teamStatus: "SOLVED" | "UNSOLVED" = isSolved ? "SOLVED" : "UNSOLVED";

    // Apply team timer logic:
    // Once team timer has started and not expired, all core questions are LIVE and unlocked without requiring admin approval!
    let status: "LOCKED" | "LIVE" | "CLOSED" | "SOLVED" = "LOCKED";
    if (isSolved) {
      status = "SOLVED";
    } else if (teamTimerExpired) {
      // Team timer expired - all questions freeze
      status = "CLOSED";
    } else {
      // Team timer active or ready: ALL questions are unlocked (LIVE) for the team
      status = "LIVE";
    }

    const solvesList = questionSolvesMap.get(q.id) || [];

    // Map hints for this question
    const questionHints = q.hints?.map(h => ({
      id: h.id,
      title: h.title,
      cost: h.cost,
      order: h.order,
      claimed: teamId ? h.claims.length > 0 : false,
    })) || [];

    return {
      id: q.id,
      roundId: q.roundId,
      title: q.title,
      description: q.description,
      points: q.points,
      difficulty: q.difficulty,
      category: q.category,
      order: q.order,
      globalStatus,
      teamStatus,
      status,
      solvedAt: solvedDateMap.get(q.id) || null,
      serverTime: now.toISOString(),
      solvesCount: solvesList.length,
      // LEADERBOARD IS ADMIN-ONLY: Participants must NOT see other team information
      // recentSolves is removed for participant view as per specification
      hints: questionHints,
    };
  });

  return {
    round: {
      id: round.id,
      name: round.name,
      status: round.status,
      startedAt: round.startedAt,
      endedAt: round.endedAt,
    },
    teamTimer: {
      started: !teamTimerNotStarted,
      startedAt: team?.round1StartedAt || null,
      deadlineAt: team?.round1DeadlineAt || null,
      duration: team?.round1Duration || 1200,
      secondsRemaining: teamTimerSecondsRemaining,
      status: teamTimerStatus,
    },
    questions: questionViews,
    coreCount,
    backupCount,
    releasedBackupCount,
    serverTime: now.toISOString(),
  };
}

export async function submitRound1Answer({
  teamId,
  questionId,
  submittedAnswer,
  memberName,
}: {
  teamId: string;
  questionId: string;
  submittedAnswer: string;
  memberName?: string;
}): Promise<{
  success: boolean;
  isCorrect?: boolean;
  points?: number;
  message: string;
  alreadySolved?: boolean;
}> {
  const now = new Date();
  const rawAnswer = submittedAnswer || "";
  const cleanAnswer = rawAnswer.trim();

  if (!cleanAnswer) {
    return { success: false, message: "Answer cannot be empty." };
  }

  // Fetch team
  const team = await prisma.team.findUnique({
    where: { id: teamId },
    include: { event: true },
  });
  if (!team) {
    return { success: false, message: "Team not found." };
  }

  // Check team timer status
  if (team.round1StartedAt && team.round1DeadlineAt) {
    if (now >= team.round1DeadlineAt) {
      return {
        success: false,
        message: "Your team's Round 1 timer has expired. No further submissions accepted.",
      };
    }
  }

  // Fetch question & round
  const question = await prisma.question.findUnique({
    where: { id: questionId },
    include: { round: true },
  });

  if (!question || !question.isActive) {
    return { success: false, message: "Question not found or inactive." };
  }

  const round = question.round;

  // 1. Authoritative check: Round status
  if (round.status === "PAUSED") {
    return {
      success: false,
      message: `Round 1 is currently paused. Submissions are temporarily paused.`,
    };
  }

  // 2. Authoritative check: Question availability
  if (!question.isCore && !question.isReleased) {
    return {
      success: false,
      message: "This challenge has not been released yet.",
    };
  }

  // 3. Server-side Rate Limiting: Max 5 submissions per 10 seconds per team per question
  const recentAttemptsCount = await prisma.submission.count({
    where: {
      teamId,
      questionId,
      submittedAt: { gte: new Date(now.getTime() - 10000) },
    },
  });

  if (recentAttemptsCount >= 5) {
    return {
      success: false,
      message: "Rate limit: Maximum 5 submissions per 10 seconds for this question. Please wait.",
    };
  }

  // 4. Answer Normalization based on question.answerMode
  let isMatch = false;
  const mode = question.answerMode || "TRIMMED";
  if (mode === "EXACT") {
    isMatch = rawAnswer === question.answer;
  } else if (mode === "CASE_INSENSITIVE") {
    isMatch = cleanAnswer.toLowerCase() === question.answer.trim().toLowerCase();
  } else {
    // TRIMMED (default)
    isMatch = cleanAnswer === question.answer.trim();
  }

  // 5. Execute in database transaction to eliminate race conditions
  try {
    const outcome = await prisma.$transaction(
      async (tx) => {
        // Check if team already solved this question (within transaction for isolation)
        const existingSolve = await tx.submission.findFirst({
          where: {
            teamId,
            questionId,
            isCorrect: true,
          },
        });

        if (existingSolve) {
          return {
            success: false,
            alreadySolved: true,
            message: "This question has already been solved by your team.",
          };
        }

        const totalPointsAwarded = isMatch ? question.points : 0;

        // Record submission attempt
        await tx.submission.create({
          data: {
            teamId,
            questionId,
            submittedAnswer: cleanAnswer,
            isCorrect: isMatch,
            submittedAt: now,
            submittedBy: memberName,
          },
        });

        if (isMatch) {
          // Award points for correct submission
          await tx.scoreEvent.create({
            data: {
              eventId: team.eventId,
              teamId: team.id,
              roundId: round.id,
              type: "ROUND1_CORRECT",
              points: totalPointsAwarded,
              reason: `Round 1 solved: ${question.title} (+${question.points} pts)`,
              createdAt: now,
            },
          });

          await tx.team.update({
            where: { id: teamId },
            data: {
              score: { increment: totalPointsAwarded },
              scoreReachedAt: now,
            },
          });

          return {
            success: true,
            isCorrect: true,
            points: totalPointsAwarded,
            message: `Correct flag! (+${question.points} pts awarded to your team)`,
          };
        } else {
          return {
            success: true,
            isCorrect: false,
            points: 0,
            message: "Incorrect flag. Try again!",
          };
        }
      },
      { 
        maxWait: 10000, 
        timeout: 15000,
        isolationLevel: "Serializable"
      }
    );

    // Non-blocking audit logging after transaction commits
    if (outcome.success && outcome.isCorrect) {
      logAuditEvent({
        eventId: team.eventId,
        teamId: team.id,
        actor: "TEAM",
        action: "QUESTION_SOLVED",
        details: `Team ${team.name} (${memberName || "Member"}) solved ${question.title} (+${question.points} pts)`,
      }).catch(console.error);
    } else if (outcome.success && !outcome.isCorrect) {
      logAuditEvent({
        eventId: team.eventId,
        teamId: team.id,
        actor: "TEAM",
        action: "INCORRECT_ATTEMPT",
        details: `Team ${team.name} (${memberName || "Member"}) incorrect attempt on ${question.title}`,
      }).catch(console.error);
    }

    return outcome;
  } catch (error: any) {
    // Handle transaction conflicts gracefully
    if (error.code === 'P2034' || error.message?.includes('serialization')) {
      return {
        success: false,
        message: "Concurrent submission detected. Please try again.",
      };
    }
    throw error;
  }
}

// Function to fetch detailed question statistics for the admin modal
export async function getQuestionDetailForAdmin(questionId: string) {
  const question = await prisma.question.findUnique({
    where: { id: questionId },
    include: {
      round: true,
      submissions: {
        include: { team: { select: { id: true, name: true } } },
        orderBy: { submittedAt: "asc" },
      },
    },
  });

  if (!question) return null;

  let globalStatus: "CORE_RELEASED" | "BACKUP_LOCKED" | "BACKUP_RELEASED" = "CORE_RELEASED";
  if (question.isCore) {
    globalStatus = "CORE_RELEASED";
  } else if (question.isReleased) {
    globalStatus = "BACKUP_RELEASED";
  } else {
    globalStatus = "BACKUP_LOCKED";
  }

  // Extract successful solves (1 per team)
  const solves: { teamId: string; teamName: string; solvedAt: Date; solvedBy?: string | null }[] = [];
  const seenTeamSolves = new Set<string>();

  const wrongAttemptsMap = new Map<string, { teamName: string; count: number }>();

  for (const s of question.submissions) {
    if (s.isCorrect) {
      if (!seenTeamSolves.has(s.teamId)) {
        seenTeamSolves.add(s.teamId);
        solves.push({
          teamId: s.teamId,
          teamName: s.team.name,
          solvedAt: s.submittedAt,
          solvedBy: s.submittedBy,
        });
      }
    } else {
      const current = wrongAttemptsMap.get(s.teamId) || { teamName: s.team.name, count: 0 };
      wrongAttemptsMap.set(s.teamId, { teamName: s.team.name, count: current.count + 1 });
    }
  }

  const wrongAttempts = Array.from(wrongAttemptsMap.values());

  return {
    id: question.id,
    title: question.title,
    description: question.description,
    answer: question.answer, // Admin only!
    category: question.category,
    difficulty: question.difficulty,
    points: question.points,
    order: question.order,
    isCore: question.isCore,
    isReleased: question.isReleased,
    answerMode: question.answerMode,
    globalStatus,
    isActive: question.isActive,
    solves,
    wrongAttempts,
  };
}

// Function to start a team's Round 1 timer
export async function startTeamRound1Timer(teamId: string): Promise<{
  success: boolean;
  message: string;
  startedAt?: Date | null;
  deadlineAt?: Date | null;
  duration?: number;
}> {
  const now = new Date();
  
  const team = await prisma.team.findUnique({
    where: { id: teamId },
    select: {
      id: true,
      name: true,
      eventId: true,
      round1StartedAt: true,
      round1DeadlineAt: true,
      round1Duration: true,
    },
  });

  if (!team) {
    return { success: false, message: "Team not found." };
  }

  // Check if timer already started
  if (team.round1StartedAt && team.round1DeadlineAt) {
    return {
      success: true,
      message: "Timer already started for this team.",
      startedAt: team.round1StartedAt,
      deadlineAt: team.round1DeadlineAt,
      duration: team.round1Duration,
    };
  }

  const duration = team.round1Duration || 1200; // 20 minutes default
  const startedAt = now;
  const deadlineAt = new Date(now.getTime() + duration * 1000);

  try {
    // Use atomic transaction to prevent race conditions
    const updatedTeam = await prisma.$transaction(async (tx) => {
      // Double-check within transaction
      const currentTeam = await tx.team.findUnique({
        where: { id: teamId },
        select: { round1StartedAt: true },
      });

      if (currentTeam?.round1StartedAt) {
        throw new Error("Timer already started");
      }

      return await tx.team.update({
        where: { id: teamId },
        data: {
          round1StartedAt: startedAt,
          round1DeadlineAt: deadlineAt,
        },
        select: {
          round1StartedAt: true,
          round1DeadlineAt: true,
          round1Duration: true,
        },
      });
    });

    // Log the timer start
    await logAuditEvent({
      eventId: team.eventId,
      teamId: team.id,
      actor: "SYSTEM",
      action: "ROUND1_TIMER_STARTED",
      details: `Team ${team.name} Round 1 timer started: ${duration / 60} minutes (${startedAt.toISOString()} → ${deadlineAt.toISOString()})`,
    });

    return {
      success: true,
      message: `Round 1 timer started for ${duration / 60} minutes.`,
      startedAt: updatedTeam.round1StartedAt,
      deadlineAt: updatedTeam.round1DeadlineAt,
      duration: updatedTeam.round1Duration,
    };
  } catch (error: any) {
    if (error.message === "Timer already started") {
      // Another request beat us to it - fetch current state
      const currentTeam = await prisma.team.findUnique({
        where: { id: teamId },
        select: {
          round1StartedAt: true,
          round1DeadlineAt: true,
          round1Duration: true,
        },
      });

      return {
        success: true,
        message: "Timer already started for this team.",
        startedAt: currentTeam?.round1StartedAt || undefined,
        deadlineAt: currentTeam?.round1DeadlineAt || undefined,
        duration: currentTeam?.round1Duration || 1200,
      };
    }
    throw error;
  }
}

// Function to release backup questions (Q21-Q30)
export async function releaseBackupQuestions(questionIds: string[]): Promise<{
  success: boolean;
  message: string;
  releasedCount: number;
}> {
  if (!questionIds.length) {
    return { success: false, message: "No questions selected for release.", releasedCount: 0 };
  }

  // Verify all questions are backup questions
  const questions = await prisma.question.findMany({
    where: {
      id: { in: questionIds },
      isCore: false,
      isReleased: false,
    },
    include: { round: true },
  });

  if (questions.length !== questionIds.length) {
    return {
      success: false,
      message: "Some questions are not valid backup questions or already released.",
      releasedCount: 0,
    };
  }

  const eventId = questions[0]?.round.eventId;

  // Release the backup questions
  const updateResult = await prisma.question.updateMany({
    where: {
      id: { in: questionIds },
    },
    data: {
      isReleased: true,
    },
  });

  // Log the release
  for (const q of questions) {
    await logAuditEvent({
      eventId: eventId,
      actor: "ADMIN",
      action: "BACKUP_QUESTION_RELEASED",
      details: `Backup question ${q.title} (${q.order}) released by admin.`,
    });
  }

  return {
    success: true,
    message: `Released ${updateResult.count} backup questions.`,
    releasedCount: updateResult.count,
  };
}

// Function to get Round 1 timer statistics for admin
export async function getRound1TimerStats(): Promise<{
  totalTeams: number;
  notStarted: number;
  active: number;
  expired: number;
  avgTimeUsed: number;
  activeTimers: {
    teamId: string;
    teamName: string;
    startedAt: Date;
    deadlineAt: Date;
    secondsRemaining: number;
    duration: number;
  }[];
}> {
  const now = new Date();

  const teams = await prisma.team.findMany({
    select: {
      id: true,
      name: true,
      round1StartedAt: true,
      round1DeadlineAt: true,
      round1Duration: true,
    },
  });

  let notStarted = 0;
  let active = 0;
  let expired = 0;
  let totalTimeUsed = 0;
  let timeUsedCount = 0;
  const activeTimers: {
    teamId: string;
    teamName: string;
    startedAt: Date;
    deadlineAt: Date;
    secondsRemaining: number;
    duration: number;
  }[] = [];

  for (const team of teams) {
    if (!team.round1StartedAt || !team.round1DeadlineAt) {
      notStarted++;
    } else {
      const secondsRemaining = Math.max(0, Math.floor((team.round1DeadlineAt.getTime() - now.getTime()) / 1000));
      
      if (secondsRemaining > 0) {
        active++;
        activeTimers.push({
          teamId: team.id,
          teamName: team.name,
          startedAt: team.round1StartedAt,
          deadlineAt: team.round1DeadlineAt,
          secondsRemaining,
          duration: team.round1Duration,
        });
      } else {
        expired++;
        // Calculate time used for expired timers
        const timeUsed = Math.floor((team.round1DeadlineAt.getTime() - team.round1StartedAt.getTime()) / 1000);
        totalTimeUsed += timeUsed;
        timeUsedCount++;
      }
    }
  }

  const avgTimeUsed = timeUsedCount > 0 ? Math.floor(totalTimeUsed / timeUsedCount) : 0;

  return {
    totalTeams: teams.length,
    notStarted,
    active,
    expired,
    avgTimeUsed,
    activeTimers: activeTimers.sort((a, b) => a.secondsRemaining - b.secondsRemaining), // Sort by time remaining
  };
}

// ========================= HINT SYSTEM =========================

export interface QuestionHintView {
  id: string;
  title: string;
  content: string;
  cost: number;
  order: number;
  isClaimed: boolean;
  claimedAt?: Date;
}

export interface HintSystemData {
  questionId: string;
  questionTitle: string;
  availableHints: QuestionHintView[];
  teamScore: number;
  totalHintsClaimed: number;
  totalCostPaid: number;
}

/**
 * Get hint system data for a specific question for a team
 */
export async function getQuestionHintData(questionId: string, teamId: string): Promise<HintSystemData | null> {
  const question = await prisma.question.findUnique({
    where: { id: questionId },
    include: {
      hints: {
        orderBy: { order: 'asc' },
        include: {
          claims: {
            where: { teamId },
            select: { claimedAt: true }
          }
        }
      }
    }
  });

  if (!question) return null;

  const team = await prisma.team.findUnique({
    where: { id: teamId },
    select: { score: true }
  });

  if (!team) return null;

  const hintsWithClaimStatus = question.hints.map(hint => ({
    id: hint.id,
    title: hint.title,
    content: hint.content,
    cost: hint.cost,
    order: hint.order,
    isClaimed: hint.claims.length > 0,
    claimedAt: hint.claims[0]?.claimedAt
  }));

  const claimedHints = hintsWithClaimStatus.filter(h => h.isClaimed);

  return {
    questionId: question.id,
    questionTitle: question.title,
    availableHints: hintsWithClaimStatus,
    teamScore: team.score,
    totalHintsClaimed: claimedHints.length,
    totalCostPaid: claimedHints.reduce((sum, h) => sum + h.cost, 0)
  };
}

/**
 * Claim a hint for a team (with score deduction)
 */
export async function claimQuestionHint(hintId: string, teamId: string): Promise<{
  success: boolean;
  message: string;
  hint?: QuestionHintView;
  remainingScore?: number;
}> {
  return await prisma.$transaction(async (tx) => {
    // Get hint details
    const hint = await tx.questionHint.findUnique({
      where: { id: hintId },
      include: {
        question: { select: { id: true, title: true } }
      }
    });

    if (!hint) {
      return { success: false, message: "Hint not found" };
    }

    // Check if hint already claimed by this team
    const existingClaim = await tx.hintClaim.findUnique({
      where: { 
        teamId_questionHintId: { 
          teamId, 
          questionHintId: hintId 
        } 
      }
    });

    if (existingClaim) {
      return { success: false, message: "Hint already claimed by your team" };
    }

    // Get team score
    const team = await tx.team.findUnique({
      where: { id: teamId },
      select: { score: true, name: true, eventId: true }
    });

    if (!team) {
      return { success: false, message: "Team not found" };
    }

    // Deduct score points (allows negative score as hints cost -2, -3, -5 pts)
    const updatedTeam = await tx.team.update({
      where: { id: teamId },
      data: { score: { decrement: hint.cost } }
    });

    // Create hint claim
    await tx.hintClaim.create({
      data: {
        teamId,
        questionHintId: hintId,
        cost: hint.cost
      }
    });

    // Create ScoreEvent to record penalty in audit & leaderboard
    await tx.scoreEvent.create({
      data: {
        eventId: team.eventId,
        teamId,
        type: "HINT_PENALTY",
        points: -hint.cost,
        reason: `Unlocked hint for "${hint.question.title}" (-${hint.cost} pts)`
      }
    });

    // Log the hint claim
    await logAuditEvent({
      eventId: team.eventId,
      teamId,
      actor: "TEAM",
      action: "HINT_CLAIMED",
      details: `Team "${team.name}" claimed hint "${hint.title}" for question "${hint.question.title}" (cost: ${hint.cost} pts)`
    });

    return {
      success: true,
      message: `Hint claimed! ${hint.cost} points deducted from score.`,
      hint: {
        id: hint.id,
        title: hint.title,
        content: hint.content,
        cost: hint.cost,
        order: hint.order,
        isClaimed: true,
        claimedAt: new Date()
      },
      remainingScore: updatedTeam.score
    };
  }, {
    maxWait: 10000, // 10 seconds
    timeout: 10000, // 10 seconds
  });
}

/**
 * Create or update hints for a question (Admin function)
 */
export async function manageQuestionHints(questionId: string, hints: {
  id?: string;
  title: string;
  content: string;
  cost: number;
  order: number;
}[]): Promise<{ success: boolean; message: string; hints?: QuestionHintView[] }> {
  try {
    const question = await prisma.question.findUnique({
      where: { id: questionId },
      include: { round: { select: { eventId: true } } }
    });

    if (!question) {
      return { success: false, message: "Question not found" };
    }

    const result = await prisma.$transaction(async (tx) => {
      // Delete existing hints that aren't in the new list
      const existingHintIds = hints.filter(h => h.id).map(h => h.id!);
      if (existingHintIds.length > 0) {
        await tx.questionHint.deleteMany({
          where: { 
            questionId,
            id: { notIn: existingHintIds }
          }
        });
      } else {
        await tx.questionHint.deleteMany({ where: { questionId } });
      }

      // Upsert hints
      const updatedHints = [];
      for (const hintData of hints) {
        const hint = await tx.questionHint.upsert({
          where: { id: hintData.id || "new-hint" },
          create: {
            questionId,
            title: hintData.title,
            content: hintData.content,
            cost: hintData.cost,
            order: hintData.order
          },
          update: {
            title: hintData.title,
            content: hintData.content,
            cost: hintData.cost,
            order: hintData.order
          }
        });
        updatedHints.push({
          id: hint.id,
          title: hint.title,
          content: hint.content,
          cost: hint.cost,
          order: hint.order,
          isClaimed: false
        });
      }

      // Log the admin action
      await logAuditEvent({
        eventId: question.round.eventId,
        actor: "ADMIN",
        action: "QUESTION_HINTS_UPDATED",
        details: `Updated hints for question "${question.title}" (${hints.length} hints configured)`
      });

      return updatedHints;
    }, {
      maxWait: 10000, // 10 seconds
      timeout: 10000, // 10 seconds
    });

    return {
      success: true,
      message: `Successfully updated ${hints.length} hints for question`,
      hints: result
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.message || "Failed to update question hints"
    };
  }
}

/**
 * Get all questions with their hint statistics (Admin function)  
 */
export async function getQuestionsWithHintStats(roundId: string): Promise<{
  id: string;
  title: string;
  order: number;
  totalHints: number;
  totalClaims: number;
  avgHintCost: number;
}[]> {
  const questions = await prisma.question.findMany({
    where: { roundId },
    select: {
      id: true,
      title: true,
      order: true,
      hints: {
        select: {
          cost: true,
          claims: { select: { id: true } }
        }
      }
    },
    orderBy: { order: 'asc' }
  });

  return questions.map(q => ({
    id: q.id,
    title: q.title,
    order: q.order,
    totalHints: q.hints.length,
    totalClaims: q.hints.reduce((sum, h) => sum + h.claims.length, 0),
    avgHintCost: q.hints.length > 0 
      ? Math.round(q.hints.reduce((sum, h) => sum + h.cost, 0) / q.hints.length)
      : 0
  }));
}