/**
 * 0G Storage & Compute SDK — Decentralized storage for agent outputs,
 * audit logs, and AI inference with TEE verification.
 *
 * Uses @0gfoundation/0g-ts-sdk for storage (Indexer, MemData)
 * and @0glabs/0g-serving-broker for compute inference.
 *
 * NOTE: 0g-ts-sdk bundles its own ethers dependency; we use the project's
 * ethers v6 for wallet/provider creation passed to the SDK.
 */
import { ethers } from "ethers";
import type { Hex } from "viem";

// ── CJS Interop (packages without type declarations) ───────────────────
// eslint-disable-next-line @typescript-eslint/no-var-requires
const _0gStorage = require("@0gfoundation/0g-ts-sdk") as ZeroGStorageModule;
// eslint-disable-next-line @typescript-eslint/no-var-requires
const _0gCompute = require("@0glabs/0g-serving-broker") as ZeroGComputeModule;

// ── Module Shape Types (no published .d.ts) ───────────────────────────
interface ZeroGStorageModule {
  Indexer: new (url: string) => ZeroGIndexerInstance;
  MemData: new (data: Uint8Array) => ZeroGMemDataInstance;
}

interface ZeroGComputeModule {
  createZGComputeNetworkBroker: (
    wallet: ZeroGEthersWallet,
  ) => Promise<ZeroGComputeBroker>;
  MAINNET_CHAIN_ID: number;
  TESTNET_CHAIN_ID: number;
}

// ── Storage SDK Shapes ────────────────────────────────────────────────
interface ZeroGIndexerInstance {
  upload(
    data: ZeroGMemDataInstance,
    rpcUrl: string,
    signer: ZeroGEthersWallet,
  ): Promise<[ZeroGUploadResult | null, string | null]>;
  download(rootHash: string): Promise<[Uint8Array | null, string | null]>;
  downloadToBlob(rootHash: string): Promise<[ZeroGBlob | null, string | null]>;
}

interface ZeroGMemDataInstance {
  bytes: Uint8Array;
}

interface ZeroGUploadResult {
  txHash: string;
  rootHash: string;
  txSeq: number;
  txHashes?: string[];
  rootHashes?: string[];
  txSeqs?: number[];
}

interface ZeroGBlob {
  text(): Promise<string>;
  arrayBuffer(): Promise<ArrayBuffer>;
}

// ── Compute SDK Shapes ────────────────────────────────────────────────
interface ZeroGEthersWallet {
  address: string;
  signMessage(msg: string | Uint8Array): Promise<string>;
  provider: ZeroGEthersProvider | null;
}

interface ZeroGEthersProvider {
  getNetwork(): Promise<{ chainId: bigint }>;
}

interface ZeroGComputeBroker {
  inference: ZeroGInferenceAPI;
  ledger: ZeroGLedgerAPI;
}

interface ZeroGInferenceAPI {
  listServices(): Promise<ZeroGServiceInfo[]>;
  getServiceMetadata(
    provider: string,
  ): Promise<{ endpoint: string; model: string }>;
  acknowledgeProviderSigner(provider: string): Promise<void>;
  getRequestHeaders(
    provider: string,
    content: string,
  ): Promise<Record<string, string>>;
  processResponse(
    provider: string,
    chatId: string,
    content: string,
  ): Promise<boolean>;
}

interface ZeroGLedgerAPI {
  addLedger(funds: number): Promise<void>;
  transferFund(
    provider: string,
    service: string,
    amount: unknown,
  ): Promise<void>;
  getAccount(provider: string): Promise<ZeroGAccountInfo>;
}

interface ZeroGServiceInfo {
  provider: string;
  serviceType: string;
  model: string;
  endpoint: string;
  pricing: string;
}

interface ZeroGAccountInfo {
  balance: string;
  lockedBalance: string;
}

// ── Exported Interfaces ───────────────────────────────────────────────

/** Reference to data stored on 0G Storage (backward-compatible). */
export interface StorageRef {
  hash: string;
  size: number;
  uploadedAt: number;
  url: string;
}

/** 0G Storage + Compute configuration. */
export interface ZeroGConfig {
  /** 0G Storage indexer URL (default: mainnet turbo indexer) */
  storageRpc: string;
  /** 0G Chain EVM RPC for storage tx submission */
  chainRpc: string;
  /** Private key for signing storage/inference transactions */
  privateKey: Hex;
  /** Optional: 0G Compute provider address (env override) */
  computeProvider?: string;
}

