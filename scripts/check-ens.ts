import { createPublicClient, http } from "viem";
import { base } from "viem/chains";
import { namehash, normalize } from "viem/ens";
import * as dotenv from "dotenv";
import { privateKeyToAccount } from "viem/accounts";

dotenv.config({ path: ".env" });

const L2_RESOLVER = "0xC6d566A56A1aFf6508b41f6c90ff131615583BCD" as `0x${string}`;

const RESOLVER_ABI = [
  { name: "addr", type: "function", stateMutability: "view", inputs: [{ name: "node", type: "bytes32" }], outputs: [{ name: "", type: "address" }] },
  { name: "text", type: "function", stateMutability: "view", inputs: [{ name: "node", type: "bytes32" }, { name: "key", type: "string" }], outputs: [{ name: "", type: "string" }] },
  { name: "name", type: "function", stateMutability: "view", inputs: [{ name: "node", type: "bytes32" }], outputs: [{ name: "", type: "string" }] },
];

async function main() {
  const rawPK = process.env.PRIVATE_KEY!;
  const pk = rawPK.startsWith("0x") ? rawPK : "0x" + rawPK;
  const account = privateKeyToAccount(pk as `0x${string}`);
  console.log("Wallet:", account.address);

  const client = createPublicClient({ chain: base, transport: http() });
  const balance = await client.getBalance({ address: account.address });
  console.log("Balance:", (Number(balance) / 1e18).toFixed(6), "ETH");

  // The CORRECT name is agentrust.base.eth
  const name = "agentrust.base.eth";
  console.log("\n=== Checking", name, "===");
  const node = namehash(normalize(name));
  console.log("Namehash:", node);

  // Check addr record
  try {
    const addr = await client.readContract({
      address: L2_RESOLVER,
      abi: RESOLVER_ABI,
      functionName: "addr",
      args: [node],
    });
    console.log("Resolves to:", addr);
  } catch (e: any) {
    console.log("addr error:", e.message?.slice(0, 200));
  }

  // Check name record
  try {
    const n = await client.readContract({
      address: L2_RESOLVER,
      abi: RESOLVER_ABI,
      functionName: "name",
      args: [node],
    });
    console.log("Name record:", n);
  } catch (e: any) {
    console.log("name error:", e.message?.slice(0, 200));
  }

  // Read all text records
  const textKeys = [
    "description", "url", "avatar", "email", "com.twitter", "com.github",
    "agent.type", "agent.capabilities", "agent.endpoint", "agent.status",
    "agent.pricing", "agent.trust-score", "agent.registry-id",
  ];
  console.log("\nText Records:");
  let foundAny = false;
  for (const key of textKeys) {
    try {
      const value = await client.readContract({
        address: L2_RESOLVER,
        abi: RESOLVER_ABI,
        functionName: "text",
        args: [node, key],
      });
      if (value && value !== "") {
        console.log(`  ${key}: ${value}`);
        foundAny = true;
      }
    } catch { /* skip */ }
  }
  if (!foundAny) console.log("  (none set)");

  // Also check subnames
  const subnames = ["requester.agentrust.base.eth", "provider.agentrust.base.eth"];
  for (const sub of subnames) {
    console.log(`\n=== Checking ${sub} ===`);
    const subNode = namehash(normalize(sub));
    try {
      const addr = await client.readContract({
        address: L2_RESOLVER,
        abi: RESOLVER_ABI,
        functionName: "addr",
        args: [subNode],
      });
      console.log("  Resolves to:", addr);
    } catch (e: any) {
      console.log("  addr error:", e.message?.slice(0, 150));
    }
  }
}

main().catch(console.error);
