/**
 * Phase 1 test: Trust gate + Trading API quote
 * Run: UNISWAP_API_KEY=xxx npx tsx sdk/tests/phase1-test.ts
 */
import { getSwapLimits, TOKENS, UniswapClient, TrustGateError } from "../uniswap.js";

const SWAPPER = "0xc44cC67485A6A5AB46978752789954a8Ae845eeA";

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error("FAIL: " + msg);
  console.log("  pass: " + msg);
}

async function main() {
  console.log("\n=== Trust Gate Logic ===");
  const b = getSwapLimits(0);
  assert(b.level === "blocked" && b.maxAmount === 0n, "score 0 blocked");
  assert(getSwapLimits(25).level === "blocked", "score 25 blocked");
  const br = getSwapLimits(30);
  assert(br.level === "bronze", "score 30 bronze");
  assert(br.slippageBps === 300, "bronze 300bps");
  assert(br.maxAmount === 100_000_000n, "bronze max 100 USDC");
  const s = getSwapLimits(55);
  assert(s.level === "silver" && s.allowedPairs.length === 2, "score 55 silver");
  const g = getSwapLimits(80);
  assert(g.level === "gold" && g.allowedPairs.length === 3, "score 80 gold");
  console.log("\nAll trust gate tests passed");

  const key = process.env.UNISWAP_API_KEY;
  if (!key) { console.log("\nSet UNISWAP_API_KEY to test quotes"); return; }

  console.log("\n=== Trading API Quote (Base) ===");
  const c = new UniswapClient({ apiKey: key, rpcUrl: "https://mainnet.base.org", chainId: 8453 });
  const q = await c.fetchQuote(TOKENS.USDC, TOKENS.WETH, "1000000", SWAPPER as `0x${string}`);
  console.log("  QuoteId: " + q.quoteId.slice(0, 8) + "... routing=" + q.routing);
  console.log("  1 USDC -> " + (Number(q.amountOut) / 1e18).toFixed(6) + " WETH");
  console.log("  Gas: " + q.gasFeeUSD + " USD");
  assert(q.quoteId.length > 0, "has quote ID");
  assert(Number(q.amountOut) > 0, "amountOut > 0");
  assert(q.permitData !== null, "has permit data");

  console.log("\n=== Trust Gate: Blocked ===");
  try {
    await c.getQuote({ agentAddress: SWAPPER as `0x${string}`, tokenIn: TOKENS.USDC, tokenOut: TOKENS.WETH, amountIn: "1000000", trustScore: 10, trustThreshold: 26 });
    assert(false, "should have thrown");
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    assert(msg.includes("TrustGateError"), "blocked low score: " + msg.slice(0, 60));
  }

  console.log("\n=== Trust Gate: Bronze pass ===");
  const bq = await c.getQuote({ agentAddress: SWAPPER as `0x${string}`, tokenIn: TOKENS.USDC, tokenOut: TOKENS.WETH, amountIn: "1000000", trustScore: 30, trustThreshold: 26 });
  assert(bq.quoteId.length > 0, "bronze quote OK: " + bq.quoteId.slice(0, 8));

  console.log("\n=== All Phase 1 tests passed ===");
}

main().catch((err) => { console.error(err); process.exit(1); });
