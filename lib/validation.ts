import { z } from "zod";

// Admin Login Schema
export const AdminLoginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

// Team Join Schema
export const TeamJoinSchema = z.object({
  joinCode: z
    .string()
    .trim()
    .toUpperCase()
    .min(3, "Join code is too short")
    .max(20, "Join code is too long"),
  memberName: z
    .string()
    .trim()
    .min(1, "Member name is required")
    .max(50, "Member name cannot exceed 50 characters"),
});

// Team Creation Schema
export const CreateTeamSchema = z.object({
  name: z.string().trim().min(2, "Team name must be at least 2 characters").max(50),
  joinCode: z.string().trim().toUpperCase().optional(),
  members: z.array(z.string().trim().min(1)).min(1, "At least one member is required"),
});

// Question Creation/Edit Schema
export const QuestionSchema = z.object({
  title: z.string().trim().min(2, "Title is required").max(100),
  description: z.string().trim().min(5, "Description is required"),
  answer: z.string().trim().min(1, "Answer/Flag is required"),
  points: z.coerce.number().int().min(1, "Points must be greater than 0"),
  difficulty: z.enum(["EASY", "MEDIUM", "HARD"]),
  category: z.string().trim().min(2, "Category is required"),
  releaseAt: z.string().or(z.date()),
  closeAt: z.string().or(z.date()),
  order: z.coerce.number().int().default(0),
});

// Answer Submission Schema
export const SubmitAnswerSchema = z.object({
  questionId: z.string().min(1, "Question ID is required"),
  answer: z.string().trim().min(1, "Answer cannot be empty"),
  memberName: z.string().trim().max(50).optional(),
});

// Round Status Schema
export const RoundStatusSchema = z.object({
  status: z.enum(["DRAFT", "READY", "LIVE", "PAUSED", "FINISHED"]),
});

// Qualification Schema
export const QualifyTeamsSchema = z.object({
  topCount: z.coerce.number().int().min(1, "Top count must be at least 1"),
});

// Set Auction Winner Schema
export const SetAuctionWinnerSchema = z.object({
  challengeId: z.string().min(1),
  teamId: z.string().min(1),
  committedSeconds: z.coerce.number().int().min(10, "Committed time must be at least 10 seconds"),
});

// Complete Auction Challenge Schema
export const CompleteAuctionChallengeSchema = z.object({
  challengeId: z.string().min(1),
  success: z.boolean(),
  notes: z.string().optional(),
});

// Manual Score Adjustment Schema
export const ManualScoreAdjustmentSchema = z.object({
  teamId: z.string().min(1),
  points: z.coerce.number().int(),
  reason: z.string().trim().min(3, "Reason must be provided"),
});
