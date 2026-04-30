/**
 * Uniswap Trading API — Trust-gated token swaps for agent commerce
 *
 * Uses the Uniswap Trading API (REST) for quotes, Permit2 approvals, and swap execution.
 * Agent trust scores dynamically gate swap parameters: max amounts, slippage, and allowed pairs.
 */

import {
  createPublicClient,
  createWalletClient,
  http,
  formatUnits,
  parseUnits,
  type Hex,
  type WalletClient,
  type PublicClient,
  type Chain,
} from "viem";
import { base, baseSepolia } from "viem/chains";

// ─── Constants ────────────────────────────────────────────────────────────────

export const TOKENS = {
  USDC: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" as Hex,
  WETH: "0x4200000000000000000000000000000000000006" as Hex,
  ETH: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE" as Hex,
} as const;

export const PERMIT2_ADDRESS =
  "0x000000000022D473030F116dDEE9F6B43aC78BA3" as Hex;

/** Universal Router on Base — this is the spender from the quote response */
const UNIVERSAL_ROUTER_BASE =
  "0x6fF5693B99212DA76Ad316178A184Ab56D299b43" as Hex;

export const TRADING_API_BASE =
  "https://trade-api.gateway.uniswap.org/v1" as const;

export const CONTRACTS = {
  AgentRegistry: "0xc44cC67485A6A5AB46978752789954a8Ae845eeA" as Hex,
  ServiceAgreement: "0x109bA5eDd23c247771F2FcD7572E8334278dBE81" as Hex,
  TrustNFT: "0x0374f7516E57e778573B2e90E6D7113b8253FF5C" as Hex,
} as const;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TrustLimits {
  maxAmount: bigint;
  slippageBps: number;
  allowedPairs: [Hex, Hex][];
  level: "blocked" | "bronze" | "silver" | "gold";
}

export interface SwapQuote {
  requestId: string;
  quoteId: string;
  routing: string;
  tokenIn: Hex;
  tokenOut: Hex;
  amountIn: string;
  amountOut: string;
  priceImpact: number;
  slippage: number;
  gasFee: string;
  gasFeeUSD: string;
  gasUseEstimate: string;
  route: Array<Array<Record<string, unknown>>>;
  permitData: Permit2Data | null;
}

export interface Permit2Data {
  domain: {
    name: string;
    chainId: number;
    verifyingContract: Hex;
  };
  types: Record<string, Array<{ name: string; type: string }>>;
  values: {
    details: {
      token: Hex;
      amount: string;
      expiration: string;
      nonce: string;
    };
    spender: Hex;
    sigDeadline: string;
  };
}

export interface SwapResult {
  txHash: Hex;
  swap: {
    to: Hex;
    from: Hex;
    data: Hex;
    value: string;
    chainId: number;
    gasLimit: string;
    maxFeePerGas: string;
    maxPriorityFeePerGas: string;
  };
  gasFee: string;
}

export interface TrustGatedSwapParams {
  agentAddress: Hex;
  tokenIn: Hex;
  tokenOut: Hex;
  amountIn: string;
  trustScore: number;
  trustThreshold: number;
  recipient?: Hex;
}

export interface UniswapConfig {
  apiKey: string;
  rpcUrl: string;
  chainId: 8453 | 84532;
}

// ─── Custom Errors ────────────────────────────────────────────────────────────

export class TrustGateError extends Error {
  constructor(
    public readonly trustScore: number,
    public readonly requiredScore: number,
    reason: string,
  ) {
    super(`Trust gate blocked: ${reason} (score ${trustScore}, need ${requiredScore})`);
    this.name = "TrustGateError";
  }
}

export class QuoteError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: string,
  public readonly endpoint: string,
  ) {
    super(`Quote failed [${status}] at ${endpoint}: ${body.slice(0, 200)}`);
    this.name = "QuoteError";
  }
}

export class SwapExecutionError extends Error {
  constructor(
    public readonly quoteId: string,
    public readonly status: number,
    public readonly body: string,
  ) {
    super(`Swap execution failed for ${quoteId} [${status}]: ${body.slice(0, 200)}`);
    this.name = "SwapExecutionError";
  }
}

// ─── Trust Gate Logic ─────────────────────────────────────────────────────────

const TRUST_TIERS: {
  min: number;
  max: number;
  level: TrustLimits["level"];
  maxUSDC: string;
  slippageBps: number;
  pairs: [Hex, Hex][];
}[] = [
  { min: 76, max: 100, level: "gold", maxUSDC: "10000", slippageBps: 50, pairs: [[TOKENS.USDC, TOKENS.WETH], [TOKENS.WETH, TOKENS.USDC], [TOKENS.USDC, TOKENS.ETH]] },
  { min: 51, max: 75, level: "silver", maxUSDC: "1000", slippageBps: 100, pairs: [[TOKENS.USDC, TOKENS.WETH], [TOKENS.USDC, TOKENS.ETH]] },
  { min: 26, max: 50, level: "bronze", maxUSDC: "100", slippageBps: 300, pairs: [[TOKENS.USDC, TOKENS.WETH]] },
];

