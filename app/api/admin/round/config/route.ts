export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit";

/**
 * GET /api/admin/round/config
 * Get current Round 1 configuration
 */
export async function GET() {
  try {
    await requireAdminSession();

    const round = await prisma.round.findFirst({
      where: { number: 1 },
      select: {
        id: true,
        name: true,
        status: true,
        startedAt: true,
        endedAt: true,
      },
    });

    // Get a sample team to check default duration
    const sampleTeam = await prisma.team.findFirst({
      select: { round1Duration: true },
    });

    return NextResponse.json({
      round,
      defaultDuration: sampleTeam?.round1Duration || 1800,
      durationOptions: [
        { label: "10 minutes", value: 600 },
        { label: "15 minutes", value: 900 },
        { label: "20 minutes", value: 1200 },
        { label: "30 minutes", value: 1800 },
        { label: "45 minutes", value: 2700 },
        { label: "60 minutes", value: 3600 },
      ],
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to get round config" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/round/config
 * Set Round 1 duration for all teams (or specific event)
 */
export async function POST(req: Request) {
  try {
    await requireAdminSession();
    const { duration, eventId } = await req.json();

    if (!duration || duration < 60 || duration > 7200) {
      return NextResponse.json(
        { error: "Duration must be between 60 and 7200 seconds (1-120 minutes)" },
        { status: 400 }
      );
    }

    // Update all teams (optionally filter by eventId)
    const where = eventId ? { eventId } : {};
    const result = await prisma.team.updateMany({
      where,
      data: { round1Duration: duration },
    });

    await logAuditEvent({
      eventId: eventId || undefined,
      actor: "ADMIN",
      action: "ROUND1_DURATION_SET",
      details: `Round 1 duration set to ${duration}s (${Math.floor(duration / 60)} minutes) for ${result.count} teams.`,
    });

    return NextResponse.json({
      success: true,
      message: `Round 1 duration updated for ${result.count} teams.`,
      duration,
      teamsUpdated: result.count,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to set round config" },
      { status: 500 }
    );
  }
}
