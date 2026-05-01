/**
 * AgentTrust Live Demo — On-Chain Data Seeder
 *
 * Seeds Base Mainnet with real data so the frontend shows agents,
 * trust scores, and agreements.
 *
 * Strategy (Option A — single wallet):
 *   1. Register ONE agent: provider.agenttrust.base.eth
 *   2. Mint TrustNFT for our wallet address
 *   3. Wrap small ETH → WETH, approve, create ServiceAgreement
 *
 * Run:  npx tsx scripts/seed-demo.ts
 */

import {
  createWalletClient,
  createPublicClient,
  http,
  parseEther,
  keccak256,
  toHex,
  formatEther,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base } from "viem/chains";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env" });
dotenv.config({ path: "contracts/.env" });

// ─── Contract Addresses (Base Mainnet 8453) ─────────────────────
const AGENT_REGISTRY  = "0xc44cc67485a6a5ab46978752789954a8ae845eea" as `0x${string}`;
const TRUST_NFT       = "0x0374f7516e57e778573b2e90e6d7113b8253ff5c" as `0x${string}`;
const SERVICE_AGREEMENT = "0x109ba5edd23c247771f2fcd7572e8334278dbe81" as `0x${string}`;
const WETH_BASE       = "0x4200000000000000000000000000000000000006" as `0x${string}`;

// Dummy provider address (must differ from msg.sender)
const DUMMY_PROVIDER = "0x1234567890123456789012345678901234567890" as `0x${string}`;

// ─── Minimal ABIs ────────────────────────────────────────────────
const AGENT_REGISTRY_ABI = [
  {
    name: "registerAgent",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "ensName", type: "string" },
      { name: "capabilitiesHash", type: "bytes32" },
    ],
    outputs: [{ name: "tokenId", type: "uint256" }],
  },
  {
    name: "totalRegistered",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "total", type: "uint256" }],
  },
] as const;

const TRUST_NFT_ABI = [
  {
    name: "mintTrustNFT",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "agent", type: "address" }],
    outputs: [{ name: "tokenId", type: "uint256" }],
  },
  {
    name: "totalMinted",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "total", type: "uint256" }],
  },
] as const;