export function getSwapLimits(trustScore: number): TrustLimits {
  if (trustScore < 26) {
    return {
      maxAmount: BigInt(0),
      slippageBps: 0,
      allowedPairs: [],
      level: "blocked",
    };
  }

  for (const tier of TRUST_TIERS) {
    if (trustScore >= tier.min && trustScore <= tier.max) {
      return {
        maxAmount: parseUnits(tier.maxUSDC, 6),
        slippageBps: tier.slippageBps,
        allowedPairs: tier.pairs,
        level: tier.level,
      };
    }
  }

  return { maxAmount: BigInt(0), slippageBps: 0, allowedPairs: [], level: "blocked" };
}

function isPairAllowed(
  tokenIn: Hex,
  tokenOut: Hex,
  allowedPairs: [Hex, Hex][],
): boolean {
  return allowedPairs.some(
    ([a, b]) =>
      (a.toLowerCase() === tokenIn.toLowerCase() &&
        b.toLowerCase() === tokenOut.toLowerCase()) ||
      (b.toLowerCase() === tokenIn.toLowerCase() &&
        a.toLowerCase() === tokenOut.toLowerCase()),
  );
}

// ─── ERC20 ABI fragment ──────────────────────────────────────────────────────

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

// ─── Client ───────────────────────────────────────────────────────────────────

export class UniswapClient {
  private readonly apiKey: string;
  private readonly chainId: 8453 | 84532;
  private readonly chain: Chain;
  private readonly publicClient: PublicClient;

  constructor(config: UniswapConfig) {
    this.apiKey = config.apiKey;
    this.chainId = config.chainId;
    this.chain = config.chainId === 8453 ? base : baseSepolia;
    this.publicClient = createPublicClient({
      chain: this.chain,
      transport: http(config.rpcUrl),
    });
  }

  // ── Trust-gated quote ────────────────────────────────────────────────────

  async getQuote(params: TrustGatedSwapParams): Promise<SwapQuote> {
    const limits = getSwapLimits(params.trustScore);

    if (limits.level === "blocked") {
      throw new TrustGateError(
        params.trustScore,
        params.trustThreshold,
        `Agent trust score ${params.trustScore} below minimum 26`,
      );
    }

    if (BigInt(params.amountIn) > limits.maxAmount) {
      throw new TrustGateError(
        params.trustScore,
        params.trustThreshold,
        `Amount ${params.amountIn} exceeds trust limit ${limits.maxAmount}`,
      );
    }

    if (!isPairAllowed(params.tokenIn, params.tokenOut, limits.allowedPairs)) {
      throw new TrustGateError(
        params.trustScore,
        params.trustThreshold,
        `Pair ${params.tokenIn}/${params.tokenOut} not allowed at trust level ${limits.level}`,
      );
    }

    return this.fetchQuote(
      params.tokenIn,
      params.tokenOut,
      params.amountIn,
      params.agentAddress,
      limits.slippageBps,
    );
  }

