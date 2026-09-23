export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { previewBonusCalculation } from "@/lib/round2-auction";
import { validateTeamAuth } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const teamAuth = await validateTeamAuth(request);
    if (!teamAuth.success) {
      return NextResponse.json({ error: teamAuth.error }, { status: 401 });
    }

    const body = await request.json();
    const { baseTimeSeconds, bidTimeSeconds, basePoints } = body;

    if (!baseTimeSeconds || !bidTimeSeconds || !basePoints) {
      return NextResponse.json(
        { error: "Base time, bid time, and base points are required" },
        { status: 400 }
      );
    }

    if (bidTimeSeconds <= 0 || baseTimeSeconds <= 0 || basePoints <= 0) {
      return NextResponse.json(
        { error: "All values must be positive" },
        { status: 400 }
      );
    }

    if (bidTimeSeconds > baseTimeSeconds) {
      return NextResponse.json(
        { error: "Bid time cannot exceed base time" },
        { status: 400 }
      );
    }

    const preview = previewBonusCalculation(baseTimeSeconds, bidTimeSeconds, basePoints);

    return NextResponse.json({
      success: true,
      preview
    });
  } catch (error: any) {
    console.error("Preview bonus calculation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}