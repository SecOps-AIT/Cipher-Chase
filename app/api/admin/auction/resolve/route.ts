export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth";
import { CompleteAuctionChallengeSchema } from "@/lib/validation";
import { resolveAuctionChallenge } from "@/lib/round2";
import { logActivity, ActivityActions } from "@/lib/activity";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const session = await requireAdminSession();
    const body = await req.json();
    const result = CompleteAuctionChallengeSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.errors[0]?.message || "Invalid payload" },
        { status: 400 }
      );
    }

    const outcome = await resolveAuctionChallenge(result.data);

    // Get challenge title for logging
    const challenge = await prisma.auctionChallenge.findUnique({ 
      where: { id: result.data.challengeId },
      select: { title: true }
    });

    await logActivity({
      action: ActivityActions.AUCTION_RESOLVED,
      performedBy: session.email,
      details: `Resolved auction for "${challenge?.title || 'challenge'}" - ${result.data.success ? 'SUCCESS' : 'FAILED'}`,
      metadata: { 
        challengeId: result.data.challengeId, 
        success: result.data.success,
        notes: result.data.notes
      }
    });

    return NextResponse.json(outcome);
  } catch (err: any) {
    if (err.message === "UNAUTHORIZED_ADMIN") {
      return NextResponse.json({ error: "Unauthorized: Admin access required" }, { status: 403 });
    }
    return NextResponse.json({ error: err.message || "Failed to resolve challenge" }, { status: 500 });
  }
}
