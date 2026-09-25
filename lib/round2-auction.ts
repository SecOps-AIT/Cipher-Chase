import { prisma } from "@/lib/prisma";
import { logAuditEvent } from "@/lib/audit";

// ============================================================
// TYPES AND INTERFACES
// ============================================================

export interface AuctionQuestionView {
  id: string;
  questionId: string;
  title: string;
  topic: string;
  outline: string;
  baseTimeSeconds: number;
  points: number; // Admin-set points, no time bonus
  hintPenalty: number; // Admin-set hint penalty (e.g., -10, -15, -20)
  status: "DRAFT" | "OPEN" | "CLOSED" | "SOLD";
  displayedAt: string | null;
  auctionClosedAt: string | null;
}

export interface AuctionBidView {
  id: string;
  teamId: string;
  teamName: string;
  bidTimeSeconds: number;
  submittedAt: string;
}

export interface TeamChallengeView {
  id: string;
  auctionQuestionId: string;
  title: string;
  topic: string;
  winningBidSeconds: number;
  status: "READY" | "ACTIVE" | "COMPLETED" | "FAILED";
  startedAt: string | null;
  deadlineAt: string | null;
  points: number; // Admin-set points (no bonus)
  potentialScore: number; // Same as points in new rules
  failurePenalty: number; // Always 0 in new rules
}


// ============================================================
// AUCTION MANAGEMENT FUNCTIONS
// ============================================================

/**
 * Create an auction question from an existing question
 */
export async function createAuctionQuestion({
  roundId,
  questionId,
  title,
  topic,
  outline,
  baseTimeSeconds,
  points,
  hintPenalty
}: {
  roundId: string;
  questionId: string;
  title: string;
  topic: string;
  outline: string;
  baseTimeSeconds: number;
  points: number;
  hintPenalty?: number;
}): Promise<{ success: boolean; message: string; auctionQuestion?: AuctionQuestionView }> {
  try {
    // Verify the question exists and belongs to the round
    const question = await prisma.question.findFirst({
      where: { id: questionId, roundId },
      include: { round: { select: { eventId: true } } }
    });

    if (!question) {
      return { success: false, message: "Question not found or doesn't belong to this round" };
    }

    // Check if auction question already exists
    const existing = await prisma.auctionQuestion.findFirst({
      where: { questionId }
    });

    if (existing) {
      return { success: false, message: "Auction question already exists for this question" };
    }

    const auctionQuestion = await prisma.auctionQuestion.create({
      data: {
        roundId,
        questionId,
        title,
        topic,
        outline,
        baseTimeSeconds,
        points,
        hintPenalty: hintPenalty || -10, // Default -10 if not provided
        status: "DRAFT"
      }
    });

    // Log the creation
    await logAuditEvent({
      eventId: question.round.eventId,
      actor: "ADMIN",
      action: "AUCTION_QUESTION_CREATED",
      details: `Created auction question "${title}" (${formatTime(baseTimeSeconds)}, ${points} pts)`
    });

    return {
      success: true,
      message: "Auction question created successfully",
      auctionQuestion: {
        id: auctionQuestion.id,
        questionId: auctionQuestion.questionId,
        title: auctionQuestion.title,
        topic: auctionQuestion.topic,
        outline: auctionQuestion.outline,
        baseTimeSeconds: auctionQuestion.baseTimeSeconds,
        points: auctionQuestion.points,
        hintPenalty: auctionQuestion.hintPenalty,
        status: auctionQuestion.status as any,
        displayedAt: auctionQuestion.displayedAt?.toISOString() || null,
        auctionClosedAt: auctionQuestion.auctionClosedAt?.toISOString() || null
      }
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.message || "Failed to create auction question"
    };
  }
}

/**
 * Open an auction for bidding (admin action)
 */
