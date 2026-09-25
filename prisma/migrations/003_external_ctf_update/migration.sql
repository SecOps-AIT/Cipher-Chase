-- Migration: External CTF Integration and Game Model Updates
-- Purpose: Transform to match final game specification

-- Add external challenge URL to Question model
ALTER TABLE "Question" ADD COLUMN "externalChallengeUrl" TEXT;

-- Add answer normalization fields
ALTER TABLE "Question" ADD COLUMN "expectedFlag" TEXT;
ALTER TABLE "Question" ADD COLUMN "answerNormalization" TEXT DEFAULT 'TRIM_UPPERCASE';

-- Add outline field for short description
ALTER TABLE "Question" ADD COLUMN "outline" TEXT;

-- Remove backup question system (all questions are now core)
UPDATE "Question" SET "isCore" = true WHERE "isCore" = false;

-- Add manual hint tracking fields to Team
ALTER TABLE "Team" ADD COLUMN "manualHintsR1" INT DEFAULT 0;
ALTER TABLE "Team" ADD COLUMN "manualHintsR2" INT DEFAULT 0;
ALTER TABLE "Team" ADD COLUMN "hintPenaltyApplied" INT DEFAULT 0;

-- Add file attachment support for Round 2 questions
CREATE TABLE "QuestionAttachment" (
  "id" TEXT PRIMARY KEY,
  "questionId" TEXT NOT NULL,
  "filename" TEXT NOT NULL,
  "originalName" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "fileSize" INT NOT NULL,
  "storageUrl" TEXT NOT NULL,
  "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "QuestionAttachment_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE
);

CREATE INDEX "QuestionAttachment_questionId_idx" ON "QuestionAttachment"("questionId");

-- Add activity tracking
CREATE TABLE "ActivityLog" (
  "id" TEXT PRIMARY KEY,
  "eventId" TEXT,
  "teamId" TEXT,
  "memberId" TEXT,
  "actor" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "target" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ActivityLog_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE,
  CONSTRAINT "ActivityLog_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE
);

CREATE INDEX "ActivityLog_eventId_createdAt_idx" ON "ActivityLog"("eventId", "createdAt");
CREATE INDEX "ActivityLog_teamId_createdAt_idx" ON "ActivityLog"("teamId", "createdAt");
CREATE INDEX "ActivityLog_action_idx" ON "ActivityLog"("action");

-- Add full question content field for Round 2
ALTER TABLE "Question" ADD COLUMN "fullContent" TEXT;

-- Update AuctionQuestion to reference files
ALTER TABLE "AuctionQuestion" ADD COLUMN "hasAttachments" BOOLEAN DEFAULT false;

-- Add admin notes field
ALTER TABLE "Question" ADD COLUMN "adminNotes" TEXT;

-- Add participant visibility control
ALTER TABLE "Team" ADD COLUMN "hideFromLeaderboard" BOOLEAN DEFAULT false;

-- Create index for active Round 1 teams
CREATE INDEX "Team_round1Active_idx" ON "Team"("round1StartedAt", "round1DeadlineAt") WHERE "round1StartedAt" IS NOT NULL;

-- Add question solve tracking
ALTER TABLE "Submission" ADD COLUMN "normalizedAnswer" TEXT;

-- Update ScoreEvent to include more context
ALTER TABLE "ScoreEvent" ADD COLUMN "questionId" TEXT;
ALTER TABLE "ScoreEvent" ADD COLUMN "metadata" JSONB;

CREATE INDEX "ScoreEvent_questionId_idx" ON "ScoreEvent"("questionId");
