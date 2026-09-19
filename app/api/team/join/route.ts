import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { TeamJoinSchema } from "@/lib/validation";
import { setTeamSessionCookie } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const result = TeamJoinSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.errors[0]?.message || "Invalid join code or member name." },
        { status: 400 }
      );
    }

    const { joinCode, memberName } = result.data;
    const cleanMemberName = memberName.trim();

    // 1. Find team by unique joinCode
    const team = await prisma.team.findFirst({
      where: { joinCode },
      include: { event: true },
    });

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
        // Enforce maximum 4 members capacity server-side
        if (currentMembers.length >= 4) {
          throw new Error("TEAM_FULL");
        }

        const newMember = await tx.teamMember.create({
          data: {
            teamId: team.id,
            name: cleanMemberName,
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
      } "${team.name}" (${joinResult.memberList.length}/4 members).`,
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
        wallet: team.wallet,
        qualified: team.qualified,
        memberCount: joinResult.memberList.length,
        maxMembers: 4,
        members: joinResult.memberList.map((m) => m.name),
        currentMember: cleanMemberName,
      },
    });
  } catch (err: any) {
    if (err.message === "TEAM_FULL") {
      return NextResponse.json(
        {
          error: "TEAM FULL: This team already has 4 members.",
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
