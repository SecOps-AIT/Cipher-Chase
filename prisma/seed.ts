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

  // 2. Create Teams with Members
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
      roundId: round1.id,
      title: "Q02 — Caesar's Shifted ROT13",
      description: "A secure dispatch was encrypted using Caesar cipher with shift 13 applied to a base64 encoded string: `UFB7ZXBiXzEzX2N5Y3BiX2ZodWJ0cWVyXzIwMjZ9`. Reversing the transformation yields what secret flag?",
      answer: "CC{rot_13_cycbi_shubtqer_2026}",
      points: 100,
      firstBloodBonus: 50,
      difficulty: "EASY",
      category: "Cryptography",
      releaseAt: b1Release,
      closeAt: b1Close,
      batchNumber: 1,
      answerMode: "TRIMMED",
      order: 2,
    },
    {
      roundId: round1.id,
      title: "Q03 — SQLi Authentication Gatekeeper",
      description: "The backend login handler evaluates: `SELECT * FROM operators WHERE user = 'admin' AND pass = '$input'`. If an attacker supplies `' OR '1'='1' -- `, the authentication check evaluates to TRUE. What standard verification flag is unlocked upon bypass?",
      answer: "CC{sqli_auth_bypass_gatekeeper_pwned}",
      points: 150,
      firstBloodBonus: 50,
      difficulty: "MEDIUM",
      category: "Web Security",
      releaseAt: b1Release,
      closeAt: b1Close,
      batchNumber: 1,
      answerMode: "TRIMMED",
      order: 3,
    },
    {
      roundId: round1.id,
      title: "Q04 — Forensic EXIF Hex Extraction",
      description: "An evidence image `suspect_avatar.png` contains hidden hex bytes inside its raw EXIF comment field: `43437b657869665f6865785f6d657461646174615f72657665616c65647d`. Convert the hexadecimal stream into readable ASCII.",
      answer: "CC{exif_hex_metadata_revealed}",
      points: 150,
      firstBloodBonus: 50,
      difficulty: "MEDIUM",
      category: "Forensics",
      releaseAt: b1Release,
      closeAt: b1Close,
      batchNumber: 1,
      answerMode: "TRIMMED",
      order: 4,
    },
    {
      roundId: round1.id,
      title: "Q05 — Cookie Tampering & Privilege Escalation",
      description: "A session cookie contains JSON encoded in base64: `eyJ1c2VyIjoiZ3Vlc3QiLCJyb2xlIjoidXNlciIsImlzQWRtaW4iOmZhbHNlfQ==`. When decoded, `isAdmin` is false. Changing `isAdmin` to `true` and re-encoding produces: `eyJ1c2VyIjoiZ3Vlc3QiLCJyb2xlIjoidXNlciIsImlzQWRtaW4iOnRydWV9`. Submitting this cookie yields the administrative token flag.",
      answer: "CC{cookie_tampering_admin_priv_escalated}",
      points: 200,
      firstBloodBonus: 75,
      difficulty: "HARD",
      category: "Web Security",
      releaseAt: b1Release,
      closeAt: b1Close,
      batchNumber: 1,
      answerMode: "TRIMMED",
      order: 5,
    },

    // Batch 2 (Upcoming / Next 30 mins)
    {
      roundId: round1.id,
      title: "Q06 — DNS Tunneling Hex Beacon",
      description: "PCAP inspection of compromised DNS queries reveals sub-domain data exfiltration: `43437b646e735f74756e6e656c696e675f657866696c74726174696f6e7d.c2.corp`. Decode the hex sub-domain to reveal the captured exfiltration flag.",
      answer: "CC{dns_tunneling_exfiltration}",
      points: 100,
      firstBloodBonus: 50,
      difficulty: "EASY",
      category: "Network Security",
      releaseAt: b2Release,
      closeAt: b2Close,
      batchNumber: 2,
      answerMode: "TRIMMED",
      order: 6,
    },
    {
      roundId: round1.id,
      title: "Q07 — Stack Buffer Overflow Return Hijack",
      description: "A 32-bit x86 vulnerable binary overflows a 64-byte buffer. Overwriting EIP with target address `0x080485c2` redirects execution to `win()` function. What system access flag is retrieved?",
      answer: "CC{stack_bof_eip_hijack_ret2win}",
      points: 200,
      firstBloodBonus: 75,
      difficulty: "HARD",
      category: "Reverse Engineering",
      releaseAt: b2Release,
      closeAt: b2Close,
      batchNumber: 2,
      answerMode: "TRIMMED",
      order: 7,
    },
    {
      roundId: round1.id,
      title: "Q08 — Morse Code Spectrogram Extraction",
      description: "Audio frequency spectrogram inspection of `beacon.wav` reveals rhythmic high-pitched pulses corresponding to: `-.-. -.-. -.-- -- --- ..- ..-. --- ..- -. -.. -- .`. Translate the morse code to plaintext flag.",
      answer: "CC{YOUFOUNDME}",
      points: 150,
      firstBloodBonus: 50,
      difficulty: "MEDIUM",
      category: "Forensics",
      releaseAt: b2Release,
      closeAt: b2Close,
      batchNumber: 2,
      answerMode: "TRIMMED",
      order: 8,
    },
    {
      roundId: round1.id,
      title: "Q09 — Reverse Keygen XOR Decryption",
      description: "A proprietary software binary checks licenses via: `input[i] ^ 0x42 == [0x01, 0x01, 0x39, 0x36, 0x73, 0x70, 0x76, 0x77, 0x3d]`. Reverse the XOR operation with key `0x42` to determine the valid license flag.",
      answer: "CC{14rvwt}",
      points: 150,
      firstBloodBonus: 50,
      difficulty: "MEDIUM",
      category: "Reverse Engineering",
      releaseAt: b2Release,
      closeAt: b2Close,
      batchNumber: 2,
      answerMode: "TRIMMED",
      order: 9,
    },
    {
      roundId: round1.id,
      title: "Q10 — Path Traversal LFI in Report Engine",
      description: "A PDF report download parameter is manipulated: `GET /report?file=../../../../etc/shadow`. The root hash field contains an injected comment flag. What is the leaked flag string?",
      answer: "CC{path_traversal_lfi_shadow_leak}",
      points: 200,
      firstBloodBonus: 75,
      difficulty: "HARD",
      category: "Web Security",
      releaseAt: b2Release,
      closeAt: b2Close,
      batchNumber: 2,
      answerMode: "TRIMMED",
      order: 10,
    },

    // Batch 3 (Batch 3)
    {
      roundId: round1.id,
      title: "Q11 — RSA Low Public Exponent e=3",
      description: "An encrypted confidential broadcast used standard RSA with low public exponent e=3 and modulus N > m^3. Since no padding was applied, taking the direct integer cube root of ciphertext c decrypts the secret flag.",
      answer: "CC{rsa_e3_cube_root_unpadded_leak}",
      points: 150,
      firstBloodBonus: 50,
      difficulty: "MEDIUM",
      category: "Cryptography",
      releaseAt: b3Release,
      closeAt: b3Close,
      batchNumber: 3,
      answerMode: "TRIMMED",
      order: 11,
    },
    {
      roundId: round1.id,
      title: "Q12 — JWT Algorithm Confusion RS256 to HS256",
      description: "An API accepts RS256 JWT tokens. If an attacker changes the header to `{\"alg\":\"HS256\"}` and signs the payload using the publicly exposed RSA PEM public key as HMAC secret, what flag is granted upon admin endpoint access?",
      answer: "CC{jwt_alg_confusion_rs256_to_hs256}",
      points: 200,
      firstBloodBonus: 75,
      difficulty: "HARD",
      category: "Web Security",
      releaseAt: b3Release,
      closeAt: b3Close,
      batchNumber: 3,
      answerMode: "TRIMMED",
      order: 12,
    },
    {
      roundId: round1.id,
      title: "Q13 — Volatility LSASS Memory Dump Analysis",
      description: "Analysis of a forensic RAM dump `mem.dmp` using Volatility extracts plaintext Kerberos ticket credentials from the LSASS process space. What credential flag was recovered?",
      answer: "CC{volatility_lsass_kerberos_ticket_dumped}",
      points: 200,
      firstBloodBonus: 75,
      difficulty: "HARD",
      category: "Forensics",
      releaseAt: b3Release,
      closeAt: b3Close,
      batchNumber: 3,
      answerMode: "TRIMMED",
      order: 13,
    },
    {
      roundId: round1.id,
      title: "Q14 — REST API Insecure Direct Object Reference (IDOR)",
      description: "A customer portal queries `GET /api/v2/invoices/10482`. By iterating backwards to `invoiceId=1`, an unauthenticated financial invoice belonging to the CEO is accessed containing the audit flag.",
      answer: "CC{idor_rest_api_broken_object_auth}",
      points: 100,
      firstBloodBonus: 50,
      difficulty: "EASY",
      category: "Web Security",
      releaseAt: b3Release,
      closeAt: b3Close,
      batchNumber: 3,
      answerMode: "TRIMMED",
      order: 14,
    },
    {
      roundId: round1.id,
      title: "Q15 — Blind Command Injection in Ping Diagnostic",
      description: "A router web admin interface executes `/bin/ping -c 1 $host`. Injecting `127.0.0.1; cat /secret/flag.txt` triggers an arbitrary command execution vulnerability printing the flag.",
      answer: "CC{rce_blind_cmd_injection_pipe_pwned}",
      points: 250,
      firstBloodBonus: 100,
      difficulty: "HARD",
      category: "Web Security",
      releaseAt: b3Release,
      closeAt: b3Close,
      batchNumber: 3,
      answerMode: "TRIMMED",
      order: 15,
    },
  ];

  for (const q of sampleQuestions) {
    const batchNum = q.batchNumber || Math.ceil(q.order / 5);
    const ansMode = q.answerMode || "TRIMMED";
    await prisma.question.create({
      data: {
        ...q,
        batchNumber: batchNum,
        answerMode: ansMode,
        firstBloodBonus: q.firstBloodBonus || 50,
      },
    });
  }
  console.log(`Created ${sampleQuestions.length} questions for Round 1 across 3 batches.`);

  // 4. Create Round 2: Cyber Auction
  const round2 = await prisma.round.create({
    data: {
      eventId: event.id,
      name: "Round 2 — Cyber Auction",
      number: 2,
      status: "READY",
    },
  });

  const auctionChallenges = [
    {
      roundId: round2.id,
      title: "Challenge #01 — Ghost in the Shell: Linux Kernel Privilege Escalation",
      description: "Target server 10.10.100.22 runs an unpatched Linux service with an exploitable SUID binary. Compromise the root account and obtain root shell proof.",
      basePoints: 200,
      failurePenalty: 100,
      order: 1,
      hints: [
        {
          title: "Hint 1: SUID Enumeration",
          content: "Run `find / -perm -4000 2>/dev/null` and inspect the custom binary located in `/opt/system-monitor`.",
          cost: 40,
          order: 1,
        },
        {
          title: "Hint 2: Insecure System Call",
          content: "The monitor binary executes `system(\"uptime\")` without an absolute path. Inspect environment variable behavior.",
          cost: 80,
          order: 2,
        },
        {
          title: "Hint 3: PATH Hijacking",
          content: "Create a malicious script named `uptime` in `/tmp` that launches `/bin/sh -p`, then prepend `/tmp` to `$PATH`.",
          cost: 120,
          order: 3,
        },
      ],
    },
    {
      roundId: round2.id,
      title: "Challenge #02 — Silent Infiltration: Active Directory Kerberoasting",
      description: "Domain Controller `CORP-DC01` holds ticket-granting service tickets for service accounts with weak passwords. Extract and crack the service account hash.",
      basePoints: 250,
      failurePenalty: 100,
      order: 2,
      hints: [
        {
          title: "Hint 1: SPN Discovery",
          content: "Use `GetUserSPNs.py` from Impacket or PowerView's `Get-DomainUser -SPN` to list all kerberoastable accounts.",
          cost: 50,
          order: 1,
        },
        {
          title: "Hint 2: TGS Requesting",
          content: "Request the Kerberos TGS ticket for the MSSQL service account using `-request` flag.",
          cost: 90,
          order: 2,
        },
        {
          title: "Hint 3: Hashcat Cracking Mode",
          content: "Format the ticket with hashcat mode 13100 (Kerberos 5 TGS-REP etype 23) using the standard wordlist.",
          cost: 140,
          order: 3,
        },
      ],
    },
    {
      roundId: round2.id,
      title: "Challenge #03 — Vault Breaker: Proprietary Firmware Decompilation",
      description: "A captured IoT lock firmware image `firmware.bin` controls physical access to the server room. Decompile the validation algorithm to compute the master unlock code.",
      basePoints: 300,
      failurePenalty: 120,
      order: 3,
      hints: [
        {
          title: "Hint 1: Firmware Extraction",
          content: "Extract the squashfs filesystem using `binwalk -e firmware.bin` and inspect `/usr/bin/lockd`.",
          cost: 60,
          order: 1,
        },
        {
          title: "Hint 2: Cryptographic Routine",
          content: "Open `lockd` in Ghidra/IDA and navigate to the `verify_passcode()` function at offset `0x10450`.",
          cost: 100,
          order: 2,
        },
        {
          title: "Hint 3: Master Key Location",
          content: "The AES-128 key is hardcoded in the `.rodata` segment starting at address `0x00408100`. The initialization vector is 16 null bytes.",
          cost: 150,
          order: 3,
        },
      ],
    },
  ];

  for (const c of auctionChallenges) {
    const { hints, ...challengeData } = c;
    const createdChallenge = await prisma.auctionChallenge.create({
      data: {
        ...challengeData,
        hints: {
          create: hints,
        },
      },
    });
    console.log(`Created Auction Challenge: ${createdChallenge.title}`);
  }

  // 5. Initial Audit Log
  await prisma.auditLog.create({
    data: {
      eventId: event.id,
      actor: "SYSTEM",
      action: "EVENT_INITIALIZED",
      details: "Cipher Chase 2026 initialized with 5 teams, Round 1 (15 questions), and Round 2 (3 challenges).",
    },
  });

  console.log("Database seeded successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
