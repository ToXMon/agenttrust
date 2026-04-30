/**
 * EVM Chain Configurations — chain IDs, RPC endpoints,
 * block explorers, and native token metadata.
 *
 * Adapted from evm-wallet-skill (viem-based, 6-chain support).
 * Base (chainId 8453) is the primary chain for AgentTrust.
 */
import type { ChainConfig, ChainName } from "./types.js";
export type { ChainName } from "./types.js";

// ── Chain Definitions ─────────────────────────────────────────────────

export const CHAINS: Record<ChainName, ChainConfig> = {
  base: {
    chainId: 8453,
    name: "Base",
    nativeToken: { symbol: "ETH", decimals: 18 },
    explorer: { name: "BaseScan", url: "https://basescan.org" },
    rpcs: [
      "https://mainnet.base.org",
      "https://base.publicnode.com",
      "https://base.llamarpc.com",
    ],
  },

  ethereum: {
    chainId: 1,
    name: "Ethereum",
    nativeToken: { symbol: "ETH", decimals: 18 },
    explorer: { name: "Etherscan", url: "https://etherscan.io" },
    rpcs: [
      "https://ethereum.publicnode.com",
      "https://cloudflare-eth.com",
      "https://rpc.ankr.com/eth",
    ],
  },

  polygon: {
    chainId: 137,
    name: "Polygon",
    nativeToken: { symbol: "POL", decimals: 18 },
    explorer: { name: "PolygonScan", url: "https://polygonscan.com" },
    rpcs: [
      "https://polygon.llamarpc.com",
      "https://polygon.publicnode.com",
      "https://rpc.ankr.com/polygon",
    ],
  },

  arbitrum: {
    chainId: 42161,
    name: "Arbitrum One",
    nativeToken: { symbol: "ETH", decimals: 18 },
    explorer: { name: "Arbiscan", url: "https://arbiscan.io" },
    rpcs: [
      "https://arbitrum.publicnode.com",
      "https://arbitrum.llamarpc.com",
      "https://rpc.ankr.com/arbitrum",
    ],
  },

  optimism: {
    chainId: 10,
    name: "Optimism",
    nativeToken: { symbol: "ETH", decimals: 18 },
    explorer: {
      name: "Optimism Etherscan",
      url: "https://optimistic.etherscan.io",
    },
    rpcs: [
      "https://optimism.publicnode.com",
      "https://optimism.llamarpc.com",
      "https://rpc.ankr.com/optimism",
    ],
  },

  bsc: {
    chainId: 56,
    name: "BNB Smart Chain",
    nativeToken: { symbol: "BNB", decimals: 18 },
    explorer: { name: "BscScan", url: "https://bscscan.com" },
    rpcs: [
      "https://bsc.publicnode.com",
      "https://bsc.llamarpc.com",
      "https://rpc.ankr.com/bsc",
    ],
  },
};

// ── Lookup Helpers ─────────────────────────────────────────────────────

/** Get chain config by name. Throws if unsupported. */
export function getChainConfig(name: ChainName): ChainConfig {
  const chain = CHAINS[name];
  if (!chain) {
    throw new Error(
      `Unsupported chain: ${name}. Supported: ${Object.keys(CHAINS).join(", ")}`,
    );
  }
  return chain;
}

/** Get chain config by chainId. Returns undefined if not found. */
export function getChainById(chainId: number): ChainConfig | undefined {
  return Object.values(CHAINS).find((c) => c.chainId === chainId);
}

/** Get all supported chain names. */
export function getSupportedChains(): ChainName[] {
  return Object.keys(CHAINS) as ChainName[];
}

/** Build a block explorer URL for a transaction. */
export function getExplorerTxUrl(
  name: ChainName,
  txHash: string,
): string {
  const chain = getChainConfig(name);
  return `${chain.explorer.url}/tx/${txHash}`;
}

/** Build a block explorer URL for an address. */
export function getExplorerAddressUrl(
  name: ChainName,
  address: string,
): string {
  const chain = getChainConfig(name);
  return `${chain.explorer.url}/address/${address}`;
}

/** Default chain for AgentTrust operations. */
export const DEFAULT_CHAIN: ChainName = "base";
