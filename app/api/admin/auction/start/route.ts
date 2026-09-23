export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth";
import { startAuctionChallenge } from "@/lib/round2";

export async function POST(req: Request) {
  try {
    await requireAdminSession();
    const body = await req.json();
    const { challengeId } = body;

    if (!challengeId) {
      return NextResponse.json({ error: "challengeId is required" }, { status: 400 });
    }

    const updated = await startAuctionChallenge(challengeId);
    return NextResponse.json({ success: true, challenge: updated });
  } catch (err: any) {
    if (err.message === "UNAUTHORIZED_ADMIN") {
      return NextResponse.json({ error: "Unauthorized: Admin access required" }, { status: 403 });
    }
    return NextResponse.json({ error: err.message || "Failed to start challenge" }, { status: 500 });
  }
}
