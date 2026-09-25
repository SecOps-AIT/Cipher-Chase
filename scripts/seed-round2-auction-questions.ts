import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const round2Catalogue = [
  {
    order: 1,
    title: "Target Alpha: Central Bank Swift Gateway Bypass",
    topic: "Network Security",
    outline: "Intercept and tamper with MT103 financial dispatch packets on port 4000 to authorize an administrative withdrawal.",
    description: "An intercepted SWIFT Alliance Lite gateway operates on simulated server 10.20.0.15. Replay and modify an authentic MT103 wire transfer message by recalculating the SHA-256 MAC signature over field 72 (Sender to Receiver Information) to retrieve the vault clearance flag.",
    answer: "CC{swift_mt103_gateway_tampered_authorized}",
    basePoints: 250,
    baseTimeSeconds: 300, // 5:00
    difficulty: "HARD",
    hints: [
      { order: 1, title: "Hint 1: Field 72 Structure", content: "Field 72 contains the line `/REC/AUTH_TOKEN`. Look for how the MAC is computed over the entire block 4.", cost: 30 },
      { order: 2, title: "Hint 2: HMAC Shared Secret", content: "The HMAC key is derived from the banking BIC code concatenated with the session nonce.", cost: 60 }
    ]
  },
  {
    order: 2,
    title: "Target Beta: Biometric Vault Firmware Reverse Engineering",
    topic: "Reverse Engineering",
    outline: "Analyze ARM32 firmware binary `vault_lock.bin` to discover the master PIN and unlock the biometric relay.",
    description: "A captured electronic safe lock controller dumps its Flash memory. Reversing the ARM32 binary in Ghidra reveals a custom non-linear feedback shift register (LFSR) used to authenticate the 8-digit supervisor PIN.",
    answer: "CC{arm32_lfsr_biometric_vault_cracked}",
    basePoints: 300,
    baseTimeSeconds: 360, // 6:00
    difficulty: "HARD",
    hints: [
      { order: 1, title: "Hint 1: Architecture", content: "Load the file as ARM Little Endian with base address 0x08000000.", cost: 40 },
      { order: 2, title: "Hint 2: Validation Subroutine", content: "Inspect function `validate_pin()` at offset 0x08001240. The taps for the LFSR are at bits 16, 14, 13, and 11.", cost: 80 }
    ]
  },
  {
    order: 3,
    title: "Target Gamma: Active Directory Golden Ticket Forgery",
    topic: "Windows Security",
    outline: "Extract the KRBTGT NTLM hash and craft a Golden Ticket to gain Domain Controller privileges.",
    description: "You have compromised a domain member workstation in `VAULT.CORP`. With local administrator privileges, dump LSASS to obtain the KRBTGT hash, then synthesize a TGS ticket granting Domain Admin rights to access `\\CORP-DC\\Flags\\flag.txt`.",
    answer: "CC{golden_ticket_krbtgt_domain_conquered}",
    basePoints: 250,
    baseTimeSeconds: 270, // 4:30
    difficulty: "MEDIUM",
    hints: [
      { order: 1, title: "Hint 1: Ticket Forging Tool", content: "Use `mimikatz` `kerberos::golden` or `impacket-ticketer` with domain SID S-1-5-21-382910.", cost: 30 },
      { order: 2, title: "Hint 2: Target Path", content: "Mount the administrative C$ share using the forged ticket in your Kerberos cache.", cost: 60 }
    ]
  },
  {
    order: 4,
    title: "Target Delta: Blind SQL Injection on Transaction Ledger",
    topic: "Web Security",
    outline: "Exploit a Boolean-blind SQL injection in `/api/ledger/query` to exfiltrate the CEO's secret offshore account.",
    description: "The financial ledger search engine evaluates: `SELECT * FROM transfers WHERE reference = '$input'`. The application returns differing status headers on TRUE vs FALSE conditions. Exfiltrate the encrypted authorization flag character-by-character.",
    answer: "CC{boolean_blind_ledger_exfil_success}",
    basePoints: 200,
    baseTimeSeconds: 240, // 4:00
    difficulty: "MEDIUM",
    hints: [
      { order: 1, title: "Hint 1: Binary Search", content: "Use `ASCII(SUBSTRING((SELECT flag FROM secrets), {pos}, 1)) > {mid}` for log2(N) extraction speed.", cost: 25 },
      { order: 2, title: "Hint 2: Scripting", content: "Write a small python script with `requests.Session()` to extract the 36-character flag in under 30 seconds.", cost: 50 }
    ]
  },
  {
    order: 5,
    title: "Target Epsilon: Linux Kernel eBPF Rootkit Extraction",
    topic: "Systems Security",
    outline: "Detect and extract a malicious kernel eBPF probe intercepting credentials on `sys_enter_execve`.",
    description: "A rogue operator installed an eBPF tracepoint rootkit hiding in the kernel ring buffer. Dump the pinned BPF maps in `/sys/fs/bpf` and reverse the ringbuffer parser to recover the captured credentials.",
    answer: "CC{ebpf_ringbuf_stealth_rootkit_neutralized}",
    basePoints: 300,
    baseTimeSeconds: 330, // 5:30
    difficulty: "HARD",
    hints: [
      { order: 1, title: "Hint 1: BPF Tooling", content: "Run `bpftool map dump pinned /sys/fs/bpf/vault_audit_map`.", cost: 40 },
      { order: 2, title: "Hint 2: Byte Order", content: "The credential string is encoded as an array of 64-bit unsigned integers in big-endian order.", cost: 80 }
    ]
  },
  {
    order: 6,
    title: "Target Zeta: Satellite Uplink Demodulation & Decryption",
    topic: "Radio & Signal",
    outline: "Demodulate an I/Q raw signal file `downlink.raw` modulated via QPSK at 10.5MHz to recover the transmission.",
    description: "Interception of an emergency satellite relay recorded raw complex float32 I/Q samples. Recover the symbol clock, perform Carrier Frequency Offset (CFO) compensation, and extract the ASCII payload stream containing the flight clearance flag.",
    answer: "CC{qpsk_satellite_downlink_demod_ok}",
    basePoints: 250,
    baseTimeSeconds: 300, // 5:00
    difficulty: "MEDIUM",
    hints: [
      { order: 1, title: "Hint 1: Constellation", content: "The constellation is 4-QAM / QPSK with symbol rate 125,000 baud.", cost: 30 },
      { order: 2, title: "Hint 2: Python / GNU Radio", content: "Use `scipy.signal` Costas loop for carrier sync and differential decoding.", cost: 60 }
    ]
  },
  {
    order: 7,
    title: "Target Eta: SCADA PLC Memory Buffer Overflow",
    topic: "ICS / SCADA",
    outline: "Craft a malicious Modbus TCP function payload to trigger a stack overflow in the cooling valve controller.",
    description: "The primary vault power plant is governed by an embedded Modbus PLC on port 502. Sending custom function code `0x48` with a payload of 128 bytes overwrites the return address to trigger emergency override subroutine `0x00010040`.",
    answer: "CC{modbus_plc_scada_overflow_bypassed}",
    basePoints: 300,
    baseTimeSeconds: 360, // 6:00
    difficulty: "HARD",
    hints: [
      { order: 1, title: "Hint 1: Modbus Framing", content: "MBAP header consists of Transaction ID (2B), Protocol ID (2B=0), Length (2B), Unit ID (1B).", cost: 40 },
      { order: 2, title: "Hint 2: ROP Chain", content: "No ASLR is enabled on the microcontroller. Send 72 bytes padding + target PC address.", cost: 80 }
    ]
  },
  {
    order: 8,
    title: "Target Theta: OAuth2 Redirection Token Hijacking",
    topic: "Web Security",
    outline: "Exploit an open redirect in `/auth/callback` to leak the bearer token of the security chief.",
    description: "The single-sign-on implementation validates `redirect_uri` using an insecure regex `https://vault\\.corp/.*`. Supplying `https://vault.corp.attacker.io/callback` bypasses the check, dumping the authorization code to an external logger.",
    answer: "CC{oauth2_redirect_regex_flaw_token_stolen}",
    basePoints: 200,
    baseTimeSeconds: 210, // 3:30
    difficulty: "EASY",
    hints: [
      { order: 1, title: "Hint 1: Regex Unescaped Dot", content: "Notice how unescaped dots in domain regex match any character or subdomains.", cost: 25 },
      { order: 2, title: "Hint 2: Code Exchange", content: "Exchange the captured authorization code at `/oauth/token` to receive the admin flag.", cost: 50 }
    ]
  },
  {
    order: 9,
    title: "Target Iota: Ransomware Decryption Key Recovery via Memory Dump",
    topic: "Forensics",
    outline: "Recover the AES-256 round keys from an unzeroed RAM dump of the encryption process.",
    description: "The vault backup database was targeted by an encryptor malware. The attacker process `cryptsvc.exe` was frozen prior to termination. Extract the AES key expansion schedule from memory using AESKeyfind to decrypt the critical flag backup.",
    answer: "CC{aes_round_key_schedule_memory_recovered}",
    basePoints: 250,
    baseTimeSeconds: 270, // 4:30
    difficulty: "MEDIUM",
    hints: [
      { order: 1, title: "Hint 1: Memory Carving", content: "Use `aeskeyfind` or Volatility `yarascan` with AES S-box constant patterns.", cost: 30 },
      { order: 2, title: "Hint 2: Cipher Mode", content: "The encrypted file `backup.enc` uses AES-256-GCM. The first 12 bytes are the IV.", cost: 60 }
    ]
  },
  {
    order: 10,
    title: "Target Kappa: Smart Contract Reentrancy Vault Drain",
    topic: "Blockchain / Web3",
    outline: "Deploy an attacking contract to recursively drain the Solidity vault contract before balance updates.",
    description: "The decentralized treasury contract `VaultBank.sol` features an insecure withdrawal function: `msg.sender.call{value: bal}(\"\")` called before `balances[msg.sender] = 0`. Deploy a fallback receiver to drain the contract balance and claim the bounty flag.",
    answer: "CC{reentrancy_fallback_contract_drained_bank}",
    basePoints: 250,
    baseTimeSeconds: 240, // 4:00
    difficulty: "MEDIUM",
    hints: [
      { order: 1, title: "Hint 1: Fallback Hook", content: "In your attacking contract, implement `receive() external payable` to re-call `withdraw()`.", cost: 30 },
      { order: 2, title: "Hint 2: Gas Limit", content: "Ensure your attacking transaction supplies at least 200,000 gas to support 5 recursive iterations.", cost: 60 }
    ]
  },
  {
    order: 11,
    title: "Target Lambda: JWT Public Key Forgery via JWKS Injection",
    topic: "API Security",
    outline: "Point the JWT validator `jku` header to an attacker-controlled JSON Web Key Set to forge tokens.",
    description: "The authentication microservice trusts the `jku` (JSON Web Key Set URL) header in JWT tokens without domain whitelist validation. Host your own RSA key set, sign a token with role `vault_master`, and claim root API access.",
    answer: "CC{jwks_jku_injection_token_forgery}",
    basePoints: 200,
    baseTimeSeconds: 210, // 3:30
    difficulty: "EASY",
    hints: [
      { order: 1, title: "Hint 1: Key Generation", content: "Generate an RSA 2048 keypair, export JWK with fields `kty`, `n`, `e`, and matching `kid`.", cost: 25 },
      { order: 2, title: "Hint 2: Header Payload", content: "Set header `{\"alg\":\"RS256\",\"typ\":\"JWT\",\"jku\":\"http://attacker.com/jwks.json\",\"kid\":\"key-1\"}`.", cost: 50 }
    ]
  },
  {
    order: 12,
    title: "Target Mu: Zero-Day Deserialization in Java RMI Service",
    topic: "Binary Exploitation",
    outline: "Exploit unsafe deserialization in Java RMI Registry on port 1099 using CommonCollections gadgets.",
    description: "An internal management daemon exposes a Java RMI registry endpoint. Utilizing ysoserial with the `CommonsCollections6` gadget chain allows arbitrary command execution to read the vault flag stored at `/root/flag.txt`.",
    answer: "CC{java_rmi_commons_collections_gadget_pwn}",
    basePoints: 300,
    baseTimeSeconds: 330, // 5:30
    difficulty: "HARD",
    hints: [
      { order: 1, title: "Hint 1: Payload Construction", content: "Use `ysoserial.jar CommonsCollections6 'cat /root/flag.txt' > payload.bin`.", cost: 40 },
      { order: 2, title: "Hint 2: Delivery", content: "Send the payload directly to the RMI endpoint using `RemoteObjectInvocationHandler`.", cost: 80 }
    ]
  },
  {
    order: 13,
    title: "Target Nu: Cloud IAM Role Privilege Escalation via SSRF",
    topic: "Cloud Security",
    outline: "Query the AWS EC2 Instance Metadata Service (IMDS) at `169.254.169.254` through a web proxy flaw.",
    description: "The internal webhook test utility allows querying user-defined URLs. Exploiting SSRF against the cloud metadata service `http://169.254.169.254/latest/meta-data/iam/security-credentials/VaultAccessRole` retrieves temporary STS tokens with full S3 administrative rights.",
    answer: "CC{ssrf_imds_cloud_role_escalation_vault}",
    basePoints: 200,
    baseTimeSeconds: 240, // 4:00
    difficulty: "MEDIUM",
    hints: [
      { order: 1, title: "Hint 1: IMDS Path", content: "Query `iam/security-credentials/` first to find the assigned IAM role name.", cost: 25 },
      { order: 2, title: "Hint 2: S3 Retrieval", content: "Configure the returned `AccessKeyId`, `SecretAccessKey`, and `Token` to download `s3://secure-vault-bucket/flag.txt`.", cost: 50 }
    ]
  },
  {
    order: 14,
    title: "Target Xi: USB Keystroke Injection Forensic Reconstruction",
    topic: "Hardware / Forensics",
    outline: "Reconstruct plaintext credentials from intercepted USB HID packet descriptors and keystroke codes.",
    description: "A surveillance camera captured a Rubber Ducky USB attack. Raw Wireshark USB capture `hid_keystrokes.pcap` recorded all HID interrupt transfers. Map the USB Usage IDs (Usage Page 7) back to ASCII characters to discover the typed supervisor password.",
    answer: "CC{usb_hid_keystroke_pcap_reconstructed}",
    basePoints: 200,
    baseTimeSeconds: 240, // 4:00
    difficulty: "MEDIUM",
    hints: [
      { order: 1, title: "Hint 1: HID Protocol", content: "Each 8-byte HID report has modifier keys in byte 0 and keypress scan codes in bytes 2-7.", cost: 25 },
      { order: 2, title: "Hint 2: Parser", content: "Parse using `tshark -r hid_keystrokes.pcap -T fields -e usb.capdata` and translate using USB HID table.", cost: 50 }
    ]
  },
  {
    order: 15,
    title: "Target Omicron: DNSSEC Cryptographic Key Tag Validation Failure",
    topic: "Cryptography",
    outline: "Exploit a colliding Key Tag in a weak RRSIG signature to spoof authoritative records for the vault.",
    description: "The DNSSEC resolver uses an obsolete 16-bit CRC algorithm for DS key tagging. Generate a colliding public key that yields the exact same key tag value `0x4A1F` to forge an authenticated IP address for `vault.bank.internal`.",
    answer: "CC{dnssec_key_tag_collision_record_spoofed}",
    basePoints: 250,
    baseTimeSeconds: 270, // 4:30
    difficulty: "MEDIUM",
    hints: [
      { order: 1, title: "Hint 1: Birthday Bound", content: "With a 16-bit tag, only ~256 iterations are needed to find a matching tag via birthday attack.", cost: 30 },
      { order: 2, title: "Hint 2: Algorithm", content: "RFC 4034 Appendix B provides the exact C implementation of the DNSSEC Key Tag algorithm.", cost: 60 }
    ]
  },
  {
    order: 16,
    title: "Target Pi: Android KeyStore Master Key Extraction",
    topic: "Mobile Security",
    outline: "Bypass Android KeyStore biometric authentication using Frida runtime instrumentation on `BiometricPrompt`.",
    description: "The mobile vault app `VaultKey.apk` gates hardware key retrieval behind `BiometricPrompt.AuthenticationCallback.onAuthenticationSucceeded()`. Hook the callback using Frida to force the method invocation and exfiltrate the decrypted master seed.",
    answer: "CC{frida_hook_biometric_keystore_bypassed}",
    basePoints: 250,
    baseTimeSeconds: 300, // 5:00
    difficulty: "HARD",
    hints: [
      { order: 1, title: "Hint 1: Frida Script", content: "Overload `onAuthenticationSucceeded(BiometricPrompt.AuthenticationResult)`.", cost: 30 },
      { order: 2, title: "Hint 2: CryptoObject", content: "Extract `result.getCryptoObject().getCipher()` and call `doFinal()` on the encrypted seed payload.", cost: 60 }
    ]
  },
  {
    order: 17,
    title: "Target Rho: WebAssembly Memory Leak & Stack Smashing",
    topic: "Reverse Engineering",
    outline: "Analyze a compiled `.wasm` cryptography validator module to exploit a buffer overflow in linear memory.",
    description: "The client-side browser portal executes security validation inside `vault_calc.wasm`. Inspecting linear memory reveals that user input is copied via `memory.copy` into a fixed 64-byte segment. Overwriting the function table pointer redirects execution to the secret reveal function.",
    answer: "CC{wasm_linear_memory_call_indirect_hijack}",
    basePoints: 250,
    baseTimeSeconds: 300, // 5:00
    difficulty: "HARD",
    hints: [
      { order: 1, title: "Hint 1: Wasm2wat", content: "Convert binary wasm to WebAssembly text format using `wasm2wat vault_calc.wasm`.", cost: 30 },
      { order: 2, title: "Hint 2: Table Index", content: "Function `call_indirect` looks up the table at index 3. Overwrite table index with 7 to trigger `reveal_flag`.", cost: 60 }
    ]
  },
  {
    order: 18,
    title: "Target Sigma: Border Gateway Protocol (BGP) Route Leak Spoofing",
    topic: "Network Security",
    outline: "Hijack the autonomous system (AS) path by announcing a more specific `/24` prefix to intercept vault traffic.",
    description: "A misconfigured BGP peering session on router `CORE-RTR-01` accepts unauthenticated route announcements. Announce prefix `192.168.100.0/24` with AS path prepending to blackhole legitimate traffic and route it through our packet inspection sniffer.",
    answer: "CC{bgp_prefix_hijack_route_leak_intercepted}",
    basePoints: 200,
    baseTimeSeconds: 240, // 4:00
    difficulty: "MEDIUM",
    hints: [
      { order: 1, title: "Hint 1: Longest Prefix Match", content: "A `/24` advertisement takes strict precedence over the existing `/22` aggregate announcement.", cost: 25 },
      { order: 2, title: "Hint 2: Tooling", content: "Use `ExaBGP` or `BIRD` to broadcast the BGP UPDATE packet with origin IGP.", cost: 50 }
    ]
  },
  {
    order: 19,
    title: "Target Tau: Zero-Knowledge Proof Simulation Forgery",
    topic: "Advanced Cryptography",
    outline: "Exploit a missing Fiat-Shamir transformation challenge bound in a zk-SNARK verifier contract.",
    description: "The zero-knowledge authentication scheme fails to bind the public input signals to the transcript hash. By picking random group elements and computing a simulated proof polynomial, you can convince the verifier of identity without possessing the secret key.",
    answer: "CC{fiat_shamir_unbound_zksnark_forged_proof}",
    basePoints: 350,
    baseTimeSeconds: 360, // 6:00
    difficulty: "HARD",
    hints: [
      { order: 1, title: "Hint 1: Public Input", content: "Notice that challenge `e = H(A, B, C)` omits public input `x`. You can choose `C` freely to satisfy the pairing equation.", cost: 50 },
      { order: 2, title: "Hint 2: Pairing Check", content: "e(A, B) = e(Alpha, Beta) * e(x * Gamma, Delta). Verify with py_ecc bn128 pairing library.", cost: 100 }
    ]
  },
  {
    order: 20,
    title: "Target Upsilon: Side-Channel Power Analysis AES Recovery",
    topic: "Hardware Security",
    outline: "Perform Correlation Power Analysis (CPA) on captured oscilloscope power traces of an AES-128 S-Box.",
    description: "An oscilloscope captured 1,000 power consumption traces of an FPGA hardware crypto accelerator executing AES encryption. Using the Hamming Distance power consumption model on the SubBytes output, correlate the power spikes to reveal the 16-byte master key.",
    answer: "CC{cpa_power_trace_hamming_weight_master_key}",
    basePoints: 350,
    baseTimeSeconds: 360, // 6:00
    difficulty: "HARD",
    hints: [
      { order: 1, title: "Hint 1: Power Model", content: "Hypothetical power consumption = HammingWeight(SBox[plaintext ^ key_guess]).", cost: 50 },
      { order: 2, title: "Hint 2: Pearson Correlation", content: "Compute Pearson r between hypothetical power vector and oscilloscope sample points around index 340.", cost: 100 }
    ]
  },
  {
    order: 21,
    title: "Target Phi: Kerberos Unconstrained Delegation Hop",
    topic: "Active Directory",
    outline: "Trigger a printer bug (SpoolSample) RPC call to capture the domain controller's TGT on an unconstrained server.",
    description: "You have compromised a web server configured with `TRUSTED_FOR_DELEGATION`. Send an `RpcRemoteFindFirstPrinterChangeNotificationEx` request to the Domain Controller to compel authentication, extracting the DC machine TGT from memory.",
    answer: "CC{spoolsample_unconstrained_delegation_dc_pwned}",
    basePoints: 250,
    baseTimeSeconds: 270, // 4:30
    difficulty: "MEDIUM",
    hints: [
      { order: 1, title: "Hint 1: Printer Bug", content: "Execute `python dementor.py -u user -p pass 10.0.0.1 10.0.0.2` to trigger the back-connect.", cost: 30 },
      { order: 2, title: "Hint 2: Ticket Extraction", content: "Monitor memory with `Rubeus monitor /interval:1 /targetuser:DC$` to capture the incoming TGT.", cost: 60 }
    ]
  },
  {
    order: 22,
    title: "Target Chi: Kubernetes RBAC Cluster-Admin Escape",
    topic: "Cloud Native",
    outline: "Abuse an over-privileged ServiceAccount token with `impersonate` permissions to achieve full cluster control.",
    description: "Inside a compromised pod, the mounted ServiceAccount token `/var/run/secrets/kubernetes.io/serviceaccount/token` has RBAC permission `verbs: ['impersonate'], resources: ['users', 'groups']`. Impersonate `system:masters` to extract the vault secrets configmap.",
    answer: "CC{k8s_rbac_impersonate_cluster_admin_escaped}",
    basePoints: 300,
    baseTimeSeconds: 300, // 5:00
    difficulty: "HARD",
    hints: [
      { order: 1, title: "Hint 1: Kubectl Impersonate", content: "Execute `kubectl --as=system:admin --as-group=system:masters get secrets -A`.", cost: 40 },
      { order: 2, title: "Hint 2: Secret Decryption", content: "Base64 decode the `flag.data` field inside namespace `vault-production`.", cost: 80 }
    ]
  }
];