export async function openAuction(auctionQuestionId: string): Promise<{
  success: boolean;
  message: string;
  auctionQuestion?: AuctionQuestionView;
}> {
  try {
    const auctionQuestion = await prisma.auctionQuestion.findUnique({
      where: { id: auctionQuestionId },
      include: { 
        round: { select: { eventId: true } },
        sale: true 
      }
    });

    if (!auctionQuestion) {
      return { success: false, message: "Auction question not found" };
    }

    if (auctionQuestion.status === "SOLD") {
      return { success: false, message: "Question has already been sold" };
    }

    if (auctionQuestion.status === "OPEN") {
      return { success: false, message: "Auction is already open" };
    }

    const updated = await prisma.auctionQuestion.update({
      where: { id: auctionQuestionId },
      data: {
        status: "OPEN",
        displayedAt: new Date()
      }
    });

    // Log the auction opening
    await logAuditEvent({
      eventId: auctionQuestion.round.eventId,
      actor: "ADMIN",
      action: "AUCTION_OPENED",
      details: `Opened auction for "${auctionQuestion.title}"`
    });

    return {
      success: true,
      message: "Auction opened successfully",
      auctionQuestion: {
        id: updated.id,
        questionId: updated.questionId,
        title: updated.title,
        topic: updated.topic,
        outline: updated.outline,
        baseTimeSeconds: updated.baseTimeSeconds,
        points: updated.points, // Admin-set points
        hintPenalty: updated.hintPenalty, // Admin-set hint penalty
        status: updated.status as any,
        displayedAt: updated.displayedAt?.toISOString() || null,
        auctionClosedAt: updated.auctionClosedAt?.toISOString() || null
      }
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.message || "Failed to open auction"
    };
  }
}

/**
 * Close an auction for bidding (admin action)
 */
export async function closeAuction(auctionQuestionId: string): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    const auctionQuestion = await prisma.auctionQuestion.findUnique({
      where: { id: auctionQuestionId },
      include: { round: { select: { eventId: true } } }
    });

    if (!auctionQuestion) {
      return { success: false, message: "Auction question not found" };
    }

    if (auctionQuestion.status !== "OPEN") {
      return { success: false, message: "Auction is not open for bidding" };
    }

    await prisma.auctionQuestion.update({
      where: { id: auctionQuestionId },
      data: {
        status: "CLOSED",
        auctionClosedAt: new Date()
      }
    });

    // Log the auction closing
    await logAuditEvent({
      eventId: auctionQuestion.round.eventId,
      actor: "ADMIN",
      action: "AUCTION_CLOSED",
      details: `Closed auction for "${auctionQuestion.title}"`
    });

    return {
      success: true,
      message: "Auction closed successfully"
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.message || "Failed to close auction"
    };
  }
}

// ============================================================
// BIDDING FUNCTIONS
// ============================================================

/**
 * Submit a time bid for an auction (team action)
 */
export async function submitBid({
  auctionQuestionId,
  teamId,
  bidTimeSeconds
}: {
  auctionQuestionId: string;
  teamId: string;
  bidTimeSeconds: number;
}): Promise<{ success: boolean; message: string; bid?: AuctionBidView }> {
  return await prisma.$transaction(async (tx) => {
    // Get auction question
    const auctionQuestion = await tx.auctionQuestion.findUnique({
      where: { id: auctionQuestionId },
      include: { 
        round: { select: { eventId: true } },
        sale: true 
      }
    });

    if (!auctionQuestion) {
      return { success: false, message: "Auction question not found" };
    }

    if (auctionQuestion.status !== "OPEN") {
      return { success: false, message: "Auction is not open for bidding" };
    }

    if (auctionQuestion.sale) {
      return { success: false, message: "Question has already been sold" };
    }

    // Get team info
    const team = await tx.team.findUnique({
      where: { id: teamId },
      select: { id: true, name: true, qualified: true }
    });

    if (!team) {
      return { success: false, message: "Team not found" };
    }

    if (!team.qualified) {
      return { success: false, message: "Team is not qualified for Round 2" };
    }

    // Check team's active question limit
    const activeAssignments = await tx.teamChallengeAssignment.count({
      where: {
        teamId,
        status: { in: ["READY", "ACTIVE"] }
      }
    });

    const maxConcurrentQuestions = 3; // TODO: Make this configurable
    if (activeAssignments >= maxConcurrentQuestions) {
      return {
        success: false,
        message: `Maximum active question limit reached (${maxConcurrentQuestions}). Complete or fail a question to unlock another auction slot.`
      };
    }

    // Validate bid time
    if (bidTimeSeconds <= 0) {
      return { success: false, message: "Bid time must be positive" };
    }

    if (bidTimeSeconds > auctionQuestion.baseTimeSeconds) {
      return { success: false, message: "Bid time cannot exceed base time" };
    }

    // Minimum bid time validation (e.g., at least 30 seconds)
    const minBidTime = 30; // TODO: Make this configurable
    if (bidTimeSeconds < minBidTime) {
      return { success: false, message: `Bid time must be at least ${minBidTime} seconds` };
    }

    // Delete any existing bid from this team for this auction
    await tx.auctionBid.deleteMany({
      where: {
        auctionQuestionId,
        teamId
      }
    });

    // Create new bid
    const bid = await tx.auctionBid.create({
      data: {
        auctionQuestionId,
        teamId,
        bidTimeSeconds
      }
    });

    // Log the bid
    await logAuditEvent({
      eventId: auctionQuestion.round.eventId,
      teamId,
      actor: "TEAM",
      action: "AUCTION_BID_SUBMITTED",
      details: `Team "${team.name}" bid ${formatTime(bidTimeSeconds)} for "${auctionQuestion.title}"`
    });

    return {
      success: true,
      message: "Bid submitted successfully",
      bid: {
        id: bid.id,
        teamId: bid.teamId,
        teamName: team.name,
        bidTimeSeconds: bid.bidTimeSeconds,
        submittedAt: bid.submittedAt.toISOString()
      }
    };
  });
}

