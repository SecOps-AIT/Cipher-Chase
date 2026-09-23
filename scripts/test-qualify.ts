import { qualifyTopTeams } from "../lib/scoring";
import { prisma } from "../lib/prisma";

async function main() {
  try {
    const res = await qualifyTopTeams(4);
    console.log("Qualify result:", res);
  } catch (err) {
    console.error("Qualify error:", err);
  }
}

main().finally(() => prisma.$disconnect());
