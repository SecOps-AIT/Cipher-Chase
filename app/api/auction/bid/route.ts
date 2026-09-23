import { NextRequest, NextResponse } from "next/server";
import { submitBid, getTeamAuctionSlots } from "@/lib/round2-auction";
import { validateTeamAuth } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const teamAuth = await validateTeamAuth(request);
    if (!teamAuth.success || !teamAuth.teamId) {
      return NextResponse.json({ error: teamAuth.error || "Authentication required" }, { status: 401 });
    }

    const body = await request.json();
    const { auctionQuestionId, bidTimeSeconds } = body;

    if (!auctionQuestionId || !bidTimeSeconds) {
      return NextResponse.json(
        { error: "Auction question ID and bid time are required" },
        { status: 400 }
      );
    }

    if (typeof bidTimeSeconds !== "number" || bidTimeSeconds <= 0) {
      return NextResponse.json(
        { error: "Bid time must be a positive number" },
        { status: 400 }
      );
    }

    const result = await submitBid({
      auctionQuestionId,
      teamId: teamAuth.teamId,
      bidTimeSeconds
    });

    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: result.message,
      bid: result.bid
    });
  } catch (error: any) {
    console.error("Submit bid error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Get team's auction slot status
export async function GET(request: NextRequest) {
  try {
    const teamAuth = await validateTeamAuth(request);
    if (!teamAuth.success || !teamAuth.teamId) {
      return NextResponse.json({ error: teamAuth.error || "Authentication required" }, { status: 401 });
    }

    const slots = await getTeamAuctionSlots(teamAuth.teamId);

    return NextResponse.json({
      success: true,
      slots
    });
  } catch (error: any) {
    console.error("Get auction slots error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}