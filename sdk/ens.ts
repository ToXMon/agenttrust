/**
 * ENS SDK — Basenames (Base L2 ENS) integration for AgentTrust.
 *
 * Supports both Base Mainnet (chainId 8453) and Base Sepolia (chainId 84532).
 * Viem built-in ENS methods (getEnsAddress, getEnsText) will NOT work —
 * they require UniversalResolver which doesn't exist on Base.
 * All operations use direct contract calls via readContract/writeContract.
 */
import {
  createPublicClient,
  createWalletClient,
  http,
  type Hex,
} from "viem";
import { baseSepolia, base } from "viem/chains";
import { namehash, normalize, labelhash } from "viem/ens";
import { privateKeyToAccount } from "viem/accounts";

// ── Contract Addresses (Base Sepolia) ──────────────────────────
const BASE_SEPOLIA_REGISTRY =
  "0x1493b2567056c2181630115660963E13A8E32735" as Hex;
const BASE_SEPOLIA_L2_RESOLVER =
  "0x6533C94869D28fAA8dF77cc63f9e2b2D6Cf77eBA" as Hex;

// ── Contract Addresses (Base Mainnet) ──────────────────────────
const BASE_MAINNET_REGISTRY =
  "0xb94704422c2a1e396835a571837aa5ae53285a95" as Hex;
const BASE_MAINNET_L2_RESOLVER =
  "0xC6d566A56A1aFf6508b41f6c90ff131615583BCD" as Hex;

// ── AgentTrust Text Record Keys ────────────────────────────────
const TEXT_KEYS = {
  AGENT_TYPE: "agent.type",
  CAPABILITIES: "agent.capabilities",
  ENDPOINT: "agent.endpoint",
  STATUS: "agent.status",
  PRICING: "agent.pricing",
} as const;

// ── Minimal ABIs ───────────────────────────────────────────────
const L2_RESOLVER_ABI = [
  {
    name: "addr",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "node", type: "bytes32" }],
    outputs: [{ name: "", type: "address" }],
  },
  {
    name: "text",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "node", type: "bytes32" },
      { name: "key", type: "string" },
    ],
    outputs: [{ name: "", type: "string" }],
  },
  {
    name: "name",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "node", type: "bytes32" }],
    outputs: [{ name: "", type: "string" }],
  },
  {
    name: "setText",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "node", type: "bytes32" },
      { name: "key", type: "string" },
      { name: "value", type: "string" },
    ],
    outputs: [],
  },
  {
    name: "setAddr",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "node", type: "bytes32" },
      { name: "addr", type: "address" },
    ],
    outputs: [],
  },
] as const;

const REGISTRY_ABI = [
  {
    name: "setSubnodeOwner",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "node", type: "bytes32" },
      { name: "label", type: "bytes32" },
      { name: "owner", type: "address" },
    ],
    outputs: [{ name: "", type: "bytes32" }],
  },
] as const;

const AGENT_REGISTRY_ABI = [
  {
    name: "getAgentByENS",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "ensName", type: "string" }],
    outputs: [{ name: "tokenId", type: "uint256" }],
  },
  {
    name: "getAgent",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [
      {
        name: "agent",
        type: "tuple",
        components: [
          { name: "ensName", type: "string" },
          { name: "capabilitiesHash", type: "bytes32" },
          { name: "registeredAt", type: "uint256" },
          { name: "isActive", type: "bool" },
        ],
      },
    ],
  },
] as const;

const TRUST_NFT_ABI = [
  {
    name: "getTrustData",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [
      {
        name: "data",
        type: "tuple",
        components: [
          { name: "score", type: "uint256" },
          { name: "agreementsCompleted", type: "uint256" },
          { name: "agreementsDisputed", type: "uint256" },
          { name: "lastUpdated", type: "uint256" },
          { name: "mintedAt", type: "uint256" },
        ],
      },
    ],
  },
] as const;

// ── Interfaces ─────────────────────────────────────────────────
export interface ENSAgentRecord {
  ensName: string;
  address: Hex;
  agentType: "requester" | "provider";
  capabilities: string[];
  trustScore: number;
  registeredAt: number;
  endpoint: string;
  status: "active" | "inactive";
  pricing: string;
}

export interface ENSConfig {
  rpcUrl: string;
  chainId: number;
  l2ResolverAddress: Hex;
  registryAddress: Hex;
  agentRegistryAddress: Hex;
  trustNftAddress: Hex;
}

