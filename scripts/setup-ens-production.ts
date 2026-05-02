/**
 * Production ENS Setup — Sets text records on agentrust.base.eth
 *
 * Phases:
 *  0. Create subnames (requester, provider, explorer) via BasenameRegistry
 *  1. Parent name text records (url, description, com.github)
 *  2. Requester agent text records
 *  3. Provider agent text records
 *  4. Explorer subname text records
 *  5. Verification
 *
 * Usage: npx tsx scripts/setup-ens-production.ts
 */
import * as dotenv from "dotenv";
dotenv.config({ path: ".env" });

import type { Hex } from "viem";
import { createPublicClient, createWalletClient, http } from "viem";
import { base } from "viem/chains";
import { namehash, normalize, labelhash } from "viem/ens";
import { privateKeyToAccount } from "viem/accounts";

const L2_RESOLVER = "0xC6d566A56A1aFf6508b41f6c90ff131615583BCD" as Hex;
const BASENAME_REGISTRY = "0xb94704422c2a1e396835a571837aa5ae53285a95" as Hex;

const RESOLVER_ABI = [
  { name: "addr", type: "function", stateMutability: "view", inputs: [{ name: "node", type: "bytes32" }], outputs: [{ name: "", type: "address" }] },
  { name: "text", type: "function", stateMutability: "view", inputs: [{ name: "node", type: "bytes32" }, { name: "key", type: "string" }], outputs: [{ name: "", type: "string" }] },
  { name: "setText", type: "function", stateMutability: "nonpayable", inputs: [{ name: "node", type: "bytes32" }, { name: "key", type: "string" }, { name: "value", type: "string" }], outputs: [] },
] as const;

const REGISTRY_ABI = [
  { name: "setSubnodeOwner", type: "function", stateMutability: "nonpayable", inputs: [{ name: "node", type: "bytes32" }, { name: "label", type: "bytes32" }, { name: "owner", type: "address" }], outputs: [{ name: "", type: "bytes32" }] },
] as const;

const PARENT = "agentrust.base.eth";
const SUBNAMES = ["requester", "provider", "explorer"];

const FRONTEND_URL = process.env.FRONTEND_URL || "https://agentrust.xyz";
const AXL_ALPHA = process.env.AXL_ALPHA_ENDPOINT || "axl://localhost:9002";
const AXL_BETA = process.env.AXL_BETA_ENDPOINT || "axl://localhost:9012";