/** Result of an AI inference call through 0G Compute. */
export interface InferenceResult {
  content: string;
  model: string;
  provider: string;
  verified: boolean;
  chatId: string;
  timestamp: number;
}

// ── Error Classes ─────────────────────────────────────────────────────

export class ZeroGStorageError extends Error {
  constructor(
    message: string,
    public readonly cause: unknown,
  ) {
    super(message);
    this.name = "ZeroGStorageError";
  }
}

export class ZeroGComputeError extends Error {
  constructor(
    message: string,
    public readonly cause: unknown,
  ) {
    super(message);
    this.name = "ZeroGComputeError";
  }
}

// ── Default Configs ───────────────────────────────────────────────────

const DEFAULT_STORAGE_RPC = "https://indexer-storage-turbo.0g.ai";
const DEFAULT_CHAIN_RPC = "https://evmrpc.0g.ai";
const ZERO_G_CHAIN_ID = 16661;

// ── Helpers ───────────────────────────────────────────────────────────

/** Create an ethers Wallet + Provider for 0G Chain. */
function createSigner(
  privateKey: Hex,
  rpcUrl: string,
): ZeroGEthersWallet {
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(privateKey, provider);
  return wallet as unknown as ZeroGEthersWallet;
}

/** SHA-256 hash of arbitrary data. */
async function hashData(data: string): Promise<string> {
  const buffer = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(data),
  );
  return Array.from(new Uint8Array(buffer))
    .map((b: number) => b.toString(16).padStart(2, "0"))
    .join("");
}

// ── ZeroGStorageClient ────────────────────────────────────────────────

/** Low-level 0G Storage operations using the @0gfoundation/0g-ts-sdk. */
export class ZeroGStorageClient {
  private readonly indexer: ZeroGIndexerInstance;
  private readonly signer: ZeroGEthersWallet;
  private readonly chainRpc: string;

  constructor(config: ZeroGConfig) {
    this.indexer = new _0gStorage.Indexer(config.storageRpc);
    this.signer = createSigner(config.privateKey, config.chainRpc);
    this.chainRpc = config.chainRpc;
  }

  /** Upload raw bytes to 0G Storage. */
  async upload(
    data: Uint8Array,
  ): Promise<{ txHash: string; rootHash: string }> {
    try {
      const memData = new _0gStorage.MemData(data);
      const [result, err] = await this.indexer.upload(
        memData,
        this.chainRpc,
        this.signer,
      );
      if (err) {
        throw new ZeroGStorageError(`Upload failed: ${err}`, err);
      }
      if (!result) {
        throw new ZeroGStorageError("Upload returned null result", null);
      }
      return {
        txHash: result.txHash,
        rootHash: result.rootHash,
      };
    } catch (err) {
      if (err instanceof ZeroGStorageError) throw err;
      throw new ZeroGStorageError("Upload failed", err);
    }
  }

  /** Download data by root hash as raw bytes. */
  async download(rootHash: string): Promise<Uint8Array | null> {
    try {
      const [data, err] = await this.indexer.download(rootHash);
      if (err) {
        console.error(`[0G Storage] Download failed: ${err}`);
        return null;
      }
      return data;
    } catch (err) {
      console.error("[0G Storage] Download error:", err);
      return null;
    }
  }

  /** Download data by root hash as text (via Blob). */
  async downloadToBlob(rootHash: string): Promise<string | null> {
    try {
      const [blob, err] = await this.indexer.downloadToBlob(rootHash);
      if (err) {
        console.error(`[0G Storage] DownloadToBlob failed: ${err}`);
        return null;
      }
      if (!blob) return null;
      return await blob.text();
    } catch (err) {
      console.error("[0G Storage] DownloadToBlob error:", err);
      return null;
    }
  }

  /** Verify that stored data matches expected content. */
  async verifyIntegrity(
    rootHash: string,
    expectedData: string,
  ): Promise<boolean> {
    try {
      const localHash = await hashData(expectedData);
      const stored = await this.downloadToBlob(rootHash);
      if (!stored) return false;
      const remoteHash = await hashData(stored);
      return localHash === remoteHash;
    } catch (err) {
      console.error("[0G Storage] Verify integrity error:", err);
      return false;
    }
  }
}

// ── ZeroGComputeClient ────────────────────────────────────────────────

