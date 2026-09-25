export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth";
import { ManualScoreAdjustmentSchema } from "@/lib/validation";
import { adjustTeamScoreManually } from "@/lib/scoring";
import { logActivity, ActivityActions } from "@/lib/activity";

export async function POST(req: Request) {
  try {
    const session = await requireAdminSession();
    const body = await req.json();
    const result = ManualScoreAdjustmentSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.errors[0]?.message || "Invalid payload" },
        { status: 400 }
      );
    }

    const updated = await adjustTeamScoreManually(result.data);

    await logActivity({
      action: ActivityActions.SCORE_ADJUSTED,
      performedBy: session.email,
      teamId: result.data.teamId,
      details: `${result.data.points > 0 ? 'Added' : 'Subtracted'} ${Math.abs(result.data.points)} points${result.data.reason ? `: ${result.data.reason}` : ''}`,
      metadata: { points: result.data.points, reason: result.data.reason }
    });

    return NextResponse.json({ success: true, team: updated });
  } catch (err: any) {
    if (err.message === "UNAUTHORIZED_ADMIN") {
      return NextResponse.json({ error: "Unauthorized: Admin access required" }, { status: 403 });
    }
    return NextResponse.json({ error: err.message || "Failed to adjust score" }, { status: 500 });
  }
}
