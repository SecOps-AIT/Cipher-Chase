export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth";
import { getRound1TimerStats } from "@/lib/round1";

export async function GET() {
  try {
    await requireAdminSession();

    const stats = await getRound1TimerStats();
    
    return NextResponse.json(stats);
  } catch (err: any) {
    console.error("Error fetching Round 1 timer stats:", err);
    return NextResponse.json({ error: "Failed to fetch timer statistics" }, { status: 500 });
  }
}