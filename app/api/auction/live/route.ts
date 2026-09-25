export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { validateTeamAuth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const teamAuth = await validateTeamAuth(request);
    if (!teamAuth.success) {
      return NextResponse.json({ error: teamAuth.error }, { status: 401 });
    }

    const { prisma } = await import("@/lib/prisma");
    
    // Get current round
    const round = await prisma.round.findFirst({
      where: {
        event: {
          teams: {
            some: { id: teamAuth.teamId }
          }
        },
        number: 2,
        status: "LIVE"
      }
    });

    if (!round) {
      return NextResponse.json({
        success: true,
        auction: null,
        message: "No active Round 2 auction"
      });
    }

    // Get current live auction
    const liveAuction = await prisma.auctionQuestion.findFirst({
      where: {
        roundId: round.id,
        status: "OPEN"
      },
      include: {
        bids: {
          include: {
            team: { select: { name: true } }
          },
          orderBy: { bidTimeSeconds: "asc" }
        }
      }
    });

    if (!liveAuction) {
      return NextResponse.json({
        success: true,
        auction: null,
        message: "No live auction currently"
      });
    }

    // Get team's current bid for this auction
    const teamBid = liveAuction.bids.find(bid => bid.teamId === teamAuth.teamId);

    // NO BONUS CALCULATION - Just return admin-set points
    const { formatTime } = await import("@/lib/round2-auction");
    const points = liveAuction.points || 200;
    
    const bidPreview = (bidTimeSeconds: number) => {
      return {
        bidTime: formatTime(bidTimeSeconds),
        points: points // Fixed points, no bonus
      };
    };

    // Get lowest bid info
    const lowestBid = liveAuction.bids.length > 0 ? liveAuction.bids[0] : null;

    return NextResponse.json({
      success: true,
      auction: {
        id: liveAuction.id,
        title: liveAuction.title,
        topic: liveAuction.topic,
        outline: liveAuction.outline,
        baseTimeSeconds: liveAuction.baseTimeSeconds,
        points: points, // Admin-set points
        displayedAt: liveAuction.displayedAt?.toISOString(),
        bidCount: liveAuction.bids.length,
        lowestBid: lowestBid ? {
          teamName: lowestBid.team.name,
          bidTimeSeconds: lowestBid.bidTimeSeconds,
          ...bidPreview(lowestBid.bidTimeSeconds)
        } : null,
        teamBid: teamBid ? {
          bidTimeSeconds: teamBid.bidTimeSeconds,
          submittedAt: teamBid.submittedAt.toISOString(),
          ...bidPreview(teamBid.bidTimeSeconds)
        } : null
      }
    });
  } catch (error: any) {
    console.error("Get live auction error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}