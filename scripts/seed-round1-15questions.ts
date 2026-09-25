import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const round1Questions = [
  {
    order: 1,
    title: "Q01 — OSINT: Hidden Clues",
    topic: "OSINT",
    outline: "Searching for clues on platforms",
    description: "Use open source intelligence gathering techniques to find hidden information about the target organization.",
    answer: "CipherChase{OSINT_Master_2026}",
    points: 50,
    difficulty: "EASY",
    category: "OSINT",
  },
  {
    order: 2,
    title: "Q02 — Web Exploitation: Parameter Tampering",
    topic: "Web Exploitation",
    outline: "Manipulating URL parameters",
    description: "Exploit vulnerable URL parameters to gain unauthorized access.",
    answer: "CipherChase{URL_Tamper_Success}",
    points: 75,
    difficulty: "EASY",
    category: "Web Security",
  },
  {
    order: 3,
    title: "Q03 — Cryptography: Caesar Cipher",
    topic: "Cryptography",
    outline: "Basic substitution cipher",
    description: "Decrypt the message encoded with a simple Caesar cipher.",
    answer: "CipherChase{Caesar_Decoded}",
    points: 50,
    difficulty: "EASY",
    category: "Cryptography",
  },
  {
    order: 4,
    title: "Q04 — Network Security: Packet Analysis",
    topic: "Network Security",
    outline: "Analyzing network traffic",
    description: "Analyze the captured network packets to extract sensitive information.",
    answer: "CipherChase{Packet_Found}",
    points: 100,
    difficulty: "MEDIUM",
    category: "Network Security",
  },
  {
    order: 5,
    title: "Q05 — Steganography: Hidden Message",
    topic: "Steganography",
    outline: "Finding hidden data in images",
    description: "Extract the hidden message from the provided image file.",
    answer: "CipherChase{Stego_Revealed}",
    points: 75,
    difficulty: "EASY",
    category: "Steganography",
  },
  {
    order: 6,
    title: "Q06 — Forensics: Deleted File Recovery",
    topic: "Forensics",
    outline: "Recovering deleted data",
    description: "Recover the deleted file from the disk image and extract the flag.",
    answer: "CipherChase{File_Recovered}",
    points: 100,
    difficulty: "MEDIUM",
    category: "Forensics",
  },
  {
    order: 7,
    title: "Q07 — Web Exploitation: SQL Injection",
    topic: "Web Exploitation",
    outline: "Database injection attack",
    description: "Exploit the SQL injection vulnerability to extract the admin password.",
    answer: "CipherChase{SQL_Injection_Win}",
    points: 125,
    difficulty: "MEDIUM",
    category: "Web Security",
  },
  {
    order: 8,
    title: "Q08 — Reverse Engineering: Binary Analysis",
    topic: "Reverse Engineering",
    outline: "Analyzing compiled binaries",
    description: "Reverse engineer the binary to find the hidden validation key.",
    answer: "CipherChase{Binary_Cracked}",
    points: 150,
    difficulty: "HARD",
    category: "Reverse Engineering",
  },
  {
    order: 9,
    title: "Q09 — Cryptography: Base64 Encoding",
    topic: "Cryptography",
    outline: "Decoding encoded strings",
    description: "Decode the Base64 encoded message to reveal the flag.",
    answer: "CipherChase{Base64_Decoded}",
    points: 50,
    difficulty: "EASY",
    category: "Cryptography",
  },
  {
    order: 10,
    title: "Q10 — OSINT: Social Media Investigation",
    topic: "OSINT",
    outline: "Investigating social profiles",
    description: "Use social media platforms to gather intelligence about the target.",
    answer: "CipherChase{Social_Intel_Found}",
    points: 75,
    difficulty: "EASY",
    category: "OSINT",
  },
  {
    order: 11,
    title: "Q11 — Network Security: Port Scanning",
    topic: "Network Security",
    outline: "Discovering open ports",
    description: "Scan the target system to identify open ports and services.",
    answer: "CipherChase{Port_Scan_Complete}",
    points: 100,
    difficulty: "MEDIUM",
    category: "Network Security",
  },
  {
    order: 12,
    title: "Q12 — Web Exploitation: Directory Traversal",
    topic: "Web Exploitation",
    outline: "Path traversal attack",
    description: "Exploit directory traversal vulnerability to access restricted files.",
    answer: "CipherChase{Path_Traversal_Success}",
    points: 100,
    difficulty: "MEDIUM",
    category: "Web Security",
  },
  {
    order: 13,
    title: "Q13 — Cryptography: Hash Cracking",
    topic: "Cryptography",
    outline: "Breaking password hashes",
    description: "Crack the MD5 hash to reveal the original password.",
    answer: "CipherChase{Hash_Cracked}",
    points: 125,
    difficulty: "MEDIUM",
    category: "Cryptography",
  },
  {
    order: 14,
    title: "Q14 — Forensics: Memory Dump Analysis",
    topic: "Forensics",
    outline: "Analyzing RAM dumps",
    description: "Analyze the memory dump to extract sensitive credentials.",
    answer: "CipherChase{Memory_Dump_Flag}",
    points: 150,
    difficulty: "HARD",
    category: "Forensics",
  },
  {
    order: 15,
    title: "Q15 — Reverse Engineering: Code Obfuscation",
    topic: "Reverse Engineering",
    outline: "Deobfuscating code",
    description: "Deobfuscate the JavaScript code to find the hidden flag.",
    answer: "CipherChase{Deobfuscated_Success}",
    points: 150,
    difficulty: "HARD",
    category: "Reverse Engineering",
  },
];

async function main() {
  console.log("Seeding Round 1 with 15 questions...");

  const round1 = await prisma.round.findFirst({
    where: { number: 1 },
  });

  if (!round1) {
    throw new Error("Round 1 not found! Make sure the round exists before seeding questions.");
  }

  // Check existing questions in Round 1
  const existingQuestions = await prisma.question.findMany({
    where: { roundId: round1.id },
    orderBy: { order: "asc" },
  });

  console.log(`Current questions in Round 1: ${existingQuestions.length}`);

  // Process each question
  for (const q of round1Questions) {
    const existing = existingQuestions.find((eq) => eq.order === q.order);
    if (!existing) {
      console.log(`Creating Question ${q.order}: ${q.title}...`);
      await prisma.question.create({
        data: {
          ...q,
          roundId: round1.id,
          isCore: true,
          isReleased: true,
          isActive: true,
          answerMode: "TRIMMED",
        },
      });
    } else {
      console.log(`Updating Question ${q.order}: ${q.title}...`);
      await prisma.question.update({
        where: { id: existing.id },
        data: {
          title: q.title,
          topic: q.topic,
          outline: q.outline,
          description: q.description,
          answer: q.answer,
          points: q.points,
          difficulty: q.difficulty,
          category: q.category,
          isCore: true,
          isReleased: true,
          isActive: true,
          answerMode: "TRIMMED",
        },
      });
    }
  }

  const finalQuestions = await prisma.question.findMany({
    where: { roundId: round1.id },
    select: { order: true, title: true, topic: true, points: true, isCore: true, isReleased: true },
    orderBy: { order: "asc" },
  });

  console.log(`\nTotal Round 1 questions: ${finalQuestions.length}`);
  console.log("\n=== ROUND 1 QUESTIONS ===");
  finalQuestions.forEach((q) => {
    console.log(`  Q${q.order.toString().padStart(2, "0")}: ${q.title} [${q.topic}] - ${q.points} pts`);
  });

  console.log("\n✅ Round 1 questions seeded successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Error seeding questions:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
