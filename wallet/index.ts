/**
 * AgentWallet — Multi-chain EVM wallet for AgentTrust agents.
 *
 * Uses viem (NOT ethers) for all wallet operations.
 * Supports 6 chains: Base (primary), Ethereum, Polygon, Arbitrum, Optimism, BSC.
 *
 * Usage:
 *   const wallet = AgentWallet.fromPrivateKey(pk);
 *   const balance = await wallet.getBalance("base");
 *   const result = await wallet.signTransaction(tx, "base");
 */
import {
  createPublicClient,
  createWalletClient,
  http,
  formatUnits,
  type Hex,
  type WalletClient,
  type PublicClient,
  type TransactionReceipt,
  type Chain,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import {
  CHAINS,
  getChainConfig,
  getExplorerTxUrl,
  DEFAULT_CHAIN,
  type ChainName,
} from "./chains.js";
import {
  ERC20_ABI,
  type TransactionParams,
  type TransactionResult,
  type GasEstimate,
  type WalletInfo,
  type ERC20Balance,
} from "./types.js";

// ── Viem Chain Builder ────────────────────────────────────────────────

/** Build a viem-compatible chain definition from our ChainConfig. */
function buildViemChain(chainName: ChainName): Chain {
  const cfg = getChainConfig(chainName);
  return {
    id: cfg.chainId,
    name: cfg.name,
    nativeCurrency: {
      name: cfg.nativeToken.symbol,
      symbol: cfg.nativeToken.symbol,
      decimals: cfg.nativeToken.decimals,
    },
    rpcUrls: {
      default: { http: cfg.rpcs },
      public: { http: cfg.rpcs },
    },
    blockExplorers: {
      default: { name: cfg.explorer.name, url: cfg.explorer.url },
    },
  } as unknown as Chain;
}

// ── AgentWallet ───────────────────────────────────────────────────────

/** Multi-chain EVM wallet for agent operations. */
export class AgentWallet {
  private readonly privateKey: Hex;
  private readonly account: ReturnType<typeof privateKeyToAccount>;
  private walletClients: Map<string, WalletClient> = new Map();
  private publicClients: Map<string, PublicClient> = new Map();

  private constructor(privateKey: Hex) {
    this.privateKey = privateKey;
    this.account = privateKeyToAccount(privateKey);
  }

  // ── Factory ──────────────────────────────────────────────────────

  /** Create an AgentWallet from a private key. */
  static fromPrivateKey(privateKey: Hex): AgentWallet {
    return new AgentWallet(privateKey);
  }

  /** Create from env var AGENT_PRIVATE_KEY (throws if missing). */
  static fromEnv(): AgentWallet {
    const pk = process.env["AGENT_PRIVATE_KEY"] as Hex | undefined;
    if (!pk) {
      throw new Error(
        "AGENT_PRIVATE_KEY environment variable is required",
      );
    }
    return new AgentWallet(pk);
  }

  // ── Identity ─────────────────────────────────────────────────────

  /** Get the agent's checksummed Ethereum address. */
  getAddress(): Hex {
    return this.account.address;
  }

  /** Get safe wallet info (no private key). */
  getInfo(): WalletInfo {
    return {
      address: this.account.address,
      createdAt: new Date().toISOString(),
    };
  }

  // ── Client Access ────────────────────────────────────────────────

  /** Get or create a viem wallet client for a chain. */
  getWalletClient(chainName: ChainName = DEFAULT_CHAIN): WalletClient {
    const cached = this.walletClients.get(chainName);
    if (cached) return cached;

    const chain = buildViemChain(chainName);
    const cfg = getChainConfig(chainName);
    const client = createWalletClient({
      account: this.account,
      chain,
      transport: http(cfg.rpcs[0], { retryCount: 3, timeout: 30_000 }),
    });
    this.walletClients.set(chainName, client);
    return client;
  }

  /** Get or create a viem public client for a chain. */
  getPublicClient(chainName: ChainName = DEFAULT_CHAIN): PublicClient {
    const cached = this.publicClients.get(chainName);
    if (cached) return cached;

    const chain = buildViemChain(chainName);
    const cfg = getChainConfig(chainName);
    const client = createPublicClient({
      chain,
      transport: http(cfg.rpcs[0], { retryCount: 3, timeout: 30_000 }),
    });
    this.publicClients.set(chainName, client);
    return client;
  }

  // ── Balance Queries ──────────────────────────────────────────────

  /** Get native ETH/token balance for the wallet on a given chain. */
  async getBalance(chainName: ChainName = DEFAULT_CHAIN): Promise<bigint> {
    const client = this.getPublicClient(chainName);
    return client.getBalance({ address: this.account.address });
  }

  /** Get formatted native balance as a string. */
  async getFormattedBalance(
    chainName: ChainName = DEFAULT_CHAIN,
  ): Promise<string> {
    const balance = await this.getBalance(chainName);
    const cfg = getChainConfig(chainName);
    return formatUnits(balance, cfg.nativeToken.decimals);
  }

  /** Get ERC20 token balance. */
  async getERC20Balance(
    tokenAddress: Hex,
    chainName: ChainName = DEFAULT_CHAIN,
  ): Promise<ERC20Balance> {
    const client = this.getPublicClient(chainName);
    const address = this.account.address;

    const [rawBalance, decimals, symbol] = await Promise.all([
      client.readContract({
        address: tokenAddress,
        abi: ERC20_ABI,
        functionName: "balanceOf",
        args: [address],
      }) as Promise<bigint>,
      client.readContract({
        address: tokenAddress,
        abi: ERC20_ABI,
        functionName: "decimals",
      }) as Promise<number>,
      client.readContract({
        address: tokenAddress,
        abi: ERC20_ABI,
        functionName: "symbol",
      }) as Promise<string>,
    ]);

    return {
      raw: rawBalance,
      formatted: formatUnits(rawBalance, decimals),
      symbol,
      decimals,
    };
  }

  // ── Gas Estimation ───────────────────────────────────────────────

  /** Estimate gas for an EIP-1559 transaction. */
  async estimateGas(
    tx: TransactionParams,
    chainName: ChainName = DEFAULT_CHAIN,
  ): Promise<GasEstimate> {
    const publicClient = this.getPublicClient(chainName);

    const [gasEstimate, feeData] = await Promise.all([
      publicClient.estimateGas({
        account: this.account.address,
        to: tx.to,
        value: tx.value ?? 0n,
        data: tx.data,
      }),
      publicClient.estimateFeesPerGas(),
    ]);

    const maxFeePerGas =
      tx.maxFeePerGas ?? feeData.maxFeePerGas ?? 2_000_000_000n;
    const maxPriorityFeePerGas =
      tx.maxPriorityFeePerGas ??
      feeData.maxPriorityFeePerGas ??
      1_000_000_000n;
    const estimatedCost = gasEstimate * maxFeePerGas + (tx.value ?? 0n);

    return {
      gasLimit: gasEstimate,
      maxFeePerGas,
      maxPriorityFeePerGas,
      estimatedCost,
    };
  }

  // ── Transaction Execution ────────────────────────────────────────

  /** Sign and broadcast an EIP-1559 transaction. Waits for receipt. */
  async signTransaction(
    tx: TransactionParams,
    chainName: ChainName = DEFAULT_CHAIN,
  ): Promise<TransactionResult> {
    const walletClient = this.getWalletClient(chainName);
    const publicClient = this.getPublicClient(chainName);

    // Auto-estimate gas if not provided
    const gas = tx.gas ?? (await this.estimateGas(tx, chainName)).gasLimit;

    const hash = await walletClient.sendTransaction({
      account: this.account,
      to: tx.to,
      value: tx.value ?? undefined,
      data: tx.data ?? undefined,
      gas,
      maxFeePerGas: tx.maxFeePerGas ?? undefined,
      maxPriorityFeePerGas: tx.maxPriorityFeePerGas ?? undefined,
      nonce: tx.nonce ?? undefined,
      chain: walletClient.chain,
    });

    // Wait for receipt (timeout 60s)
    const receipt: TransactionReceipt =
      await publicClient.waitForTransactionReceipt({
        hash,
        timeout: 60_000,
      });

    return {
      hash: receipt.transactionHash,
      explorerUrl: getExplorerTxUrl(chainName, receipt.transactionHash),
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed,
      status: receipt.status === "success" ? 1 : 0,
    };
  }
}

// ── Convenience Exports ───────────────────────────────────────────────

export { CHAINS, getChainConfig, getExplorerTxUrl, getExplorerAddressUrl, DEFAULT_CHAIN } from "./chains.js";
export { getChainById, getSupportedChains } from "./chains.js";
export type { ChainName, ChainConfig } from "./types.js";
export type { TransactionParams, TransactionResult, GasEstimate, WalletInfo, ERC20Balance } from "./types.js";
export { ERC20_ABI } from "./types.js";

/** Check if an environment has a valid private key configured. */
export function isWalletConfigured(): boolean {
  const pk = process.env["AGENT_PRIVATE_KEY"];
  return typeof pk === "string" && pk.startsWith("0x") && pk.length === 66;
}
