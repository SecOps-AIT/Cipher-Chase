export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logActivity, ActivityActions } from "@/lib/activity";

/**
 * GET /api/admin/round-2/attachments?questionId=xxx
 * Get all attachments for a specific Round 2 question
 */
export async function GET(request: Request) {
  try {
    await requireAdminSession();

    const { searchParams } = new URL(request.url);
    const questionId = searchParams.get("questionId");

    if (!questionId) {
      return NextResponse.json(
        { error: "questionId is required" },
        { status: 400 }
      );
    }

    const attachments = await prisma.questionAttachment.findMany({
      where: { questionId },
      orderBy: { uploadedAt: "desc" },
    });

    return NextResponse.json({
      success: true,
      attachments,
    });

  } catch (err: any) {
    if (err.message === "UNAUTHORIZED_ADMIN") {
      return NextResponse.json(
        { error: "Unauthorized: Admin access required" },
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

/**
 * POST /api/admin/round-2/attachments
 * Add attachment to a Round 2 question
 */
export async function POST(request: Request) {
  try {
    const session = await requireAdminSession();

    const body = await request.json();
    const { questionId, filename, originalName, mimeType, fileSize, storageUrl } = body;

    if (!questionId || !filename || !originalName || !storageUrl) {
      return NextResponse.json(
        { error: "Missing required fields: questionId, filename, originalName, storageUrl" },
        { status: 400 }
      );
    }

    // Verify question exists
    const question = await prisma.question.findUnique({
      where: { id: questionId },
      select: { id: true, title: true },
    });

    if (!question) {
      return NextResponse.json(
        { error: "Question not found" },
        { status: 404 }
      );
    }

    // Create attachment record
    const attachment = await prisma.questionAttachment.create({
      data: {
        questionId,
        filename,
        originalName,
        mimeType: mimeType || "application/octet-stream",
        fileSize: fileSize || 0,
        storageUrl,
      },
    });

    // Update question hasAttachments flag if this is an AuctionQuestion
    const auctionQuestion = await prisma.auctionQuestion.findFirst({
      where: { questionId },
    });

    if (auctionQuestion) {
      await prisma.auctionQuestion.update({
        where: { id: auctionQuestion.id },
        data: { hasAttachments: true },
      });
    }

    // Log activity
    await logActivity({
      action: ActivityActions.ATTACHMENT_ADDED,
      performedBy: session.email,
      questionId,
      details: `Added attachment "${originalName}" to "${question.title}"`,
      metadata: {
        questionId,
        filename: originalName,
        fileSize,
        mimeType,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Attachment added successfully",
      attachment,
    });

  } catch (err: any) {
    if (err.message === "UNAUTHORIZED_ADMIN") {
      return NextResponse.json(
        { error: "Unauthorized: Admin access required" },
        { status: 403 }
      );
    }
    console.error("Error adding attachment:", err);
    return NextResponse.json(
      { error: err.message || "Failed to add attachment" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/round-2/attachments?attachmentId=xxx
 * Remove attachment from a Round 2 question
 */
export async function DELETE(request: Request) {
  try {
    const session = await requireAdminSession();

    const { searchParams } = new URL(request.url);
    const attachmentId = searchParams.get("attachmentId");

    if (!attachmentId) {
      return NextResponse.json(
        { error: "attachmentId is required" },
        { status: 400 }
      );
    }

    // Get attachment info before deleting
    const attachment = await prisma.questionAttachment.findUnique({
      where: { id: attachmentId },
      select: { questionId: true },
    });

    if (!attachment) {
      return NextResponse.json(
        { error: "Attachment not found" },
        { status: 404 }
      );
    }

    // Delete attachment
    await prisma.questionAttachment.delete({
      where: { id: attachmentId },
    });

    // Check if question still has attachments
    const remainingAttachments = await prisma.questionAttachment.count({
      where: { questionId: attachment.questionId },
    });

    // Update hasAttachments flag if no attachments remain
    if (remainingAttachments === 0) {
      const auctionQuestion = await prisma.auctionQuestion.findFirst({
        where: { questionId: attachment.questionId },
      });

      if (auctionQuestion) {
        await prisma.auctionQuestion.update({
          where: { id: auctionQuestion.id },
          data: { hasAttachments: false },
        });
      }
    }

    // Log activity
    await logActivity({
      action: ActivityActions.ATTACHMENT_DELETED,
      performedBy: session.email,
      details: `Deleted attachment from question`,
      metadata: {
        attachmentId,
        questionId: attachment.questionId,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Attachment deleted successfully",
    });

  } catch (err: any) {
    if (err.message === "UNAUTHORIZED_ADMIN") {
      return NextResponse.json(
        { error: "Unauthorized: Admin access required" },
        { status: 403 }
      );
    }
    console.error("Error deleting attachment:", err);
    return NextResponse.json(
      { error: err.message || "Failed to delete attachment" },
      { status: 500 }
    );
  }
}
