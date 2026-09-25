export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth";
import { SetAuctionWinnerSchema } from "@/lib/validation";
import { setAuctionWinner } from "@/lib/round2";
import { logActivity, ActivityActions } from "@/lib/activity";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const session = await requireAdminSession();
    const body = await req.json();
    const result = SetAuctionWinnerSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.errors[0]?.message || "Invalid payload" },
        { status: 400 }
      );
    }

    const updated = await setAuctionWinner(result.data);

    // Get team name for logging
    const team = await prisma.team.findUnique({ where: { id: result.data.teamId } });

    await logActivity({
      action: ActivityActions.AUCTION_WINNER_SET,
      performedBy: session.email,
      teamId: result.data.teamId,
      details: `Set ${team?.name || 'team'} as winner for "${updated.title}"`,
      metadata: { challengeId: updated.id, title: updated.title, teamName: team?.name }
    });

    return NextResponse.json({ success: true, challenge: updated });
  } catch (err: any) {
    if (err.message === "UNAUTHORIZED_ADMIN") {
      return NextResponse.json({ error: "Unauthorized: Admin access required" }, { status: 403 });
    }
    return NextResponse.json({ error: err.message || "Failed to set auction winner" }, { status: 500 });
  }
}
