/**
 * Provider Agent Entry Point — Live Demo
 *
 * Starts the provider agent, registers ENS identity, and waits
 * for incoming service requests via AXL. All computation is REAL —
 * fetches live Base Mainnet blocks and produces verifiable hashes.
 */

import * as dotenv from "dotenv";
dotenv.config();

import { type Hex } from "viem";
import { ProviderAgent } from "./agent.js";

const PRIVATE_KEY = process.env.PRIVATE_KEY as Hex;
const RPC_URL = process.env.RPC_URL ?? "https://mainnet.base.org";
const CHAIN_ID = parseInt(process.env.CHAIN_ID ?? "8453", 10);
const PROVIDER_ENS = process.env.PROVIDER_ENS ?? "provider.agenttrust.eth";
const AXL_NODE_B_URL = process.env.AXL_NODE_B_URL ?? "http://localhost:9012";

let agent: ProviderAgent | null = null;

async function main(): Promise<void> {
  console.log("[Provider] ========== AgentTrust Provider Agent ==========");
  console.log(`[Provider] ENS:         ${PROVIDER_ENS}`);
  console.log(`[Provider] Chain ID:    ${CHAIN_ID}`);
  console.log(`[Provider] RPC:         ${RPC_URL}`);
  console.log(`[Provider] AXL Node:    ${AXL_NODE_B_URL}`);
  console.log("[Provider] ========================================================");

  if (!PRIVATE_KEY) {
    console.error("[Provider] ERROR: PRIVATE_KEY not set in .env");
    process.exit(1);
  }

  agent = new ProviderAgent({
    ensName: PROVIDER_ENS,
    privateKey: PRIVATE_KEY,
    rpcUrl: RPC_URL,
    chainId: CHAIN_ID,
    axlNodeUrl: AXL_NODE_B_URL,
  });

  // Graceful shutdown handlers
  const shutdown = async (signal: string): Promise<void> => {
    console.log(`\n[Provider] Received ${signal}, shutting down gracefully...`);
    if (agent) {
      console.log(`[Provider] Services completed: ${agent.getCompletedCount()}`);
      agent.stop();
    }
    process.exit(0);
  };
  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));

  try {
    // Start agent — registers ENS identity, begins AXL polling
    console.log("[Provider] Starting agent...");
    await agent.start();
    console.log("[Provider] Agent started successfully.");
    console.log("[Provider] Provider agent running, waiting for requests...\n");

    // Report completed service count every 10 seconds
    const reportInterval = setInterval(() => {
      const completed = agent!.getCompletedCount();
      const mem = process.memoryUsage();
      console.log(
        `[Provider] Status: running | Services completed: ${completed} | RSS: ${(mem.rss / 1024 / 1024).toFixed(1)}MB | Uptime: ${formatUptime(process.uptime())}`,
      );
    }, 10_000);

    // Keep process alive
    await new Promise(() => {}); // never resolves
    clearInterval(reportInterval);
  } catch (err) {
    console.error("[Provider] Fatal error:", err);
    if (agent) agent.stop();
    process.exit(1);
  }
}

function formatUptime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}m${s}s`;
}

main().catch((err) => {
  console.error("[Provider] Unhandled error:", err);
  process.exit(1);
});
