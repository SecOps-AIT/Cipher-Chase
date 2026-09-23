-- Migration: Round 2 Time-Based Auction System
-- Remove wallet/cash system, implement time-based auction

-- Remove wallet field from Team table
ALTER TABLE "Team" DROP COLUMN IF EXISTS "wallet";

-- Create AuctionQuestion table for Round 2 auction questions
CREATE TABLE "AuctionQuestion" (
    "id" TEXT NOT NULL,
    "roundId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "outline" TEXT NOT NULL,
    "baseTimeSeconds" INTEGER NOT NULL,
    "basePoints" INTEGER NOT NULL DEFAULT 200,
    "bonusFormula" TEXT, -- Configurable bonus calculation
    "status" TEXT NOT NULL DEFAULT 'DRAFT', -- DRAFT, OPEN, CLOSED, SOLD
    "displayedAt" TIMESTAMP(3),
    "auctionClosedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AuctionQuestion_pkey" PRIMARY KEY ("id")
);

-- Create AuctionBid table for team time bids
CREATE TABLE "AuctionBid" (
    "id" TEXT NOT NULL,
    "auctionQuestionId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "bidTimeSeconds" INTEGER NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuctionBid_pkey" PRIMARY KEY ("id")
);

-- Create AuctionSale table for settled auctions
CREATE TABLE "AuctionSale" (
    "id" TEXT NOT NULL,
    "auctionQuestionId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "winningBidSeconds" INTEGER NOT NULL,
    "settledByAdminId" TEXT,
    "soldAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuctionSale_pkey" PRIMARY KEY ("id")
);

-- Create TeamChallengeAssignment table for purchased questions
CREATE TABLE "TeamChallengeAssignment" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "auctionQuestionId" TEXT NOT NULL,
    "winningBidSeconds" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'READY', -- READY, ACTIVE, COMPLETED, FAILED
    "startedAt" TIMESTAMP(3),
    "deadlineAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "bonusPoints" INTEGER DEFAULT 0,
    "finalScoreChange" INTEGER DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeamChallengeAssignment_pkey" PRIMARY KEY ("id")
);

-- Add foreign key constraints
ALTER TABLE "AuctionQuestion" ADD CONSTRAINT "AuctionQuestion_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "Round"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AuctionQuestion" ADD CONSTRAINT "AuctionQuestion_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AuctionBid" ADD CONSTRAINT "AuctionBid_auctionQuestionId_fkey" FOREIGN KEY ("auctionQuestionId") REFERENCES "AuctionQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AuctionBid" ADD CONSTRAINT "AuctionBid_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AuctionSale" ADD CONSTRAINT "AuctionSale_auctionQuestionId_fkey" FOREIGN KEY ("auctionQuestionId") REFERENCES "AuctionQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AuctionSale" ADD CONSTRAINT "AuctionSale_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TeamChallengeAssignment" ADD CONSTRAINT "TeamChallengeAssignment_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TeamChallengeAssignment" ADD CONSTRAINT "TeamChallengeAssignment_auctionQuestionId_fkey" FOREIGN KEY ("auctionQuestionId") REFERENCES "AuctionQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Create unique constraints to prevent duplicate sales and assignments
ALTER TABLE "AuctionSale" ADD CONSTRAINT "AuctionSale_auctionQuestionId_key" UNIQUE ("auctionQuestionId");
ALTER TABLE "TeamChallengeAssignment" ADD CONSTRAINT "TeamChallengeAssignment_teamId_auctionQuestionId_key" UNIQUE ("teamId", "auctionQuestionId");

-- Create indexes for performance
CREATE INDEX "AuctionQuestion_roundId_status_idx" ON "AuctionQuestion"("roundId", "status");
CREATE INDEX "AuctionQuestion_status_displayedAt_idx" ON "AuctionQuestion"("status", "displayedAt");

CREATE INDEX "AuctionBid_auctionQuestionId_bidTimeSeconds_idx" ON "AuctionBid"("auctionQuestionId", "bidTimeSeconds");
CREATE INDEX "AuctionBid_teamId_submittedAt_idx" ON "AuctionBid"("teamId", "submittedAt");

CREATE INDEX "AuctionSale_teamId_soldAt_idx" ON "AuctionSale"("teamId", "soldAt");

CREATE INDEX "TeamChallengeAssignment_teamId_status_idx" ON "TeamChallengeAssignment"("teamId", "status");
CREATE INDEX "TeamChallengeAssignment_status_startedAt_idx" ON "TeamChallengeAssignment"("status", "startedAt");
CREATE INDEX "TeamChallengeAssignment_deadlineAt_idx" ON "TeamChallengeAssignment"("deadlineAt");

-- Remove old auction challenge system if it exists (wallet-based)
-- Keep the tables for now but we'll deprecate them