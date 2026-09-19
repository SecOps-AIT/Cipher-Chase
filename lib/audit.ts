import { prisma } from "@/lib/prisma";

export async function logAuditEvent({
  eventId,
  teamId,
  actor = "SYSTEM",
  action,
  details,
}: {
  eventId?: string | null;
  teamId?: string | null;
  actor?: "ADMIN" | "TEAM" | "SYSTEM";
  action: string;
  details?: string | null;
}) {
  try {
    return await prisma.auditLog.create({
      data: {
        eventId: eventId ?? undefined,
        teamId: teamId ?? undefined,
        actor,
        action,
        details: details ?? undefined,
      },
    });
  } catch (err) {
    console.error("Failed to write audit log:", err);
  }
}
