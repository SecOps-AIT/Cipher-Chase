export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth";
import { getRecentActivities, getActivityStats } from "@/lib/activity";

/**
 * GET /api/admin/activity
 * Get activity logs with optional filters
 */
export async function GET(request: Request) {
  try {
    await requireAdminSession();

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "100");
    const eventId = searchParams.get("eventId") || undefined;
    const teamId = searchParams.get("teamId") || undefined;
    const actor = searchParams.get("actor") || undefined;
    const action = searchParams.get("action") || undefined;

    const [activities, stats] = await Promise.all([
      getRecentActivities({
        limit,
        eventId,
        teamId,
        actor,
        action,
      }),
      getActivityStats(eventId),
    ]);

    return NextResponse.json({
      success: true,
      activities,
      stats,
      total: activities.length,
    });

  } catch (err: any) {
    if (err.message === "UNAUTHORIZED_ADMIN") {
      return NextResponse.json(
        { error: "Unauthorized: Admin access required" },
        { status: 403 }
      );
    }
    console.error("Error fetching activity logs:", err);
    return NextResponse.json(
      { error: err.message || "Failed to fetch activity logs" },
      { status: 500 }
    );
  }
}
