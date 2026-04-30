/**
 * Uniswap SDK — Trust-gated token swaps for agent payments.
 *
 * Uses the Uniswap Trading API (POST /v1/quote, POST /v1/swap) with Permit2
 * approvals and trust-score-based swap limits.
 *
 * Trust tiers:
 *   0–25  → blocked (no swaps)
 *   26–50 → max 100 USDC, 300 BPS slippage, USDC→WETH only
 *   51–75 → max 1 000 USDC, 100 BPS, USDC→WETH + USDC→ETH
 *   76–100 → max 10 000 USDC, 50 BPS, all pairs
 */
import {
  createPublicClient,
  http,
  parseUnits,
  formatUnits,
  type Hex,
  type WalletClient,
} from "viem";
import { baseSepolia, base } from "viem/chains";

// ── Constants ──────────────────────────────────────────────────

export const TRADING_API_BASE = "https://trade-api.gateway.uniswap.org/v1" as const;

export const TOKENS = {
  USDC: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" as Hex, // 6 decimals
  WETH: "0x4200000000000000000000000000000000000006" as Hex, // 18 decimals
  ETH: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE" as Hex, // native
} as const;

const PERMIT2_ADDRESS = "0x000000000022D473030F116dDEE9F6B43aC78BA3" as Hex;

const ERC20_ABI = [
  {
    name: "allowance",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
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
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

// ── Types ──────────────────────────────────────────────────────

export interface TrustLimits {
  maxAmountUsdc: string;
  slippageBps: number;
  allowedPairs: Array<{ tokenIn: Hex; tokenOut: Hex }>;
}

export interface SwapQuote {
  requestId: string;
  inputToken: Hex;
  outputToken: Hex;
  amountIn: string;
  amountOut: string;
  amountOutMinimum: string;
  priceImpact: number;
  route: string;
  gasEstimate: string;
  gasEstimateUsd: string;
  slippageBps: number;
  /** Full raw quote from Trading API — needed for POST /swap later */
  raw: unknown;
}

export interface TrustGatedSwapParams {
  agentAddress: Hex;
  tokenIn: Hex;
  tokenOut: Hex;
  amountIn: string;
  trustScore: number;
  /** Decimals for the input token (default 6 for USDC) */
  tokenInDecimals?: number;
}

export interface SwapResult {
  txHash: Hex; from: Hex;
  to: Hex;
  value: string;
  gasUsed: string;
  amountIn: string;
  amountOut: string;
}

export interface UniswapConfig {
  rpcUrl: string;
  chainId: number;
  apiKey: string;
}

// ── Custom Errors ──────────────────────────────────────────────

export class TrustGateError extends Error {
  constructor(
    public readonly trustScore: number,
    public readonly reason: string,
  ) {
    super(`TrustGate blocked (score=${trustScore}): ${reason}`);
    this.name = "TrustGateError";
  }
}

export class QuoteError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly body: unknown,
  ) {
    super(`Quote API error ${statusCode}: ${JSON.stringify(body)}`);
    this.name = "QuoteError";
  }
}

export class SwapExecutionError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly body: unknown,
  ) {
    super(`Swap API error ${statusCode}: ${JSON.stringify(body)}`);
    this.name = "SwapExecutionError";
  }
}

// ── Trust Gate Logic ───────────────────────────────────────────

/** Returns swap limits for a given trust score (0–100). */
export function getSwapLimits(trustScore: number): TrustLimits {
  if (trustScore <= 25) {
    return {
      maxAmountUsdc: "0",
      slippageBps: 0,
      allowedPairs: [],
    };
  }
  if (trustScore <= 50) {
    return {
      maxAmountUsdc: parseUnits("100", 6).toString(), // 100 USDC
      slippageBps: 300, // 3%
      allowedPairs: [{ tokenIn: TOKENS.USDC, tokenOut: TOKENS.WETH }],
    };
  }
  if (trustScore <= 75) {
    return {
      maxAmountUsdc: parseUnits("1000", 6).toString(), // 1 000 USDC
      slippageBps: 100, // 1%
      allowedPairs: [
        { tokenIn: TOKENS.USDC, tokenOut: TOKENS.WETH },
        { tokenIn: TOKENS.USDC, tokenOut: TOKENS.ETH },
      ],
    };
  }
  // trustScore 76–100
  return {
    maxAmountUsdc: parseUnits("10000", 6).toString(), // 10 000 USDC
    slippageBps: 50, // 0.5%
    allowedPairs: [
      { tokenIn: TOKENS.USDC, tokenOut: TOKENS.WETH },
      { tokenIn: TOKENS.USDC, tokenOut: TOKENS.ETH },
      { tokenIn: TOKENS.WETH, tokenOut: TOKENS.USDC },
      { tokenIn: TOKENS.WETH, tokenOut: TOKENS.ETH },
    ],
  };
}

