import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const ROUND_1_QUESTIONS = [
  {
    order: 1,
    title: 'Q01: The First Door',
    description: 'Access the external CTF platform and solve the first challenge.',
    outline: 'Cipher shift challenge - decode the message to find the key',
    answer: 'SHIFT-3',
    expectedFlag: 'CC{FIRST_DOOR}',
    points: 100,
    difficulty: 'EASY',
    category: 'Cryptography',
  },
  {
    order: 2,
    title: 'Q02: Tokyo Connection',
    description: 'Follow the coordinates to discover the location.',
    outline: 'Geolocation and data analysis challenge',
    answer: 'ORBIT-42',
    expectedFlag: 'CC{TOKYO}',
    points: 100,
    difficulty: 'EASY',
    category: 'OSINT',
  },
  {
    order: 3,
    title: 'Q03: The Red Mask',
    description: 'Identify the mysterious figure behind the red mask.',
    outline: 'Image analysis and steganography',
    answer: 'REDMASK',
    expectedFlag: 'CC{REDMASK}',
    points: 150,
    difficulty: 'MEDIUM',
    category: 'Forensics',
  },
  {
    order: 4,
    title: 'Q04: Blackout Protocol',
    description: 'Decrypt the hash to reveal the blackout protocol.',
    outline: 'Hash cracking and cryptographic analysis',
    answer: 'fcab347d88214215683bdd17b4f78fae6fee61f67b35aeb9f04158dcbb755db6',
    expectedFlag: 'CC{BLACKOUT}',
    points: 150,
    difficulty: 'MEDIUM',
    category: 'Cryptography',
  },
  {
    order: 5,
    title: 'Q05: Source Found',
    description: 'Discover the hidden source in the old logs.',
    outline: 'Log analysis and data mining',
    answer: 'LOGS-OLD',
    expectedFlag: 'CC{SOURCE_FOUND}',
    points: 150,
    difficulty: 'MEDIUM',
    category: 'Web',
  },
  {
    order: 6,
    title: 'Q06: The Vault Path',
    description: 'Navigate through the system to find the vault telemetry.',
    outline: 'Directory traversal and web exploitation',
    answer: '/vault/room-9/telemetry',
    expectedFlag: 'CC{VAULT_FOUND}',
    points: 200,
    difficulty: 'MEDIUM',
    category: 'Web',
  },
  {
    order: 7,
    title: 'Q07: Thirteen',
    description: 'Combine the mask with the number to unlock the next level.',
    outline: 'Pattern recognition and cipher combination',
    answer: 'REDMASK13',
    expectedFlag: 'CC{THIRTEEN}',
    points: 200,
    difficulty: 'MEDIUM',
    category: 'Cryptography',
  },
  {
    order: 8,
    title: 'Q08: Route Acquired',
    description: 'Trace the route through the network to find the map.',
    outline: 'Network analysis and packet inspection',
    answer: 'ROUTE-9C',
    expectedFlag: 'CC{MAP_ACQUIRED}',
    points: 200,
    difficulty: 'HARD',
    category: 'Network',
  },
  {
    order: 9,
    title: 'Q09: The Ledger',
    description: 'Access the financial records to find the ledger code.',
    outline: 'SQL injection and database exploitation',
    answer: 'LEDGER',
    expectedFlag: 'CC{LEDGER}',
    points: 250,
    difficulty: 'HARD',
    category: 'Web',
  },
  {
    order: 10,
    title: 'Q10: Manager Access',
    description: 'Gain manager-level access to the orbital system.',
    outline: 'Privilege escalation and authentication bypass',
    answer: 'ORBIT-6384',
    expectedFlag: 'CC{MANAGER_ACCESS}',
    points: 250,
    difficulty: 'HARD',
    category: 'Web',
  },
  {
    order: 11,
    title: 'Q11: Top Three',
    description: 'Identify the top three sequences in the correct order.',
    outline: 'Sequence analysis and pattern matching',
    answer: '3950-3520-3150',
    expectedFlag: 'CC{TOP_THREE}',
    points: 250,
    difficulty: 'HARD',
    category: 'Reverse Engineering',
  },
  {
    order: 12,
    title: 'Q12: Nightfall Protocol',
    description: 'Decode the vector to reveal the nightfall sequence.',
    outline: 'Advanced cryptography and multi-stage decryption',
    answer: 'VECTOR-83',
    expectedFlag: 'CC{NIGHTFALL-17}',
    points: 300,
    difficulty: 'HARD',
    category: 'Cryptography',
  },
  {
    order: 13,
    title: 'Q13: Blackout Bypass',
    description: 'Bypass the blackout security system.',
    outline: 'Binary exploitation and memory analysis',
    answer: '7F3A-91C2',
    expectedFlag: 'CC{BLACKOUT_BYPASS}',
    points: 300,
    difficulty: 'EXPERT',
    category: 'Binary',
  },
  {
    order: 14,
    title: 'Q14: Phase Shift',
    description: 'Navigate the phase shift relay to unlock the path.',
    outline: 'Advanced network exploitation and timing attack',
    answer: 'RELAY-83',
    expectedFlag: 'CC{PHASE_SHIFT_47}',
    points: 300,
    difficulty: 'EXPERT',
    category: 'Network',
  },
  {
    order: 15,
    title: 'Q15: The Final Escape',
    description: 'Complete the heist by finding the final escape gate.',
    outline: 'Multi-stage challenge combining all learned skills',
    answer: 'GATE-58X',
    expectedFlag: 'CC{THE_FINAL_ESCAPE}',
    points: 350,
    difficulty: 'EXPERT',
    category: 'Mixed',
  },
];

