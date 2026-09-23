export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { settleAuction } from "@/lib/round2-auction";
import { validateAdminAuth } from "@/lib/auth";

export async function POST(
  request: NextRequest,
  { params }: { params: { auctionId: string } }
) {
  try {
    const adminAuth = await validateAdminAuth(request);
    if (!adminAuth.success) {
      return NextResponse.json({ error: adminAuth.error }, { status: 401 });
    }

    const { auctionId } = params;
    const body = await request.json();
    const { winningTeamId, winningBidSeconds } = body;

    if (!auctionId) {
      return NextResponse.json(
        { error: "Auction ID is required" },
        { status: 400 }
      );
    }

    if (!winningTeamId || !winningBidSeconds) {
      return NextResponse.json(
        { error: "Winning team ID and bid time are required" },
        { status: 400 }
      );
    }

    if (winningBidSeconds <= 0) {
      return NextResponse.json(
        { error: "Winning bid time must be positive" },
        { status: 400 }
      );
    }

    const result = await settleAuction({
      auctionQuestionId: auctionId,
      winningTeamId,
      winningBidSeconds,
      settledByAdminId: adminAuth.adminId
    });

    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: result.message,
      sale: result.sale
    });
  } catch (error: any) {
    console.error("Settle auction error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}