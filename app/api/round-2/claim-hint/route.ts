export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { claimAuctionHint } from "@/lib/round2";
import { getTeamSession } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const session = await getTeamSession();
    if (!session || !session.teamId) {
      return NextResponse.json({ error: "Unauthorized. Please join a team first." }, { status: 401 });
    }

    const body = await req.json();
    const { hintId } = body;

    if (!hintId) {
      return NextResponse.json({ error: "Hint ID is required" }, { status: 400 });
    }

    const result = await claimAuctionHint({
      teamId: session.teamId,
      hintId,
    });

    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to claim hint" }, { status: 500 });
  }
}