/** Low-level 0G Compute inference with TEE verification. */
export class ZeroGComputeClient {
  private broker: ZeroGComputeBroker | null = null;
  private readonly signer: ZeroGEthersWallet;
  private readonly defaultProvider: string;

  constructor(config: ZeroGConfig) {
    this.signer = createSigner(config.privateKey, config.chainRpc);
    this.defaultProvider = config.computeProvider ?? "";
  }

  /** Initialize the compute broker (lazy — one-time setup). */
  private async ensureBroker(): Promise<ZeroGComputeBroker> {
    if (!this.broker) {
      try {
        this.broker = await _0gCompute.createZGComputeNetworkBroker(
          this.signer,
        );
      } catch (err) {
        throw new ZeroGComputeError(
          "Failed to initialize compute broker",
          err,
        );
      }
    }
    return this.broker;
  }

  /** List available inference services. */
  async listServices(): Promise<ZeroGServiceInfo[]> {
    try {
      const broker = await this.ensureBroker();
      return await broker.inference.listServices();
    } catch (err) {
      if (err instanceof ZeroGComputeError) throw err;
      throw new ZeroGComputeError("Failed to list services", err);
    }
  }

  /** Run a single inference request with TEE verification. */
  async inference(
    prompt: string,
    providerAddress?: string,
  ): Promise<InferenceResult> {
    try {
      const provider = providerAddress || this.defaultProvider;
      if (!provider) {
        throw new ZeroGComputeError(
          "No provider address specified and no default configured",
          null,
        );
      }

      const broker = await this.ensureBroker();

      // 1. Get service metadata (endpoint + model)
      const { endpoint, model } =
        await broker.inference.getServiceMetadata(provider);

      // 2. Get signed request headers
      const headers = await broker.inference.getRequestHeaders(
        provider,
        prompt,
      );

      // 3. POST to OpenAI-compatible endpoint
      const response = await fetch(`${endpoint}/chat/completions`, {
        method: "POST",
        headers: {
          ...headers,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content: prompt }],
        }),
      });

      if (!response.ok) {
        throw new ZeroGComputeError(
          `Inference request failed: ${response.status} ${response.statusText}`,
          { status: response.status },
        );
      }

      // 4. Parse response and extract verification key
      const chatId = response.headers.get("ZG-Res-Key") ?? "";
      const responseBody = (await response.json()) as {
        choices: Array<{ message: { content: string } }>;
      };
      const content = responseBody.choices[0]?.message?.content ?? "";

      // 5. Verify TEE proof
      let verified = false;
      if (chatId) {
        try {
          verified = await broker.inference.processResponse(
            provider,
            chatId,
            content,
          );
        } catch (verifyErr) {
          console.error(
            "[0G Compute] TEE verification failed:",
            verifyErr,
          );
          verified = false;
        }
      }

      return {
        content,
        model,
        provider,
        verified,
        chatId,
        timestamp: Date.now(),
      };
    } catch (err) {
      if (err instanceof ZeroGComputeError) throw err;
      throw new ZeroGComputeError("Inference failed", err);
    }
  }

  /** Acknowledge a provider (required before first inference). */
  async acknowledgeProvider(providerAddress: string): Promise<void> {
    try {
      const broker = await this.ensureBroker();
      await broker.inference.acknowledgeProviderSigner(providerAddress);
    } catch (err) {
      throw new ZeroGComputeError(
        "Failed to acknowledge provider",
        err,
      );
    }
  }

  /** Get account balance for a specific provider sub-account. */
  async getAccountBalance(
    providerAddress: string,
  ): Promise<ZeroGAccountInfo> {
    try {
      const broker = await this.ensureBroker();
      return await broker.ledger.getAccount(providerAddress);
    } catch (err) {
      throw new ZeroGComputeError(
        "Failed to get account balance",
        err,
      );
    }
  }
}

// ── ZeroGClient (High-level) ──────────────────────────────────────────

/** Combined 0G Storage + Compute client with convenience methods. */
export class ZeroGClient {
  private readonly storage: ZeroGStorageClient;
  private readonly compute: ZeroGComputeClient;
  private readonly config: ZeroGConfig;

  constructor(config: ZeroGConfig) {
    this.config = config;
    this.storage = new ZeroGStorageClient(config);
    this.compute = new ZeroGComputeClient(config);
  }

  // ── Storage Convenience ───────────────────────────────────────────

