-- Add partial unique index to prevent duplicate correct submissions per team+question
-- This ensures database-level enforcement that a team can only have ONE correct submission per question
-- The partial index only applies when isCorrect = true, allowing multiple incorrect attempts

CREATE UNIQUE INDEX "Submission_teamId_questionId_correct_unique" 
ON "Submission"("teamId", "questionId") 
WHERE "isCorrect" = true;
