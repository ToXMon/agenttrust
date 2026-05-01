/**
 * Requester Agent Entry Point — Live Demo
 *
 * Starts the requester agent, waits for AXL readiness, then
 * auto-triggers: discoverProvider → requestService (data-analysis
 * of last 10 blocks gas usage on Base Mainnet).
 *
 * All data is REAL — no mocks.
 */

import * as dotenv from "dotenv";
dotenv.config();

import { type Hex } from "viem";
import { RequesterAgent } from "./agent.js";
import type { AgentConfig, ServiceProposal } from "./types.js";

const PRIVATE_KEY = process.env.PRIVATE_KEY as Hex;
const RPC_URL = process.env.RPC_URL ?? "https://mainnet.base.org";
const CHAIN_ID = parseInt(process.env.CHAIN_ID ?? "8453", 10);
const REQUESTER_ENS = process.env.REQUESTER_ENS ?? "requester.agenttrust.eth";
const PROVIDER_ENS = process.env.PROVIDER_ENS ?? "provider.agenttrust.eth";
const AXL_NODE_A_URL = process.env.AXL_NODE_A_URL ?? "http://localhost:9002";

const REQUESTER_PEER_ID =
  "f91e048671228a2c3f79493c59391687f837b27ad58d54ab61f99366863fce22";
const PROVIDER_PEER_ID =
  "5342ef9e91ddf13bf91037714045b563fe2e316213356a5441c749732015c758";

let agent: RequesterAgent | null = null;

async function main(): Promise<void> {
  console.log("[Requester] ========== AgentTrust Requester Agent ==========");
  console.log(`[Requester] ENS:         ${REQUESTER_ENS}`);
  console.log(`[Requester] Chain ID:    ${CHAIN_ID}`);
  console.log(`[Requester] RPC:         ${RPC_URL}`);
  console.log(`[Requester] AXL Node:    ${AXL_NODE_A_URL}`);
  console.log(`[Requester] Provider:    ${PROVIDER_ENS}`);
  console.log("[Requester] ========================================================");

  if (!PRIVATE_KEY) {
    console.error("[Requester] ERROR: PRIVATE_KEY not set in .env");
    process.exit(1);
  }

  const config: AgentConfig = {
    ensName: REQUESTER_ENS,
    privateKey: PRIVATE_KEY,
    rpcUrl: RPC_URL,
    chainId: CHAIN_ID,
    trustThreshold: 0,
    axlNodeUrl: AXL_NODE_A_URL,
  };

  agent = new RequesterAgent(config);

  // Graceful shutdown handlers
  const shutdown = async (signal: string): Promise<void> => {
    console.log(`\n[Requester] Received ${signal}, shutting down gracefully...`);
    if (agent) agent.stop();
    process.exit(0);
  };
  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));

  try {
    // Start agent — registers ENS identity, begins AXL polling
    console.log("[Requester] Starting agent...");
    await agent.start();
    console.log("[Requester] Agent started successfully. AXL polling active.");

    // Wait for AXL mesh to stabilize
    console.log("[Requester] Waiting 5s for AXL mesh readiness...");
    await sleep(5000);

    // Step 1: Discover provider via ENS
    console.log(`\n[Requester] --- Step 1: Discovering provider ${PROVIDER_ENS} ---`);
    const providerRecord = await agent.discoverProvider(PROVIDER_ENS);
    if (!providerRecord) {
      console.warn("[Requester] Provider not found via ENS. Continuing with direct AXL request.");
    } else {
      console.log(`[Requester] Provider discovered: score=${providerRecord.trustScore} caps=[${providerRecord.capabilities.join(",")}]`);
    }

    // Step 2: Send DISCOVER via AXL to let provider introduce itself
    console.log("\n[Requester] --- Step 2: Broadcasting DISCOVER via AXL ---");
    await agent.discoverViaAXL(PROVIDER_PEER_ID);
    console.log("[Requester] DISCOVER sent. Waiting 3s for provider response...");
    await sleep(3000);

    // Step 3: Request service — data-analysis of last 10 blocks
    console.log("\n[Requester] --- Step 3: Requesting data-analysis service ---");
    const proposal: ServiceProposal = {
      serviceType: "data-analysis",
      providerAddress: PROVIDER_ENS,
      amount: "0.001",  // ETH
      token: "ETH",
      deadline: Math.floor(Date.now() / 1000) + 300, // 5 min from now
      description: "Analyze gas usage of last 10 blocks on Base Mainnet. Compute avg gasUsed, avg baseFee, total transactions, and produce a verifiable SHA-256 output hash.",
    };

    const agreement = await agent.requestService(proposal, PROVIDER_PEER_ID);
    if (agreement.accepted) {
      console.log(`[Requester] Service request ACCEPTED. Agreement ID: ${agreement.agreementId?.slice(0, 16)}...`);
    } else {
      console.warn(`[Requester] Service request REJECTED: ${agreement.reason}`);
    }

    // Keep running to receive results
    console.log("\n[Requester] Waiting for service result from provider...");
    console.log("[Requester] (Agent will continue polling AXL for incoming messages)");
    console.log("[Requester] Press Ctrl+C to stop.\n");

    // Report status every 15 seconds
    const statusInterval = setInterval(() => {
      const mem = process.memoryUsage();
      console.log(
        `[Requester] Status: running | RSS: ${(mem.rss / 1024 / 1024).toFixed(1)}MB | Uptime: ${formatUptime(process.uptime())}`,
      );
    }, 15_000);

    // Keep process alive
    await new Promise(() => {}); // never resolves
    clearInterval(statusInterval);
  } catch (err) {
    console.error("[Requester] Fatal error:", err);
    if (agent) agent.stop();
    process.exit(1);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function formatUptime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}m${s}s`;
}

main().catch((err) => {
  console.error("[Requester] Unhandled error:", err);
  process.exit(1);
});
