import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth";
import { CompleteAuctionChallengeSchema } from "@/lib/validation";
import { resolveAuctionChallenge } from "@/lib/round2";

export async function POST(req: Request) {
  try {
    await requireAdminSession();
    const body = await req.json();
    const result = CompleteAuctionChallengeSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.errors[0]?.message || "Invalid payload" },
        { status: 400 }
      );
    }

    const outcome = await resolveAuctionChallenge(result.data);
    return NextResponse.json(outcome);
  } catch (err: any) {
    if (err.message === "UNAUTHORIZED_ADMIN") {
      return NextResponse.json({ error: "Unauthorized: Admin access required" }, { status: 403 });
    }
    return NextResponse.json({ error: err.message || "Failed to resolve challenge" }, { status: 500 });
  }
}