/** Validate a swap against trust limits. Throws TrustGateError if blocked. */
function enforceTrustGate(
  trustScore: number,
  tokenIn: Hex,
  tokenOut: Hex,
  amountIn: string,
  tokenInDecimals: number,
): TrustLimits {
  const limits = getSwapLimits(trustScore);

  if (limits.allowedPairs.length === 0) {
    throw new TrustGateError(
      trustScore,
      `Score ${trustScore} is at or below 25 — swaps blocked`,
    );
  }

  // Check the pair is allowed
  const pairAllowed = limits.allowedPairs.some(
    (p) =>
      p.tokenIn.toLowerCase() === tokenIn.toLowerCase() &&
      p.tokenOut.toLowerCase() === tokenOut.toLowerCase(),
  );
  if (!pairAllowed) {
    throw new TrustGateError(
      trustScore,
      `Pair ${tokenIn}→${tokenOut} not allowed at score ${trustScore}. ` +
        `Allowed: ${limits.allowedPairs.map((p) => `${p.tokenIn}→${p.tokenOut}`).join(", ")}`,
    );
  }

  // Check amount (convert to USDC-equivalent for the cap)
  const amountBigint = BigInt(amountIn);
  const maxBigint = BigInt(limits.maxAmountUsdc);

  // If tokenIn is USDC (6 decimals), compare directly.
  // For other tokens we do an approximate conversion.
  if (tokenIn.toLowerCase() === TOKENS.USDC.toLowerCase()) {
    if (amountBigint > maxBigint) {
      throw new TrustGateError(
        trustScore,
        `Amount ${formatUnits(amountBigint, tokenInDecimals)} USDC exceeds ` +
          `max ${formatUnits(maxBigint, 6)} USDC at score ${trustScore}`,
      );
    }
  } else {
    // Non-USDC input: cap in token-native units.
    // We approximate by scaling the USDC max to token decimals.
    // For WETH/ETH (18 decimals) the cap is effectively higher.
    const scaledMax =
      tokenInDecimals > 6
        ? maxBigint * BigInt(10 ** (tokenInDecimals - 6))
        : maxBigint;
    if (amountBigint > scaledMax) {
      throw new TrustGateError(
        trustScore,
        `Amount ${formatUnits(amountBigint, tokenInDecimals)} exceeds ` +
          `trust-limited max at score ${trustScore}`,
      );
    }
  }

  return limits;
}

// ── Client ─────────────────────────────────────────────────────

export class UniswapTradingClient {
  private readonly publicClient;
  private readonly config: UniswapConfig;

  constructor(config: UniswapConfig) {
    this.config = config;
    const chain = config.chainId === 8453 ? base : baseSepolia;
    this.publicClient = createPublicClient({
      transport: http(config.rpcUrl),
      chain,
    });
  }

  // ── Quote ────────────────────────────────────────────────────

