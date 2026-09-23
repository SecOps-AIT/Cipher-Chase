export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getAuthoritativeLeaderboard } from "@/lib/leaderboard";

export async function GET() {
  try {
    const data = await getAuthoritativeLeaderboard();
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to load leaderboard" }, { status: 500 });
  }
}
