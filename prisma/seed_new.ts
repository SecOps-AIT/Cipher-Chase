import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding Cipher Chase CTF database...");

  // Clean existing data
  await prisma.auditLog.deleteMany();
  await prisma.teamChallengeAttempt.deleteMany();
  await prisma.hintClaim.deleteMany();
  await prisma.questionHint.deleteMany();
  await prisma.hint.deleteMany();
  await prisma.auctionChallenge.deleteMany();
  await prisma.scoreEvent.deleteMany();
  await prisma.submission.deleteMany();
  await prisma.question.deleteMany();
  await prisma.round.deleteMany();
  await prisma.teamMember.deleteMany();
  await prisma.team.deleteMany();
  await prisma.event.deleteMany();

  // 1. Create Main Event
  const event = await prisma.event.create({
    data: {
      name: "Cipher Chase 2026",
      status: "LIVE",
    },
  });

  console.log(`Created Event: ${event.name} (${event.id})`);

  // 2. Create Teams with proper member structure
  const teamsData = [
    {
      name: "Cyber Wolves",
      joinCode: "CC-7X4K9", 
      members: [{ name: "Anagesh", isLeader: true }, { name: "Arun", isLeader: false }, { name: "Vishnu", isLeader: false }],
    },
    {
      name: "Null Squad",
      joinCode: "CC-9B2M7",
      members: [{ name: "Rohan", isLeader: true }, { name: "Karthik", isLeader: false }, { name: "Sneha", isLeader: false }],
    },
    {
      name: "Root Access", 
      joinCode: "CC-4T8W1",
      members: [{ name: "Vikram", isLeader: true }, { name: "Deepak", isLeader: false }, { name: "Meera", isLeader: false }],
    },
    {
      name: "Byte Force",
      joinCode: "CC-6K3R5",
      members: [{ name: "Rahul", isLeader: true }, { name: "Naveen", isLeader: false }, { name: "Swathi", isLeader: false }],
    },
    {
      name: "Hex Raiders",
      joinCode: "CC-2P9Y4", 
      members: [{ name: "Tanvi", isLeader: true }, { name: "Akash", isLeader: false }],
    },
  ];

  for (const t of teamsData) {
    const createdTeam = await prisma.team.create({
      data: {
        eventId: event.id,
        name: t.name,
        joinCode: t.joinCode,
        score: 0,
        qualified: false,
        round1Duration: 1800, // 30 minutes default
        members: {
          create: t.members,
        },
      },
    });
    console.log(`Created Team: ${createdTeam.name} with code [${createdTeam.joinCode}]`);
  }

  console.log("✅ Teams created successfully");
  
  // 3. Create Round 1: Themed CTF  
  const round1 = await prisma.round.create({
    data: {
      eventId: event.id,
      name: "Round 1 — Themed CTF",
      number: 1,
      status: "LIVE",
      startedAt: new Date(),
    },
  });

  // CORE QUESTIONS (Q01-Q20) - Available immediately
  const coreQuestions = [
    {
      title: "Q01 — Base64 Radio Beacon",
      description: "A radio broadcast intercepted on frequency 433.92MHz contains a repeating message encoded in base64: `Q0N7YmFzZTY0X3JhZGlvX2JlYWNvbl8yMDI2X2ZvdW5kfQ==`. Decode the transmission to recover the flag.",
      answer: "CC{base64_radio_beacon_2026_found}",
      points: 100,
      difficulty: "EASY",
      category: "Cryptography",
      order: 1,
    },
    {
      title: "Q02 — Caesar's Shifted ROT13",
      description: "A secure dispatch was encrypted using Caesar cipher with shift 13 applied to a base64 encoded string: `UFB7ZXBiXzEzX2N5Y3BiX2ZodWJ0cWVyXzIwMjZ9`. Reversing the transformation yields what secret flag?",
      answer: "CC{rot_13_cycbi_shubtqer_2026}",
      points: 100,
      difficulty: "EASY", 
      category: "Cryptography",
      order: 2,
    },
    {
      title: "Q03 — SQLi Authentication Gatekeeper",
      description: "The backend login handler evaluates: `SELECT * FROM operators WHERE user = 'admin' AND pass = '$input'`. If an attacker supplies `' OR '1'='1' -- `, the authentication check evaluates to TRUE. What standard verification flag is unlocked upon bypass?",
      answer: "CC{sqli_auth_bypass_gatekeeper_pwned}",
      points: 150,
      difficulty: "MEDIUM",
      category: "Web Security",
      order: 3,
    },
    {
      title: "Q04 — Forensic EXIF Hex Extraction",
      description: "An evidence image `suspect_avatar.png` contains hidden hex bytes inside its raw EXIF comment field: `43437b657869665f6865785f6d657461646174615f72657665616c65647d`. Convert the hexadecimal stream into readable ASCII.",
      answer: "CC{exif_hex_metadata_revealed}",
      points: 150,
      difficulty: "MEDIUM",
      category: "Forensics",
      order: 4,
    },
    {
      title: "Q05 — Cookie Tampering & Privilege Escalation",
      description: "A session cookie contains JSON encoded in base64: `eyJ1c2VyIjoiZ3Vlc3QiLCJyb2xlIjoidXNlciIsImlzQWRtaW4iOmZhbHNlfQ==`. When decoded, `isAdmin` is false. Changing `isAdmin` to `true` and re-encoding produces: `eyJ1c2VyIjoiZ3Vlc3QiLCJyb2xlIjoidXNlciIsImlzQWRtaW4iOnRydWV9`. Submitting this cookie yields the administrative token flag.",
      answer: "CC{cookie_tampering_admin_priv_escalated}",
      points: 200,
      difficulty: "HARD",
      category: "Web Security",
      order: 5,
    },
  ];

  // Create first 5 core questions for now (can be expanded)
  for (const q of coreQuestions) {
    await prisma.question.create({ 
      data: { ...q, roundId: round1.id, isCore: true, isReleased: true } 
    });
  }

  console.log(`Created ${coreQuestions.length} core questions (expandable to Q01-Q20)`);

  // 4. Create Round 2: Cyber Auction
  const round2 = await prisma.round.create({
    data: {
      eventId: event.id,
      name: "Round 2 — Cyber Auction",
      number: 2,
      status: "READY",
    },
  });

  console.log("✅ Rounds created successfully");

  // 5. Initial Audit Log
  await prisma.auditLog.create({
    data: {
      eventId: event.id,
      actor: "SYSTEM",
      action: "EVENT_INITIALIZED",
      details: "Cipher Chase 2026 initialized with Round 1 (core/backup questions) and Round 2 (auction). Per-team timers implemented.",
    },
  });

  console.log("Database seeded successfully!");
  console.log("✅ Round 1: Per-team timer system ready");
  console.log("✅ Round 2: Auction system ready");
  console.log("✅ 5 teams created with proper member structure");
  console.log("✅ First Blood system removed");
  console.log("✅ Batch system removed - core/backup classification implemented");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });