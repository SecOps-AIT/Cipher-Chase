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
    console.log("[Leaderboard API] Starting request...");
    
    // Require admin authentication
    const session = await requireAdminSession();
    console.log("[Leaderboard API] Admin authenticated:", session.email);
    
    console.log("[Leaderboard API] Fetching leaderboard data...");
    const data = await getAuthoritativeLeaderboard();
    console.log("[Leaderboard API] Data fetched successfully, teams:", data.leaderboard?.length || 0);
    
    return NextResponse.json(data);
  } catch (err: any) {
    console.error("[Leaderboard API] Error:", err.message, err.stack);
    
    if (err.message === "UNAUTHORIZED_ADMIN") {
      return NextResponse.json(
        { error: "Unauthorized: Admin access required. Leaderboard is not available to participants." },
        { status: 403 }
      );
    }
    return NextResponse.json({ error: err.message || "Failed to load leaderboard" }, { status: 500 });
  }
}