  /** Store a string on 0G Storage and return a StorageRef. */
  async store(data: string, tag?: string): Promise<StorageRef> {
    const bytes = new TextEncoder().encode(data);
    console.log(
      `[0G] Storing ${bytes.length} bytes${tag ? ` (${tag})` : ""}...`,
    );

    const { rootHash } = await this.storage.upload(bytes);
    return {
      hash: rootHash,
      size: bytes.length,
      uploadedAt: Date.now(),
      url: `${this.config.storageRpc}/data/${rootHash}`,
    };
  }

  /** Retrieve stored data as a string by root hash. */
  async retrieve(hash: string): Promise<string | null> {
    console.log(`[0G] Retrieving data: ${hash}`);
    return this.storage.downloadToBlob(hash);
  }

  /** Store a JSON object on 0G Storage. */
  async storeJSON(
    data: Record<string, unknown>,
    tag?: string,
  ): Promise<StorageRef> {
    return this.store(JSON.stringify(data), tag);
  }

  /** Verify that stored data matches expected content. */
  async verifyIntegrity(
    hash: string,
    expectedData: string,
  ): Promise<boolean> {
    return this.storage.verifyIntegrity(hash, expectedData);
  }

  // ── Agent-Specific Storage ────────────────────────────────────────

  /** Store an agent interaction log on 0G Storage. */
  async storeAgentLog(log: {
    agentId: string;
    interactionType: string;
    timestamp: number;
    data: Record<string, unknown>;
  }): Promise<StorageRef> {
    return this.storeJSON(
      {
        ...log,
        storedAt: Date.now(),
        version: 1,
      },
      `agent-log:${log.agentId}`,
    );
  }

  /** Store the result of an agent interaction (for audit trail). */
  async storeInteractionResult(result: {
    requesterId: string;
    providerId: string;
    agreementId: string;
    outcome: "success" | "failure" | "disputed";
    trustDelta: number;
    data: Record<string, unknown>;
  }): Promise<StorageRef> {
    return this.storeJSON(
      {
        ...result,
        storedAt: Date.now(),
        version: 1,
      },
      `interaction:${result.agreementId}`,
    );
  }

  // ── Compute Convenience ───────────────────────────────────────────

  /** Run AI inference through 0G Compute with TEE verification. */
  async inference(
    prompt: string,
    providerAddress?: string,
  ): Promise<InferenceResult> {
    return this.compute.inference(prompt, providerAddress);
  }

  /** List available compute services. */
  async listComputeServices(): Promise<ZeroGServiceInfo[]> {
    return this.compute.listServices();
  }

  // ── Accessors ─────────────────────────────────────────────────────

  /** Get the underlying storage client for advanced operations. */
  getStorage(): ZeroGStorageClient {
    return this.storage;
  }

  /** Get the underlying compute client for advanced operations. */
  getCompute(): ZeroGComputeClient {
    return this.compute;
  }
}

// ── Factory ───────────────────────────────────────────────────────────

/** Create a ZeroGClient from environment variables with sensible defaults. */
export function createZeroGClient(
  overrides?: Partial<ZeroGConfig>,
): ZeroGClient {
  const config: ZeroGConfig = {
    storageRpc:
      overrides?.storageRpc ??
      process.env["ZEROG_STORAGE_RPC"] ??
      DEFAULT_STORAGE_RPC,
    chainRpc:
      overrides?.chainRpc ??
      process.env["ZEROG_CHAIN_RPC"] ??
      DEFAULT_CHAIN_RPC,
    privateKey:
      (overrides?.privateKey as Hex | undefined) ??
      (process.env["ZEROG_PRIVATE_KEY"] as Hex),
    computeProvider:
      overrides?.computeProvider ??
      process.env["ZEROG_COMPUTE_PROVIDER"],
  };
  return new ZeroGClient(config);
}

/** Check if 0G Storage is reachable (health check). */
export async function isStorageAvailable(
  storageRpc: string = DEFAULT_STORAGE_RPC,
): Promise<boolean> {
  try {
    const response = await fetch(storageRpc, { method: "HEAD" });
    return response.ok;
  } catch {
    return false;
  }
}

/** Exported constants for external use. */
export const ZEROG_DEFAULTS = {
  storageRpc: DEFAULT_STORAGE_RPC,
  chainRpc: DEFAULT_CHAIN_RPC,
  chainId: ZERO_G_CHAIN_ID,
} as const;
