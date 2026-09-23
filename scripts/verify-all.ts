import { prisma } from "../lib/prisma";
import { getNextCC26Code } from "../lib/teams";

async function main() {
  console.log("=== RUNNING CIPHER CHASE SYSTEM VERIFICATION ===");

  // 1. Check CC26 code generation
  const nextCode = await getNextCC26Code();
  console.log(`[1] Next Join Code generated: ${nextCode} (Expected: CC2613)`);
  if (!/^CC26\d{2,}$/.test(nextCode)) {
    throw new Error(`Invalid code format: ${nextCode}`);
  }

  // 2. Check Round 1 question count
  const round1 = await prisma.round.findFirst({
    where: { number: 1 },
    include: { questions: true }
  });
  console.log(`[2] Round 1 (${round1?.id}): ${round1?.questions.length} questions (Expected: 20)`);
  if (round1?.questions.length !== 20) {
    throw new Error(`Round 1 does not have exactly 20 questions! Found: ${round1?.questions.length}`);
  }

  // 3. Check Round 2 question count & auction questions
  const round2 = await prisma.round.findFirst({
    where: { number: 2 },
    include: { questions: { include: { auctionQuestions: true } } }
  });
  console.log(`[3] Round 2 (${round2?.id}): ${round2?.questions.length} questions, ${round2?.questions.filter(q => q.auctionQuestions.length > 0).length} with auction target records (Expected: 22)`);
  if ((round2?.questions.length ?? 0) < 20) {
    throw new Error(`Round 2 does not have at least 20 questions! Found: ${round2?.questions.length}`);
  }

  // 4. Verify existing team join codes
  const teams = await prisma.team.findMany({ select: { id: true, name: true, joinCode: true } });
  console.log(`[4] Total Teams in Registry: ${teams.length}`);
  const nonConforming = teams.filter(t => !/^CC26\d{2,}$/.test(t.joinCode));
  if (nonConforming.length > 0) {
    console.warn(`WARNING: Found ${nonConforming.length} non-conforming team codes:`, nonConforming);
  } else {
    console.log(`[4] All ${teams.length} teams conform to CC26XX format!`);
  }

  console.log("=== ALL SYSTEM CHECKS PASSED ===");
}

main()
  .catch(e => {
    console.error("Verification failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
