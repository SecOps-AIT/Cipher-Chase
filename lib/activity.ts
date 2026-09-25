import { prisma } from "@/lib/prisma";

/**
 * Activity logging utility for tracking admin and system actions
 * 
 * This provides a centralized way to log important activities for:
 * - Security auditing
 * - Debugging and monitoring
 * - Competition integrity
 */

export interface ActivityLogData {
  eventId?: string;
  teamId?: string;
  memberId?: string;
  questionId?: string;
  action: string;
  performedBy?: string; // email of the admin/user performing the action
  details?: string; // human-readable description
  metadata?: Record<string, any>;
}

/**
 * Log an activity to the ActivityLog table
 */
export async function logActivity(data: ActivityLogData): Promise<void> {
  try {
    // Determine actor type based on data
    let actor: "ADMIN" | "SYSTEM" | "TEAM" = "SYSTEM";
    if (data.performedBy) {
      // If performedBy is an admin email or contains "admin", it's an admin action
      actor = "ADMIN";
    } else if (data.teamId || data.memberId) {
      actor = "TEAM";
    }

    await prisma.activityLog.create({
      data: {
        eventId: data.eventId || null,
        teamId: data.teamId || null,
        memberId: data.memberId || null,
        actor,
        action: data.action,
        target: data.details || null,
        metadata: {
          ...data.metadata,
          performedBy: data.performedBy,
        },
      },
    });
  } catch (error) {
    // Log error but don't throw - activity logging should not break main operations
    console.error("Failed to log activity:", error);
  }
}

/**
 * Pre-defined action types for consistency
 */
export const ActivityActions = {
  // Admin - Team Management
  TEAM_CREATED: "TEAM_CREATED",
  TEAM_DELETED: "TEAM_DELETED",
  TEAM_UPDATED: "TEAM_UPDATED",
  SCORE_ADJUSTED: "SCORE_ADJUSTED",
  TEAMS_QUALIFIED: "TEAMS_QUALIFIED",
  
  // Admin - Question Management
  QUESTION_CREATED: "QUESTION_CREATED",
  QUESTION_UPDATED: "QUESTION_UPDATED",
  QUESTION_DELETED: "QUESTION_DELETED",
  BACKUP_QUESTIONS_RELEASED: "BACKUP_QUESTIONS_RELEASED",
  
  // Admin - Round Management
  ROUND_STATUS_CHANGED: "ROUND_STATUS_CHANGED",
  ROUND_CONFIG_UPDATED: "ROUND_CONFIG_UPDATED",
  ROUND1_DURATION_SET: "ROUND1_DURATION_SET",
  
  // Admin - Auction Management
  AUCTION_STARTED: "AUCTION_STARTED",
  AUCTION_OPENED: "AUCTION_OPENED",
  AUCTION_CLOSED: "AUCTION_CLOSED",
  AUCTION_SETTLED: "AUCTION_SETTLED",
  AUCTION_WINNER_SET: "AUCTION_WINNER_SET",
  AUCTION_RESOLVED: "AUCTION_RESOLVED",
  
  // Admin - File Management
  FILE_UPLOADED: "FILE_UPLOADED",
  ATTACHMENT_ADDED: "ATTACHMENT_ADDED",
  ATTACHMENT_DELETED: "ATTACHMENT_DELETED",
  
  // Admin - Hints
  HINT_RECORDED: "HINT_RECORDED",
  HINT_CREATED: "HINT_CREATED",
  HINT_UPDATED: "HINT_UPDATED",
  
  // System - Automated Actions
  TIMER_EXPIRED: "TIMER_EXPIRED",
  PENALTY_APPLIED: "PENALTY_APPLIED",
  
  // Team - Important Actions
  TEAM_JOINED: "TEAM_JOINED",
  MEMBER_LOGGED_IN: "MEMBER_LOGGED_IN",
  QUESTION_TIMER_STARTED: "QUESTION_TIMER_STARTED",
  FLAG_SUBMITTED: "FLAG_SUBMITTED",
  QUESTION_SOLVED: "QUESTION_SOLVED",
  BID_SUBMITTED: "BID_SUBMITTED",
} as const;

/**
 * Get recent activities with filters
 */
export async function getRecentActivities(options: {
  limit?: number;
  eventId?: string;
  teamId?: string;
  actor?: string;
  action?: string;
  startDate?: Date;
  endDate?: Date;
}): Promise<Array<{
  id: string;
  eventId: string | null;
  teamId: string | null;
  memberId: string | null;
  actor: string;
  action: string;
  target: string | null;
  metadata: any;
  createdAt: Date;
}>> {
  const where: any = {};
  
  if (options.eventId) where.eventId = options.eventId;
  if (options.teamId) where.teamId = options.teamId;
  if (options.actor) where.actor = options.actor;
  if (options.action) where.action = options.action;
  
  if (options.startDate || options.endDate) {
    where.createdAt = {};
    if (options.startDate) where.createdAt.gte = options.startDate;
    if (options.endDate) where.createdAt.lte = options.endDate;
  }

  return await prisma.activityLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: options.limit || 100,
  });
}

/**
 * Get activity statistics
 */
export async function getActivityStats(eventId?: string): Promise<{
  totalActivities: number;
  adminActions: number;
  teamActions: number;
  systemActions: number;
  recentActivityCount: number; // Last 24 hours
}> {
  const where: any = eventId ? { eventId } : {};
  const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [total, adminCount, teamCount, systemCount, recentCount] = await Promise.all([
    prisma.activityLog.count({ where }),
    prisma.activityLog.count({ where: { ...where, actor: "ADMIN" } }),
    prisma.activityLog.count({ where: { ...where, actor: "TEAM" } }),
    prisma.activityLog.count({ where: { ...where, actor: "SYSTEM" } }),
    prisma.activityLog.count({ where: { ...where, createdAt: { gte: last24h } } }),
  ]);

  return {
    totalActivities: total,
    adminActions: adminCount,
    teamActions: teamCount,
    systemActions: systemCount,
    recentActivityCount: recentCount,
  };
}
