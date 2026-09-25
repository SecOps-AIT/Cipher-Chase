export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/auth";
import { CreateTeamSchema } from "@/lib/validation";
import { createTeam } from "@/lib/teams";
import { logActivity, ActivityActions } from "@/lib/activity";

export async function GET() {
  try {
    await requireAdminSession();
    const teams = await prisma.team.findMany({
      include: {
        members: true,
        submissions: {
          where: { isCorrect: true },
          select: { id: true },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({
      teams: teams.map((t) => ({
        id: t.id,
        name: t.name,
        joinCode: t.joinCode,
        score: t.score,
        qualified: t.qualified,
        members: t.members.map((m) => ({ id: m.id, name: m.name })),
        solvesCount: t.submissions.length,
        createdAt: t.createdAt,
      })),
    });
  } catch (err: any) {
    if (err.message === "UNAUTHORIZED_ADMIN") {
      return NextResponse.json({ error: "Unauthorized: Admin access required" }, { status: 403 });
    }
    return NextResponse.json({ error: err.message || "Failed to load teams" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireAdminSession();
    const body = await req.json();
    const result = CreateTeamSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.errors[0]?.message || "Invalid team data" },
        { status: 400 }
      );
    }

    // Find active event
    const event = await prisma.event.findFirst({ orderBy: { createdAt: "desc" } });
    if (!event) throw new Error("No active event found. Please create an event first.");

    const newTeam = await createTeam({
      eventId: event.id,
      name: result.data.name,
      joinCode: result.data.joinCode,
      members: result.data.members,
    });

    // Log activity
    await logActivity({
      eventId: event.id,
      teamId: newTeam.id,
      action: ActivityActions.TEAM_CREATED,
      performedBy: session.email,
      details: `Created team "${newTeam.name}"`,
      metadata: {
        joinCode: newTeam.joinCode,
        memberCount: result.data.members?.length || 0,
      },
    });

    return NextResponse.json({ success: true, team: newTeam });
  } catch (err: any) {
    if (err.message === "UNAUTHORIZED_ADMIN") {
      return NextResponse.json({ error: "Unauthorized: Admin access required" }, { status: 403 });
    }
    return NextResponse.json({ error: err.message || "Failed to create team" }, { status: 500 });
  }
}
