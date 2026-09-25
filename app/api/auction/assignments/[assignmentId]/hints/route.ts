export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { validateTeamAuth } from "@/lib/auth";

/**
 * AUTOMATIC HINT SYSTEM DISABLED FOR ROUND 2
 * 
 * As per game specification, there is NO automatic hint system in the portal.
 * Hints are now manually recorded by admins with a -5 point penalty.
 * 
 * Teams should contact admins/organizers directly for hints during the competition.
 */

/**
 * GET /api/auction/assignments/:assignmentId/hints - DISABLED
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { assignmentId: string } }
) {
  try {
    const authResult = await validateTeamAuth(req);
    if (!authResult.success || !authResult.teamId) {
      return NextResponse.json({ error: authResult.error || "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json({
      error: "Automatic hint system is disabled",
      message: "Hints are manually provided by admins. Contact the organizers for assistance. Each hint costs -5 points.",
      hints: []
    }, { status: 410 }); // 410 Gone
    
  } catch (error: any) {
    console.error("Get hints error:", error);
    return NextResponse.json(
      { error: "Failed to fetch hints" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/auction/assignments/:assignmentId/hints - DISABLED
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { assignmentId: string } }
) {
  try {
    const authResult = await validateTeamAuth(req);
    if (!authResult.success || !authResult.teamId) {
      return NextResponse.json({ error: authResult.error || "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json({
      error: "Automatic hint system is disabled",
      message: "Hints are manually provided by admins. Contact the organizers for assistance. Each hint costs -5 points."
    }, { status: 410 }); // 410 Gone
    
  } catch (error: any) {
    console.error("Claim hint error:", error);
    return NextResponse.json(
      { error: "Failed to claim hint" },
      { status: 500 }
    );
  }
}
