export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { TeamJoinSchema } from "@/lib/validation";
import { setTeamSessionCookie } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit";
import { getNextCC26Code } from "@/lib/teams";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // Accept either joinCode (legacy) or teamName + memberName
    const { teamName, memberName, joinCode, phone, email, isLeader } = body;
    const cleanMemberName = memberName?.trim();
    const cleanTeamName = teamName?.trim();
    const cleanPhone = phone?.trim();
    const cleanEmail = email?.trim();

    if (!cleanMemberName || (!cleanTeamName && !joinCode)) {
      return NextResponse.json(
        { error: "Member name and team name are required." },
        { status: 400 }
      );
    }

    // If creating team (isLeader=true), require phone and email
    if (isLeader && (!cleanPhone || !cleanEmail)) {
      return NextResponse.json(
        { error: "Phone and email are required for team leaders." },
        { status: 400 }
      );
    }

    // 1. Find or create team
    let team = joinCode 
      ? await prisma.team.findFirst({ where: { joinCode }, include: { event: true } })
      : await prisma.team.findFirst({ where: { name: cleanTeamName }, include: { event: true } });

    // If no team found and teamName provided, create new team
    if (!team && cleanTeamName) {
      // Get active event (status: LIVE)
      const activeEvent = await prisma.event.findFirst({
        where: { status: "LIVE" },
      });

      if (!activeEvent) {
        return NextResponse.json(
          { error: "No active event found. Contact admin." },
          { status: 400 }
        );
      }

      const generatedCode = await getNextCC26Code();

      team = await prisma.team.create({
        data: {
          name: cleanTeamName,
          joinCode: generatedCode,
          eventId: activeEvent.id,
          score: 0,
          qualified: false,
        },
        include: { event: true },
      });

      await logAuditEvent({
        eventId: activeEvent.id,
        teamId: team.id,
        actor: "TEAM",
        action: "TEAM_CREATED",
        details: `Team "${cleanTeamName}" created by ${cleanMemberName}.`,
      });
    }

    if (!team) {
      return NextResponse.json(
        { error: "Invalid join code. Please check with your team captain or admin." },
        { status: 404 }
      );
    }

    // 2. Perform atomic capacity check and member creation inside transaction
    const joinResult = await prisma.$transaction(async (tx) => {
      // Fetch fresh member list inside transaction to avoid race conditions
      const currentMembers = await tx.teamMember.findMany({
        where: { teamId: team.id },
      });

      // Check if this member is reconnecting (existing member name)
      const existingMember = currentMembers.find(
        (m) => m.name.toLowerCase() === cleanMemberName.toLowerCase()
      );

      let activeMemberId: string;
      let memberList = currentMembers;

      if (existingMember) {
        // Reconnecting existing member — does NOT consume another slot!
        activeMemberId = existingMember.id;
      } else {
        // Enforce maximum 3 members capacity server-side
        if (currentMembers.length >= 3) {
          throw new Error("TEAM_FULL");
        }

        const newMember = await tx.teamMember.create({
          data: {
            teamId: team.id,
            name: cleanMemberName,
            phone: cleanPhone || null,
            email: cleanEmail || null,
            isLeader: isLeader || false,
          },
        });
        activeMemberId = newMember.id;
        memberList = [...currentMembers, newMember];
      }

      return {
        memberId: activeMemberId,
        isReconnect: !!existingMember,
        memberList,
      };
    });

    // 3. Set signed HTTP-only member session cookie
    await setTeamSessionCookie({
      teamId: team.id,
      memberId: joinResult.memberId,
      memberName: cleanMemberName,
      eventId: team.eventId,
      teamName: team.name,
      joinCode: team.joinCode,
    });

    await logAuditEvent({
      eventId: team.eventId,
      teamId: team.id,
      actor: "TEAM",
      action: joinResult.isReconnect ? "MEMBER_RECONNECTED" : "MEMBER_JOINED",
      details: `${cleanMemberName} ${
        joinResult.isReconnect ? "reconnected to" : "joined"
      } "${team.name}" (${joinResult.memberList.length}/3 members).`,
    });

    return NextResponse.json({
      success: true,
      message: joinResult.isReconnect
        ? "Welcome back! Reconnected to team session."
        : "You joined successfully.",
      team: {
        id: team.id,
        name: team.name,
        joinCode: team.joinCode,
        score: team.score,
        qualified: team.qualified,
        memberCount: joinResult.memberList.length,
        maxMembers: 3,
        members: joinResult.memberList.map((m) => m.name),
        currentMember: cleanMemberName,
      },
    });
  } catch (err: any) {
    if (err.message === "TEAM_FULL") {
      return NextResponse.json(
        {
          error: "TEAM FULL: This team already has 3 members. Maximum 3 members allowed per team.",
          code: "TEAM_FULL",
        },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: err.message || "Failed to join team" },
      { status: 500 }
    );
  }
}
