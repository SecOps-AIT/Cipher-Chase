import { prisma } from "@/lib/prisma";
import { logAuditEvent } from "@/lib/audit";

// Generate sequential CC26XX format codes (e.g., CC2601, CC2602, ..., CC2699)
export async function getNextCC26Code(): Promise<string> {
  const existingTeams = await prisma.team.findMany({
    where: { joinCode: { startsWith: "CC26" } },
    select: { joinCode: true },
  });

  const usedNumbers = new Set<number>();
  for (const t of existingTeams) {
    const numPart = t.joinCode.replace(/^CC26/i, "");
    const parsed = parseInt(numPart, 10);
    if (!isNaN(parsed) && parsed > 0) {
      usedNumbers.add(parsed);
    }
  }

  let nextNum = 1;
  while (usedNumbers.has(nextNum)) {
    nextNum++;
  }

  const padded = nextNum.toString().padStart(2, "0");
  return `CC26${padded}`;
}

export function generateCipherChaseCode(): string {
  const randomNum = Math.floor(Math.random() * 99) + 1;
  const paddedNum = randomNum.toString().padStart(2, "0");
  return `CC26${paddedNum}`;
}

// Legacy format for backwards compatibility (CC-XXXXX)
const CHARS = "23456789ABCDEFGHJKMNPQRSTUVWXYZ"; // excludes 0, O, 1, I, L

export function generateReadableCode(prefix: string = "CC"): string {
  let code = "";
  for (let i = 0; i < 5; i++) {
    code += CHARS.charAt(Math.floor(Math.random() * CHARS.length));
  }
  return `${prefix}-${code}`;
}

export async function createTeam({
  eventId,
  name,
  joinCode,
  members,
}: {
  eventId: string;
  name: string;
  joinCode?: string;
  members: string[];
}) {
  const code = joinCode?.trim().toUpperCase() || (await getNextCC26Code());

  const team = await prisma.team.create({
    data: {
      eventId,
      name: name.trim(),
      joinCode: code,
      score: 0,
      qualified: false,
      members: {
        create: members.filter(Boolean).map((m) => ({ name: m.trim() })),
      },
    },
    include: { members: true },
  });

  await logAuditEvent({
    eventId,
    teamId: team.id,
    actor: "ADMIN",
    action: "TEAM_CREATED",
    details: `Team "${team.name}" created with code [${team.joinCode}] and ${members.length} members.`,
  });

  return team;
}

export async function regenerateTeamJoinCode(teamId: string) {
  const team = await prisma.team.findUnique({ where: { id: teamId } });
  if (!team) throw new Error("Team not found.");

  const newCode = await getNextCC26Code();
  const updated = await prisma.team.update({
    where: { id: teamId },
    data: { joinCode: newCode },
  });

  await logAuditEvent({
    eventId: team.eventId,
    teamId: team.id,
    actor: "ADMIN",
    action: "TEAM_CODE_REGENERATED",
    details: `Join code regenerated for team "${team.name}": [${newCode}]`,
  });

  return updated;
}
