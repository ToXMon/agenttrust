/**
 * ERC-8004 Integration — Agent identity and reputation for trust-gated commerce
 *
 * Interfaces with IdentityRegistry (ERC-721) and ReputationRegistry on Base mainnet.
 * These contracts form the on-chain identity and feedback layer for the
 * agent commerce loop: discover → trust → transact → rate.
 */

import {
  type Hex,
  type WalletClient,
  type PublicClient,
} from "viem";

// ─── Contract Addresses (Base Mainnet 8453) ──────────────────────────────────

export const ERC8004_IDENTITY_REGISTRY =
  "0x8004A169FB4a3325136EB29fA0ceB6D2e539a432" as Hex;

export const ERC8004_REPUTATION_REGISTRY =
  "0x8004BAa17C55a88189AE136b182e5fdA19dE9b63" as Hex;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AgentRegistrationParams {
  walletClient: WalletClient;
  publicClient: PublicClient;
  agentURI: string;
  metadata: Hex;
}

export interface AgentRegistrationResult {
  agentId: bigint;
  txHash: Hex;
}

export interface ReputationQuery {
  agentId: bigint;
  tag1?: string;
  tag2?: string;
  trustedClients?: Hex[];
}

export interface ReputationSummary {
  count: bigint;
  value: bigint;
  decimals: number;
  /** Normalized score 0-100 computed from value/10^decimals */
  normalizedScore: number;
}

export interface FeedbackSubmissionParams {
  walletClient: WalletClient;
  publicClient: PublicClient;
  agentId: bigint;
  value: number;
  decimals: number;
  tag1: string;
  tag2: string;
  endpoint: string;
  ipfsHash: string;
}

export interface FeedbackSubmissionResult {
  txHash: Hex;
}

export interface ERC8004SwapLimit {
  maxAmountUSDC: string;
  slippageBps: number;
  tier: "blocked" | "bronze" | "silver" | "gold";
  reputationScore: number;
  hasIdentity: boolean;
}

// ─── Custom Errors ────────────────────────────────────────────────────────────

export class ERC8004Error extends Error {
  constructor(
    public readonly contract: string,
    public readonly operation: string,
    reason: string,
  ) {
    super(`ERC-8004 ${contract}.${operation} failed: ${reason}`);
    this.name = "ERC8004Error";
  }
}

export class IdentityNotFoundError extends ERC8004Error {
  constructor(public readonly address: Hex) {
    super("IdentityRegistry", "getAgentIdByOwner", `No identity for ${address}`);
    this.name = "IdentityNotFoundError";
  }
}

export class ReputationQueryError extends ERC8004Error {
  constructor(agentId: bigint, reason: string) {
    super("ReputationRegistry", "getSummary", `Agent ${agentId}: ${reason}`);
    this.name = "ReputationQueryError";
  }
}

// ─── ABI Fragments ────────────────────────────────────────────────────────────

const IDENTITY_REGISTRY_ABI = [
  {
    name: "register",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "owner", type: "address" },
      { name: "agentURI", type: "string" },
      { name: "metadata", type: "bytes" },
    ],
    outputs: [{ name: "agentId", type: "uint256" }],
  },
  {
    name: "ownerOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "agentId", type: "uint256" }],
    outputs: [{ name: "", type: "address" }],
  },
  {
    name: "getAgentCapabilities",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "agentId", type: "uint256" }],
    outputs: [{ name: "", type: "bytes32[]" }],
  },
  {
    name: "updateAgentMetadata",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "agentId", type: "uint256" },
      { name: "metadataURI", type: "string" },
    ],
    outputs: [],
  },
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "owner", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "tokenOfOwnerByIndex",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "index", type: "uint256" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

