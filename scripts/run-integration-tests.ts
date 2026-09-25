import { spawnSync } from "node:child_process";

const testDatabaseUrl = process.env.DATABASE_URL_TEST;
if (!testDatabaseUrl) {
  console.error("Set DATABASE_URL_TEST to a dedicated local PostgreSQL test database before running integration tests.");
  process.exit(1);
}

let parsedUrl: URL;
try {
  parsedUrl = new URL(testDatabaseUrl);
} catch {
  console.error("DATABASE_URL_TEST must be a valid PostgreSQL connection URL.");
  process.exit(1);
}

if (!parsedUrl.hostname || !["localhost", "127.0.0.1", "::1"].includes(parsedUrl.hostname)) {
  console.error("Integration tests are restricted to a local database to protect event data.");
  process.exit(1);
}

const result = spawnSync(
  process.platform === "win32" ? "npx.cmd" : "npx",
  ["vitest", "run", "tests/round2-auction.test.ts", "tests/round2-timer.test.ts", "tests/hint-system.test.ts"],
  {
    stdio: "inherit",
    env: {
      ...process.env,
      DATABASE_URL: testDatabaseUrl,
      DIRECT_URL: testDatabaseUrl,
    },
  }
);

process.exit(result.status ?? 1);
