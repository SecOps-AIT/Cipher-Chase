export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { openAuction } from "@/lib/round2-auction";
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

    if (!auctionId) {
      return NextResponse.json(
        { error: "Auction ID is required" },
        { status: 400 }
      );
    }

    const result = await openAuction(auctionId);

    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: result.message,
      auctionQuestion: result.auctionQuestion
    });
  } catch (error: any) {
    console.error("Open auction error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}