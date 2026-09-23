import { prisma } from "../lib/prisma";

async function main() {
  const events = await prisma.event.findMany();
  console.log("Events:", events);
  const rounds = await prisma.round.findMany({ select: { id: true, number: true, eventId: true, status: true } });
  console.log("Rounds:", rounds);
  const teams = await prisma.team.findMany({ select: { id: true, name: true, eventId: true, qualified: true } });
  console.log("Teams count:", teams.length, "first team eventId:", teams[0]?.eventId);
}

main().finally(() => prisma.$disconnect());
