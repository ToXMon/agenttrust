import { createPublicClient, http } from "viem";
import { base } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env" });
dotenv.config({ path: "contracts/.env" });

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      PRIVATE_KEY: string;
    }
  }
}

async function main() {
  const rawPK = process.env.PRIVATE_KEY;
  if (!rawPK) { console.error("No PRIVATE_KEY in env"); process.exit(1); }

  // Ensure 0x prefix
  const pk = rawPK.startsWith("0x") ? rawPK : "0x" + rawPK;
  const account = privateKeyToAccount(pk as `0x${string}`);
  console.log("Address:", account.address);

  const client = createPublicClient({ chain: base, transport: http() });
  const bal = await client.getBalance({ address: account.address });
  console.log("Balance:", (Number(bal) / 1e18).toFixed(6), "ETH");

  const block = await client.getBlockNumber();
  console.log("Current Block:", block.toString());

  // Check deployed contracts
  const registry = "0xc44cc67485a6a5ab46978752789954a8ae845eea" as `0x${string}`;
  const code = await client.getCode({ address: registry });
  console.log("AgentRegistry deployed:", code ? "YES" : "NO");
  console.log("AgentRegistry address:", registry);
}

main().catch(console.error);