async function main() {
  console.log('🚀 Starting seed for Round 1 questions...');

  // Get or create the event
  let event = await prisma.event.findFirst({
    where: { name: 'Cipher Chase 2026' },
  });

  if (!event) {
    console.log('📝 Creating Cipher Chase 2026 event...');
    event = await prisma.event.create({
      data: {
        name: 'Cipher Chase 2026',
        status: 'DRAFT',
      },
    });
  }

  console.log(`✅ Event: ${event.name} (${event.id})`);

  // Get or create Round 1
  let round1 = await prisma.round.findFirst({
    where: {
      eventId: event.id,
      number: 1,
    },
  });

  if (!round1) {
    console.log('📝 Creating Round 1...');
    round1 = await prisma.round.create({
      data: {
        eventId: event.id,
        name: 'Round 1: The Heist',
        number: 1,
        status: 'DRAFT',
      },
    });
  }

  console.log(`✅ Round 1: ${round1.name} (${round1.id})`);

  // Check if questions already exist
  const existingQuestions = await prisma.question.count({
    where: { roundId: round1.id },
  });

  if (existingQuestions > 0) {
    console.log(`⚠️  Found ${existingQuestions} existing questions in Round 1`);
    console.log('🗑️  Deleting existing questions to reseed...');
    await prisma.question.deleteMany({
      where: { roundId: round1.id },
    });
  }

  // Create all 15 questions
  console.log('📝 Creating 15 Round 1 questions...');
  const externalChallengeUrl = 'https://heist-ctf.vercel.app/';

  for (const questionData of ROUND_1_QUESTIONS) {
    const question = await prisma.question.create({
      data: {
        roundId: round1.id,
        title: questionData.title,
        description: questionData.description,
        outline: questionData.outline,
        answer: questionData.answer,
        expectedFlag: questionData.expectedFlag,
        points: questionData.points,
        difficulty: questionData.difficulty,
        category: questionData.category,
        externalChallengeUrl,
        answerMode: 'TRIMMED',
        answerNormalization: 'TRIM_UPPERCASE',
        isActive: true,
        isCore: true,
        isReleased: true,
        order: questionData.order,
      },
    });

    console.log(`   ✓ ${question.title} - Answer: ${question.answer} → Flag: ${question.expectedFlag}`);
  }

  console.log('\n✅ Seed completed successfully!');
  console.log(`📊 Total questions created: ${ROUND_1_QUESTIONS.length}`);
  console.log(`🌐 External CTF URL: ${externalChallengeUrl}`);
}

main()
  .catch((e) => {
    console.error('❌ Error during seed:');
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
