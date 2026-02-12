/**
 * Test script for FlowB standalone service
 *
 * Run: npm test  (or: npx tsx test.ts)
 */

import "dotenv/config";
import { loadConfig } from "./src/config.js";
import { FlowBCore } from "./src/core/flowb.js";

const config = loadConfig();
const core = new FlowBCore(config);

async function test(name: string, action: string, input: Record<string, any> = {}) {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`TEST: ${name}`);
  console.log(`Action: ${action} | Input: ${JSON.stringify(input)}`);
  console.log("-".repeat(60));

  try {
    const result = await core.execute(action, { action, ...input });
    console.log(result);
  } catch (err) {
    console.error("Error:", err);
  }
}

async function main() {
  console.log("\nFlowB Standalone Test\n");

  const plugins = core.getPluginStatus();
  for (const p of plugins) {
    console.log(`${p.name}: ${p.configured ? "configured" : "not configured"}`);
  }

  // Core
  await test("Help", "help");
  await test("Events (all sources)", "events");
  await test("Events in Denver", "events", { city: "Denver" });

  // DANZ
  await test("DANZ - Join Info", "join");
  await test("DANZ - Signup", "signup", {
    user_id: "telegram_12345",
    platform: "telegram",
    platform_username: "testuser",
  });
  await test("DANZ - Status", "status", {
    user_id: "telegram_12345",
    platform: "telegram",
  });
  await test("DANZ - Verify (koH)", "verify", {
    user_id: "test_user_123",
    danz_username: "koH",
  });
  await test("DANZ - Stats", "stats", { user_id: "test_user_123", platform: "telegram" });
  await test("DANZ - Challenges", "challenges", { platform: "telegram" });
  await test("DANZ - Leaderboard", "leaderboard");

  // eGator
  await test("eGator - Search", "search", { city: "San Francisco" });

  console.log(`\n${"=".repeat(60)}`);
  console.log("All tests completed\n");
}

main().catch(console.error);
