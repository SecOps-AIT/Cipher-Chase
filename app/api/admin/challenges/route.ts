import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/auth";

export async function GET() {
  try {
    await requireAdminSession();
    const challenges = await prisma.auctionChallenge.findMany({
      include: {
        round: true,
        hints: { orderBy: { order: "asc" } },
        attempts: {
          include: { team: { select: { id: true, name: true } } },
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: { order: "asc" },
    });

    const teams = await prisma.team.findMany({
      where: { qualified: true },
      select: { id: true, name: true, score: true },
      orderBy: { score: "desc" },
    });

    return NextResponse.json({ challenges, qualifiedTeams: teams });
  } catch (err: any) {
    if (err.message === "UNAUTHORIZED_ADMIN") {
      return NextResponse.json({ error: "Unauthorized: Admin access required" }, { status: 403 });
    }
    return NextResponse.json({ error: err.message || "Failed to load auction challenges" }, { status: 500 });
  }
}
