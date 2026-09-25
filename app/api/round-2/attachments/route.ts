export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { requireTeamSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/round-2/attachments?assignmentId=xxx
 * Get attachments for team's assigned Round 2 question
 * 
 * Teams can only access attachments for questions assigned to them
 */
export async function GET(request: Request) {
  try {
    const teamSession = await requireTeamSession();
    const { searchParams } = new URL(request.url);
    const assignmentId = searchParams.get("assignmentId");

    if (!assignmentId) {
      return NextResponse.json(
        { error: "assignmentId is required" },
        { status: 400 }
      );
    }

    // Get assignment and verify it belongs to this team
    const assignment = await prisma.teamChallengeAssignment.findUnique({
      where: { id: assignmentId },
      include: {
        auctionQuestion: {
          include: {
            question: {
              include: {
                attachments: {
                  orderBy: { uploadedAt: "asc" },
                },
              },
            },
          },
        },
      },
    });

    if (!assignment) {
      return NextResponse.json(
        { error: "Assignment not found" },
        { status: 404 }
      );
    }

    if (assignment.teamId !== teamSession.teamId) {
      return NextResponse.json(
        { error: "Unauthorized: This assignment belongs to another team" },
        { status: 403 }
      );
    }

    // Only allow access if assignment is ACTIVE or COMPLETED
    if (assignment.status !== "ACTIVE" && assignment.status !== "COMPLETED") {
      return NextResponse.json(
        { error: "Assignment must be active to access attachments" },
        { status: 403 }
      );
    }

    const attachments = assignment.auctionQuestion.question.attachments.map(att => ({
      id: att.id,
      filename: att.filename,
      originalName: att.originalName,
      mimeType: att.mimeType,
      fileSize: att.fileSize,
      storageUrl: att.storageUrl,
      uploadedAt: att.uploadedAt,
    }));

    return NextResponse.json({
      success: true,
      attachments,
      questionTitle: assignment.auctionQuestion.title,
    });

  } catch (err: any) {
    if (err.message === "UNAUTHORIZED_TEAM") {
      return NextResponse.json(
        { error: "Unauthorized: Team session required" },
        { status: 403 }
      );
    }
    console.error("Error fetching attachments:", err);
    return NextResponse.json(
      { error: err.message || "Failed to fetch attachments" },
      { status: 500 }
    );
  }
}