  /**
   * Get a quote from the Uniswap Trading API.
   * FREE — no on-chain transaction. Calls POST /v1/quote.
   */
  async getQuote(
    tokenIn: Hex,
    tokenOut: Hex,
    amountIn: string,
    trustScore: number,
    swapper: Hex = "0x0000000000000000000000000000000000000001" as Hex,
  ): Promise<SwapQuote> {
    const decimals = getTokenDecimals(tokenIn);
    const limits = enforceTrustGate(trustScore, tokenIn, tokenOut, amountIn, decimals);

    const body = {
      type: "EXACT_INPUT",
      amount: amountIn,
      tokenIn,
      tokenOut,
      swapper,
    };

    const url = `${TRADING_API_BASE}/quote`;
    console.log(`[Uniswap] POST ${url}`, JSON.stringify(body));

    const resp = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.config.apiKey,
      },
      body: JSON.stringify(body),
    });

    if (!resp.ok) {
      const errorBody = await resp.text();
      throw new QuoteError(resp.status, errorBody);
    }

    const data = (await resp.json()) as Record<string, unknown>;
    const quote = data.quote as Record<string, unknown>;
    const input = quote?.input as Record<string, unknown>;
    const output = quote?.output as Record<string, unknown>;

    const amountOut =
      (output?.amount as string) ?? "0";

    // The API returns gasUseEstimate in the quote
    const gasEstimate = (quote?.gasUseEstimate as string) ?? "0";
    const gasEstimateUsd = (quote?.gasFeeUSD as string) ?? "0";
    const priceImpact = (quote?.priceImpact as number) ?? 0;
    const route = (data.routeString as string) ?? [tokenIn, tokenOut].join("→");

    return {
      requestId: data.requestId as string,
      inputToken: tokenIn,
      outputToken: tokenOut,
      amountIn,
      amountOut,
      amountOutMinimum: calculateMinOut(amountOut, limits.slippageBps),
      priceImpact,
      route,
      gasEstimate,
      gasEstimateUsd,
      slippageBps: limits.slippageBps,
      raw: data,
    };
  }

  // ── Allowance / Approve ──────────────────────────────────────

  /** Check ERC20 allowance for the Permit2 contract. */
  async checkAllowance(
    owner: Hex,
    tokenAddress: Hex,
  ): Promise<bigint> {
    const allowance = await this.publicClient.readContract({
      address: tokenAddress,
      abi: ERC20_ABI,
      functionName: "allowance",
      args: [owner, PERMIT2_ADDRESS],
    });
    return allowance as bigint;
  }

  /** Check if a sufficient Permit2 allowance exists. */
  async hasSufficientAllowance(
    owner: Hex,
    tokenAddress: Hex,
    amount: string,
  ): Promise<boolean> {
    const allowance = await this.checkAllowance(owner, tokenAddress);
    return allowance >= BigInt(amount);
  }

  /**
   * Approve Permit2 as a spender for the given token.
   * Uses max uint256 so approval only needs to happen once per token.
   */
  async approvePermit2(
    walletClient: WalletClient,
    tokenAddress: Hex,
  ): Promise<Hex> {
    const maxApproval =
      "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff" as Hex;

    // Simulate first to catch revert reasons
    const { request } = await this.publicClient.simulateContract({
      address: tokenAddress,
      abi: ERC20_ABI,
      functionName: "approve",
      args: [PERMIT2_ADDRESS, BigInt(maxApproval)],
      account: walletClient.account!,
    });

    const txHash = await walletClient.writeContract(request);
    console.log(`[Uniswap] Approve tx: ${txHash}`);

    // Wait for confirmation
    const receipt = await this.publicClient.waitForTransactionReceipt({
      hash: txHash,
    });
    console.log(`[Uniswap] Approve confirmed in block ${receipt.blockNumber}`);
    return txHash;
  }

  // ── Balance helpers ──────────────────────────────────────────

  /** Get ERC20 balance for an address. */
  async getTokenBalance(
    owner: Hex,
    tokenAddress: Hex,
    decimals: number = 6,
  ): Promise<{ raw: bigint; formatted: string }> {
    const raw = (await this.publicClient.readContract({
      address: tokenAddress,
      abi: ERC20_ABI,
      functionName: "balanceOf",
      args: [owner],
    })) as bigint;
    return { raw, formatted: formatUnits(raw, decimals) };
  }

  /** Get native ETH balance. */
  async getEthBalance(address: Hex): Promise<{ raw: bigint; formatted: string }> {
    const raw = await this.publicClient.getBalance({ address });
    return { raw, formatted: formatUnits(raw, 18) };
  }

  // ── Swap Execution ───────────────────────────────────────────

  /**
   * Execute a trust-gated swap end-to-end:
   * 1. Enforce trust gate
   * 2. Get quote from Trading API
   * 3. (If permitData present) sign EIP-712 permit
   * 4. POST /swap to get calldata
   * 5. Send transaction
   */
  async executeTrustGatedSwap(
    params: TrustGatedSwapParams,
    walletClient: WalletClient,
  ): Promise<SwapResult> {
    const decimals = params.tokenInDecimals ?? getTokenDecimals(params.tokenIn);
    const limits = enforceTrustGate(
      params.trustScore,
      params.tokenIn,
      params.tokenOut,
      params.amountIn,
      decimals,
    );

    // Log balances before
    const balBefore = await this.getTokenBalance(
      params.agentAddress,
      params.tokenIn,
      decimals,
    );
    console.log(
      `[Uniswap] Balance before: ${balBefore.formatted} (raw ${balBefore.raw})`,
    );

    // Step 1: Get quote
    const quote = await this.getQuote(
      params.tokenIn,
      params.tokenOut,
      params.amountIn,
      params.trustScore,
      params.agentAddress,
    );

    // Step 2: Build swap request
    const swapBody = buildSwapRequestBody(
      quote.raw as Record<string, unknown>,
      limits.slippageBps,
    );

    const swapUrl = `${TRADING_API_BASE}/swap`;
    console.log(`[Uniswap] POST ${swapUrl}`);

    const swapResp = await fetch(swapUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.config.apiKey,
      },
      body: JSON.stringify(swapBody),
    });

    if (!swapResp.ok) {
      const errorBody = await swapResp.text();
      throw new SwapExecutionError(swapResp.status, errorBody);
    }

    const swapData = (await swapResp.json()) as Record<string, unknown>;
    const swap = swapData.swap as Record<string, unknown>;

    // Step 3: Send the transaction with the returned calldata
    const txHash = await walletClient.sendTransaction({
      to: swap.to as Hex,
      data: swap.data as Hex,
      value: BigInt((swap.value as string) ?? "0"),
      account: walletClient.account!,
      chain: walletClient.chain,
      gas: swap.gasLimit ? BigInt(swap.gasLimit as string) : undefined,
      maxFeePerGas: swap.maxFeePerGas
        ? BigInt(swap.maxFeePerGas as string)
        : undefined,
      maxPriorityFeePerGas: swap.maxPriorityFeePerGas
        ? BigInt(swap.maxPriorityFeePerGas as string)
        : undefined,
    });

    console.log(`[Uniswap] Swap tx sent: ${txHash}`);

    // Wait for confirmation
    const receipt = await this.publicClient.waitForTransactionReceipt({
      hash: txHash,
    });
    console.log(
      `[Uniswap] Swap confirmed in block ${receipt.blockNumber}, status=${receipt.status}`,
    );

    // Log balances after
    const balAfter = await this.getTokenBalance(
      params.agentAddress,
      params.tokenIn,
      decimals,
    );
    console.log(
      `[Uniswap] Balance after: ${balAfter.formatted} (raw ${balAfter.raw})`,
    );

    if (receipt.status === "reverted") {
      throw new SwapExecutionError(0, {
        message: "Transaction reverted on-chain",
        txHash,
        receipt,
      });
    }

    return {
      txHash,
      from: swap.from as Hex,
      to: swap.to as Hex,
      value: (swap.value as string) ?? "0",
      gasUsed: receipt.gasUsed.toString(),
      amountIn: params.amountIn,
      amountOut: quote.amountOut,
    };
  }
}

