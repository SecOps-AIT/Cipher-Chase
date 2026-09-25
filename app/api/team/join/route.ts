export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { setTeamSessionCookie } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit";
import { getNextCC26Code } from "@/lib/teams";
import { startTeamRound1Timer } from "@/lib/round1";

/**
 * POST /api/team/join
 * 
 * Two modes:
 * 1. Leader registers team with all members upfront (teamName + members array)
 * 2. Member accesses existing team using join code (joinCode + memberName)
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // NEW FLOW: Leader registers all members upfront
    // OR legacy flow: Member joins with code
    const { teamName, members, joinCode, memberName } = body;

    // --- MODE 1: LEADER REGISTERS TEAM WITH ALL MEMBERS UPFRONT ---
    if (teamName && Array.isArray(members) && members.length > 0) {
      const cleanTeamName = teamName.trim();
      
      if (!cleanTeamName) {
        return NextResponse.json(
          { error: "Team name is required." },
          { status: 400 }
        );
      }

      if (members.length > 3) {
        return NextResponse.json(
          { error: "Maximum 3 members allowed per team." },
          { status: 400 }
        );
      }

      // Validate leader (first member)
      const leader = members[0];
      if (!leader.name?.trim()) {
        return NextResponse.json(
          { error: "Leader name is required." },
          { status: 400 }
        );
      }
      if (!leader.phone?.trim()) {
        return NextResponse.json(
          { error: "Leader phone number is required." },
          { status: 400 }
        );
      }
      if (!leader.email?.trim()) {
        return NextResponse.json(
          { error: "Leader email address is required." },
          { status: 400 }
        );
      }

      // Validate all member names are provided
      for (const member of members) {
        if (!member.name?.trim()) {
          return NextResponse.json(
            { error: "All member names must be provided." },
            { status: 400 }
          );
        }
      }

      // Get active event
      const activeEvent = await prisma.event.findFirst({
        where: { status: "LIVE" },
      });

      if (!activeEvent) {
        return NextResponse.json(
          { error: "No active event found. Contact admin." },
          { status: 400 }
        );
      }

      // Generate team code
      const generatedCode = await getNextCC26Code();

      // Create team and all members in a transaction
      const result = await prisma.$transaction(async (tx) => {
        // Create team
        const team = await tx.team.create({
          data: {
            name: cleanTeamName,
            joinCode: generatedCode,
            eventId: activeEvent.id,
            score: 0,
            qualified: false,
          },
        });

        // Create all members
        const createdMembers = [];
        for (const member of members) {
          const created = await tx.teamMember.create({
            data: {
              teamId: team.id,
              name: member.name.trim(),
              phone: member.phone?.trim() || null,
              email: member.email?.trim() || null,
              isLeader: member.isLeader || false,
            },
          });
          createdMembers.push(created);
        }

        return { team, members: createdMembers };
      });

      // Set session cookie for the leader (first member)
      const leaderMember = result.members[0];
      await setTeamSessionCookie({
        teamId: result.team.id,
        memberId: leaderMember.id,
        memberName: leaderMember.name,
        eventId: activeEvent.id,
        teamName: result.team.name,
        joinCode: result.team.joinCode,
      });

      await logAuditEvent({
        eventId: activeEvent.id,
        teamId: result.team.id,
        actor: "TEAM",
        action: "TEAM_CREATED",
        details: `Team "${cleanTeamName}" created by ${leaderMember.name} with ${result.members.length} members registered upfront.`,
      });

      return NextResponse.json({
        success: true,
        message: "Team registered successfully with all members.",
        team: {
          id: result.team.id,
          name: result.team.name,
          joinCode: result.team.joinCode,
          score: result.team.score,
          qualified: result.team.qualified,
          memberCount: result.members.length,
          maxMembers: 3,
          members: result.members.map(m => m.name),
          currentMember: leaderMember.name,
        },
      });
    }

    // --- MODE 2: MEMBER ACCESSES EXISTING TEAM WITH JOIN CODE ---
    if (joinCode && memberName) {
      const cleanMemberName = memberName.trim();
      const cleanJoinCode = joinCode.trim().toUpperCase();

      if (!cleanMemberName) {
        return NextResponse.json(
          { error: "Member name is required." },
          { status: 400 }
        );
      }

      // Find team by join code
      const team = await prisma.team.findFirst({
        where: { joinCode: cleanJoinCode },
        include: { event: true, members: true },
      });

      if (!team) {
        return NextResponse.json(
          { error: "Invalid join code. Please check with your team leader." },
          { status: 404 }
        );
      }

      // Find existing member by name (case-insensitive)
      const existingMember = team.members.find(
        m => m.name.toLowerCase() === cleanMemberName.toLowerCase()
      );

      if (!existingMember) {
        return NextResponse.json(
          {
            error: "Member not registered. The team leader must register all members upfront. Contact your team leader.",
            code: "MEMBER_NOT_REGISTERED"
          },
          { status: 403 }
        );
      }

      // Set session cookie for the member
      await setTeamSessionCookie({
        teamId: team.id,
        memberId: existingMember.id,
        memberName: existingMember.name,
        eventId: team.eventId,
        teamName: team.name,
        joinCode: team.joinCode,
      });

      await logAuditEvent({
        eventId: team.eventId,
        teamId: team.id,
        actor: "TEAM",
        action: "MEMBER_LOGGED_IN",
        details: `${existingMember.name} accessed team "${team.name}" using join code.`,
      });

      // Start the Round 1 timer on first login (idempotent — no-op if already started)
      await startTeamRound1Timer(team.id);

      return NextResponse.json({
        success: true,
        message: "Access granted. Welcome to your team!",
        team: {
          id: team.id,
          name: team.name,
          joinCode: team.joinCode,
          score: team.score,
          qualified: team.qualified,
          memberCount: team.members.length,
          maxMembers: 3,
          members: team.members.map(m => m.name),
          currentMember: existingMember.name,
        },
      });
    }

    // Invalid request
    return NextResponse.json(
      { error: "Invalid request. Provide either (teamName + members) or (joinCode + memberName)." },
      { status: 400 }
    );

  } catch (err: any) {
    console.error("Team join error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to process request" },
      { status: 500 }
    );
  }
}