export interface TrustData {
  score: number;
  agreementsCompleted: number;
  agreementsDisputed: number;
  lastUpdated: number;
  mintedAt: number;
}

// ── Config for Base Sepolia ────────────────────────────────────
export const BASE_SEPOLIA_ENS_CONFIG: ENSConfig = {
  rpcUrl: "https://sepolia.base.org",
  chainId: 84532,
  l2ResolverAddress: BASE_SEPOLIA_L2_RESOLVER,
  registryAddress: BASE_SEPOLIA_REGISTRY,
  agentRegistryAddress:
    "0x6ce3d4bf7c7140924c6ab7579b8b86dc9ebf7a02" as Hex,
  trustNftAddress: "0x92f725c404d355645d5daf9d7ab7967f2f15a952" as Hex,
};

// ── Config for Base Mainnet ────────────────────────────────────
export const BASE_MAINNET_ENS_CONFIG: ENSConfig = {
  rpcUrl: "https://mainnet.base.org",
  chainId: 8453,
  l2ResolverAddress: BASE_MAINNET_L2_RESOLVER,
  registryAddress: BASE_MAINNET_REGISTRY,
  agentRegistryAddress:
    "0xc44cC67485A6A5AB46978752789954a8Ae845eeA" as Hex,
  trustNftAddress: "0x0374f7516E57e778573B2e90E6D7113b8253FF5C" as Hex,
};

// ── ENS Client ─────────────────────────────────────────────────
export class ENSClient {
  private readonly publicClient;
  private readonly config: ENSConfig;
  private walletClient: ReturnType<typeof createWalletClient> | null = null;

  constructor(config: ENSConfig = BASE_MAINNET_ENS_CONFIG) {
    this.config = config;
    const chain = config.chainId === 8453 ? base : baseSepolia;
    this.publicClient = createPublicClient({
      chain,
      transport: http(config.rpcUrl),
    });
  }

  /** Initialise write capability with a private key. */
  initWallet(privateKey: Hex): void {
    const account = privateKeyToAccount(privateKey);
    const chain = this.config.chainId === 8453 ? base : baseSepolia;
    this.walletClient = createWalletClient({
      account,
      chain,
      transport: http(this.config.rpcUrl),
    });
  }

  // ── Read Operations ─────────────────────────────────────────

  /** Resolve a Basename (e.g. "data-agent.base.eth") to an Ethereum address. */
  async getAddress(name: string): Promise<Hex | null> {
    try {
      const node = namehash(normalize(name));
      const addr = await this.publicClient.readContract({
        address: this.config.l2ResolverAddress,
        abi: L2_RESOLVER_ABI,
        functionName: "addr",
        args: [node],
      });
      const address = addr as Hex;
      return address === "0x0000000000000000000000000000000000000000" ? null : address;
    } catch (err) {
      console.error(`[ENS] getAddress failed for ${name}:`, err);
      return null;
    }
  }

  /** Read a single text record from the L2Resolver. */
  async getTextRecord(name: string, key: string): Promise<string | null> {
    try {
      const node = namehash(normalize(name));
      const value = await this.publicClient.readContract({
        address: this.config.l2ResolverAddress,
        abi: L2_RESOLVER_ABI,
        functionName: "text",
        args: [node, key],
      });
      const result = value as string;
      return result === "" ? null : result;
    } catch (err) {
      console.error(`[ENS] getTextRecord failed for ${name}/${key}:`, err);
      return null;
    }
  }

  /** Reverse-resolve an address to its Basename. */
  async resolveAddressToName(address: Hex): Promise<string | null> {
    try {
      const reverseNode = namehash(
        `${address.toLowerCase().slice(2)}.addr.reverse`,
      );
      const name = await this.publicClient.readContract({
        address: this.config.l2ResolverAddress,
        abi: L2_RESOLVER_ABI,
        functionName: "name",
        args: [reverseNode],
      });
      return (name as string) || null;
    } catch (err) {
      console.error(`[ENS] resolveAddressToName failed for ${address}:`, err);
      return null;
    }
  }