async function main() {
  console.log("Seeding Round 2 Auction Questions (22 prepared challenges)...");

  const round2 = await prisma.round.findFirst({
    where: { number: 2 },
  });

  if (!round2) {
    throw new Error("Round 2 not found!");
  }

  console.log(`Targeting Round 2: "${round2.name}" (${round2.id})`);

  let count = 0;
  for (const item of round2Catalogue) {
    const { hints, basePoints, baseTimeSeconds, topic, outline, ...qData } = item;

    // Check if Question already exists in Round 2
    let question = await prisma.question.findFirst({
      where: {
        roundId: round2.id,
        title: item.title,
      },
    });

    if (!question) {
      question = await prisma.question.create({
        data: {
          ...qData,
          roundId: round2.id,
          points: basePoints,
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
      console.log(`Created Question: ${question.title}`);
    }

    // Check if AuctionQuestion exists
    let auctionQ = await prisma.auctionQuestion.findFirst({
      where: {
        roundId: round2.id,
        questionId: question.id,
      },
    });

    if (!auctionQ) {
      auctionQ = await prisma.auctionQuestion.create({
        data: {
          roundId: round2.id,
          questionId: question.id,
          title: item.title,
          topic,
          outline,
          baseTimeSeconds,
          points: basePoints,
          hintPenalty: -10,
          status: "DRAFT",
        },
      });
      console.log(`Created AuctionQuestion: ${auctionQ.title} (${baseTimeSeconds}s, ${basePoints} pts)`);
    }

    count++;
  }

  const totalAQ = await prisma.auctionQuestion.count({
    where: { roundId: round2.id },
  });

  console.log(`Round 2 Auction Catalogue Ready! Total Auction Questions: ${totalAQ}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
