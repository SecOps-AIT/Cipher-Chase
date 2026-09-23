import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/auction/time
 * Returns current server time for client synchronization
 * Used to ensure accurate countdown timers across all clients
 */
export async function GET(req: NextRequest) {
  try {
    return NextResponse.json({
      serverTime: new Date().toISOString(),
      timestamp: Date.now()
    });
  } catch (error) {
    console.error("Error getting server time:", error);
    return NextResponse.json(
      { error: "Failed to get server time" },
      { status: 500 }
    );
  }
}
