-- Migration: Round 1 Cleanup - Remove First Blood, Batches, Add Core/Backup Classification
-- This migration transforms the question model according to CIPHER CHASE specification

-- Add new fields for Round 1 redesign
ALTER TABLE "Question" ADD COLUMN "isCore" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Question" ADD COLUMN "isReleased" BOOLEAN NOT NULL DEFAULT true;

-- Remove First Blood system fields
ALTER TABLE "Question" DROP COLUMN IF EXISTS "firstBloodBonus";
ALTER TABLE "Submission" DROP COLUMN IF EXISTS "isFirstBlood";

-- Remove batch/wave system fields  
ALTER TABLE "Question" DROP COLUMN IF EXISTS "batchNumber";
ALTER TABLE "Question" DROP COLUMN IF EXISTS "releaseAt";
ALTER TABLE "Question" DROP COLUMN IF EXISTS "closeAt";

-- Update existing questions to be core questions (Q01-Q20)
-- Questions Q01-Q20 will be isCore=true, isReleased=true
-- Questions Q21-Q30 will be isCore=false, isReleased=false (backup questions)

-- Drop existing batch-based indexes
DROP INDEX IF EXISTS "Question_roundId_batchNumber_order_idx";
DROP INDEX IF EXISTS "Question_releaseAt_idx";
DROP INDEX IF EXISTS "Question_closeAt_idx";

-- Create new indexes for core/backup system
CREATE INDEX "Question_roundId_isCore_order_idx" ON "Question"("roundId", "isCore", "order");
CREATE INDEX "Question_roundId_isReleased_idx" ON "Question"("roundId", "isReleased");
CREATE INDEX "Question_isCore_isReleased_idx" ON "Question"("isCore", "isReleased");