// ── Helpers ────────────────────────────────────────────────────

/** Calculate minimum output after slippage. */
function calculateMinOut(amountOut: string, slippageBps: number): string {
  const amount = BigInt(amountOut);
  const factor = BigInt(10_000 - slippageBps);
  return ((amount * factor) / 10_000n).toString();
}

/** Get standard decimals for known tokens. */
function getTokenDecimals(token: Hex): number {
  if (token.toLowerCase() === TOKENS.USDC.toLowerCase()) return 6;
  return 18; // WETH, ETH, and everything else
}

/**
 * Build the request body for POST /v1/swap from a raw quote.
 * The quote response contains all the fields we need; we add slippage and trade type.
 */
function buildSwapRequestBody(
  rawQuote: Record<string, unknown>,
  slippageBps: number,
): Record<string, unknown> {
  // The raw quote already has `quote` nested inside it
  const quote = (rawQuote.quote ?? rawQuote) as Record<string, unknown>;

  return {
    quote: {
      ...quote,
      slippage: slippageBps,
      tradeType: "EXACT_INPUT",
    },
    // The quote response may include permitData — pass it through
    permitData: rawQuote.permitData ?? undefined,
    // No signature yet — would be added for Permit2 flow
    signature: undefined,
    includeGasInfo: true,
    simulateTransaction: true,
    safetyMode: "SAFE",
  };
}
