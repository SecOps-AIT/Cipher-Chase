export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { validateTeamAuth } from "@/lib/auth";

/**
 * DEPRECATED: This endpoint is no longer needed as bonus calculations have been removed.
 * Points are now fixed per question as set by admin.
 * Kept for backward compatibility but returns simple fixed points.
 */
export async function POST(request: NextRequest) {
  try {
    const teamAuth = await validateTeamAuth(request);
    if (!teamAuth.success) {
      return NextResponse.json({ error: teamAuth.error }, { status: 401 });
    }

    const body = await request.json();
    const { points } = body;

    if (!points || points <= 0) {
      return NextResponse.json(
        { error: "Points must be provided and positive" },
        { status: 400 }
      );
    }

    // NO BONUS CALCULATION - Just return the admin-set points
    return NextResponse.json({
      success: true,
      preview: {
        points: points,
        potentialScore: points,
        successMessage: `SUCCESS: +${points} pts`,
        failureMessage: `FAILURE: No points awarded`
      }
    });
  } catch (error: any) {
    console.error("Preview error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}