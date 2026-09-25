export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth";
import { startAuctionChallenge } from "@/lib/round2";
import { logActivity, ActivityActions } from "@/lib/activity";

export async function POST(req: Request) {
  try {
    const session = await requireAdminSession();
    const body = await req.json();
    const { challengeId } = body;

    if (!challengeId) {
      return NextResponse.json({ error: "challengeId is required" }, { status: 400 });
    }

    const updated = await startAuctionChallenge(challengeId);

    await logActivity({
      action: ActivityActions.AUCTION_STARTED,
      performedBy: session.email,
      details: `Started auction for challenge "${updated.title}"`,
      metadata: { challengeId: updated.id, title: updated.title }
    });

    return NextResponse.json({ success: true, challenge: updated });
  } catch (err: any) {
    if (err.message === "UNAUTHORIZED_ADMIN") {
      return NextResponse.json({ error: "Unauthorized: Admin access required" }, { status: 403 });
    }
    return NextResponse.json({ error: err.message || "Failed to start challenge" }, { status: 500 });
  }
}
