export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getTeamSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAuditEvent } from "@/lib/audit";

// GET current Round 1 duration configuration
export async function GET() {
  try {
    const session = await getTeamSession();
    
    // TODO: Add admin role check here
    if (!session) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    // Get current default duration from a team (they should all have the same default)
    const sampleTeam = await prisma.team.findFirst({
      select: { round1Duration: true },
    });

    return NextResponse.json({
      defaultDuration: sampleTeam?.round1Duration || 1800, // 30 minutes default
    });
  } catch (err: any) {
    console.error("Error fetching Round 1 duration:", err);
    return NextResponse.json({ error: "Failed to fetch duration" }, { status: 500 });
  }
}

// PUT update Round 1 duration configuration
export async function PUT(request: Request) {
  try {
    const session = await getTeamSession();
    
    // TODO: Add admin role check here
    if (!session) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const { duration } = await request.json();
    
    if (!duration || duration < 60 || duration > 7200) {
      return NextResponse.json({ 
        error: "Duration must be between 60 seconds (1 minute) and 7200 seconds (2 hours)" 
      }, { status: 400 });
    }

    // Update default duration for new teams (existing active timers are not affected)
    const updateResult = await prisma.team.updateMany({
      where: {
        round1StartedAt: null, // Only update teams that haven't started yet
      },
      data: {
        round1Duration: duration,
      },
    });

    // Log the configuration change
    await logAuditEvent({
      actor: "ADMIN",
      action: "ROUND1_DURATION_CHANGED",
      details: `Round 1 default duration changed to ${duration} seconds (${Math.floor(duration / 60)} minutes). Applied to ${updateResult.count} teams that haven't started yet.`,
    });

    return NextResponse.json({
      success: true,
      message: `Round 1 duration updated to ${Math.floor(duration / 60)} minutes`,
      duration: duration,
      teamsUpdated: updateResult.count,
    });
  } catch (err: any) {
    console.error("Error updating Round 1 duration:", err);
    return NextResponse.json({ error: "Failed to update duration" }, { status: 500 });
  }
}