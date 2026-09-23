export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getActiveAssignmentsForAdmin } from "@/lib/round2-timer";
import { validateAdminAuth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const adminAuth = await validateAdminAuth(request);
    if (!adminAuth.success) {
      return NextResponse.json({ error: adminAuth.error }, { status: 401 });
    }

    const url = new URL(request.url);
    let roundId = url.searchParams.get("roundId");

    if (!roundId) {
      const { prisma } = await import("@/lib/prisma");
      const r2 = await prisma.round.findFirst({ where: { number: 2 } });
      if (r2) {
        roundId = r2.id;
      } else {
        return NextResponse.json(
          { error: "Round 2 not found and no roundId provided" },
          { status: 400 }
        );
      }
    }

    const activeAssignments = await getActiveAssignmentsForAdmin(roundId);

    return NextResponse.json({
      success: true,
      assignments: activeAssignments
    });
  } catch (error: any) {
    console.error("Get active assignments error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}