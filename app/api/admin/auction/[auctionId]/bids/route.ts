export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: { auctionId: string } }
) {
  try {
    const { validateAdminAuth } = await import("@/lib/auth");
    const { getAuctionBids } = await import("@/lib/round2-auction");

    const adminAuth = await validateAdminAuth(request);
    if (!adminAuth.success) {
      return NextResponse.json({ error: adminAuth.error }, { status: 401 });
    }

    const { auctionId } = params;

    if (!auctionId) {
      return NextResponse.json(
        { error: "Auction ID is required" },
        { status: 400 }
      );
    }

    const bids = await getAuctionBids(auctionId);

    return NextResponse.json({
      success: true,
      bids
    });
  } catch (error: any) {
    console.error("Get auction bids error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}