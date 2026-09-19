import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth";
import { QualifyTeamsSchema } from "@/lib/validation";
import { qualifyTopTeams } from "@/lib/scoring";

export async function POST(req: Request) {
  try {
    await requireAdminSession();
    const body = await req.json();
    const result = QualifyTeamsSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.errors[0]?.message || "Invalid top count" },
        { status: 400 }
      );
    }

    const { topCount } = result.data;
    const outcome = await qualifyTopTeams(topCount);

    return NextResponse.json({ success: true, ...outcome });
  } catch (err: any) {
    if (err.message === "UNAUTHORIZED_ADMIN") {
      return NextResponse.json({ error: "Unauthorized: Admin access required" }, { status: 403 });
    }
    return NextResponse.json({ error: err.message || "Failed to qualify teams" }, { status: 500 });
  }
}
