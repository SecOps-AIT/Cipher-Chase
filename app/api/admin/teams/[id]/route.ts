export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/auth";
import { regenerateTeamJoinCode } from "@/lib/teams";
import { logAuditEvent } from "@/lib/audit";
import { logActivity, ActivityActions } from "@/lib/activity";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    await requireAdminSession();
    const body = await req.json();
    const { action } = body;

    const team = await prisma.team.findUnique({
      where: { id: params.id },
      include: { members: true },
    });
    if (!team) return NextResponse.json({ error: "Team not found" }, { status: 404 });

    if (action === "REGENERATE_CODE") {
      const updated = await regenerateTeamJoinCode(params.id);
      return NextResponse.json({ success: true, team: updated });
    }

    if (action === "ADD_MEMBER") {
      const memberName = body.memberName?.trim();
      if (!memberName) {
        return NextResponse.json({ error: "Member name is required" }, { status: 400 });
      }

      if (team.members.length >= 3) {
        return NextResponse.json(
          { error: "Team capacity reached (3/3 members). Cannot add more." },
          { status: 400 }
        );
      }

      // Check if duplicate member in this team
      const existing = team.members.find(
        (m) => m.name.toLowerCase() === memberName.toLowerCase()
      );
      if (existing) {
        return NextResponse.json(
          { error: "A member with this name is already in the team." },
          { status: 400 }
        );
      }

      const newMember = await prisma.teamMember.create({
        data: {
          teamId: team.id,
          name: memberName,
        },
      });

      await logAuditEvent({
        eventId: team.eventId,
        teamId: team.id,
        actor: "ADMIN",
        action: "MEMBER_ADDED_BY_ADMIN",
        details: `Admin added "${memberName}" to "${team.name}".`,
      });

      return NextResponse.json({ success: true, member: newMember });
    }

    if (action === "REMOVE_MEMBER") {
      const memberId = body.memberId;
      if (!memberId) {
        return NextResponse.json({ error: "memberId is required" }, { status: 400 });
      }

      await prisma.teamMember.delete({
        where: { id: memberId },
      });

      await logAuditEvent({
        eventId: team.eventId,
        teamId: team.id,
        actor: "ADMIN",
        action: "MEMBER_REMOVED_BY_ADMIN",
        details: `Admin removed member from "${team.name}".`,
      });

      return NextResponse.json({ success: true, message: "Member removed" });
    }

    if (action === "EDIT_TEAM") {
      const name = body.name?.trim();
      if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });

      const updated = await prisma.team.update({
        where: { id: params.id },
        data: { name },
      });

      return NextResponse.json({ success: true, team: updated });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err: any) {
    if (err.message === "UNAUTHORIZED_ADMIN") {
      return NextResponse.json({ error: "Unauthorized: Admin access required" }, { status: 403 });
    }
    return NextResponse.json({ error: err.message || "Failed to update team" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await requireAdminSession();
    const team = await prisma.team.findUnique({ 
      where: { id: params.id },
      include: {
        members: true,
        submissions: true,
        scoreEvents: true,
        auctionBids: true,
        auctionSales: true,
        challengeAssignments: true
      }
    });
    
    if (!team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    // Delete team (cascade will handle related records)
    await prisma.team.delete({ where: { id: params.id } });

    // Log after successful deletion
    await logAuditEvent({
      eventId: team.eventId,
      actor: "ADMIN",
      action: "TEAM_DELETED",
      details: `Team "${team.name}" (${team.members.length} members, ${team.submissions.length} submissions) was deleted.`,
    });

    await logActivity({
      action: ActivityActions.TEAM_DELETED,
      performedBy: session.email,
      details: `Deleted team "${team.name}"`,
      metadata: { teamName: team.name, joinCode: team.joinCode, membersCount: team.members.length }
    });

    return NextResponse.json({ 
      success: true, 
      message: `Team "${team.name}" deleted successfully` 
    });
  } catch (err: any) {
    console.error("Team deletion error:", err);
    if (err.message === "UNAUTHORIZED_ADMIN") {
      return NextResponse.json({ error: "Unauthorized: Admin access required" }, { status: 403 });
    }
    return NextResponse.json({ 
      error: `Failed to delete team: ${err.message}`,
      details: err.code || "Unknown error"
    }, { status: 500 });
  }
}
