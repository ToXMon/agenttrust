/**
 * Wallet module type definitions — shared types for AgentWallet,
 * chain configs, and transaction helpers.
 */

import type { Hex } from "viem";

// ── Chain Types ───────────────────────────────────────────────────────

/** Supported chain names for multi-chain wallet operations. */
export type ChainName =
  | "base"
  | "ethereum"
  | "polygon"
  | "arbitrum"
  | "optimism"
  | "bsc";

/** Configuration for a single EVM chain. */
export interface ChainConfig {
  /** Chain ID (e.g. 8453 for Base) */
  chainId: number;
  /** Human-readable chain name */
  name: string;
  /** Native token info */
  nativeToken: {
    symbol: string;
    decimals: number;
  };
  /** Block explorer config */
  explorer: {
    name: string;
    url: string;
  };
  /** RPC endpoints (ordered by preference) */
  rpcs: string[];
}

// ── Transaction Types ─────────────────────────────────────────────────

/** Parameters for constructing an EIP-1559 transaction. */
export interface TransactionParams {
  /** Recipient address */
  to: Hex;
  /** Value in wei (as bigint) */
  value?: bigint;
  /** Encoded contract calldata */
  data?: Hex;
  /** Max fee per gas (wei) — auto-estimated if omitted */
  maxFeePerGas?: bigint;
  /** Max priority fee per gas (wei) — auto-estimated if omitted */
  maxPriorityFeePerGas?: bigint;
  /** Gas limit — auto-estimated if omitted */
  gas?: bigint;
  /** Nonce — auto-fetched if omitted */
  nonce?: number;
}

/** Result of a signed and broadcast transaction. */
export interface TransactionResult {
  /** Transaction hash */
  hash: Hex;
  /** Explorer URL for the transaction */
  explorerUrl: string;
  /** Block number the tx was included in (null if pending) */
  blockNumber: bigint | null;
  /** Gas used (null if pending) */
  gasUsed: bigint | null;
  /** Status: 1 = success, 0 = reverted, null = pending */
  status: number | null;
}

/** EIP-1559 gas estimation result. */
export interface GasEstimate {
  /** Estimated gas limit */
  gasLimit: bigint;
  /** Suggested max fee per gas (wei) */
  maxFeePerGas: bigint;
  /** Suggested max priority fee per gas (wei) */
  maxPriorityFeePerGas: bigint;
  /** Estimated total cost (gasLimit × maxFeePerGas + value) */
  estimatedCost: bigint;
}

// ── Wallet Types ──────────────────────────────────────────────────────

/** Wallet info (safe — no private key). */
export interface WalletInfo {
  /** Checksummed Ethereum address */
  address: Hex;
  /** ISO timestamp of wallet creation */
  createdAt: string;
}

/** ERC20 token balance result. */
export interface ERC20Balance {
  /** Raw balance (wei-scale bigint) */
  raw: bigint;
  /** Human-readable balance (adjusted for decimals) */
  formatted: string;
  /** Token symbol */
  symbol: string;
  /** Token decimals */
  decimals: number;
}

/** Minimal ERC20 ABI for balance checking. */
export const ERC20_ABI = [
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "decimals",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint8" }],
  },
  {
    name: "symbol",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "string" }],
  },
] as const;