const SERVICE_AGREEMENT_ABI = [
  {
    name: "createAgreement",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "provider", type: "address" },
      { name: "token", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "trustThreshold", type: "uint256" },
      { name: "deadline", type: "uint256" },
      { name: "serviceHash", type: "bytes32" },
    ],
    outputs: [{ name: "agreementId", type: "uint256" }],
  },
  {
    name: "totalAgreements",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

const WETH_ABI = [
  {
    name: "deposit",
    type: "function",
    stateMutability: "payable",
    inputs: [],
    outputs: [],
  },
  {
    name: "approve",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
] as const;

// ─── Helpers ──────────────────────────────────────────────────────
const BASESCAN_TX = (hash: string) => `https://basescan.org/tx/${hash}`;
const BASESCAN_ADDR = (addr: string) => `https://basescan.org/address/${addr}`;

// ─── Main ─────────────────────────────────────────────────────────
async function main(): Promise<void> {
  console.log("\n🚀 AgentTrust Live Demo — On-Chain Data Seeder\n");

  // ── Setup wallet & clients ──────────────────────────────────────
  const rawPK = process.env.PRIVATE_KEY;
  if (!rawPK) {
    console.error("❌ PRIVATE_KEY not found in .env");
    process.exit(1);
  }

  const pk = (rawPK.startsWith("0x") ? rawPK : `0x${rawPK}`) as `0x${string}`;
  const account = privateKeyToAccount(pk);
  console.log("📋 Wallet:", account.address);

  const publicClient = createPublicClient({ chain: base, transport: http() });
  const walletClient = createWalletClient({ account, chain: base, transport: http() });

  // Pre-flight balance check
  const balance = await publicClient.getBalance({ address: account.address });
  console.log("💰 Balance:", formatEther(balance), "ETH\n");

  if (balance < parseEther("0.001")) {
    console.error("❌ Insufficient ETH for gas. Need at least 0.001 ETH.");
    process.exit(1);
  }

  // ── STEP 1: Register Agent ──────────────────────────────────────
  console.log("━━━ STEP 1: Register Agent ━━━");
  const ensName = "provider.agenttrust.base.eth";
  const capabilitiesHash = keccak256(toHex("data-analysis,on-chain-analytics,computation"));

  // Check if already registered
  const existingTotal = await publicClient.readContract({
    address: AGENT_REGISTRY,
    abi: AGENT_REGISTRY_ABI,
    functionName: "totalRegistered",
  });
  console.log("   Existing registrations:", existingTotal.toString());

  let agentTxHash: `0x${string}`;
  let agentAlreadyExisted = false;
  try {
    const { request: registerReq } = await publicClient.simulateContract({
      address: AGENT_REGISTRY,
      abi: AGENT_REGISTRY_ABI,
      functionName: "registerAgent",
      args: [ensName, capabilitiesHash],
      account,
    });
    agentTxHash = await walletClient.writeContract(registerReq);
    console.log("   ✅ Agent registered!");
    console.log("   🔗", BASESCAN_TX(agentTxHash));

    // Wait for confirmation
    await publicClient.waitForTransactionReceipt({ hash: agentTxHash as `0x${string}` });
    console.log("   ⛓️  Confirmed");
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("AlreadyRegistered")) {
      console.log("   ⏭️  Already registered, skipping");
      agentTxHash = "0x0000000000000000000000000000000000000000000000000000000000000000" as `0x${string}`;
      agentAlreadyExisted = true;
    } else {
      throw err;
    }
  }

  // ── STEP 2: Mint TrustNFT ───────────────────────────────────────
  console.log("\n━━━ STEP 2: Mint TrustNFT ━━━");
  const existingMinted = await publicClient.readContract({
    address: TRUST_NFT,
    abi: TRUST_NFT_ABI,
    functionName: "totalMinted",
  });
  console.log("   Existing TrustNFTs:", existingMinted.toString());

  let trustTxHash: `0x${string}`;
  let trustAlreadyExisted = false;
  try {
    const { request: mintReq } = await publicClient.simulateContract({
      address: TRUST_NFT,
      abi: TRUST_NFT_ABI,
      functionName: "mintTrustNFT",
      args: [account.address],
      account,
    });
    trustTxHash = await walletClient.writeContract(mintReq);
    console.log("   ✅ TrustNFT minted!");
    console.log("   🔗", BASESCAN_TX(trustTxHash));

    await publicClient.waitForTransactionReceipt({ hash: trustTxHash as `0x${string}` });
    console.log("   ⛓️  Confirmed");
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("AlreadyMinted")) {
      console.log("   ⏭️  TrustNFT already minted, skipping");
      trustTxHash = "0x0000000000000000000000000000000000000000000000000000000000000000" as `0x${string}`;
      trustAlreadyExisted = true;
    } else {
      throw err;
    }
  }

  // ── STEP 3: Wrap ETH → WETH ─────────────────────────────────────
  console.log("\n━━━ STEP 3: Wrap ETH → WETH ━━━");
  const wrapAmount = parseEther("0.0001"); // 0.0001 WETH — minimal for demo
  console.log("   Wrapping", formatEther(wrapAmount), "ETH → WETH");

  const { request: wrapReq } = await publicClient.simulateContract({
    address: WETH_BASE,
    abi: WETH_ABI,
    functionName: "deposit",
    value: wrapAmount,
    account,
  });
  const wrapTxHash = await walletClient.writeContract(wrapReq);
  console.log("   ✅ WETH deposited!");
  console.log("   🔗", BASESCAN_TX(wrapTxHash));
  await publicClient.waitForTransactionReceipt({ hash: wrapTxHash });
  console.log("   ⛓️  Confirmed");

  // ── STEP 4: Approve WETH spending ───────────────────────────────
  console.log("\n━━━ STEP 4: Approve WETH for ServiceAgreement ━━━");
  const { request: approveReq } = await publicClient.simulateContract({
    address: WETH_BASE,
    abi: WETH_ABI,
    functionName: "approve",
    args: [SERVICE_AGREEMENT, wrapAmount],
    account,
  });
  const approveTxHash = await walletClient.writeContract(approveReq);
  console.log("   ✅ WETH approved!");
  console.log("   🔗", BASESCAN_TX(approveTxHash));
  await publicClient.waitForTransactionReceipt({ hash: approveTxHash });
  console.log("   ⛓️  Confirmed");

  // ── STEP 5: Create ServiceAgreement ──────────────────────────────
  console.log("\n━━━ STEP 5: Create ServiceAgreement ━━━");
  const serviceHash = keccak256(toHex("data-analysis-task:compute-trust-score"));
  const deadline = BigInt(Math.floor(Date.now() / 1000) + 86400); // 24h from now
  const trustThreshold = BigInt(40); // minimum trust score required

  const { request: agreementReq } = await publicClient.simulateContract({
    address: SERVICE_AGREEMENT,
    abi: SERVICE_AGREEMENT_ABI,
    functionName: "createAgreement",
    args: [
      DUMMY_PROVIDER,   // provider (different from msg.sender)
      WETH_BASE,        // payment token
      wrapAmount,       // payment amount
      trustThreshold,   // trust threshold
      deadline,         // deadline (24h)
      serviceHash,      // service description hash
    ],
    account,
  });
  const agreementTxHash = await walletClient.writeContract(agreementReq);
  console.log("   ✅ ServiceAgreement created!");
  console.log("   🔗", BASESCAN_TX(agreementTxHash));
  await publicClient.waitForTransactionReceipt({ hash: agreementTxHash });
  console.log("   ⛓️  Confirmed");

  // ── FINAL: Post-seed verification ───────────────────────────────
  console.log("\n━━━ Post-Seed Verification ━━━");
  const finalRegistered = await publicClient.readContract({
    address: AGENT_REGISTRY,
    abi: AGENT_REGISTRY_ABI,
    functionName: "totalRegistered",
  });
  const finalMinted = await publicClient.readContract({
    address: TRUST_NFT,
    abi: TRUST_NFT_ABI,
    functionName: "totalMinted",
  });
  const finalAgreements = await publicClient.readContract({
    address: SERVICE_AGREEMENT,
    abi: SERVICE_AGREEMENT_ABI,
    functionName: "totalAgreements",
  });
  const finalBalance = await publicClient.getBalance({ address: account.address });

  console.log("   Agents registered:", finalRegistered.toString());
  console.log("   TrustNFTs minted:  ", finalMinted.toString());
  console.log("   Agreements created:", finalAgreements.toString());
  console.log("   Remaining balance: ", formatEther(finalBalance), "ETH");

  // ── Summary ─────────────────────────────────────────────────────
  console.log("\n━━━ Transaction Summary ━━━");
  console.log("   AgentRegistry:  ", BASESCAN_ADDR(AGENT_REGISTRY));
  console.log("   TrustNFT:       ", BASESCAN_ADDR(TRUST_NFT));
  console.log("   ServiceAgreement:", BASESCAN_ADDR(SERVICE_AGREEMENT));
  console.log("");
  if (!agentAlreadyExisted) console.log("   Register tx:   ", BASESCAN_TX(agentTxHash));
  if (!trustAlreadyExisted) console.log("   Mint tx:       ", BASESCAN_TX(trustTxHash));
  console.log("   Wrap WETH tx:  ", BASESCAN_TX(wrapTxHash));
  console.log("   Approve tx:    ", BASESCAN_TX(approveTxHash));
  console.log("   Agreement tx:  ", BASESCAN_TX(agreementTxHash));
  console.log("\n🎉 Seed complete! Frontend should now show live data.\n");
}

main().catch((err: unknown) => {
  console.error("\n❌ Seed failed:");
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