const REPUTATION_REGISTRY_ABI = [
  {
    name: "giveFeedback",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "agentId", type: "uint256" },
      { name: "value", type: "int128" },
      { name: "valueDecimals", type: "uint8" },
      { name: "tag1", type: "string" },
      { name: "tag2", type: "string" },
      { name: "endpoint", type: "string" },
      { name: "ipfsHash", type: "string" },
      { name: "dataHash", type: "bytes32" },
    ],
    outputs: [],
  },
  {
    name: "getSummary",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "agentId", type: "uint256" },
      { name: "trustedClients", type: "address[]" },
      { name: "tag1", type: "string" },
      { name: "tag2", type: "string" },
    ],
    outputs: [
      { name: "count", type: "uint64" },
      { name: "value", type: "int128" },
      { name: "decimals", type: "uint8" },
    ],
  },
  {
    name: "getReputationScore",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "agentId", type: "uint256" }],
    outputs: [{ name: "score", type: "uint256" }],
  },
] as const;

// ─── Functions ────────────────────────────────────────────────────────────────

/**
 * Register a new agent identity on the ERC-8004 IdentityRegistry.
 *
 * Mints an ERC-721 token representing the agent's on-chain identity.
 * The caller (wallet owner) becomes the token owner.
 */
export async function registerAgentIdentity(
  params: AgentRegistrationParams,
): Promise<AgentRegistrationResult> {
  const { walletClient, publicClient, agentURI, metadata } = params;

  if (!walletClient.account) {
    throw new ERC8004Error(
      "IdentityRegistry",
      "register",
      "WalletClient has no account attached",
    );
  }

  const { request } = await publicClient.simulateContract({
    address: ERC8004_IDENTITY_REGISTRY,
    abi: IDENTITY_REGISTRY_ABI,
    functionName: "register",
    args: [walletClient.account.address, agentURI, metadata],
    account: walletClient.account,
  });

  const txHash = await walletClient.writeContract(request);

  const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });

  // Parse AgentRegistered event to get the agentId
  const log = receipt.logs.find(
    (l) => l.address.toLowerCase() === ERC8004_IDENTITY_REGISTRY.toLowerCase(),
  );

  let agentId = BigInt(0);
  if (log) {
    // The agentId is typically the first indexed topic (topic1) in the event
    agentId = BigInt(log.topics[1] ?? "0x0");
  }

  return { agentId, txHash };
}

/*** Query an agent's reputation score from the ERC-8004 ReputationRegistry.
 *
 * Uses `getSummary()` to aggregate feedback for the given tags.
 * Returns a normalized 0-100 score derived from the raw value and decimals.
 */
export async function getAgentReputation(
  publicClient: PublicClient,
  params: ReputationQuery,
): Promise<ReputationSummary> {
  const { agentId, tag1 = "", tag2 = "", trustedClients = [] } = params;

  try {
    const [count, value, decimals] = await publicClient.readContract({
      address: ERC8004_REPUTATION_REGISTRY,
      abi: REPUTATION_REGISTRY_ABI,
      functionName: "getSummary",
      args: [agentId, trustedClients, tag1, tag2],
    });

    // Normalize: value / 10^decimals gives the actual score
    const divisor = Math.pow(10, Number(decimals));
    const normalizedScore =
      divisor > 0 ? Math.min(100, Math.max(0, Number(value) / divisor)) : 0;

    return {
      count: count as bigint,
      value: value as bigint,
      decimals: Number(decimals),
      normalizedScore,
    };
  } catch (err) {
    throw new ReputationQueryError(
      agentId,
      err instanceof Error ? err.message : String(err),
    );
  }
}

/*** Submit feedback for an agent after a service interaction.
 *
 * Writes a signed feedback entry to the ReputationRegistry.
 * Example: Quality 87/100 → value=87, decimals=0. Uptime 99.77% → value=9977, decimals=2.
 */