  /** Resolve a full agent record by reading all text records + on-chain data. */
  async resolveAgent(name: string): Promise<ENSAgentRecord | null> {
    try {
      const address = await this.getAddress(name);
      if (!address) {
        console.log(`[ENS] No address found for ${name}`);
        return null;
      }
      const [agentType, capsRaw, endpoint, status, pricing] = await Promise.all([
        this.getTextRecord(name, TEXT_KEYS.AGENT_TYPE),
        this.getTextRecord(name, TEXT_KEYS.CAPABILITIES),
        this.getTextRecord(name, TEXT_KEYS.ENDPOINT),
        this.getTextRecord(name, TEXT_KEYS.STATUS),
        this.getTextRecord(name, TEXT_KEYS.PRICING),
      ]);
      let capabilities: string[] = [];
      try {
        capabilities = capsRaw ? (JSON.parse(capsRaw) as string[]) : [];
      } catch {
        capabilities = capsRaw ? [capsRaw] : [];
      }
      const trustScore = await this.getTrustScore(address);
      return {
        ensName: name,
        address,
        agentType: (agentType as "requester" | "provider") ?? "requester",
        capabilities,
        trustScore,
        registeredAt: Date.now(),
        endpoint: endpoint ?? "",
        status: (status as "active" | "inactive") ?? "inactive",
        pricing: pricing ?? "",
      };
    } catch (err) {
      console.error(`[ENS] resolveAgent failed for ${name}:`, err);
      return null;
    }
  }

  /** Read agent capabilities as a parsed array. */
  async getAgentCapabilities(name: string): Promise<string[]> {
    const raw = await this.getTextRecord(name, TEXT_KEYS.CAPABILITIES);
    if (!raw) return [];
    try {
      return JSON.parse(raw) as string[];
    } catch {
      return [raw];
    }
  }

  /** Get trust score from on-chain TrustNFT by agent address. */
  async getTrustScore(agentAddress: Hex): Promise<number> {
    try {
      const tokenId = await this.getAgentTokenId(agentAddress);
      if (tokenId === 0n) {
        console.log(`[ENS] No TrustNFT found for ${agentAddress}`);
        return 0;
      }
      const data = await this.publicClient.readContract({
        address: this.config.trustNftAddress,
        abi: TRUST_NFT_ABI,
        functionName: "getTrustData",
        args: [tokenId],
      });
      const trustData = data as {
        score: bigint;
        agreementsCompleted: bigint;
        agreementsDisputed: bigint;
        lastUpdated: bigint;
        mintedAt: bigint;
      };
      return Number(trustData.score);
    } catch (err) {
      console.error(`[ENS] getTrustScore failed for ${agentAddress}:`, err);
      return 0;
    }
  }

  /** Get full TrustData struct from TrustNFT. */
  async getTrustData(agentAddress: Hex): Promise<TrustData | null> {
    try {
      const tokenId = await this.getAgentTokenId(agentAddress);
      if (tokenId === 0n) return null;
      const data = await this.publicClient.readContract({
        address: this.config.trustNftAddress,
        abi: TRUST_NFT_ABI,
        functionName: "getTrustData",
        args: [tokenId],
      });
      const td = data as {
        score: bigint;
        agreementsCompleted: bigint;
        agreementsDisputed: bigint;
        lastUpdated: bigint;
        mintedAt: bigint;
      };
      return {
        score: Number(td.score),
        agreementsCompleted: Number(td.agreementsCompleted),
        agreementsDisputed: Number(td.agreementsDisputed),
        lastUpdated: Number(td.lastUpdated),
        mintedAt: Number(td.mintedAt),
      };
    } catch (err) {
      console.error(`[ENS] getTrustData failed for ${agentAddress}:`, err);
      return null;
    }
  }

  /** Discover agents by querying AgentRegistry for a given ENS name. */
  async discoverAgentByENS(ensName: string): Promise<{
    ensName: string;
    capabilitiesHash: Hex;
    registeredAt: number;
    isActive: boolean;
  } | null> {
    try {
      const tokenId = await this.publicClient.readContract({
        address: this.config.agentRegistryAddress,
        abi: AGENT_REGISTRY_ABI,
        functionName: "getAgentByENS",
        args: [ensName],
      });
      if ((tokenId as bigint) === 0n) return null;
      const agent = await this.publicClient.readContract({
        address: this.config.agentRegistryAddress,
        abi: AGENT_REGISTRY_ABI,
        functionName: "getAgent",
        args: [tokenId as bigint],
      });
      const a = agent as {
        ensName: string;
        capabilitiesHash: Hex;
        registeredAt: bigint;
        isActive: boolean;
      };
      return {
        ensName: a.ensName,
        capabilitiesHash: a.capabilitiesHash,
        registeredAt: Number(a.registeredAt),
        isActive: a.isActive,
      };
    } catch (err) {
      console.error(`[ENS] discoverAgentByENS failed for ${ensName}:`, err);
      return null;
    }
  }

