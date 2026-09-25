export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getTeamActiveAssignments } from "@/lib/round2-auction";
import { processExpiredTimers } from "@/lib/round2-timer";
import { validateTeamAuth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const teamAuth = await validateTeamAuth(request);
    if (!teamAuth.success || !teamAuth.teamId) {
      return NextResponse.json({ error: teamAuth.error || "Authentication required" }, { status: 401 });
    }

    // No cron sweeps expired Round 2 timers, so piggyback it on this poll
    // (called every 4s by the team dashboard) — applies FAILED status and
    // any timeout penalty as soon as a deadline passes, not just when the
    // timed-out team happens to be polling.
    await processExpiredTimers();

    const assignments = await getTeamActiveAssignments(teamAuth.teamId);

    const { getTimerStatus } = await import("@/lib/round2-timer");
    const visibleAssignments = await Promise.all(assignments.map(async (assignment) => {
      const timer = await getTimerStatus(assignment.id, teamAuth.teamId!);
      return {
        ...assignment,
        questionTitle: assignment.title,
        bidTimeSeconds: assignment.winningBidSeconds,
        points: assignment.points, // Admin-set points (no bonus)
        outcome: assignment.status,
        timeRemaining: timer.timer?.timeRemaining ?? null,
        question: null,
      };
    }));

    return NextResponse.json({
      success: true,
      assignments: visibleAssignments
    });
  } catch (error: any) {
    console.error("Get team assignments error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