const DELAY_MS = 4000; // 4 seconds between txs to avoid nonce/rate issues

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  const rawPK = process.env.PRIVATE_KEY!;
  if (!rawPK) { console.error("ERROR: PRIVATE_KEY not set"); process.exit(1); }
  const pk = (rawPK.startsWith("0x") ? rawPK : "0x" + rawPK) as Hex;
  const account = privateKeyToAccount(pk);

  const publicClient = createPublicClient({ chain: base, transport: http() });
  const walletClient = createWalletClient({ account, chain: base, transport: http() });

  console.log("══════════════════════════════════════════════════");
  console.log(" AgentTrust — Production ENS Setup");
  console.log(" Wallet:", account.address);
  console.log(" Parent:", PARENT);
  console.log("══════════════════════════════════════════════════\n");

  const balance = await publicClient.getBalance({ address: account.address });
  console.log("Balance:", (Number(balance) / 1e18).toFixed(6), "ETH\n");

  // ── Phase 0: Create subnames ──────────────────────────────
  console.log("[Phase 0] Creating subnames under", PARENT);
  const parentNode = namehash(normalize(PARENT));
  for (const label of SUBNAMES) {
    try {
      const labelNode = labelhash(label);
      const { request } = await publicClient.simulateContract({
        address: BASENAME_REGISTRY,
        abi: REGISTRY_ABI,
        functionName: "setSubnodeOwner",
        args: [parentNode, labelNode, account.address],
        account,
      });
      const tx = await walletClient.writeContract(request);
      console.log(`  ✅ ${label}.${PARENT} — tx: ${tx}`);
      await publicClient.waitForTransactionReceipt({ hash: tx });
      await sleep(DELAY_MS);
    } catch (err: any) {
      const msg = err.message?.slice(0, 200) || String(err);
      if (msg.includes("ERC6031") || msg.includes("not owned")) {
        console.log(`  ⏭️  ${label}.${PARENT} — may already exist or registry restricted: ${msg.slice(0, 100)}`);
      } else {
        console.error(`  ❌ ${label}.${PARENT}: ${msg}`);
      }
    }
  }

  // Helper: set a text record and wait for confirmation
  async function setText(name: string, key: string, value: string): Promise<boolean> {
    try {
      const node = namehash(normalize(name));
      const { request } = await publicClient.simulateContract({
        address: L2_RESOLVER,
        abi: RESOLVER_ABI,
        functionName: "setText",
        args: [node, key, value],
        account,
      });
      const tx = await walletClient.writeContract(request);
      await publicClient.waitForTransactionReceipt({ hash: tx });
      console.log(`  ✅ ${name} ${key}=${value} (tx: ${tx})`);
      await sleep(DELAY_MS);
      return true;
    } catch (err: any) {
      console.error(`  ❌ ${name} ${key}: ${err.shortMessage || err.message?.slice(0, 150)}`);
      await sleep(DELAY_MS);
      return false;
    }
  }

  // ── Phase 1: Parent text records ─────────────────────────
  console.log("\n[Phase 1] Parent text records on", PARENT);
  await setText(PARENT, "url", FRONTEND_URL);
  await setText(PARENT, "description", "AgentTrust — Verifiable Agent Commerce Protocol");
  await setText(PARENT, "com.github", "https://github.com/ToXMon/agentrust");

  // ── Phase 2: Requester agent ──────────────────────────────
  const requester = `requester.${PARENT}`;
  console.log("\n[Phase 2] Requester agent on", requester);
  await setText(requester, "agent.type", "requester");
  await setText(requester, "agent.capabilities", JSON.stringify(["research", "analysis", "data-fetching"]));
  await setText(requester, "agent.endpoint", AXL_ALPHA);
  await setText(requester, "agent.status", "active");
  await setText(requester, "agent.pricing", "0.0005 ETH per analysis");

  // ── Phase 3: Provider agent ───────────────────────────────
  const provider = `provider.${PARENT}`;
  console.log("\n[Phase 3] Provider agent on", provider);
  await setText(provider, "agent.type", "provider");
  await setText(provider, "agent.capabilities", JSON.stringify(["computation", "verification", "block-analysis"]));
  await setText(provider, "agent.endpoint", AXL_BETA);
  await setText(provider, "agent.status", "active");
  await setText(provider, "agent.pricing", "0.0005 ETH per analysis");

  // ── Phase 4: Explorer dashboard ───────────────────────────
  const explorer = `explorer.${PARENT}`;
  console.log("\n[Phase 4] Explorer dashboard on", explorer);
  await setText(explorer, "agent.type", "dashboard");
  await setText(explorer, "agent.endpoint", FRONTEND_URL);

  // ── Phase 5: Verify ───────────────────────────────────────
  console.log("\n[Phase 5] Verification — reading back records");
  const names = [PARENT, requester, provider, explorer];
  for (const name of names) {
    console.log(`\n  ${name}:`);
    try {
      const node = namehash(normalize(name));
      const addr = await publicClient.readContract({
        address: L2_RESOLVER, abi: RESOLVER_ABI, functionName: "addr", args: [node],
      });
      console.log(`    address: ${addr}`);
    } catch { console.log("    address: (error)"); }
    const keys = ["url", "description", "com.github", "agent.type", "agent.capabilities", "agent.endpoint", "agent.status", "agent.pricing"];
    for (const key of keys) {
      try {
        const node = namehash(normalize(name));
        const val = await publicClient.readContract({
          address: L2_RESOLVER, abi: RESOLVER_ABI, functionName: "text", args: [node, key],
        });
        if (val && val !== "") console.log(`    ${key}: ${val}`);
      } catch { /* skip rate-limited */ }
    }
    await sleep(1000);
  }

  console.log("\n══════════════════════════════════════════════════");
  console.log(" ENS setup complete!");
  console.log("══════════════════════════════════════════════════");
}

main().catch((err) => { console.error("FATAL:", err); process.exit(1); });