/**
 * Get all bids for an auction
 */
export async function getAuctionBids(auctionQuestionId: string): Promise<AuctionBidView[]> {
  const bids = await prisma.auctionBid.findMany({
    where: { auctionQuestionId },
    include: {
      team: { select: { name: true } }
    },
    orderBy: { bidTimeSeconds: "asc" }
  });

  return bids.map(bid => ({
    id: bid.id,
    teamId: bid.teamId,
    teamName: bid.team.name,
    bidTimeSeconds: bid.bidTimeSeconds,
    submittedAt: bid.submittedAt.toISOString()
  }));
}

// ============================================================
// AUCTION SETTLEMENT FUNCTIONS
// ============================================================

/**
 * Settle an auction by selecting the winning team (admin action)
 */
export async function settleAuction({
  auctionQuestionId,
  winningTeamId,
  winningBidSeconds,
  settledByAdminId
}: {
  auctionQuestionId: string;
  winningTeamId: string;
  winningBidSeconds: number;
  settledByAdminId?: string;
}): Promise<{ success: boolean; message: string; sale?: any }> {
  return await prisma.$transaction(async (tx) => {
    // Get auction question
    const auctionQuestion = await tx.auctionQuestion.findUnique({
      where: { id: auctionQuestionId },
      include: { 
        round: { select: { eventId: true } },
        sale: true 
      }
    });

    if (!auctionQuestion) {
      return { success: false, message: "Auction question not found" };
    }

    if (auctionQuestion.sale || auctionQuestion.status === "SOLD") {
      return { success: false, message: "Auction already settled and sold" };
    }

    // Get winning team
    const team = await tx.team.findUnique({
      where: { id: winningTeamId },
      select: { id: true, name: true, qualified: true }
    });

    if (!team) {
      return { success: false, message: "Winning team not found" };
    }

    // Auto-qualify team for Round 2 if not yet marked
    if (!team.qualified) {
      await tx.team.update({
        where: { id: winningTeamId },
        data: { qualified: true }
      });
    }

    // Ensure bid record exists for tracking
    let bid = await tx.auctionBid.findFirst({
      where: {
        auctionQuestionId,
        teamId: winningTeamId,
      }
    });

    if (!bid) {
      bid = await tx.auctionBid.create({
        data: {
          auctionQuestionId,
          teamId: winningTeamId,
          bidTimeSeconds: winningBidSeconds
        }
      });
    } else if (bid.bidTimeSeconds !== winningBidSeconds) {
      bid = await tx.auctionBid.update({
        where: { id: bid.id },
        data: { bidTimeSeconds: winningBidSeconds }
      });
    }

    // Check team's active question limit
    const activeAssignments = await tx.teamChallengeAssignment.count({
      where: {
        teamId: winningTeamId,
        status: { in: ["READY", "ACTIVE"] }
      }
    });

    const maxConcurrentQuestions = 3; // TODO: Make this configurable
    if (activeAssignments >= maxConcurrentQuestions) {
      return {
        success: false,
        message: `Winning team has reached maximum active question limit (${maxConcurrentQuestions})`
      };
    }

    // Create auction sale (with unique constraint protection)
    const sale = await tx.auctionSale.create({
      data: {
        auctionQuestionId,
        teamId: winningTeamId,
        winningBidSeconds,
        settledByAdminId
      }
    });

    // Update auction question status
    await tx.auctionQuestion.update({
      where: { id: auctionQuestionId },
      data: { status: "SOLD" }
    });

    // NO BONUS CALCULATION - Admin-set points only
    // The points are set by admin in auctionQuestion.points field

    // Create team challenge assignment
    const assignment = await tx.teamChallengeAssignment.create({
      data: {
        teamId: winningTeamId,
        auctionQuestionId,
        winningBidSeconds,
        status: "READY",
        finalScoreChange: 0 // Will be set to auctionQuestion.points when solved (minus any hint penalties)
      }
    });

    // Log the settlement
    await logAuditEvent({
      eventId: auctionQuestion.round.eventId,
      teamId: winningTeamId,
      actor: "ADMIN",
      action: "AUCTION_SETTLED",
      details: `Question "${auctionQuestion.title}" sold to team "${team.name}" for ${formatTime(winningBidSeconds)} (potential: +${auctionQuestion.points} pts)`
    });

    return {
      success: true,
      message: `Auction settled successfully. Question sold to ${team.name} for ${formatTime(winningBidSeconds)}.`,
      sale: {
        id: sale.id,
        teamId: winningTeamId,
        teamName: team.name,
        winningBidSeconds,
        assignmentId: assignment.id
      }
    };
  }, { timeout: 20000, maxWait: 10000 });
}

