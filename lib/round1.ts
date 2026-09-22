import { prisma } from "@/lib/prisma";
import { logAuditEvent } from "@/lib/audit";

export interface QuestionView {
  id: string;
  roundId: string;
  title: string;
  description: string;
  points: number;
  firstBloodBonus: number;
  difficulty: string;
  category: string;
  releaseAt: Date;
  closeAt: Date;
  batchNumber: number;
  order: number;
  globalStatus: "UPCOMING" | "ACTIVE" | "EXPIRED";
  teamStatus: "SOLVED" | "UNSOLVED";
  status: "LOCKED" | "LIVE" | "CLOSED" | "SOLVED";
  solvedAt?: Date | null;
  serverTime: string;
  firstBlood?: {
    teamId: string;
    teamName: string;
    solvedAt: Date;
    bonus: number;
  } | null;
  solvesCount: number;
  recentSolves?: {
    teamId: string;
    teamName: string;
    solvedAt: Date;
    isFirstBlood: boolean;
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
  batchInfo: {
    currentBatch: number;
    totalBatches: number;
    activeQuestionsCount: number;
    batchCloseAt: Date | null;
    secondsRemaining: number;
  };
  questions: QuestionView[];
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
      batchInfo: {
        currentBatch: 1,
        totalBatches: 1,
        activeQuestionsCount: 0,
        batchCloseAt: null,
        secondsRemaining: 0,
      },
      questions: [],
      serverTime: now.toISOString(),
    };
  }

  // Get all active questions for Round 1
  const questions = await prisma.question.findMany({
    where: { roundId: round.id, isActive: true },
    orderBy: [{ batchNumber: "asc" }, { order: "asc" }],
  });

  const questionIds = questions.map((q) => q.id);

  // Get all global correct solves for these questions (ordered by time)
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

  // Group global solves by questionId
  const questionSolvesMap = new Map<string, { teamId: string; teamName: string; solvedAt: Date; isFirstBlood: boolean }[]>();
  const firstBloodMap = new Map<string, { teamId: string; teamName: string; solvedAt: Date; bonus: number }>();
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
        isFirstBlood: s.isFirstBlood,
      });
      questionSolvesMap.set(s.questionId, list);
    }

    if (s.isFirstBlood && !firstBloodMap.has(s.questionId)) {
      const q = questions.find((qItem) => qItem.id === s.questionId);
      firstBloodMap.set(s.questionId, {
        teamId: s.teamId,
        teamName: s.team.name,
        solvedAt: s.submittedAt,
        bonus: q?.firstBloodBonus || 50,
      });
    }

    if (teamId && s.teamId === teamId) {
      solvedQuestionIds.add(s.questionId);
      solvedDateMap.set(s.questionId, s.submittedAt);
    }
  }

  // Calculate batches metadata
  const batchNumbers = Array.from(new Set(questions.map((q) => q.batchNumber)));
  const totalBatches = batchNumbers.length > 0 ? Math.max(...batchNumbers) : 1;

  // Find currently active batch
  const activeQuestions = questions.filter(
    (q) => now >= q.releaseAt && now < q.closeAt
  );

  let currentBatch = 1;
  let batchCloseAt: Date | null = null;
  let secondsRemaining = 0;

  if (activeQuestions.length > 0) {
    currentBatch = activeQuestions[0].batchNumber;
    batchCloseAt = activeQuestions[0].closeAt;
    secondsRemaining = Math.max(0, Math.ceil((batchCloseAt.getTime() - now.getTime()) / 1000));
  } else {
    // If no batch is active, find the next upcoming batch
    const nextUpcoming = questions.find((q) => now < q.releaseAt);
    if (nextUpcoming) {
      currentBatch = nextUpcoming.batchNumber;
      batchCloseAt = nextUpcoming.closeAt;
      secondsRemaining = Math.max(0, Math.ceil((nextUpcoming.releaseAt.getTime() - now.getTime()) / 1000));
    }
  }

  // Map to client-safe question views (answers stripped!)
  const questionViews: QuestionView[] = questions.map((q) => {
    let globalStatus: "UPCOMING" | "ACTIVE" | "EXPIRED" = "UPCOMING";
    if (now < q.releaseAt) {
      globalStatus = "UPCOMING";
    } else if (now >= q.closeAt) {
      globalStatus = "EXPIRED";
    } else {
      globalStatus = "ACTIVE";
    }

    const isSolved = solvedQuestionIds.has(q.id);
    const teamStatus: "SOLVED" | "UNSOLVED" = isSolved ? "SOLVED" : "UNSOLVED";

    // Apply team timer logic: if team timer expired, questions become CLOSED
    let status: "LOCKED" | "LIVE" | "CLOSED" | "SOLVED" = "LOCKED";
    if (isSolved) {
      status = "SOLVED";
    } else if (teamTimerExpired) {
      // Team timer expired - all questions freeze
      status = "CLOSED";
    } else if (globalStatus === "UPCOMING") {
      status = "LOCKED";
    } else if (globalStatus === "EXPIRED") {
      status = "CLOSED";
    } else if (round.status === "LIVE") {
      status = "LIVE";
    } else {
      status = "LOCKED";
    }

    const solvesList = questionSolvesMap.get(q.id) || [];
    const fb = firstBloodMap.get(q.id) || null;

    return {
      id: q.id,
      roundId: q.roundId,
      title: q.title,
      description: status === "LOCKED" ? "This challenge is currently locked." : q.description,
      points: q.points,
      firstBloodBonus: q.firstBloodBonus,
      difficulty: q.difficulty,
      category: q.category,
      releaseAt: q.releaseAt,
      closeAt: q.closeAt,
      batchNumber: q.batchNumber,
      order: q.order,
      globalStatus,
      teamStatus,
      status,
      solvedAt: solvedDateMap.get(q.id) || null,
      serverTime: now.toISOString(),
      firstBlood: fb,
      solvesCount: solvesList.length,
      recentSolves: solvesList,
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
      duration: team?.round1Duration || 1800,
      secondsRemaining: teamTimerSecondsRemaining,
      status: teamTimerStatus,
    },
    batchInfo: {
      currentBatch,
      totalBatches,
      activeQuestionsCount: activeQuestions.length,
      batchCloseAt,
      secondsRemaining,
    },
    questions: questionViews,
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
  isFirstBlood?: boolean;
  firstBloodBonus?: number;
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
  if (round.status !== "LIVE") {
    return {
      success: false,
      message: `Round 1 is currently ${round.status.toLowerCase()}. Submissions are paused.`,
    };
  }

  // 2. Authoritative check: Release window
  if (now < question.releaseAt) {
    return {
      success: false,
      message: "This challenge has not been released yet.",
    };
  }

  if (now >= question.closeAt) {
    return {
      success: false,
      message: "This challenge has expired. No further submissions accepted.",
    };
  }

  // 3. Server-side Rate Limiting: Max 5 submissions per 10 seconds per team per question (Section 14)
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

  // 4. Answer Normalization based on question.answerMode (Section 15)
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

  // 5. Execute in database transaction to eliminate race conditions (Section 13)
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

        // Check if this is the FIRST BLOOD across ALL teams globally
        const globalFirstSolve = await tx.submission.findFirst({
          where: {
            questionId,
            isCorrect: true,
          },
        });

        const isFirstBlood = !globalFirstSolve;
        const firstBloodBonus = isFirstBlood ? (question.firstBloodBonus || 50) : 0;
        const totalPointsAwarded = isMatch ? (question.points + firstBloodBonus) : 0;

        // Record submission attempt
        await tx.submission.create({
          data: {
            teamId,
            questionId,
            submittedAnswer: cleanAnswer,
            isCorrect: isMatch,
            isFirstBlood: isMatch ? isFirstBlood : false,
            submittedAt: now,
            submittedBy: memberName,
          },
        });

        if (isMatch) {
          // First correct submission by team: awards points
          await tx.scoreEvent.create({
            data: {
              eventId: team.eventId,
              teamId: team.id,
              roundId: round.id,
              type: isFirstBlood ? "ROUND1_FIRST_BLOOD" : "ROUND1_CORRECT",
              points: totalPointsAwarded,
              reason: isFirstBlood
                ? `First Blood 🩸: ${question.title} (+${question.points} + ${firstBloodBonus} FB bonus)`
                : `Round 1 solved: ${question.title} (+${question.points} pts)`,
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
            isFirstBlood,
            firstBloodBonus,
            points: totalPointsAwarded,
            message: isFirstBlood
              ? `🩸 FIRST BLOOD! You were the first team to solve ${question.title}! (+${question.points} + ${firstBloodBonus} bonus)`
              : `Correct flag! (+${question.points} pts awarded to your team)`,
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
        isolationLevel: "Serializable" // Highest isolation level for PostgreSQL
      }
    );

    // Non-blocking audit logging after transaction commits
    if (outcome.success && outcome.isCorrect) {
      logAuditEvent({
        eventId: team.eventId,
        teamId: team.id,
        actor: "TEAM",
        action: outcome.isFirstBlood ? "FIRST_BLOOD_CLAIMED" : "QUESTION_SOLVED",
        details: outcome.isFirstBlood
          ? `🩸 Team ${team.name} (${memberName || "Member"}) scored FIRST BLOOD on ${question.title} (+${outcome.points} pts)`
          : `Team ${team.name} (${memberName || "Member"}) solved ${question.title} (+${question.points} pts)`,
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

// Function to fetch detailed question statistics for the admin modal (Section 19)
export async function getQuestionDetailForAdmin(questionId: string) {
  const now = new Date();

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

  let globalStatus: "UPCOMING" | "ACTIVE" | "EXPIRED" = "UPCOMING";
  if (now < question.releaseAt) {
    globalStatus = "UPCOMING";
  } else if (now >= question.closeAt) {
    globalStatus = "EXPIRED";
  } else {
    globalStatus = "ACTIVE";
  }

  // Extract successful solves (1 per team)
  const solves: { teamId: string; teamName: string; solvedAt: Date; solvedBy?: string | null; isFirstBlood: boolean }[] = [];
  const seenTeamSolves = new Set<string>();

  const wrongAttemptsMap = new Map<string, { teamName: string; count: number }>();
  let firstBlood: { teamId: string; teamName: string; solvedAt: Date; bonus: number } | null = null;

  for (const s of question.submissions) {
    if (s.isCorrect) {
      if (!seenTeamSolves.has(s.teamId)) {
        seenTeamSolves.add(s.teamId);
        solves.push({
          teamId: s.teamId,
          teamName: s.team.name,
          solvedAt: s.submittedAt,
          solvedBy: s.submittedBy,
          isFirstBlood: s.isFirstBlood,
        });

        if (s.isFirstBlood && !firstBlood) {
          firstBlood = {
            teamId: s.teamId,
            teamName: s.team.name,
            solvedAt: s.submittedAt,
            bonus: question.firstBloodBonus || 50,
          };
        }
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
    firstBloodBonus: question.firstBloodBonus,
    firstBlood,
    batchNumber: question.batchNumber,
    answerMode: question.answerMode,
    releaseAt: question.releaseAt,
    closeAt: question.closeAt,
    globalStatus,
    isActive: question.isActive,
    solves,
    wrongAttempts,
  };
}

// Function to activate/reset batch schedule dynamically
export async function activateBatchSchedule({
  batchNumber,
  durationMinutes = 15,
  resetAll = false,
}: {
  batchNumber?: number;
  durationMinutes?: number;
  resetAll?: boolean;
}) {
  const round = await prisma.round.findFirst({ where: { number: 1 } });
  if (!round) throw new Error("Round 1 not found");

  const now = new Date();
  const durMs = durationMinutes * 60 * 1000;

  if (resetAll) {
    const questions = await prisma.question.findMany({
      where: { roundId: round.id },
      select: { id: true, batchNumber: true },
    });

    const batchNumbers = Array.from(new Set(questions.map((q) => q.batchNumber))).sort((a, b) => a - b);

    for (let i = 0; i < batchNumbers.length; i++) {
      const bNum = batchNumbers[i];
      const bRelease = new Date(now.getTime() + i * durMs);
      const bClose = new Date(now.getTime() + (i + 1) * durMs);

      await prisma.question.updateMany({
        where: { roundId: round.id, batchNumber: bNum },
        data: {
          releaseAt: bRelease,
          closeAt: bClose,
          isActive: true,
        },
      });
    }

    await prisma.round.update({
      where: { id: round.id },
      data: { status: "LIVE", startedAt: round.startedAt || now },
    });

    await logAuditEvent({
      eventId: round.eventId,
      actor: "ADMIN",
      action: "BATCHES_RESET_AND_SCHEDULED",
      details: `Reset and scheduled ${batchNumbers.length} batches starting from now (${durationMinutes} mins each). Batch 1 is now ACTIVE.`,
    });

    return {
      success: true,
      message: `Reset and scheduled ${batchNumbers.length} batches (${durationMinutes} mins each). Batch 1 is now ACTIVE!`,
    };
  }

  const targetBatch = batchNumber || 1;
  const bRelease = now;
  const bClose = new Date(now.getTime() + durMs);

  await prisma.question.updateMany({
    where: { roundId: round.id, batchNumber: targetBatch },
    data: {
      releaseAt: bRelease,
      closeAt: bClose,
      isActive: true,
    },
  });

  await prisma.round.update({
    where: { id: round.id },
    data: { status: "LIVE", startedAt: round.startedAt || now },
  });

  await logAuditEvent({
    eventId: round.eventId,
    actor: "ADMIN",
    action: "BATCH_ACTIVATED",
    details: `Batch ${targetBatch} activated now for ${durationMinutes} minutes.`,
  });

  return {
    success: true,
    message: `Batch ${targetBatch} activated now! Open for ${durationMinutes} minutes.`,
  };
}

export async function extendActiveBatch({
  batchNumber,
  extraMinutes = 5,
}: {
  batchNumber?: number;
  extraMinutes?: number;
}) {
  const round = await prisma.round.findFirst({ where: { number: 1 } });
  if (!round) throw new Error("Round 1 not found");

  const extraMs = extraMinutes * 60 * 1000;
  const now = new Date();

  // Find active or target batch
  let bNum = batchNumber;
  if (!bNum) {
    const activeQ = await prisma.question.findFirst({
      where: { roundId: round.id, releaseAt: { lte: now }, closeAt: { gt: now } },
    });
    bNum = activeQ ? activeQ.batchNumber : 1;
  }

  const questionsInBatch = await prisma.question.findMany({
    where: { roundId: round.id, batchNumber: bNum },
  });

  for (const q of questionsInBatch) {
    const newClose = new Date(Math.max(q.closeAt.getTime(), now.getTime()) + extraMs);
    await prisma.question.update({
      where: { id: q.id },
      data: { closeAt: newClose },
    });
  }

  await logAuditEvent({
    eventId: round.eventId,
    actor: "ADMIN",
    action: "BATCH_EXTENDED",
    details: `Extended Batch ${bNum} by +${extraMinutes} minutes.`,
  });

  return {
    success: true,
    message: `Batch ${bNum} extended by +${extraMinutes} minutes.`,
  };
}
