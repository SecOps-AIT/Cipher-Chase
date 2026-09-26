export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { validateAdminAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAuditEvent } from "@/lib/audit";

// Create a Round 2 auction question: this creates the underlying Question
// row (roundId = Round 2) together with its AuctionQuestion wrapper in one
// step, since auction questions are authored directly (no separate bank).
export async function POST(request: NextRequest) {
  try {
    const adminAuth = await validateAdminAuth(request);
    if (!adminAuth.success) {
      return NextResponse.json({ error: adminAuth.error }, { status: 401 });
    }

    const body = await request.json();
    const {
      title,
      description,
      answer,
      difficulty,
      category,
      topic,
      outline,
      baseTimeSeconds,
      points,
      hintPenalty,
      failurePenalty,
    } = body;

    if (
      !title || !description || !answer || !difficulty || !category ||
      !topic || !outline || !baseTimeSeconds || !points
    ) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (baseTimeSeconds <= 0 || points <= 0) {
      return NextResponse.json(
        { error: "Base time and points must be positive" },
        { status: 400 }
      );
    }

    const round2 = await prisma.round.findFirst({ where: { number: 2 } });
    if (!round2) {
      return NextResponse.json({ error: "Round 2 not found" }, { status: 400 });
    }

    const { question, auctionQuestion } = await prisma.$transaction(async (tx) => {
      const question = await tx.question.create({
        data: {
          roundId: round2.id,
          title,
          description,
          answer,
          points,
          difficulty,
          category,
          isActive: true,
          isCore: true,
          isReleased: false,
          order: 0,
        },
      });

      const auctionQuestion = await tx.auctionQuestion.create({
        data: {
          roundId: round2.id,
          questionId: question.id,
          title,
          topic,
          outline,
          baseTimeSeconds,
          points,
          hintPenalty: hintPenalty ?? -10,
          failurePenalty: failurePenalty ?? 0,
          status: "DRAFT",
        },
      });

      return { question, auctionQuestion };
    });

    await logAuditEvent({
      eventId: round2.eventId,
      actor: "ADMIN",
      action: "AUCTION_QUESTION_CREATED",
      details: `Created auction question "${title}" (${points} pts)`,
    });

    return NextResponse.json({
      success: true,
      auctionQuestion: {
        id: auctionQuestion.id,
        questionId: question.id,
        title: auctionQuestion.title,
        topic: auctionQuestion.topic,
        outline: auctionQuestion.outline,
        baseTimeSeconds: auctionQuestion.baseTimeSeconds,
        points: auctionQuestion.points,
        hintPenalty: auctionQuestion.hintPenalty,
        failurePenalty: auctionQuestion.failurePenalty,
        status: auctionQuestion.status,
        answer: question.answer,
        difficulty: question.difficulty,
        category: question.category,
      },
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
      select: {
        id: true,
        questionId: true,
        title: true,
        topic: true,
        outline: true,
        baseTimeSeconds: true,
        points: true,
        hintPenalty: true,
        failurePenalty: true,
        status: true,
        displayedAt: true,
        auctionClosedAt: true,
        createdAt: true,
        question: {
          select: {
            description: true,
            answer: true,
            difficulty: true,
            category: true,
          },
        },
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
      points: aq.points, // Admin-set points
      hintPenalty: aq.hintPenalty, // Admin-set hint penalty
      failurePenalty: aq.failurePenalty, // Admin-set penalty on timeout
      description: aq.question.description,
      answer: aq.question.answer,
      difficulty: aq.question.difficulty,
      category: aq.question.category,
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

// Update an auction question (and its underlying question)
export async function PUT(request: NextRequest) {
  try {
    const adminAuth = await validateAdminAuth(request);
    if (!adminAuth.success) {
      return NextResponse.json({ error: adminAuth.error }, { status: 401 });
    }

    const url = new URL(request.url);
    const id = url.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const body = await request.json();
    const {
      title,
      description,
      answer,
      difficulty,
      category,
      topic,
      outline,
      baseTimeSeconds,
      points,
      hintPenalty,
      failurePenalty,
    } = body;

    if (
      !title || !description || !answer || !difficulty || !category ||
      !topic || !outline || !baseTimeSeconds || !points
    ) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (baseTimeSeconds <= 0 || points <= 0) {
      return NextResponse.json(
        { error: "Base time and points must be positive" },
        { status: 400 }
      );
    }

    const existing = await prisma.auctionQuestion.findUnique({
      where: { id },
      select: { questionId: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Auction question not found" }, { status: 404 });
    }

    const { question, auctionQuestion } = await prisma.$transaction(async (tx) => {
      const question = await tx.question.update({
        where: { id: existing.questionId },
        data: { title, description, answer, points, difficulty, category },
      });

      const auctionQuestion = await tx.auctionQuestion.update({
        where: { id },
        data: {
          title,
          topic,
          outline,
          baseTimeSeconds,
          points,
          hintPenalty: hintPenalty ?? -10,
          failurePenalty: failurePenalty ?? 0,
        },
      });

      return { question, auctionQuestion };
    });

    await logAuditEvent({
      actor: "ADMIN",
      action: "AUCTION_QUESTION_UPDATED",
      details: `Updated auction question "${title}" (${points} pts)`,
    });

    return NextResponse.json({
      success: true,
      auctionQuestion: {
        id: auctionQuestion.id,
        questionId: question.id,
        title: auctionQuestion.title,
        topic: auctionQuestion.topic,
        outline: auctionQuestion.outline,
        baseTimeSeconds: auctionQuestion.baseTimeSeconds,
        points: auctionQuestion.points,
        hintPenalty: auctionQuestion.hintPenalty,
        failurePenalty: auctionQuestion.failurePenalty,
        status: auctionQuestion.status,
        description: question.description,
        answer: question.answer,
        difficulty: question.difficulty,
        category: question.category,
      },
    });
  } catch (error: any) {
    console.error("Update auction question error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Delete an auction question (and its underlying question)
export async function DELETE(request: NextRequest) {
  try {
    const adminAuth = await validateAdminAuth(request);
    if (!adminAuth.success) {
      return NextResponse.json({ error: adminAuth.error }, { status: 401 });
    }

    const url = new URL(request.url);
    const id = url.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const auctionQuestion = await prisma.auctionQuestion.findUnique({
      where: { id },
      select: { id: true, questionId: true, status: true },
    });

    if (!auctionQuestion) {
      return NextResponse.json({ error: "Auction question not found" }, { status: 404 });
    }

    if (auctionQuestion.status === "SOLD") {
      return NextResponse.json(
        { error: "Cannot delete an auction question that has already been sold" },
        { status: 400 }
      );
    }

    // Deleting the underlying Question cascades to the AuctionQuestion (and its bids/sale)
    await prisma.question.delete({ where: { id: auctionQuestion.questionId } });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Delete auction question error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}