import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth";
import { activateBatchSchedule, extendActiveBatch } from "@/lib/round1";

export async function POST(req: Request) {
  try {
    await requireAdminSession();
    const body = await req.json();
    const { action, batchNumber, durationMinutes, extraMinutes } = body;

    if (action === "RESET_ALL") {
      const outcome = await activateBatchSchedule({
        durationMinutes: durationMinutes || 15,
        resetAll: true,
      });
      return NextResponse.json(outcome);
    }

    if (action === "EXTEND") {
      const outcome = await extendActiveBatch({
        batchNumber,
        extraMinutes: extraMinutes || 5,
      });
      return NextResponse.json(outcome);
    }

    // Default: ACTIVATE specific batch
    const outcome = await activateBatchSchedule({
      batchNumber: batchNumber || 1,
      durationMinutes: durationMinutes || 15,
      resetAll: false,
    });

    return NextResponse.json(outcome);
  } catch (err: any) {
    if (err.message === "UNAUTHORIZED_ADMIN") {
      return NextResponse.json({ error: "Unauthorized: Admin access required" }, { status: 403 });
    }
    return NextResponse.json({ error: err.message || "Failed to manage batch" }, { status: 500 });
  }
}