// ============================================================
// REMOVED: BONUS CALCULATION (NO TIME BONUS IN NEW RULES)
// Points are now fixed per question as set by admin
// ============================================================

// ============================================================
// TEAM QUERY FUNCTIONS
// ============================================================

/**
 * Get team's active and ready challenge assignments
 */
export async function getTeamActiveAssignments(teamId: string): Promise<TeamChallengeView[]> {
  const assignments = await prisma.teamChallengeAssignment.findMany({
    where: {
      teamId,
      status: { in: ["READY", "ACTIVE", "COMPLETED", "FAILED"] }
    },
    include: {
      auctionQuestion: {
        select: {
          title: true,
          topic: true,
          points: true, // Admin-set points, no bonus
          baseTimeSeconds: true
        }
      }
    },
    orderBy: { createdAt: "desc" }
  });

  return assignments.map(assignment => {
    // NO BONUS CALCULATION - Just return the admin-set points
    const points = assignment.auctionQuestion.points;

    return {
      id: assignment.id,
      auctionQuestionId: assignment.auctionQuestionId,
      title: assignment.auctionQuestion.title,
      topic: assignment.auctionQuestion.topic,
      winningBidSeconds: assignment.winningBidSeconds,
      status: assignment.status as any,
      startedAt: assignment.startedAt?.toISOString() || null,
      deadlineAt: assignment.deadlineAt?.toISOString() || null,
      points: points, // Fixed points set by admin
      potentialScore: points, // Same as points (no bonus)
      failurePenalty: 0 // No penalty in new rules - admin just doesn't award points if failed
    };
  });
}

/**
 * Get team's available auction slots
 */
export async function getTeamAuctionSlots(teamId: string): Promise<{
  activeSlots: number;
  maxSlots: number;
  availableSlots: number;
}> {
  const activeSlots = await prisma.teamChallengeAssignment.count({
    where: {
      teamId,
      status: { in: ["READY", "ACTIVE"] }
    }
  });

  const maxSlots = 3; // TODO: Make this configurable
  const availableSlots = Math.max(0, maxSlots - activeSlots);

  return {
    activeSlots,
    maxSlots,
    availableSlots
  };
}

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

/**
 * Format time in seconds to MM:SS format
 */
export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Parse time string (MM:SS) to seconds
 */
export function parseTimeToSeconds(timeString: string): number {
  const parts = timeString.split(':');
  if (parts.length !== 2) throw new Error("Invalid time format. Use MM:SS");
  
  const minutes = parseInt(parts[0], 10);
  const seconds = parseInt(parts[1], 10);
  
  if (isNaN(minutes) || isNaN(seconds) || minutes < 0 || seconds < 0 || seconds >= 60) {
    throw new Error("Invalid time values");
  }
  
  return minutes * 60 + seconds;
}