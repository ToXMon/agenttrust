import { createPublicClient, http, parseAbi, formatUnits } from "viem";
import { base } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";

const rawPK = process.env.PRIVATE_KEY!;
const PK = rawPK.startsWith("0x") ? rawPK : "0x" + rawPK;
const USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" as `0x${string}`;
const PERMIT2 = "0x000000000022D473030F116dDEE9F6B43aC78BA3" as `0x${string}`;

async function main() {
  const account = privateKeyToAccount(PK as `0x${string}`);
  console.log("Wallet:", account.address);

  const client = createPublicClient({ chain: base, transport: http("https://mainnet.base.org") });

  const ethBal = await client.getBalance({ address: account.address });
  console.log("ETH balance:", formatUnits(ethBal, 18), "ETH");

  const erc20 = parseAbi([
    "function balanceOf(address) view returns (uint256)",
    "function allowance(address,address) view returns (uint256)",
  ]);

  const usdcBal = await client.readContract({ address: USDC, abi: erc20, functionName: "balanceOf", args: [account.address] });
  console.log("USDC balance:", formatUnits(usdcBal as bigint, 6), "USDC");

  const allowance = await client.readContract({ address: USDC, abi: erc20, functionName: "allowance", args: [account.address, PERMIT2] });
  console.log("USDC->Permit2 allowance:", (allowance as bigint).toString());
  console.log("Permit2 approved:", (allowance as bigint) > 0n ? "YES" : "NO");
}

main().catch(e => { console.error(e.message); process.exit(1); });