  // ── Write Operations ────────────────────────────────────────

  /** Set a text record on a Basename (requires ownership). */
  async setTextRecord(name: string, key: string, value: string): Promise<Hex> {
    if (!this.walletClient) throw new Error("[ENS] Wallet not initialised — call initWallet() first");
    const node = namehash(normalize(name));
    const { request } = await this.publicClient.simulateContract({
      address: this.config.l2ResolverAddress,
      abi: L2_RESOLVER_ABI,
      functionName: "setText",
      args: [node, key, value],
      account: this.walletClient.account,
    });
    const txHash = await this.walletClient.writeContract(request);
    console.log(`[ENS] setTextRecord tx: ${txHash} (${name} ${key}=${value})`);
    return txHash;
  }

  /** Set the address record for a Basename. */
  async setAddress(name: string, addr: Hex): Promise<Hex> {
    if (!this.walletClient) throw new Error("[ENS] Wallet not initialised — call initWallet() first");
    const node = namehash(normalize(name));
    const { request } = await this.publicClient.simulateContract({
      address: this.config.l2ResolverAddress,
      abi: L2_RESOLVER_ABI,
      functionName: "setAddr",
      args: [node, addr],
      account: this.walletClient.account,
    });
    const txHash = await this.walletClient.writeContract(request);
    console.log(`[ENS] setAddress tx: ${txHash} (${name} -> ${addr})`);
    return txHash;
  }

  /** Create a subname under a parent domain (requires owning the parent). */
  async createSubname(
    parentName: string,
    label: string,
    ownerAddress: Hex,
  ): Promise<Hex> {
    if (!this.walletClient) throw new Error("[ENS] Wallet not initialised — call initWallet() first");
    const parentNode = namehash(normalize(parentName));
    const labelHash = labelhash(label);
    const { request } = await this.publicClient.simulateContract({
      address: this.config.registryAddress,
      abi: REGISTRY_ABI,
      functionName: "setSubnodeOwner",
      args: [parentNode, labelHash, ownerAddress],
      account: this.walletClient.account,
    });
    const txHash = await this.walletClient.writeContract(request);
    console.log(`[ENS] createSubname tx: ${txHash} (${label}.${parentName})`);
    return txHash;
  }

  /** Register agent metadata by setting all text records at once. */
  async registerAgentMetadata(
    name: string,
    metadata: {
      agentType: "requester" | "provider";
      capabilities: string[];
      endpoint: string;
      pricing: string;
    },
  ): Promise<Hex[]> {
    const txHashes: Hex[] = [];
    txHashes.push(await this.setTextRecord(name, TEXT_KEYS.AGENT_TYPE, metadata.agentType));
    txHashes.push(
      await this.setTextRecord(name, TEXT_KEYS.CAPABILITIES, JSON.stringify(metadata.capabilities)),
    );
    txHashes.push(await this.setTextRecord(name, TEXT_KEYS.ENDPOINT, metadata.endpoint));
    txHashes.push(await this.setTextRecord(name, TEXT_KEYS.STATUS, "active"));
    txHashes.push(await this.setTextRecord(name, TEXT_KEYS.PRICING, metadata.pricing));
    console.log(`[ENS] Registered ${name} metadata in ${txHashes.length} txs`);
    return txHashes;
  }

  // ── Internal ────────────────────────────────────────────────

  /** Look up AgentRegistry tokenId for an address. */
  private async getAgentTokenId(agentAddress: Hex): Promise<bigint> {
    try {
      const tokenId = await this.publicClient.readContract({
        address: this.config.agentRegistryAddress,
        abi: [
          {
            name: "getAgentByAddress",
            type: "function",
            stateMutability: "view",
            inputs: [{ name: "agentAddress", type: "address" }],
            outputs: [{ name: "tokenId", type: "uint256" }],
          },
        ] as const,
        functionName: "getAgentByAddress",
        args: [agentAddress],
      });
      return tokenId as bigint;
    } catch {
      return 0n;
    }
  }
}
