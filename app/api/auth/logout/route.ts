export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { clearAdminSessionCookie, clearTeamSessionCookie } from "@/lib/auth";

export async function POST() {
  await clearAdminSessionCookie();
  await clearTeamSessionCookie();
  return NextResponse.json({ success: true, message: "Logged out successfully" });
}
