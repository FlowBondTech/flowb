/**
 * Test script for AgentKit wallet on Base network
 *
 * Usage:
 *   npx tsx scripts/test-agentkit.ts
 *
 * Requires env vars (set in .env or export):
 *   CDP_API_KEY_ID          - API key ID from CDP Portal
 *   CDP_API_KEY_SECRET      - API key secret (PEM private key)
 *   CDP_WALLET_SECRET       - Wallet secret for signing
 *   CDP_ACCOUNT_ADDRESS     - (optional) Existing account address
 */

import "dotenv/config";
import {
  AgentKit,
  CdpEvmWalletProvider,
  walletActionProvider,
  erc20ActionProvider,
} from "@coinbase/agentkit";

const USDC_BASE = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";

async function main() {
  console.log("=== AgentKit Wallet Test ===\n");

  // Check credentials
  const apiKeyId = process.env.CDP_API_KEY_ID || process.env.CDP_API_KEY_NAME;
  const apiKeySecret = process.env.CDP_API_KEY_SECRET || process.env.CDP_API_KEY_PRIVATE_KEY;
  const walletSecret = process.env.CDP_WALLET_SECRET;
  const address = process.env.CDP_ACCOUNT_ADDRESS;

  if (!apiKeyId) {
    console.error("Missing CDP_API_KEY_ID (or CDP_API_KEY_NAME)");
    process.exit(1);
  }
  if (!apiKeySecret) {
    console.error("Missing CDP_API_KEY_SECRET (or CDP_API_KEY_PRIVATE_KEY)");
    process.exit(1);
  }
  if (!walletSecret) {
    console.error("Missing CDP_WALLET_SECRET");
    process.exit(1);
  }

  console.log(`API Key ID: ${apiKeyId.slice(0, 8)}...`);
  console.log(`Address: ${address || "(will create new)"}`);
  console.log();

  // 1. Initialize wallet provider
  console.log("1. Initializing CdpEvmWalletProvider on Base...");
  const walletProvider = await CdpEvmWalletProvider.configureWithWallet({
    apiKeyId,
    apiKeySecret,
    walletSecret,
    address: address as `0x${string}` | undefined,
    networkId: "base",
  });

  const walletAddress = walletProvider.getAddress();
  console.log(`   Wallet address: ${walletAddress}`);
  console.log(`   Network: ${walletProvider.getNetwork().networkId}`);
  console.log();

  // 2. Check ETH balance
  console.log("2. Checking ETH balance...");
  const balanceWei = await walletProvider.getBalance();
  const ethBalance = Number(balanceWei) / 1e18;
  console.log(`   ETH balance: ${ethBalance.toFixed(6)} ETH (${balanceWei} wei)`);
  console.log();

  // 3. Check USDC balance
  console.log("3. Checking USDC balance...");
  const provider = erc20ActionProvider();
  try {
    const usdcResult = await provider.getBalance(walletProvider, {
      tokenAddress: USDC_BASE,
    });
    console.log(`   USDC balance: ${usdcResult}`);
  } catch (err: any) {
    console.log(`   USDC balance check error: ${err.message}`);
  }
  console.log();

  // 4. Initialize AgentKit
  console.log("4. Initializing AgentKit...");
  const kit = await AgentKit.from({
    walletProvider,
    actionProviders: [
      walletActionProvider(),
      erc20ActionProvider(),
    ],
  });
  console.log("   AgentKit initialized successfully");
  console.log();

  // 5. Small test transaction (only if --send flag is passed)
  if (process.argv.includes("--send")) {
    console.log("5. Sending test transaction (0.0001 ETH to self)...");
    try {
      const txHash = await walletProvider.nativeTransfer(
        walletAddress as `0x${string}`,
        BigInt(Math.round(0.0001 * 1e18)).toString(),
      );
      console.log(`   TX hash: ${txHash}`);
      console.log(`   View: https://basescan.org/tx/${txHash}`);
    } catch (err: any) {
      console.error(`   Send failed: ${err.message}`);
    }
  } else {
    console.log("5. Skipping test transaction (pass --send to enable)");
  }

  console.log("\n=== Test Complete ===");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
