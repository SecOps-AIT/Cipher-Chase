import { NextRequest, NextResponse } from "next/server";
import { createAuctionQuestion } from "@/lib/round2-auction";
import { validateAdminAuth } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const adminAuth = await validateAdminAuth(request);
    if (!adminAuth.success) {
      return NextResponse.json({ error: adminAuth.error }, { status: 401 });
    }

    const body = await request.json();
    const {
      roundId,
      questionId,
      title,
      topic,
      outline,
      baseTimeSeconds,
      basePoints,
      bonusFormula
    } = body;

    // Validate required fields
    if (!roundId || !questionId || !title || !topic || !outline || !baseTimeSeconds || !basePoints) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (baseTimeSeconds <= 0 || basePoints <= 0) {
      return NextResponse.json(
        { error: "Base time and points must be positive" },
        { status: 400 }
      );
    }

    const result = await createAuctionQuestion({
      roundId,
      questionId,
      title,
      topic,
      outline,
      baseTimeSeconds,
      basePoints,
      bonusFormula
    });

    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: result.message,
      auctionQuestion: result.auctionQuestion
    });
  } catch (error: any) {
    console.error("Create auction question error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Get all auction questions for a round
export async function GET(request: NextRequest) {
  try {
    const adminAuth = await validateAdminAuth(request);
    if (!adminAuth.success) {
      return NextResponse.json({ error: adminAuth.error }, { status: 401 });
    }

    const url = new URL(request.url);
    let roundId = url.searchParams.get("roundId");

    const { prisma } = await import("@/lib/prisma");

    if (!roundId) {
      const r2 = await prisma.round.findFirst({ where: { number: 2 } });
      if (r2) {
        roundId = r2.id;
      } else {
        return NextResponse.json(
          { error: "Round 2 not found and no roundId provided" },
          { status: 400 }
        );
      }
    }
    
    const auctionQuestions = await prisma.auctionQuestion.findMany({
      where: { roundId },
      include: {
        bids: {
          include: {
            team: { select: { name: true } }
          },
          orderBy: { bidTimeSeconds: "asc" }
        },
        sale: {
          include: {
            team: { select: { name: true } }
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    const questionsWithDetails = auctionQuestions.map(aq => ({
      id: aq.id,
      questionId: aq.questionId,
      title: aq.title,
      topic: aq.topic,
      outline: aq.outline,
      baseTimeSeconds: aq.baseTimeSeconds,
      basePoints: aq.basePoints,
      status: aq.status,
      displayedAt: aq.displayedAt?.toISOString() || null,
      auctionClosedAt: aq.auctionClosedAt?.toISOString() || null,
      bidCount: aq.bids.length,
      lowestBid: aq.bids.length > 0 ? aq.bids[0] : null,
      sale: aq.sale ? {
        teamName: aq.sale.team.name,
        winningBidSeconds: aq.sale.winningBidSeconds,
        soldAt: aq.sale.soldAt.toISOString()
      } : null
    }));

    return NextResponse.json({
      success: true,
      auctionQuestions: questionsWithDetails
    });
  } catch (error: any) {
    console.error("Get auction questions error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}