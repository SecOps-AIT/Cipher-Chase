export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { requireTeamSession } from "@/lib/auth";

/**
 * AUTOMATIC HINT SYSTEM DISABLED
 * 
 * As per game specification, there is NO automatic hint system in the portal.
 * Hints are now manually recorded by admins with a -5 point penalty.
 * 
 * Teams should contact admins/organizers directly for hints during the competition.
 */

// GET /api/round-1/hints/[questionId] - DISABLED
export async function GET(_req: Request, { params }: { params: { questionId: string } }) {
  try {
    await requireTeamSession();
    
    return NextResponse.json({
      error: "Automatic hint system is disabled",
      message: "Hints are manually provided by admins. Contact the organizers for assistance. Each hint costs -5 points."
    }, { status: 410 }); // 410 Gone - resource no longer available
    
  } catch (err: any) {
    if (err.message === "UNAUTHORIZED_TEAM") {
      return NextResponse.json({ error: "Unauthorized: Team session required" }, { status: 403 });
    }
    return NextResponse.json(
      { error: err.message || "Failed to load hint data" },
      { status: 500 }
    );
  }
}

// POST /api/round-1/hints/[questionId] - DISABLED
export async function POST(req: Request, { params }: { params: { questionId: string } }) {
  try {
    await requireTeamSession();
    
    return NextResponse.json({
      error: "Automatic hint system is disabled",
      message: "Hints are manually provided by admins. Contact the organizers for assistance. Each hint costs -5 points."
    }, { status: 410 }); // 410 Gone - resource no longer available
    
  } catch (err: any) {
    if (err.message === "UNAUTHORIZED_TEAM") {
      return NextResponse.json({ error: "Unauthorized: Team session required" }, { status: 403 });
    }
    return NextResponse.json(
      { error: err.message || "Failed to claim hint" },
      { status: 500 }
    );
  }
}