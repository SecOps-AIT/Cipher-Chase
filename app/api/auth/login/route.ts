export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { AdminLoginSchema } from "@/lib/validation";
import { setAdminSessionCookie } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const result = AdminLoginSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.errors[0]?.message || "Invalid credentials format" },
        { status: 400 }
      );
    }

    const { email, password } = result.data;
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminEmail || !adminPassword) {
      return NextResponse.json({ error: "Admin authentication is not configured." }, { status: 503 });
    }

    if (email !== adminEmail || password !== adminPassword) {
      return NextResponse.json(
        { error: "Invalid admin email or password" },
        { status: 401 }
      );
    }

    await setAdminSessionCookie({ email, isAdmin: true });

    return NextResponse.json({ success: true, message: "Admin authenticated successfully" });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
