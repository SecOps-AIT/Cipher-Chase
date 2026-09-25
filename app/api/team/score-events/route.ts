export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { validateTeamAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/team/score-events
 * Get recent score events for the authenticated team
 * Shows hint penalties, question solves, bonuses, etc.
 */
export async function GET(request: NextRequest) {
  try {
    const teamAuth = await validateTeamAuth(request);
    if (!teamAuth.success || !teamAuth.teamId) {
      return NextResponse.json(
        { error: teamAuth.error || "Authentication required" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "20");

    // Get recent score events for this team
    const scoreEvents = await prisma.scoreEvent.findMany({
      where: {
        teamId: teamAuth.teamId
      },
      orderBy: {
        createdAt: "desc"
      },
      take: Math.min(limit, 100), // Max 100
      select: {
        id: true,
        type: true,
        points: true,
        reason: true,
        createdAt: true,
        metadata: true
      }
    });

    // Format events for display
    const formattedEvents = scoreEvents.map(event => ({
      id: event.id,
      type: event.type,
      points: event.points,
      reason: event.reason,
      timestamp: event.createdAt.toISOString(),
      metadata: event.metadata
    }));

    return NextResponse.json({
      success: true,
      events: formattedEvents
    });

  } catch (error: any) {
    console.error("Get score events error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
