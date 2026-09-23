export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth";
import { getQuestionsWithHintStats } from "@/lib/round1";
import { prisma } from "@/lib/prisma";

// GET /api/admin/round-1/hint-stats - Get hint statistics for Round 1
export async function GET() {
  try {
    await requireAdminSession();
    
    // Get Round 1
    const round1 = await prisma.round.findFirst({
      where: { number: 1 },
      select: { id: true }
    });

    if (!round1) {
      return NextResponse.json({ error: "Round 1 not found" }, { status: 404 });
    }

    const questionStats = await getQuestionsWithHintStats(round1.id);

    // Get overall statistics
    const totalHints = questionStats.reduce((sum, q) => sum + q.totalHints, 0);
    const totalClaims = questionStats.reduce((sum, q) => sum + q.totalClaims, 0);
    const questionsWithHints = questionStats.filter(q => q.totalHints > 0).length;

    return NextResponse.json({
      questions: questionStats,
      summary: {
        totalQuestions: questionStats.length,
        questionsWithHints,
        totalHints,
        totalClaims,
        avgHintsPerQuestion: questionStats.length > 0 
          ? Math.round((totalHints / questionStats.length) * 10) / 10 
          : 0
      }
    });
  } catch (err: any) {
    if (err.message === "UNAUTHORIZED_ADMIN") {
      return NextResponse.json({ error: "Unauthorized: Admin access required" }, { status: 403 });
    }
    return NextResponse.json(
      { error: err.message || "Failed to load hint statistics" },
      { status: 500 }
    );
  }
}