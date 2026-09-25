export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    adminEmailConfigured: !!process.env.ADMIN_EMAIL,
    adminPasswordConfigured: !!process.env.ADMIN_PASSWORD,
    databaseConfigured: !!process.env.DATABASE_URL,
    sessionSecretConfigured: !!process.env.SESSION_SECRET,
    // Only show first few chars for debugging
    adminEmailPrefix: process.env.ADMIN_EMAIL?.substring(0, 5) || "NOT_SET",
  });
}
