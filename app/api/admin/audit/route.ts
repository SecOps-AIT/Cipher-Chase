export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    await requireAdminSession();
    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action");
    const actor = searchParams.get("actor");
    const teamId = searchParams.get("teamId");
    const limit = Math.min(200, parseInt(searchParams.get("limit") || "100", 10));

    const where: any = {};
    if (action) where.action = { contains: action, mode: "insensitive" };
    if (actor) where.actor = actor;
    if (teamId) where.teamId = teamId;

    const logs = await prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        event: { select: { name: true } },
      },
    });

    return NextResponse.json({ logs });
  } catch (err: any) {
    if (err.message === "UNAUTHORIZED_ADMIN") {
      return NextResponse.json({ error: "Unauthorized: Admin access required" }, { status: 403 });
    }
    return NextResponse.json({ error: err.message || "Failed to load audit logs" }, { status: 500 });
  }
}
