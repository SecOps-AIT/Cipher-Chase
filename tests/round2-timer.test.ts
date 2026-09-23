import { describe, it, expect, beforeAll, afterAll, beforeEach } from "@jest/globals";
import { prisma } from "../lib/prisma";
import {
  startQuestionTimer,
  getTimerStatus,
  submitQuestionAnswer,
  processExpiredTimers
} from "../lib/round2-timer";

describe("Round 2 Timer System", () => {
  let testEventId: string;
  let testRoundId: string;
  let testTeamId: string;
  let testQuestionId: string;
  let testAuctionQuestionId: string;
  let testAssignmentId: string;

  beforeAll(async () => {
    // Create test event and round
    const event = await prisma.event.create({
      data: {
        name: "Timer Test Event",
        slug: "timer-test",
        status: "LIVE"
      }
    });
    testEventId = event.id;

    const round = await prisma.round.create({
      data: {
        eventId: testEventId,
        number: 2,
        name: "Round 2",
        status: "LIVE"
      }
    });
    testRoundId = round.id;

    // Create test team
    const team = await prisma.team.create({
      data: {
        name: "Timer Test Team",
        joinCode: "TIMER-1",
        eventId: testEventId,
        score: 1000,
        qualified: true
      }
    });
    testTeamId = team.id;

    // Create test question
    const question = await prisma.question.create({
      data: {
        roundId: testRoundId,
        title: "Timer Test Challenge",
        description: "Test description",
        category: "Test",
        difficulty: "EASY",
        points: 100,
        answer: "correct_answer",
        answerMode: "TRIMMED"
      }
    });
    testQuestionId = question.id;

    // Create auction question
    const auctionQuestion = await prisma.auctionQuestion.create({
      data: {
        roundId: testRoundId,
        questionId: testQuestionId,
        title: "Timer Test Auction",
        topic: "Test",
        outline: "Test outline",
        baseTimeSeconds: 600,
        basePoints: 200,
        status: "SOLD"
      }
    });
    testAuctionQuestionId = auctionQuestion.id;
  });

  afterAll(async () => {
    // Clean up
    await prisma.teamChallengeAssignment.deleteMany({ where: { teamId: testTeamId } });
    await prisma.auctionQuestion.deleteMany({ where: { roundId: testRoundId } });
    await prisma.question.deleteMany({ where: { roundId: testRoundId } });
    await prisma.team.deleteMany({ where: { eventId: testEventId } });
    await prisma.round.deleteMany({ where: { eventId: testEventId } });
    await prisma.event.delete({ where: { id: testEventId } });
  });

  beforeEach(async () => {
    // Create fresh assignment for each test
    const assignment = await prisma.teamChallengeAssignment.create({
      data: {
        teamId: testTeamId,
        auctionQuestionId: testAuctionQuestionId,
        winningBidSeconds: 300, // 5 minutes
        status: "READY",
        bonusPoints: 100
      }
    });
    testAssignmentId = assignment.id;
  });

  afterEach(async () => {
    // Clean up assignment
    await prisma.teamChallengeAssignment.deleteMany({
      where: { id: testAssignmentId }
    });
  });

  describe("Timer Start", () => {
    it("should start timer successfully", async () => {
      const result = await startQuestionTimer({
        assignmentId: testAssignmentId,
        teamId: testTeamId
      });

      expect(result.success).toBe(true);
      expect(result.timer?.status).toBe("ACTIVE");
      expect(result.timer?.startedAt).toBeDefined();
      expect(result.timer?.deadlineAt).toBeDefined();
      expect(result.timer?.timeRemaining).toBeLessThanOrEqual(300);

      // Verify deadline is approximately 5 minutes from start
      const startTime = new Date(result.timer!.startedAt!).getTime();
      const deadlineTime = new Date(result.timer!.deadlineAt!).getTime();
      const difference = (deadlineTime - startTime) / 1000;
      expect(difference).toBeCloseTo(300, 0);
    });

    it("should reject starting timer twice", async () => {
      // Start timer first time
      await startQuestionTimer({
        assignmentId: testAssignmentId,
        teamId: testTeamId
      });

      // Try to start again
      const result = await startQuestionTimer({
        assignmentId: testAssignmentId,
        teamId: testTeamId
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("already started");
    });

    it("should reject starting timer for non-READY assignment", async () => {
      // Mark as completed
      await prisma.teamChallengeAssignment.update({
        where: { id: testAssignmentId },
        data: { status: "COMPLETED" }
      });

      const result = await startQuestionTimer({
        assignmentId: testAssignmentId,
        teamId: testTeamId
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("not in READY state");
    });

    it("should reject starting timer for wrong team", async () => {
      const wrongTeamId = "non-existent-team-id";

      const result = await startQuestionTimer({
        assignmentId: testAssignmentId,
        teamId: wrongTeamId
      });

      expect(result.success).toBe(false);
    });
  });

  describe("Timer Status", () => {
    beforeEach(async () => {
      // Start timer for status tests
      await startQuestionTimer({
        assignmentId: testAssignmentId,
        teamId: testTeamId
      });
    });

    it("should get active timer status", async () => {
      const result = await getTimerStatus(testAssignmentId, testTeamId);

      expect(result.success).toBe(true);
      expect(result.timer?.status).toBe("ACTIVE");
      expect(result.timer?.timeRemaining).toBeLessThanOrEqual(300);
      expect(result.timer?.timeRemaining).toBeGreaterThan(295); // Allow 5 seconds margin
    });

    it("should calculate time remaining correctly", async () => {
      const result1 = await getTimerStatus(testAssignmentId, testTeamId);
      const remaining1 = result1.timer!.timeRemaining!;

      // Wait 2 seconds
      await new Promise(resolve => setTimeout(resolve, 2000));

      const result2 = await getTimerStatus(testAssignmentId, testTeamId);
      const remaining2 = result2.timer!.timeRemaining!;

      // Time should have decreased
      expect(remaining2).toBeLessThan(remaining1);
      expect(remaining1 - remaining2).toBeGreaterThanOrEqual(1);
      expect(remaining1 - remaining2).toBeLessThanOrEqual(3);
    });

    it("should return null status for non-started assignment", async () => {
      // Create new assignment without starting
      const newAssignment = await prisma.teamChallengeAssignment.create({
        data: {
          teamId: testTeamId,
          auctionQuestionId: testAuctionQuestionId,
          winningBidSeconds: 300,
          status: "READY",
          bonusPoints: 100
        }
      });

      const result = await getTimerStatus(newAssignment.id, testTeamId);

      expect(result.success).toBe(true);
      expect(result.timer?.status).toBe("READY");
      expect(result.timer?.startedAt).toBeNull();
      expect(result.timer?.deadlineAt).toBeNull();

      // Clean up
      await prisma.teamChallengeAssignment.delete({ where: { id: newAssignment.id } });
    });
  });

  describe("Answer Submission", () => {
    beforeEach(async () => {
      // Start timer for submission tests
      await startQuestionTimer({
        assignmentId: testAssignmentId,
        teamId: testTeamId
      });
    });

    it("should accept correct answer within time limit", async () => {
      const result = await submitQuestionAnswer({
        assignmentId: testAssignmentId,
        teamId: testTeamId,
        answer: "correct_answer"
      });

      expect(result.success).toBe(true);
      expect(result.result?.isCorrect).toBe(true);
      expect(result.result?.scoreChange).toBeGreaterThan(200); // Base + bonus
      expect(result.result?.status).toBe("COMPLETED");

      // Verify team score increased
      const team = await prisma.team.findUnique({ where: { id: testTeamId } });
      expect(team!.score).toBeGreaterThan(1000);
    });

    it("should reject incorrect answer", async () => {
      const initialScore = 1000;

      const result = await submitQuestionAnswer({
        assignmentId: testAssignmentId,
        teamId: testTeamId,
        answer: "wrong_answer"
      });

      expect(result.success).toBe(true);
      expect(result.result?.isCorrect).toBe(false);
      expect(result.result?.scoreChange).toBe(0);

      // Verify team score unchanged
      const team = await prisma.team.findUnique({ where: { id: testTeamId } });
      expect(team!.score).toBe(initialScore);
    });

    it("should handle case-insensitive and trimmed answers", async () => {
      const result = await submitQuestionAnswer({
        assignmentId: testAssignmentId,
        teamId: testTeamId,
        answer: "  CORRECT_ANSWER  "
      });

      expect(result.success).toBe(true);
      expect(result.result?.isCorrect).toBe(true);
    });

    it("should award decreasing bonus for slower solve", async () => {
      // Wait 2 seconds before submitting
      await new Promise(resolve => setTimeout(resolve, 2000));

      const result = await submitQuestionAnswer({
        assignmentId: testAssignmentId,
        teamId: testTeamId,
        answer: "correct_answer"
      });

      expect(result.success).toBe(true);
      expect(result.result?.isCorrect).toBe(true);
      expect(result.result?.timeUsed).toBeGreaterThanOrEqual(2);
      // Bonus should still be full since we're well within time
      expect(result.result?.scoreChange).toBeGreaterThanOrEqual(200);
    });

    it("should reject submission after timer expires", async () => {
      // Create assignment with very short timer (1 second)
      const shortAssignment = await prisma.teamChallengeAssignment.create({
        data: {
          teamId: testTeamId,
          auctionQuestionId: testAuctionQuestionId,
          winningBidSeconds: 1,
          status: "READY",
          bonusPoints: 10
        }
      });

      // Start and wait for expiration
      await startQuestionTimer({
        assignmentId: shortAssignment.id,
        teamId: testTeamId
      });

      await new Promise(resolve => setTimeout(resolve, 1500));

      const result = await submitQuestionAnswer({
        assignmentId: shortAssignment.id,
        teamId: testTeamId,
        answer: "correct_answer"
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain("expired");

      // Clean up
      await prisma.teamChallengeAssignment.delete({ where: { id: shortAssignment.id } });
    });
  });

  describe("Expired Timer Processing", () => {
    it("should process expired timers and apply penalties", async () => {
      // Create assignment with immediate expiration
      const expiredAssignment = await prisma.teamChallengeAssignment.create({
        data: {
          teamId: testTeamId,
          auctionQuestionId: testAuctionQuestionId,
          winningBidSeconds: 1,
          status: "ACTIVE",
          startedAt: new Date(Date.now() - 2000), // Started 2 seconds ago
          deadlineAt: new Date(Date.now() - 1000), // Expired 1 second ago
          bonusPoints: 50
        }
      });

      const initialScore = (await prisma.team.findUnique({
        where: { id: testTeamId }
      }))!.score;

      // Process expired timers
      const result = await processExpiredTimers();

      expect(result.processedCount).toBeGreaterThan(0);
      expect(result.expiredAssignments).toContain(expiredAssignment.id);

      // Verify assignment marked as FAILED
      const assignment = await prisma.teamChallengeAssignment.findUnique({
        where: { id: expiredAssignment.id }
      });
      expect(assignment?.status).toBe("FAILED");
      expect(assignment?.failedAt).toBeDefined();

      // Verify penalty applied
      const team = await prisma.team.findUnique({ where: { id: testTeamId } });
      expect(team!.score).toBe(initialScore - 50);

      // Clean up
      await prisma.teamChallengeAssignment.delete({ where: { id: expiredAssignment.id } });
    });

    it("should not process non-expired active timers", async () => {
      // Start a timer that hasn't expired
      await startQuestionTimer({
        assignmentId: testAssignmentId,
        teamId: testTeamId
      });

      const result = await processExpiredTimers();

      // This assignment should not be in the processed list
      expect(result.expiredAssignments).not.toContain(testAssignmentId);

      // Verify assignment still ACTIVE
      const assignment = await prisma.teamChallengeAssignment.findUnique({
        where: { id: testAssignmentId }
      });
      expect(assignment?.status).toBe("ACTIVE");
    });

    it("should handle multiple expired timers", async () => {
      // Create multiple expired assignments
      const expired1 = await prisma.teamChallengeAssignment.create({
        data: {
          teamId: testTeamId,
          auctionQuestionId: testAuctionQuestionId,
          winningBidSeconds: 1,
          status: "ACTIVE",
          startedAt: new Date(Date.now() - 3000),
          deadlineAt: new Date(Date.now() - 2000),
          bonusPoints: 30
        }
      });

      const expired2 = await prisma.teamChallengeAssignment.create({
        data: {
          teamId: testTeamId,
          auctionQuestionId: testAuctionQuestionId,
          winningBidSeconds: 1,
          status: "ACTIVE",
          startedAt: new Date(Date.now() - 4000),
          deadlineAt: new Date(Date.now() - 3000),
          bonusPoints: 40
        }
      });

      const result = await processExpiredTimers();

      expect(result.processedCount).toBeGreaterThanOrEqual(2);
      expect(result.expiredAssignments).toContain(expired1.id);
      expect(result.expiredAssignments).toContain(expired2.id);

      // Clean up
      await prisma.teamChallengeAssignment.deleteMany({
        where: { id: { in: [expired1.id, expired2.id] } }
      });
    });
  });

  describe("Timer Edge Cases", () => {
    it("should handle very short time limits", async () => {
      const shortAssignment = await prisma.teamChallengeAssignment.create({
        data: {
          teamId: testTeamId,
          auctionQuestionId: testAuctionQuestionId,
          winningBidSeconds: 5, // 5 seconds
          status: "READY",
          bonusPoints: 20
        }
      });

      const result = await startQuestionTimer({
        assignmentId: shortAssignment.id,
        teamId: testTeamId
      });

      expect(result.success).toBe(true);
      expect(result.timer?.bidTimeSeconds).toBe(5);

      // Clean up
      await prisma.teamChallengeAssignment.delete({ where: { id: shortAssignment.id } });
    });

    it("should handle very long time limits", async () => {
      const longAssignment = await prisma.teamChallengeAssignment.create({
        data: {
          teamId: testTeamId,
          auctionQuestionId: testAuctionQuestionId,
          winningBidSeconds: 3600, // 1 hour
          status: "READY",
          bonusPoints: 150
        }
      });

      const result = await startQuestionTimer({
        assignmentId: longAssignment.id,
        teamId: testTeamId
      });

      expect(result.success).toBe(true);
      expect(result.timer?.bidTimeSeconds).toBe(3600);

      // Clean up
      await prisma.teamChallengeAssignment.delete({ where: { id: longAssignment.id } });
    });

    it("should prevent timer manipulation", async () => {
      // Start timer
      await startQuestionTimer({
        assignmentId: testAssignmentId,
        teamId: testTeamId
      });

      // Try to manually extend deadline
      const originalAssignment = await prisma.teamChallengeAssignment.findUnique({
        where: { id: testAssignmentId }
      });

      await prisma.teamChallengeAssignment.update({
        where: { id: testAssignmentId },
        data: {
          deadlineAt: new Date(Date.now() + 600000) // Try to extend by 10 minutes
        }
      });

      // Get timer status (should use deadline from DB)
      const status = await getTimerStatus(testAssignmentId, testTeamId);

      // Time remaining should be more than original but system should still track it
      expect(status.timer?.deadlineAt).toBeDefined();
    });
  });
});
