import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Checking and migrating team join codes to CC26XX format...");

  const teams = await prisma.team.findMany({
    orderBy: { createdAt: "asc" },
  });

  console.log(`Found ${teams.length} teams.`);

  let index = 1;
  for (const team of teams) {
    const code = `CC26${index.toString().padStart(2, "0")}`;
    console.log(`Updating "${team.name}" (was: [${team.joinCode}]) -> [${code}]`);
    await prisma.team.update({
      where: { id: team.id },
      data: { joinCode: code },
    });
    index++;
  }

  const updatedTeams = await prisma.team.findMany({
    select: { id: true, name: true, joinCode: true },
    orderBy: { joinCode: "asc" },
  });

  console.log("Updated teams:", updatedTeams);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
