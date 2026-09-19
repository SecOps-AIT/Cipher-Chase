import { NextResponse } from "next/server";
import { SubmitAnswerSchema } from "@/lib/validation";
import { submitRound1Answer } from "@/lib/round1";
import { getTeamSession } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const session = await getTeamSession();
    if (!session || !session.teamId) {
      return NextResponse.json({ error: "Unauthorized. Please join a team first." }, { status: 401 });
    }

    const body = await req.json();
    const result = SubmitAnswerSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.errors[0]?.message || "Invalid submission format" },
        { status: 400 }
      );
    }

    const { questionId, answer, memberName } = result.data;

    const outcome = await submitRound1Answer({
      teamId: session.teamId,
      questionId,
      submittedAnswer: answer,
      memberName: memberName || session.memberName || "Teammate",
    });

    if (!outcome.success && outcome.alreadySolved) {
      return NextResponse.json(outcome, { status: 409 });
    }

    if (!outcome.success) {
      return NextResponse.json(outcome, { status: 400 });
    }

    return NextResponse.json(outcome);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Submission failed" }, { status: 500 });
  }
}
