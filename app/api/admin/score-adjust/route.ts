import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth";
import { ManualScoreAdjustmentSchema } from "@/lib/validation";
import { adjustTeamScoreManually } from "@/lib/scoring";

export async function POST(req: Request) {
  try {
    await requireAdminSession();
    const body = await req.json();
    const result = ManualScoreAdjustmentSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.errors[0]?.message || "Invalid payload" },
        { status: 400 }
      );
    }

    const updated = await adjustTeamScoreManually(result.data);
    return NextResponse.json({ success: true, team: updated });
  } catch (err: any) {
    if (err.message === "UNAUTHORIZED_ADMIN") {
      return NextResponse.json({ error: "Unauthorized: Admin access required" }, { status: 403 });
    }
    return NextResponse.json({ error: err.message || "Failed to adjust score" }, { status: 500 });
  }
}
