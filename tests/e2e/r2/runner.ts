import { spawn } from "node:child_process";
import path from "node:path";

interface TierResult {
  tier: string;
  name: string;
  file: string;
  tests: number;
  pass: number;
  fail: number;
  durationMs: number;
}

const TIERS = [
  { tier: "Tier 1", name: "Feature Coverage (Features 1-20)", file: "tests/e2e/r2/tier1-features.test.ts" },
  { tier: "Tier 2", name: "Boundary & Corner Cases (Features 1-20)", file: "tests/e2e/r2/tier2-boundaries.test.ts" },
  { tier: "Tier 3", name: "Cross-Feature Combinations (Pairwise)", file: "tests/e2e/r2/tier3-combinations.test.ts" },
  { tier: "Tier 4", name: "Real-World Application Scenarios", file: "tests/e2e/r2/tier4-scenarios.test.ts" },
];

async function runTier(tierConfig: typeof TIERS[0]): Promise<TierResult> {
  const startTime = Date.now();
  const args = [
    "--conditions=react-server",
    "--disable-warning=MODULE_TYPELESS_PACKAGE_JSON",
    "--test",
    "--experimental-strip-types",
    tierConfig.file,
  ];

  return new Promise((resolve) => {
    const proc = spawn("node", args, {
      cwd: process.cwd(),
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    proc.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    proc.on("close", (code) => {
      const durationMs = Date.now() - startTime;
      let tests = 0;
      let pass = 0;
      let fail = 0;

      const testsMatch = stdout.match(/ℹ tests (\d+)/);
      const passMatch = stdout.match(/ℹ pass (\d+)/);
      const failMatch = stdout.match(/ℹ fail (\d+)/);

      if (testsMatch) tests = parseInt(testsMatch[1], 10);
      if (passMatch) pass = parseInt(passMatch[1], 10);
      if (failMatch) fail = parseInt(failMatch[1], 10);

      if (code !== 0 && fail === 0) {
        fail = 1;
        tests = Math.max(tests, 1);
      }

      resolve({
        tier: tierConfig.tier,
        name: tierConfig.name,
        file: tierConfig.file,
        tests,
        pass,
        fail,
        durationMs,
      });
    });
  });
}

async function main() {
  console.log("================================================================================");
  console.log("   InsideJibon Remaster Phase R2: E2E Test Suite Runner (Tiers 1-4)");
  console.log("================================================================================\n");

  const results: TierResult[] = [];
  let totalTests = 0;
  let totalPass = 0;
  let totalFail = 0;
  const overallStart = Date.now();

  for (const t of TIERS) {
    process.stdout.write(`Executing ${t.tier}: ${t.name}... `);
    const res = await runTier(t);
    results.push(res);
    totalTests += res.tests;
    totalPass += res.pass;
    totalFail += res.fail;
    if (res.fail === 0) {
      console.log(`PASS (${res.pass}/${res.tests} in ${res.durationMs}ms)`);
    } else {
      console.log(`FAIL (${res.fail} failed, ${res.pass}/${res.tests} passed in ${res.durationMs}ms)`);
    }
  }

  const overallDuration = Date.now() - overallStart;

  console.log("\n--------------------------------------------------------------------------------");
  console.log("  Summary Table");
  console.log("--------------------------------------------------------------------------------");
  console.log("| Tier   | Description                             | Tests | Pass | Fail | Time   |");
  console.log("|--------|-----------------------------------------|-------|------|------|--------|");
  for (const r of results) {
    const padTier = r.tier.padEnd(6);
    const padDesc = r.name.padEnd(39);
    const padTests = String(r.tests).padStart(5);
    const padPass = String(r.pass).padStart(4);
    const padFail = String(r.fail).padStart(4);
    const padTime = `${r.durationMs}ms`.padStart(6);
    console.log(`| ${padTier} | ${padDesc} | ${padTests} | ${padPass} | ${padFail} | ${padTime} |`);
  }
  console.log("--------------------------------------------------------------------------------");
  console.log(`TOTAL: ${totalTests} tests across ${TIERS.length} tiers | PASS: ${totalPass} | FAIL: ${totalFail} | Time: ${overallDuration}ms\n`);

  if (totalFail > 0) {
    console.error("Test Suite execution completed with FAILURES.");
    process.exit(1);
  } else {
    console.log("All 4 Tiers PASSED cleanly with 100% success rate.");
    process.exit(0);
  }
}

main().catch((err) => {
  console.error("Fatal test runner error:", err);
  process.exit(1);
});
