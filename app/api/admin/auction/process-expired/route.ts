import { NextRequest, NextResponse } from "next/server";
import { processExpiredTimers } from "@/lib/round2-timer";

export async function POST(request: NextRequest) {
  try {
    // Verify this is being called by an authorized source
    // In production, you might want to add API key validation here
    const authHeader = request.headers.get("authorization");
    const expectedToken = process.env.CRON_SECRET || "your-secret-token";
    
    if (authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await processExpiredTimers();

    return NextResponse.json({
      success: true,
      message: `Processed ${result.processedCount} expired timers`,
      processedCount: result.processedCount,
      expiredAssignments: result.expiredAssignments
    });
  } catch (error: any) {
    console.error("Process expired timers error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}