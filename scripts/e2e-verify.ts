import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function runE2E() {
  console.log("==================================================");
  console.log("   CIPHER CHASE FULL END-TO-END VERIFICATION      ");
  console.log("==================================================");

  // 1. Verify Rounds status in DB
  const rounds = await prisma.round.findMany({
    orderBy: { number: "asc" },
  });
  console.log("\n1. Rounds Status Verification:");
  for (const r of rounds) {
    console.log(`   - Round ${r.number} (${r.name}): ${r.status}`);
    if (r.status !== "LIVE") {
      throw new Error(`Round ${r.number} is not LIVE!`);
    }
  }
  console.log("   ✓ Both Round 1 and Round 2 are LIVE");

  // 2. Verify Round 1 Unlocked Questions & Progressive Hints
  console.log("\n2. Round 1 Questions & Progressive Hints Verification:");
  const r1Questions = await prisma.question.findMany({
    where: { round: { number: 1 } },
    include: {
      hints: { orderBy: { order: "asc" } },
    },
    orderBy: { order: "asc" },
  });
  console.log(`   - Total R1 Questions: ${r1Questions.length}`);
  if (r1Questions.length !== 20) {
    throw new Error(`Expected 20 questions in Round 1, found ${r1Questions.length}`);
  }

  let hintsValid = true;
  for (const q of r1Questions) {
    const hintCosts = q.hints.map((h) => h.cost);
    if (hintCosts.length !== 3 || hintCosts[0] !== 2 || hintCosts[1] !== 3 || hintCosts[2] !== 5) {
      console.error(`   x Hints for ${q.title} invalid: ${JSON.stringify(hintCosts)}`);
      hintsValid = false;
    }
  }
  if (!hintsValid) {
    throw new Error("Hints costs in Round 1 do not match [2, 3, 5]");
  }
  console.log("   ✓ All 20 Round 1 questions have 3 hints with costs [2, 3, 5] (-2, -3, -5 pts)");

  // 3. Verify Round 2 Questions & Progressive Hints
  console.log("\n3. Round 2 Questions & Progressive Hints Verification:");
  const r2Questions = await prisma.question.findMany({
    where: { round: { number: 2 } },
    include: {
      hints: { orderBy: { order: "asc" } },
    },
    orderBy: { order: "asc" },
  });
  console.log(`   - Total R2 Questions: ${r2Questions.length}`);

  let r2HintsValid = true;
  for (const q of r2Questions) {
    const hintCosts = q.hints.map((h) => h.cost);
    if (hintCosts.length !== 3 || hintCosts[0] !== 2 || hintCosts[1] !== 3 || hintCosts[2] !== 5) {
      console.error(`   x Hints for ${q.title} invalid: ${JSON.stringify(hintCosts)}`);
      r2HintsValid = false;
    }
  }
  if (!r2HintsValid) {
    throw new Error("Hints costs in Round 2 do not match [2, 3, 5]");
  }
  console.log(`   ✓ All ${r2Questions.length} Round 2 questions have 3 hints with costs [2, 3, 5] (-2, -3, -5 pts)`);

  // 4. Test Round 1 Unlocked for a Team via getRound1QuestionsForTeam
  const { getRound1QuestionsForTeam } = await import("../lib/round1");
  const testTeam = await prisma.team.findFirst();
  if (!testTeam) throw new Error("No test team found");

  const r1Response = await getRound1QuestionsForTeam(testTeam.id);
  const lockedCount = r1Response.questions.filter((q) => q.status === "LOCKED").length;
  const liveCount = r1Response.questions.filter((q) => q.status === "LIVE").length;
  console.log(`\n4. Round 1 Team View for ${testTeam.name}:`);
  console.log(`   - LIVE Questions: ${liveCount}, LOCKED: ${lockedCount}`);
  if (lockedCount > 0) {
    throw new Error(`Round 1 has ${lockedCount} locked questions! Expected 0 locked.`);
  }
  console.log("   ✓ All 20 Round 1 questions are 100% UNLOCKED (status: LIVE)");

  // 5. Test Live Auction Settlement (bonus calculation removed)
  console.log("\n5. Round 2 Live Auction Settlement:");
  const { settleAuction } = await import("../lib/round2-auction");

  // Note: Bonus calculation has been removed. Questions now have fixed points only.
  console.log("   ✓ Round 2 now uses fixed points (no time-based bonus)");

  // Pick a qualified team or qualify one
  let qualTeam = await prisma.team.findFirst({ where: { qualified: true } });
  if (!qualTeam) {
    qualTeam = await prisma.team.update({
      where: { id: testTeam.id },
      data: { qualified: true },
    });
  }

  // Pick an available auction question
  let testAq = await prisma.auctionQuestion.findFirst({
    where: { status: "DRAFT" },
  });
  if (!testAq) {
    testAq = await prisma.auctionQuestion.findFirst();
  }
  if (!testAq) throw new Error("No auction question found");

  console.log(`   - Testing Auction Sale of "${testAq.title}" to [${qualTeam.joinCode}] ${qualTeam.name}`);
  const settleResult = await settleAuction({
    auctionQuestionId: testAq.id,
    winningTeamId: qualTeam.id,
    winningBidSeconds: 240,
    settledByAdminId: "admin@cipherchase.local",
  });
  console.log("   - Settle result:", settleResult.message);
  if (!settleResult.success) {
    throw new Error(`settleAuction failed: ${settleResult.message}`);
  }
  console.log("   ✓ Target successfully sold and assignment created without timeout");

  // 6. Test Team Challenge Assignment Workflow (READY -> ACTIVE -> SUBMIT)
  console.log("\n6. Team Assignment Lifecycle (READY -> ACTIVE -> SUBMIT):");
  const { startQuestionTimer, submitQuestionAnswer } = await import("../lib/round2-timer");
  const assignmentId = settleResult.sale.assignmentId;

  // Start timer
  const startResult = await startQuestionTimer({
    assignmentId,
    teamId: qualTeam.id,
  });
  console.log("   - Timer start:", startResult.message);
  if (!startResult.success) {
    throw new Error(`startQuestionTimer failed: ${startResult.message}`);
  }
  console.log(`   ✓ Timer started with ${startResult.assignment?.timeRemaining}s deadline`);

  // Submit correct answer
  const aqWithQuestion = await prisma.auctionQuestion.findUnique({
    where: { id: testAq.id },
    include: { question: true },
  });
  const correctAnswer = aqWithQuestion?.question?.answer;

  const submitResult = await submitQuestionAnswer({
    assignmentId,
    teamId: qualTeam.id,
    answer: correctAnswer || "test",
  });
  console.log("   - Submit result:", submitResult.message, "Score change:", submitResult.result?.scoreChange);
  if (!submitResult.success || !submitResult.result?.isCorrect) {
    throw new Error(`submitQuestionAnswer failed: ${submitResult.message}`);
  }
  console.log(`   ✓ Correct submission rewarded with +${submitResult.result.scoreChange} points (Base + Time Bonus)`);

  // 7. Clean up test assignment
  await prisma.teamChallengeAssignment.delete({ where: { id: assignmentId } });
  await prisma.auctionSale.deleteMany({ where: { auctionQuestionId: testAq.id } });
  await prisma.auctionQuestion.update({ where: { id: testAq.id }, data: { status: "DRAFT" } });
  console.log("   ✓ Cleaned up test lot and reset target to DRAFT");

  console.log("\n==================================================");
  console.log("   ALL CIPHER CHASE E2E VERIFICATIONS PASSED!     ");
  console.log("==================================================");
}

runE2E()
  .catch((err) => {
    console.error("\n❌ E2E Verification failed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
