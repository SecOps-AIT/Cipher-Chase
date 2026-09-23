import { NextRequest, NextResponse } from "next/server";
import { validateAdminAuth } from "@/lib/auth";
import {
  getTeamScoringStats,
  getQuestionPerformance,
  getAuctionMetrics,
  getRound2Leaderboard,
  exportScoringData
} from "@/lib/scoring-analytics";

/**
 * GET /api/admin/auction/analytics
 * Get comprehensive Round 2 scoring analytics
 */
export async function GET(req: NextRequest) {
  try {
    const authResult = await validateAdminAuth(req);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const roundId = searchParams.get("roundId");
    const type = searchParams.get("type") || "overview";

    if (!roundId) {
      return NextResponse.json(
        { error: "roundId is required" },
        { status: 400 }
      );
    }

    switch (type) {
      case "teams":
        const teamStats = await getTeamScoringStats(roundId);
        return NextResponse.json({ teamStats });

      case "questions":
        const questionPerformance = await getQuestionPerformance(roundId);
        return NextResponse.json({ questionPerformance });

      case "metrics":
        const metrics = await getAuctionMetrics(roundId);
        return NextResponse.json({ metrics });

      case "leaderboard":
        const leaderboard = await getRound2Leaderboard(roundId);
        return NextResponse.json({ leaderboard });

      case "export":
        const exportData = await exportScoringData(roundId);
        return NextResponse.json(exportData);

      case "overview":
      default:
        const [teams, questions, overviewMetrics, lb] = await Promise.all([
          getTeamScoringStats(roundId),
          getQuestionPerformance(roundId),
          getAuctionMetrics(roundId),
          getRound2Leaderboard(roundId)
        ]);

        return NextResponse.json({
          metrics: overviewMetrics,
          teamStats: teams.slice(0, 10), // Top 10 teams
          questionPerformance: questions.slice(0, 10), // Top 10 questions
          leaderboard: lb.slice(0, 10) // Top 10 on leaderboard
        });
    }
  } catch (error: any) {
    console.error("Analytics error:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}
