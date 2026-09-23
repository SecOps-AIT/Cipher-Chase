import { NextRequest, NextResponse } from "next/server";
import { getAuctionBids } from "@/lib/round2-auction";
import { validateAdminAuth } from "@/lib/auth";

export async function GET(
  request: NextRequest,
  { params }: { params: { auctionId: string } }
) {
  try {
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