export async function submitFeedback(
  params: FeedbackSubmissionParams,
): Promise<FeedbackSubmissionResult> {
  const {
    walletClient,
    publicClient,
    agentId,
    value,
    decimals,
    tag1,
    tag2,
    endpoint,
    ipfsHash,
  } = params;

  if (!walletClient.account) {
    throw new ERC8004Error(
      "ReputationRegistry",
      "giveFeedback",
      "WalletClient has no account attached",
    );
  }

  const dataHash =
    "0x0000000000000000000000000000000000000000000000000000000000000000" as Hex;

  const { request } = await publicClient.simulateContract({
    address: ERC8004_REPUTATION_REGISTRY,
    abi: REPUTATION_REGISTRY_ABI,
    functionName: "giveFeedback",
    args: [
      agentId,
      BigInt(value),
      decimals,
      tag1,
      tag2,
      endpoint,
      ipfsHash,
      dataHash,
    ],
    account: walletClient.account,
  });

  const txHash = await walletClient.writeContract(request);

  return { txHash };
}

/*** Look up an agent's ERC-8004 identity token by owner address.
 *
 * Queries the IdentityRegistry (ERC-721) for tokens owned by the address.
 * Returns the agentId (tokenId) if found.
 */
export async function getAgentIdByOwner(
  publicClient: PublicClient,
  owner: Hex,
): Promise<bigint | null> {
  try {
    const balance = await publicClient.readContract({
      address: ERC8004_IDENTITY_REGISTRY,
      abi: IDENTITY_REGISTRY_ABI,
      functionName: "balanceOf",
      args: [owner],
    });

    if ((balance as bigint) === BigInt(0)) {
      return null;
    }

    // Get the first token owned by this address
    const agentId = await publicClient.readContract({
      address: ERC8004_IDENTITY_REGISTRY,
      abi: IDENTITY_REGISTRY_ABI,
      functionName: "tokenOfOwnerByIndex",
      args: [owner, BigInt(0)],
    });

    return agentId as bigint;
  } catch {
    return null;
  }
}

/*** Query ERC-8004 reputation and compute trust-gated swap limits.
 *
 * This is the main entry point for the Uniswap integration: it checks
 * whether the agent has an ERC-8004 identity, pulls its reputation score,
 * and maps it to swap parameters (max USDC amount, slippage tolerance, tier).
 *
 * Tier system:
 * - No identity or reputation < 50: falls back to existing trust score tiers
 * - Reputation 50-69 (bronze): max 100 USDC, 300bps slippage
 * - Reputation 70-84 (silver): max 1,000 USDC, 100bps slippage
 * - Reputation 85-100 (gold): max 10,000 USDC, 50bps slippage
 */
export async function getTrustGatedSwapLimit(
  publicClient: PublicClient,
  agentAddress: Hex,
): Promise<ERC8004SwapLimit> {
  const agentId = await getAgentIdByOwner(publicClient, agentAddress);

  if (agentId === null) {
    return {
      maxAmountUSDC: "0",
      slippageBps: 0,
      tier: "blocked",
      reputationScore: 0,
      hasIdentity: false,
    };
  }

  let reputationScore = 0;
  try {
    const summary = await getAgentReputation(publicClient, {
      agentId,
      tag1: "quality",
      tag2: "",
    });
    reputationScore = summary.normalizedScore;
  } catch {
    // If reputation query fails, treat as no reputation
    reputationScore = 0;
  }

  if (reputationScore < 50) {
    return {
      maxAmountUSDC: "0",
      slippageBps: 0,
      tier: "blocked",
      reputationScore,
      hasIdentity: true,
    };
  }

  if (reputationScore <= 69) {
    return {
      maxAmountUSDC: "100",
      slippageBps: 300,
      tier: "bronze",
      reputationScore,
      hasIdentity: true,
    };
  }

  if (reputationScore <= 84) {
    return {
      maxAmountUSDC: "1000",
      slippageBps: 100,
      tier: "silver",
      reputationScore,
      hasIdentity: true,
    };
  }

  return {
    maxAmountUSDC: "10000",
    slippageBps: 50,
    tier: "gold",
    reputationScore,
    hasIdentity: true,
  };
}
