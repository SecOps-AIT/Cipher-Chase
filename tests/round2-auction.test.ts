import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { prisma } from "../lib/prisma";
import {
  createAuctionQuestion,
  submitBid,
  settleAuction,
  calculateBonus,
  formatTime,
  parseTimeToSeconds
} from "../lib/round2-auction";

describe("Round 2 Time Auction System", () => {
  let testEventId: string;
  let testRoundId: string;
  let testTeam1Id: string;
  let testTeam2Id: string;
  let testQuestionId: string;

  beforeAll(async () => {
    // Create test event
    const event = await prisma.event.create({
      data: {
        name: "Round 2 Auction Test Event",
        slug: "r2-auction-test",
        status: "LIVE"
      }
    });
    testEventId = event.id;

    // Create Round 2
    const round2 = await prisma.round.create({
      data: {
        eventId: testEventId,
        number: 2,
        name: "Round 2 - Time Auction",
        status: "LIVE"
      }
    });
    testRoundId = round2.id;

    // Create test teams
    const team1 = await prisma.team.create({
      data: {
        name: "Test Team Alpha",
        joinCode: "TEST-A",
        eventId: testEventId,
        score: 1000,
        qualified: true
      }
    });
    testTeam1Id = team1.id;

    const team2 = await prisma.team.create({
      data: {
        name: "Test Team Beta",
        joinCode: "TEST-B",
        eventId: testEventId,
        score: 1000,
        qualified: true
      }
    });
    testTeam2Id = team2.id;

    // Create test question
    const question = await prisma.question.create({
      data: {
        roundId: testRoundId,
        title: "Test Crypto Challenge",
        description: "Decrypt the message",
        category: "Cryptography",
        difficulty: "MEDIUM",
        points: 200,
        answer: "FLAG{test123}",
        answerMode: "TRIMMED"
      }
    });
    testQuestionId = question.id;
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.team.deleteMany({ where: { eventId: testEventId } });
    await prisma.round.deleteMany({ where: { eventId: testEventId } });
    await prisma.event.delete({ where: { id: testEventId } });
  });

  describe("Time Format Utilities", () => {
    it("should format seconds to MM:SS correctly", () => {
      expect(formatTime(0)).toBe("0:00");
      expect(formatTime(30)).toBe("0:30");
      expect(formatTime(60)).toBe("1:00");
      expect(formatTime(90)).toBe("1:30");
      expect(formatTime(600)).toBe("10:00");
      expect(formatTime(3661)).toBe("61:01");
    });

    it("should parse MM:SS to seconds correctly", () => {
      expect(parseTimeToSeconds("0:00")).toBe(0);
      expect(parseTimeToSeconds("0:30")).toBe(30);
      expect(parseTimeToSeconds("1:00")).toBe(60);
      expect(parseTimeToSeconds("1:30")).toBe(90);
      expect(parseTimeToSeconds("10:00")).toBe(600);
      expect(parseTimeToSeconds("61:01")).toBe(3661);
    });

    it("should handle various time string formats", () => {
      expect(parseTimeToSeconds("5:00")).toBe(300);
      expect(parseTimeToSeconds("05:00")).toBe(300);
      expect(parseTimeToSeconds("5:0")).toBe(300);
      expect(parseTimeToSeconds("05:0")).toBe(300);
    });
  });

  describe("Bonus Calculation", () => {
    it("should calculate 0% bonus when bid equals base time", () => {
      const result = calculateBonus(600, 600, 200);
      expect(result.timeReduction).toBe(0);
      expect(result.bonusPoints).toBe(0);
      expect(result.potentialScore).toBe(200);
      expect(result.failurePenalty).toBe(0);
    });

    it("should calculate 50% bonus correctly", () => {
      const result = calculateBonus(600, 300, 200);
      expect(result.timeReduction).toBe(300);
      expect(result.bonusPoints).toBe(100);
      expect(result.potentialScore).toBe(300);
      expect(result.failurePenalty).toBe(-100);
    });

    it("should calculate 75% bonus correctly", () => {
      const result = calculateBonus(600, 150, 200);
      expect(result.timeReduction).toBe(450);
      expect(result.bonusPoints).toBe(150);
      expect(result.potentialScore).toBe(350);
      expect(result.failurePenalty).toBe(-150);
    });

    it("should calculate 90% bonus correctly", () => {
      const result = calculateBonus(600, 60, 200);
      expect(result.timeReduction).toBe(540);
      expect(result.bonusPoints).toBe(180);
      expect(result.potentialScore).toBe(380);
      expect(result.failurePenalty).toBe(-180);
    });

    it("should handle different base points", () => {
      const result = calculateBonus(600, 300, 500);
      expect(result.bonusPoints).toBe(250); // 50% of 500
      expect(result.potentialScore).toBe(750);
    });

    it("should floor bonus points to integer", () => {
      // 33.33% reduction should floor to integer
      const result = calculateBonus(600, 400, 200);
      expect(result.bonusPoints).toBe(66); // floor(66.66...)
    });
  });

  describe("Auction Question Creation", () => {
    it("should create auction question successfully", async () => {
      const result = await createAuctionQuestion({
        roundId: testRoundId,
        questionId: testQuestionId,
        title: "Crypto Auction #1",
        topic: "Cryptography",
        outline: "Decrypt a message using classical cipher techniques",
        baseTimeSeconds: 600,
        basePoints: 200
      });

      expect(result.success).toBe(true);
      expect(result.auctionQuestion).toBeDefined();
      expect(result.auctionQuestion?.status).toBe("DRAFT");
      expect(result.auctionQuestion?.baseTimeSeconds).toBe(600);
      expect(result.auctionQuestion?.basePoints).toBe(200);

      // Clean up
      if (result.auctionQuestion) {
        await prisma.auctionQuestion.delete({ where: { id: result.auctionQuestion.id } });
      }
    });

    it("should reject creation with invalid base time", async () => {
      const result = await createAuctionQuestion({
        roundId: testRoundId,
        questionId: testQuestionId,
        title: "Invalid Auction",
        topic: "Test",
        outline: "Test",
        baseTimeSeconds: -100,
        basePoints: 200
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Base time must be positive");
    });

    it("should reject creation with invalid base points", async () => {
      const result = await createAuctionQuestion({
        roundId: testRoundId,
        questionId: testQuestionId,
        title: "Invalid Auction",
        topic: "Test",
        outline: "Test",
        baseTimeSeconds: 600,
        basePoints: 0
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Base points must be positive");
    });
  });

  describe("Bidding System", () => {
    let auctionQuestionId: string;

    beforeEach(async () => {
      // Create and open an auction for bidding tests
      const auction = await createAuctionQuestion({
        roundId: testRoundId,
        questionId: testQuestionId,
        title: "Bidding Test Auction",
        topic: "Test",
        outline: "Test outline",
        baseTimeSeconds: 600,
        basePoints: 200
      });

      auctionQuestionId = auction.auctionQuestion!.id;

      // Open the auction
      await prisma.auctionQuestion.update({
        where: { id: auctionQuestionId },
        data: {
          status: "OPEN",
          displayedAt: new Date()
        }
      });
    });

    afterEach(async () => {
      // Clean up auction and bids
      await prisma.auctionBid.deleteMany({ where: { auctionQuestionId } });
      await prisma.auctionQuestion.delete({ where: { id: auctionQuestionId } });
    });

    it("should accept valid bid", async () => {
      const result = await submitBid({
        auctionQuestionId,
        teamId: testTeam1Id,
        bidTimeSeconds: 300
      });

      expect(result.success).toBe(true);
      expect(result.bid?.bidTimeSeconds).toBe(300);
      expect(result.potentialBonus).toBe(100); // 50% bonus
    });

    it("should reject bid that exceeds base time", async () => {
      const result = await submitBid({
        auctionQuestionId,
        teamId: testTeam1Id,
        bidTimeSeconds: 700 // Exceeds base time of 600
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("cannot exceed base time");
    });

    it("should allow updating bid with lower time", async () => {
      // First bid
      await submitBid({
        auctionQuestionId,
        teamId: testTeam1Id,
        bidTimeSeconds: 400
      });

      // Update with lower bid
      const result = await submitBid({
        auctionQuestionId,
        teamId: testTeam1Id,
        bidTimeSeconds: 300
      });

      expect(result.success).toBe(true);
      expect(result.bid?.bidTimeSeconds).toBe(300);

      // Verify only one bid exists
      const bids = await prisma.auctionBid.findMany({
        where: { auctionQuestionId, teamId: testTeam1Id }
      });
      expect(bids.length).toBe(1);
    });

    it("should reject bid update with higher time", async () => {
      // First bid
      await submitBid({
        auctionQuestionId,
        teamId: testTeam1Id,
        bidTimeSeconds: 300
      });

      // Try to update with higher bid
      const result = await submitBid({
        auctionQuestionId,
        teamId: testTeam1Id,
        bidTimeSeconds: 400
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("can only reduce");
    });

    it("should accept bids from multiple teams", async () => {
      const result1 = await submitBid({
        auctionQuestionId,
        teamId: testTeam1Id,
        bidTimeSeconds: 350
      });

      const result2 = await submitBid({
        auctionQuestionId,
        teamId: testTeam2Id,
        bidTimeSeconds: 300
      });

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);

      const bids = await prisma.auctionBid.findMany({
        where: { auctionQuestionId },
        orderBy: { bidTimeSeconds: "asc" }
      });

      expect(bids.length).toBe(2);
      expect(bids[0].teamId).toBe(testTeam2Id); // Lowest bid
      expect(bids[0].bidTimeSeconds).toBe(300);
    });

    it("should reject bid on closed auction", async () => {
      // Close the auction
      await prisma.auctionQuestion.update({
        where: { id: auctionQuestionId },
        data: { status: "CLOSED", auctionClosedAt: new Date() }
      });

      const result = await submitBid({
        auctionQuestionId,
        teamId: testTeam1Id,
        bidTimeSeconds: 300
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("not open");
    });
  });

  describe("Auction Settlement", () => {
    let auctionQuestionId: string;

    beforeEach(async () => {
      // Create closed auction with bids
      const auction = await createAuctionQuestion({
        roundId: testRoundId,
        questionId: testQuestionId,
        title: "Settlement Test Auction",
        topic: "Test",
        outline: "Test outline",
        baseTimeSeconds: 600,
        basePoints: 200
      });

      auctionQuestionId = auction.auctionQuestion!.id;

      // Open auction
      await prisma.auctionQuestion.update({
        where: { id: auctionQuestionId },
        data: { status: "OPEN", displayedAt: new Date() }
      });

      // Add bids
      await submitBid({
        auctionQuestionId,
        teamId: testTeam1Id,
        bidTimeSeconds: 400
      });

      await submitBid({
        auctionQuestionId,
        teamId: testTeam2Id,
        bidTimeSeconds: 300
      });

      // Close auction
      await prisma.auctionQuestion.update({
        where: { id: auctionQuestionId },
        data: { status: "CLOSED", auctionClosedAt: new Date() }
      });
    });

    afterEach(async () => {
      // Clean up
      await prisma.teamChallengeAssignment.deleteMany({
        where: { auctionQuestionId }
      });
      await prisma.auctionSale.deleteMany({ where: { auctionQuestionId } });
      await prisma.auctionBid.deleteMany({ where: { auctionQuestionId } });
      await prisma.auctionQuestion.delete({ where: { id: auctionQuestionId } });
    });

    it("should settle auction with lowest bidder", async () => {
      const result = await settleAuction({
        auctionQuestionId,
        winningTeamId: testTeam2Id,
        winningBidSeconds: 300
      });

      expect(result.success).toBe(true);
      expect(result.sale?.teamId).toBe(testTeam2Id);
      expect(result.sale?.winningBidSeconds).toBe(300);

      // Verify auction status updated to SOLD
      const auction = await prisma.auctionQuestion.findUnique({
        where: { id: auctionQuestionId }
      });
      expect(auction?.status).toBe("SOLD");

      // Verify assignment created
      const assignment = await prisma.teamChallengeAssignment.findFirst({
        where: { auctionQuestionId, teamId: testTeam2Id }
      });
      expect(assignment).toBeDefined();
      expect(assignment?.status).toBe("READY");
      expect(assignment?.bidTimeSeconds).toBe(300);
      expect(assignment?.bonusPoints).toBe(100); // 50% bonus
    });

    it("should reject settlement of non-closed auction", async () => {
      // Reopen auction
      await prisma.auctionQuestion.update({
        where: { id: auctionQuestionId },
        data: { status: "OPEN" }
      });

      const result = await settleAuction({
        auctionQuestionId,
        winningTeamId: testTeam2Id,
        winningBidSeconds: 300
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("not closed");
    });

    it("should prevent double settlement", async () => {
      // First settlement
      await settleAuction({
        auctionQuestionId,
        winningTeamId: testTeam2Id,
        winningBidSeconds: 300
      });

      // Try to settle again
      const result = await settleAuction({
        auctionQuestionId,
        winningTeamId: testTeam1Id,
        winningBidSeconds: 400
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("already settled");
    });
  });

  describe("Auction Lifecycle Integration", () => {
    it("should complete full auction lifecycle", async () => {
      // 1. Create auction question
      const createResult = await createAuctionQuestion({
        roundId: testRoundId,
        questionId: testQuestionId,
        title: "Full Lifecycle Test",
        topic: "Integration",
        outline: "End-to-end test",
        baseTimeSeconds: 600,
        basePoints: 200
      });

      expect(createResult.success).toBe(true);
      const auctionId = createResult.auctionQuestion!.id;

      // 2. Open auction
      await prisma.auctionQuestion.update({
        where: { id: auctionId },
        data: { status: "OPEN", displayedAt: new Date() }
      });

      // 3. Teams submit bids
      const bid1 = await submitBid({
        auctionQuestionId: auctionId,
        teamId: testTeam1Id,
        bidTimeSeconds: 450
      });
      expect(bid1.success).toBe(true);

      const bid2 = await submitBid({
        auctionQuestionId: auctionId,
        teamId: testTeam2Id,
        bidTimeSeconds: 350
      });
      expect(bid2.success).toBe(true);

      // 4. Close auction
      await prisma.auctionQuestion.update({
        where: { id: auctionId },
        data: { status: "CLOSED", auctionClosedAt: new Date() }
      });

      // 5. Settle auction
      const settleResult = await settleAuction({
        auctionQuestionId: auctionId,
        winningTeamId: testTeam2Id,
        winningBidSeconds: 350
      });
      expect(settleResult.success).toBe(true);

      // 6. Verify final state
      const finalAuction = await prisma.auctionQuestion.findUnique({
        where: { id: auctionId },
        include: {
          sale: true,
          assignments: true,
          bids: true
        }
      });

      expect(finalAuction?.status).toBe("SOLD");
      expect(finalAuction?.sale?.teamId).toBe(testTeam2Id);
      expect(finalAuction?.assignments.length).toBe(1);
      expect(finalAuction?.assignments[0].status).toBe("READY");
      expect(finalAuction?.bids.length).toBe(2);

      // Clean up
      await prisma.teamChallengeAssignment.deleteMany({ where: { auctionQuestionId: auctionId } });
      await prisma.auctionSale.deleteMany({ where: { auctionQuestionId: auctionId } });
      await prisma.auctionBid.deleteMany({ where: { auctionQuestionId: auctionId } });
      await prisma.auctionQuestion.delete({ where: { id: auctionId } });
    });
  });
});
