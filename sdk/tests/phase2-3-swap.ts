import { createPublicClient, createWalletClient, http, formatUnits, parseAbi, type Hex } from "viem";
import { base } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import { UniswapClient, TOKENS } from "../uniswap.js";

const rawPK = process.env.PRIVATE_KEY!;
const PK: Hex = (rawPK.startsWith("0x") ? rawPK : "0x" + rawPK) as Hex;
const API_KEY = process.env.UNISWAP_API_KEY!;
const WETH = TOKENS.WETH;
const USDC = TOKENS.USDC;
const WRAP_AMOUNT = 100000000000000n; // 0.0001 ETH

async function main() {
  const account = privateKeyToAccount(PK);
  const wallet = createWalletClient({ account, chain: base, transport: http("https://mainnet.base.org") });
  const publicClient = createPublicClient({ chain: base, transport: http("https://mainnet.base.org") });

  // ── BEFORE balances ──────────────────────────────────────────────────────
  console.log("=== BEFORE ===");
  console.log("Wallet:", account.address);
  const ethBefore = await publicClient.getBalance({ address: account.address });
  console.log("ETH:", formatUnits(ethBefore, 18));
  const erc20 = parseAbi(["function balanceOf(address) view returns (uint256)"]);
  const wethBefore = await publicClient.readContract({ address: WETH, abi: erc20, functionName: "balanceOf", args: [account.address] });
  console.log("WETH:", formatUnits(wethBefore as bigint, 18));

  // ── Step 1: Wrap ETH via WETH.deposit() ───────────────────────────────────
  console.log("\n=== STEP 1: WRAP 0.0001 ETH -> WETH ===");
  const wethAbi = parseAbi(["function deposit() payable"]);
  const { request } = await publicClient.simulateContract({
    address: WETH,
    abi: wethAbi,
    functionName: "deposit",
    value: WRAP_AMOUNT,
    account: account,
  });
  console.log("simulateContract passed, sending tx...");
  const wrapTx = await wallet.writeContract(request);
  console.log("Wrap tx hash:", wrapTx);
  const receipt = await publicClient.waitForTransactionReceipt({ hash: wrapTx });
  console.log("Status:", receipt.status);
  console.log("Gas used:", receipt.gasUsed.toString());
  console.log("Block:", receipt.blockNumber.toString());

  // ── Step 2: Get USDC->WETH quote (free API call) ──────────────────────────
  console.log("\n=== STEP 2: QUOTE CHECK ===");
  const uni = new UniswapClient({ apiKey: API_KEY, rpcUrl: "https://mainnet.base.org", chainId: 8453 });
  const quote = await uni.fetchQuote(USDC, WETH, "1000000", account.address);
  console.log("Quote OK:", quote.quoteId.slice(0, 8), "... 1 USDC ->", (Number(quote.amountOut) / 1e18).toFixed(8), "WETH");
  console.log("Gas:", quote.gasFeeUSD, "USD");

  // ── AFTER balances ───────────────────────────────────────────────────────
  console.log("\n=== AFTER ===");
  const ethAfter = await publicClient.getBalance({ address: account.address });
  console.log("ETH:", formatUnits(ethAfter, 18));
  const wethAfter = await publicClient.readContract({ address: WETH, abi: erc20, functionName: "balanceOf", args: [account.address] });
  console.log("WETH:", formatUnits(wethAfter as bigint, 18));
  console.log("\nETH spent (swap + gas):", formatUnits(ethBefore - ethAfter, 18));
  console.log("WETH gained:", formatUnits((wethAfter as bigint) - (wethBefore as bigint), 18));
}

main().catch(e => { console.error("ERROR:", e.message); process.exit(1); });
