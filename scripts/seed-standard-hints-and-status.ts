import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("=== Setting Round Statuses to LIVE ===");
  await prisma.round.updateMany({
    where: { number: 1 },
    data: { status: "LIVE" },
  });
  await prisma.round.updateMany({
    where: { number: 2 },
    data: { status: "LIVE" },
  });
  console.log("✓ Round 1 and Round 2 set to LIVE");

  console.log("=== Standardizing 3 Progressive Hints (-2, -3, -5 pts) for All Questions ===");

  // 1. Get all questions in Round 1 and Round 2
  const questions = await prisma.question.findMany({
    include: {
      hints: {
        orderBy: { order: "asc" },
      },
    },
  });

  console.log(`Found ${questions.length} total questions.`);

  const hintCosts = [2, 3, 5]; // Hint 1: -2, Hint 2: -3, Hint 3: -5

  for (const q of questions) {
    const existingHints = q.hints;

    // Standardize existing hints or create missing ones up to 3
    for (let i = 0; i < 3; i++) {
      const order = i + 1;
      const expectedCost = hintCosts[i];

      if (existingHints[i]) {
        // Update cost if different
        if (existingHints[i].cost !== expectedCost || existingHints[i].order !== order) {
          await prisma.questionHint.update({
            where: { id: existingHints[i].id },
            data: {
              cost: expectedCost,
              order: order,
            },
          });
        }
      } else {
        // Create missing hint
        await prisma.questionHint.create({
          data: {
            questionId: q.id,
            title: `Intel Hint ${order}: Tactical Guidance`,
            content: `Deconstruct the challenge vector for "${q.title}". Review payload structure, encoding layers, and service logs carefully.`,
            cost: expectedCost,
            order: order,
          },
        });
      }
    }
  }

  console.log("✓ All questions now have 3 progressive hints with costs: 2 pts, 3 pts, 5 pts.");

  // Also verify hints
  const sampleHints = await prisma.questionHint.findMany({
    take: 6,
    select: { questionId: true, title: true, order: true, cost: true },
    orderBy: { createdAt: "desc" },
  });
  console.log("Sample hints after migration:", sampleHints);
}

main()
  .catch((err) => {
    console.error("Migration error:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
