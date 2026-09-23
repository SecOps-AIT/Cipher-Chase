export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getTeamSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { releaseBackupQuestions } from "@/lib/round1";

// GET all backup questions with their release status
export async function GET() {
  try {
    const session = await getTeamSession();
    
    // TODO: Add admin role check here
    if (!session) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    // Get Round 1
    const round1 = await prisma.round.findFirst({
      where: { number: 1 },
      select: { id: true },
    });

    if (!round1) {
      return NextResponse.json({ error: "Round 1 not found" }, { status: 404 });
    }

    // Get all questions for Round 1, categorized by core/backup
    const questions = await prisma.question.findMany({
      where: { 
        roundId: round1.id,
        isActive: true,
      },
      select: {
        id: true,
        title: true,
        category: true,
        difficulty: true,
        points: true,
        order: true,
        isCore: true,
        isReleased: true,
      },
      orderBy: { order: "asc" },
    });

    // Separate core and backup questions
    const coreQuestions = questions.filter(q => q.isCore);
    const backupQuestions = questions.filter(q => !q.isCore);

    const stats = {
      coreCount: coreQuestions.length,
      backupCount: backupQuestions.length,
      releasedBackupCount: backupQuestions.filter(q => q.isReleased).length,
    };

    return NextResponse.json({
      stats,
      coreQuestions,
      backupQuestions,
    });
  } catch (err: any) {
    console.error("Error fetching backup questions:", err);
    return NextResponse.json({ error: "Failed to fetch questions" }, { status: 500 });
  }
}

// POST to release selected backup questions
export async function POST(request: Request) {
  try {
    const session = await getTeamSession();
    
    // TODO: Add admin role check here
    if (!session) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const { questionIds } = await request.json();
    
    if (!questionIds || !Array.isArray(questionIds) || questionIds.length === 0) {
      return NextResponse.json({ error: "Question IDs are required" }, { status: 400 });
    }

    const result = await releaseBackupQuestions(questionIds);
    
    if (result.success) {
      return NextResponse.json({
        success: true,
        message: result.message,
        releasedCount: result.releasedCount,
      });
    } else {
      return NextResponse.json({ error: result.message }, { status: 400 });
    }
  } catch (err: any) {
    console.error("Error releasing backup questions:", err);
    return NextResponse.json({ error: "Failed to release questions" }, { status: 500 });
  }
}