  /** Low-level quote fetch — no trust gate. Use for testing. */
  async fetchQuote(
    tokenIn: Hex,
    tokenOut: Hex,
    amount: string,
    swapper: Hex,
    slippageBps?: number,
  ): Promise<SwapQuote> {
    const body: Record<string, unknown> = {
      type: "EXACT_INPUT",
      tokenInChainId: this.chainId,
      tokenOutChainId: this.chainId,
      generatePermitAsTransaction: false,
      autoSlippage: "DEFAULT",
      routingPreference: "BEST_PRICE",
      spreadOptimization: "EXECUTION",
      urgency: "normal",
      permitAmount: "FULL",
      amount,
      tokenIn,
      tokenOut,
      swapper,
      protocols: ["V4", "V3", "V2"],
    };

    if (slippageBps !== undefined) {
      body.autoSlippage = String(slippageBps / 100);
    }

    const res = await fetch(`${TRADING_API_BASE}/quote`, {
      method: "POST",
      headers: {
        "x-api-key": this.apiKey,
        "Content-Type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new QuoteError(res.status, text, "/v1/quote");
    }

    const data = (await res.json()) as Record<string, unknown>;
    const quote = data.quote as Record<string, unknown>;
    const input = quote.input as Record<string, string>;
    const output = quote.output as Record<string, string>;

    return {
      requestId: data.requestId as string,
      quoteId: (quote.quoteId as string) ?? "",
      routing: data.routing as string,
      tokenIn: input.token as Hex,
      tokenOut: output.token as Hex,
      amountIn: input.amount,
      amountOut: output.amount,
      priceImpact: Number(quote.priceImpact ?? 0),
      slippage: Number(quote.slippage ?? 0),
      gasFee: (quote.gasFee as string) ?? "0",
      gasFeeUSD: (quote.gasFeeUSD as string) ?? "0",
      gasUseEstimate: (quote.gasUseEstimate as string) ?? "0",
      route: (quote.route as Array<Array<Record<string, unknown>>>) ?? [],
      permitData: (data.permitData as Permit2Data) ?? null,
    };
  }

  // ── Permit2 approvals ────────────────────────────────────────────────────

  async checkAllowance(
    owner: Hex,
    tokenAddress: Hex,
    spender: Hex = PERMIT2_ADDRESS,
  ): Promise<bigint> {
    return this.publicClient.readContract({
      address: tokenAddress,
      abi: ERC20_ABI,
      functionName: "allowance",
      args: [owner, spender],
    });
  }

  async checkBalance(owner: Hex, tokenAddress: Hex): Promise<bigint> {
    return this.publicClient.readContract({
      address: tokenAddress,
      abi: ERC20_ABI,
      functionName: "balanceOf",
      args: [owner],
    });
  }

  async approvePermit2(
    walletClient: WalletClient,
    tokenAddress: Hex,
  ): Promise<Hex> {
    const maxUint256 =
      115792089237316195423570985008687907853269984665640564039457584007913129639935n;

    const { request } = await this.publicClient.simulateContract({
      address: tokenAddress,
      abi: ERC20_ABI,
      functionName: "approve",
      args: [PERMIT2_ADDRESS, maxUint256],
      account: walletClient.account!,
    });

    return walletClient.writeContract(request);
  }

  // ── Swap execution ───────────────────────────────────────────────────────

  async executeSwap(
    walletClient: WalletClient,
    quote: SwapQuote,
    signature: Hex,
  ): Promise<SwapResult> {
    const swapBody = {
      quote: {
        input: { token: quote.tokenIn, amount: quote.amountIn },
        output: {
          token: quote.tokenOut,
          amount: quote.amountOut,
          recipient: walletClient.account!.address,
        },
        swapper: walletClient.account!.address,
        chainId: this.chainId,
        slippage: quote.slippage,
        tradeType: "EXACT_INPUT",
        gasFee: quote.gasFee,
        gasFeeUSD: quote.gasFeeUSD,
        gasUseEstimate: quote.gasUseEstimate,
        quoteId: quote.quoteId,
        route: quote.route,
        aggregatedOutputs: [],
        txFailureReasons: [],
        priceImpact: quote.priceImpact,
      },
      signature,
      includeGasInfo: true,
      simulateTransaction: true,
      safetyMode: "SAFE",
    };

    const res = await fetch(`${TRADING_API_BASE}/swap`, {
      method: "POST",
      headers: {
        "x-api-key": this.apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(swapBody),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new SwapExecutionError(quote.quoteId, res.status, text);
    }

    const data = (await res.json()) as Record<string, unknown>;
    const swap = data.swap as Record<string, unknown>;

    const swapResult: SwapResult = {
      txHash: "" as Hex, // will be filled after sending
      swap: {
        to: swap.to as Hex,
        from: swap.from as Hex,
        data: swap.data as Hex,
        value: (swap.value as string) ?? "0",
        chainId: this.chainId,
        gasLimit: (swap.gasLimit as string) ?? "0",
        maxFeePerGas: (swap.maxFeePerGas as string) ?? "0",
        maxPriorityFeePerGas: (swap.maxPriorityFeePerGas as string) ?? "0",
      },
      gasFee: (data.gasFee as string) ?? "0",
    };

    // Send the transaction on-chain
    const txHash = await walletClient.sendTransaction({
      to: swapResult.swap.to,
      data: swapResult.swap.data,
      value: BigInt(swapResult.swap.value || "0"),
      gas: BigInt(swapResult.swap.gasLimit || "0"),
      maxFeePerGas: swapResult.swap.maxFeePerGas
        ? BigInt(swapResult.swap.maxFeePerGas)
        : undefined,
      maxPriorityFeePerGas: swapResult.swap.maxPriorityFeePerGas
        ? BigInt(swapResult.swap.maxPriorityFeePerGas)
        : undefined,
      account: walletClient.account!,
      chain: this.chain,
    });

    swapResult.txHash = txHash;
    return swapResult;
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  getChain(): Chain {
    return this.chain;
  }

  getPublicClient(): PublicClient {
    return this.publicClient;
  }
}
