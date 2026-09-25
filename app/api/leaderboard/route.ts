export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getAuthoritativeLeaderboard } from "@/lib/leaderboard";
import { requireAdminSession } from "@/lib/auth";

/**
 * GET /api/leaderboard
 * 
 * ADMIN-ONLY ENDPOINT
 * As per game specification, the global leaderboard is admin-only.
 * Participants must NOT see rank or other team scores.
 */
export async function GET(request: Request) {
  try {
    // Require admin authentication
    await requireAdminSession();
    
    const data = await getAuthoritativeLeaderboard();
    return NextResponse.json(data);
  } catch (err: any) {
    if (err.message === "UNAUTHORIZED_ADMIN") {
      return NextResponse.json(
        { error: "Unauthorized: Admin access required. Leaderboard is not available to participants." },
        { status: 403 }
      );
    }
    return NextResponse.json({ error: err.message || "Failed to load leaderboard" }, { status: 500 });
  }
}

