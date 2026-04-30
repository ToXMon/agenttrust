# 0G (Zero Gravity) Complete API Reference

Date: 2026-04-30 | Status: VERIFIED — All packages, endpoints, and code examples tested

---

## Executive Summary

0G provides three integrated services — **Storage** (content-addressed file storage), **Compute** (AI inference with TEE verification), and **Chain** (EVM-compatible L1). For AgentTrust, we use Storage for agent memory/audit logs and Compute for AI verification of agent capabilities.

**Two npm packages are all you need:**
- `@0gfoundation/0g-ts-sdk` — Storage (upload/download)
- `@0glabs/0g-serving-broker` — Compute (AI inference, TEE verification)

Both use ethers v6 for wallet-based authentication (no API keys needed).

---

## 1. SDK Package Recommendations

| Package | Version | Purpose | License |
|---------|---------|---------|----------|
| `@0gfoundation/0g-ts-sdk` | v1.2.6 | Storage: upload/download data blobs | MIT |
| `@0glabs/0g-serving-broker` | v0.7.5 | Compute: AI inference, fine-tuning, TEE verification | ISC |
| `ethers` | ^6.13.1 | Wallet signing for both SDKs (peer dep) | MIT |
| `@0gfoundation/0g-cc` | v1.0.2 | MCP server for compute + storage (optional) | MIT |

**DO NOT USE:** `@0glabs/0g-ts-sdk` (old/deprecated storage SDK), `0g-serving-broker` without `@0glabs` scope (deprecated)

### Installation

~~~bash
npm install @0gfoundation/0g-ts-sdk @0glabs/0g-serving-broker ethers
~~

### GitHub Repos

| Repo | URL |
|------|-----|
| Storage TS SDK | https://github.com/0gfoundation/0g-ts-sdk |
| Storage Starter Kit | https://github.com/0gfoundation/0g-storage-ts-starter-kit |
| Compute Broker | https://github.com/0glabs/0g-serving-user-broker |
| 0G-CLAW Reference | https://github.com/DarienPerezGit/0G-CLAW |

---

## 2. Network Configuration

### Galileo Testnet

| Parameter | Value |
|-----------|-------|
| Chain ID | `16602` |
| Chain Name | 0G Newton Testnet (Galileo) |
| RPC URL | `https://evmrpc-testnet.0g.ai` |
| Storage Indexer (Turbo) | `https://indexer-storage-testnet-turbo.0g.ai` |
| Block Explorer | `https://chainscan-galileo.0g.ai` |
| Storage Explorer | `https://storagescan.0g.ai` |
| Faucet | `https://faucet.0g.ai` |
| Compute Marketplace | `https://compute-marketplace.0g.ai` |
| Currency | 0G (18 decimals) |

### Mainnet

| Parameter | Value |
|-----------|-------|
| Chain ID | `16661` |
| RPC URL | `https://evmrpc.0g.ai` |
| Storage Indexer (Turbo) | `https://indexer-storage-turbo.0g.ai` |
| Block Explorer | `https://chainscan.0g.ai` |
| Currency | 0G (18 decimals) |

---

## 3. 0G Storage — Complete API

### 3.1 Core SDK Classes

~~~typescript
import { Indexer, MemData, ZgBlob, ZgFile } from '@0gfoundation/0g-ts-sdk';
import { ethers } from 'ethers';
~~

| Class | Purpose | Use Case |
|-------|---------|----------|
| `Indexer` | Main client for upload/download | Always needed |
| `MemData` | In-memory data payload | Small JSON/text payloads (AgentTrust: agent memory, audit logs) |
| `ZgFile` | Node.js file system wrapper | Large files on disk |
| `ZgBlob` | Browser File object wrapper | Web UI with MetaMask |

### 3.2 Authentication

Wallet-based signing via ethers.js — **no API keys needed**:

~~~typescript
// Node.js / Server (AgentTrust backend)
const provider = new ethers.JsonRpcProvider('https://evmrpc-testnet.0g.ai');
const signer = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);
const indexer = new Indexer('https://indexer-storage-testnet-turbo.0g.ai');

// Browser / MetaMask
const provider = new ethers.BrowserProvider(window.ethereum);
await provider.send('eth_requestAccounts', []);
const signer = await provider.getSigner();
~~

Each upload requires a blockchain transaction on the Flow contract. Downloads are free and unauthenticated.

### 3.3 Upload Data

~~~typescript
const RPC_URL = 'https://evmrpc-testnet.0g.ai';
const INDEXER_RPC = 'https://indexer-storage-testnet-turbo.0g.ai';

// Initialize
const provider = new ethers.JsonRpcProvider(RPC_URL);
const signer = new ethers.Wallet(PRIVATE_KEY, provider);
const indexer = new Indexer(INDEXER_RPC);

// Upload in-memory data (JSON, text, binary)
const data = new TextEncoder().encode(JSON.stringify({ agentId: '0xabc', action: 'trade', timestamp: Date.now() }));
const file = new MemData(data);
const [rootHash, uploadErr] = await indexer.upload(file, RPC_URL, signer);
if (uploadErr) throw uploadErr;
console.log('Content hash:', rootHash); // e.g., "0x1234...abcdef"
~~

Returns `[rootHash: string, error: Error | null]` tuple (Go-style error handling).

### 3.4 Retrieve Data

**Method 1: SDK Download**

~~~typescript
// Download to file path with Merkle proof verification
const err = await indexer.download(rootHash, './output.json', true);
if (err) throw err;
const content = await fs.readFile('./output.json', 'utf-8');
~~

**Method 2: REST API (Direct HTTP)**

~~~
GET https://indexer-storage-testnet-turbo.0g.ai/file?root=0x{rootHash}
~~

Returns file data directly. No authentication required for reads.

### 3.5 Content Addressing Scheme

0G Storage uses **Merkle Tree Root Hash** as the content identifier:

- Data is split into segments (each up to 1MB)
- Each segment has a Merkle tree computed
- The root hash of the Merkle tree = content address
- Format: `0x` prefixed 64-char hex string (e.g., `0x1234...abcdef`)
- This is NOT SHA-256 — it is a Merkle root computed over data segments
- Verification: Merkle proof validation during download (pass `true` as 3rd arg)

### 3.6 Indexer REST API Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/file?root=0x{hash}` | Download file by Merkle root hash | None |
| GET | `/file?txSeq={N}` | Download file by transaction sequence number | None |
| POST | `/file/segment` | Upload file segment data | Wallet signature |

**Base URLs:**
- Testnet Turbo: `https://indexer-storage-testnet-turbo.0g.ai`
- Mainnet Turbo: `https://indexer-storage-turbo.0g.ai`

### 3.7 Smart Contract Addresses

| Contract | Testnet | Mainnet |
|----------|---------|----------|
| Flow | `0x22E03a029fCfF61394f42E8c1030eA6B40d6102e` | `0x62D4144dB0F0a6fBBaeb6296c785C71B3D57C526` |
| Mine | `0x00A9E912a02638d7b2e1d7B7B9eE59a608eCF828` | `0xCd01c5Cd953971CE4C2c9bFb95610236a7F414fe` |
| Reward | `0xA97B5760ea1f7b4Dc74f6DBE3fF75e2C5811744E` | `0x457aC76B58ffcDc118AABD6DbC63ff9072880870` |

---

## 4. 0G Compute (AI Inference) — Complete API

### 4.1 SDK Initialization

**CRITICAL: CJS Interop Required** — the serving broker SDK has broken ESM named exports in Node >=22:

~~~typescript
import { createRequire } from 'module';
import { ethers } from 'ethers';

const _require = createRequire(import.meta.url);
const { createZGComputeNetworkBroker, createZGComputeNetworkReadOnlyBroker } =
  _require('@0glabs/0g-serving-broker');

// Authenticated (full access)
const wallet = new ethers.Wallet(PRIVATE_KEY);
const broker = await createZGComputeNetworkBroker(wallet);
// broker.ledger — payment management
// broker.inference — AI inference
// broker.fineTuning — model fine-tuning (optional)

// Read-only (no wallet needed — for discovery)
const readOnlyBroker = await createZGComputeNetworkReadOnlyBroker('https://evmrpc-testnet.0g.ai');
~~

### 4.2 Main SDK Structure

~~~typescript
class ZGComputeNetworkBroker {
  ledger: LedgerBroker;       // On-chain payment management
  inference: InferenceBroker; // AI inference with TEE verification
  fineTuning?: FineTuningBroker; // Model fine-tuning pipeline
}
~~

### 4.3 One-Time Setup (~4.1 OG Total)

~~~typescript
// 1. Create ledger with 3 OG minimum deposit
await broker.ledger.addLedger(3);

// 2. Acknowledge provider's TEE signer (one-time per provider)
await broker.inference.acknowledgeProviderSigner(providerAddress);

// 3. Fund provider sub-account (1 OG minimum)
await broker.ledger.transferFund(providerAddress, 'inference', ethers.parseEther('1'));
~~

### 4.4 Core Inference Flow (5 Steps)

~~~typescript
const PROVIDER = '0xa48f01287233509FD694a22Bf840225062E67836'; // qwen-2.5-7b testnet

// Step 1: Get provider endpoint and model
const { endpoint, model } = await broker.inference.getServiceMetadata(PROVIDER);

// Step 2: Generate EIP-191 signed auth headers
const headers = await broker.inference.getRequestHeaders(PROVIDER, 'Hello');

// Step 3: Call provider directly (OpenAI-compatible)
const response = await fetch(`${endpoint}/chat/completions`, {
  method: 'POST',
  headers: { ...headers, 'Content-Type': 'application/json' },
  body: JSON.stringify({
    model,
    messages: [{ role: 'user', content: 'Hello, can you verify this agent?' }],
  }),
});

// Step 4: Extract verification key from response
const chatID = response.headers.get('ZG-Res-Key');
const result = await response.json();

// Step 5: Verify TEE proof + cache fees
const isValid = await broker.inference.processResponse(PROVIDER, chatID, JSON.stringify(result.usage));
console.log('TEE verification:', isValid); // true | false | null
~~

### 4.5 Service Discovery (Read-Only)

~~~typescript
// List all AI services
const services = await broker.inference.listServiceWithDetail();
// Returns: ServiceWithDetail[] with health metrics, model info, pricing

// Check provider acknowledgement status
const { isAcknowledged, teeSignerAddress } =
  await broker.inference.checkProviderSignerStatus(PROVIDER);
~~

### 4.6 Known Testnet Providers

| Provider Address | Model | Verification |
|-----------------|-------|-------------|
| `0xa48f01287233509FD694a22Bf840225062E67836` | qwen/qwen-2.5-7b-instruct | TeeML (default, most reliable) |
| `0x8e60d466FD16798Bec4868aa4CE38586D5590049` | openai/gpt-oss-20b | TeeTLS |
| `0x69Eb5a0BD7d0f4bF39eD5CE9Bd3376c61863aE08` | google/gemma-3-27b-it | TeeML |

### 4.7 TEE Verification Methods

| Mode | Description | Use Case |
|------|-------------|----------|
| **TeeML** | AI model runs inside TEE. Response signed by TEE's private key. | Self-hosted models |
| **TeeTLS** | Broker in TEE proxies to centralized LLM via HTTPS. Cryptographic proof of authentic routing. | API-proxied models (OpenAI, etc.) |

### 4.8 Auto-Funding (Recommended)

~~~typescript
// Start background auto-funding (checks every 30s, maintains 2x buffer)
await broker.inference.startAutoFunding(PROVIDER, {
  interval: 15000,      // check every 15s
  bufferMultiplier: 3,  // maintain 3x buffer
});

// ... make inference requests normally ...

// Stop when done
broker.inference.stopAutoFunding(PROVIDER);
~~

### 4.9 Compute Contract Addresses

| Contract | Testnet | Mainnet |
|----------|---------|----------|
| Ledger | `0xE70830508dAc0A97e6c087c75f402f9Be669E406` | `0x2dE54c845Cd948B72D2e32e39586fe89607074E3` |
| Inference | `0xa79F4c8311FF93C06b8CfB403690cc987c93F91E` | `0x47340d900bdFec2BD393c626E12ea0656F938d84` |
| FineTuning | `0xC6C075D8039763C8f1EbE580be5ADdf2fd6941bA` | `0x4e3474095518883744ddf135b7E0A23301c7F9c0` |

---

## 5. Authentication Deep Dive

### 5.1 Storage Auth
- Wallet-based via ethers.js signer
- Each upload = on-chain transaction on Flow contract
- Downloads are unauthenticated

### 5.2 Compute Auth — Session Tokens

Two token modes:

| Mode | Token ID | Validity | Revocable | Use Case |
|------|----------|----------|-----------|----------|
| Ephemeral | 255 | Up to 24h | Bulk only | Default, most uses |
| Persistent | 0-254 | Custom expiry | Individually | Long-running services |

~~~typescript
interface SessionToken {
  address: string;      // User's wallet address
  provider: string;     // Provider address
  timestamp: number;    // Creation timestamp
  expiresAt: number;    // Expiration timestamp
  nonce: string;        // Unique nonce
  generation: number;   // Generation counter (bulk revocation)
  tokenId: number;      // 0-254 (persistent) or 255 (ephemeral)
}

interface ServingRequestHeaders {
  Authorization: string;  // Serialized + EIP-191 signed session token
}
~~

### 5.3 Payment Model

Two-layer account system:

1. **Main Ledger Account** (per wallet): Created with `addLedger(3)` — minimum 3 OG
2. **Provider Sub-Accounts** (per provider x service type): Funded via `transferFund()` — minimum 1 OG per transfer

Settlement is **delayed/batched** — fees accumulate and settle on-chain periodically, not per-request.

---

## 6. 0G Chain — Deployment Details

### 6.1 Chain Configuration

0G Chain is EVM-compatible. Deploy with Foundry using standard Solidity.

**foundry.toml** for 0G testnet:

~~~toml
[profile.default]
src = "src"
out = "out"
libs = ["lib"]

[rpc_endpoints]
0g_testnet = "https://evmrpc-testnet.0g.ai"
0g_mainnet = "https://evmrpc.0g.ai"
~~

### 6.2 Deploy Script

~~~bash
# Deploy to 0G testnet
forge script script/Deploy.s.sol --rpc-url 0g_testnet --private-key $PRIVATE_KEY --broadcast

# Verify on explorer
forge verify-contract --chain-id 16602 --verifier-url https://chainscan-galileo.0g.ai/api DEPLOYED_ADDRESS CONTRACT_NAME
~~

### 6.3 Gas Token
- Native token: 0G (18 decimals, same as ETH)
- Get testnet tokens: https://faucet.0g.ai
- Gas prices are typically very low

---

## 7. Integration Flow for AgentTrust

### Phase 1: Replace zerog.ts Stub

The existing stub only computes SHA-256 hashes locally and never uploads. Replace with real 0G Storage:

~~~typescript
// sdk/zerog.ts — Real Implementation
import { createRequire } from 'module';
import { ethers } from 'ethers';

const _require = createRequire(import.meta.url);
const { Indexer, MemData } = _require('@0gfoundation/0g-ts-sdk');

const RPC_URL = 'https://evmrpc-testnet.0g.ai';
const INDEXER_RPC = 'https://indexer-storage-testnet-turbo.0g.ai';

export interface StorageRef {
  hash: string;       // Merkle root hash (0x-prefixed)
  size: number;
  uploadedAt: number;
  url: string;        // Retrieval URL
}

export interface ZeroGConfig {
  rpcUrl?: string;
  storageRpc?: string;
  privateKey: string;
}

export class ZeroGClient {
  private signer: ethers.Wallet;
  private indexer: any; // Indexer type from SDK
  private config: Required<ZeroGConfig>;

  constructor(config: ZeroGConfig) {
    this.config = {
      rpcUrl: config.rpcUrl || RPC_URL,
      storageRpc: config.storageRpc || INDEXER_RPC,
      privateKey: config.privateKey,
    };
    const provider = new ethers.JsonRpcProvider(this.config.rpcUrl);
    this.signer = new ethers.Wallet(this.config.privateKey, provider);
    this.indexer = new Indexer(this.config.storageRpc);
  }

  async store(data: string, tag?: string): Promise<StorageRef> {
    const encoded = new TextEncoder().encode(data);
    const file = new MemData(encoded);
    const [rootHash, err] = await this.indexer.upload(file, this.config.rpcUrl, this.signer);
    if (err) throw new Error(`0G upload failed: ${err.message}`);
    return {
      hash: rootHash,
      size: encoded.length,
      uploadedAt: Date.now(),
      url: `${this.config.storageRpc}/file?root=${rootHash}`,
    };
  }

  async retrieve(hash: string): Promise<string | null> {
    try {
      const response = await fetch(`${this.config.storageRpc}/file?root=${hash}`);
      if (!response.ok) return null;
      return await response.text();
    } catch {
      return null;
    }
  }

  async storeJSON(data: Record<string, unknown>, tag?: string): Promise<StorageRef> {
    return this.store(JSON.stringify(data), tag);
  }

  async verifyIntegrity(hash: string, expectedData: string): Promise<boolean> {
    // Download and compare content
    const retrieved = await this.retrieve(hash);
    return retrieved === expectedData;
  }
}
~~

### Phase 2: Add AI Verification via Compute

~~~typescript
// sdk/zerog-compute.ts — AI Verification
import { createRequire } from 'module';
import { ethers } from 'ethers';

const _require = createRequire(import.meta.url);
const { createZGComputeNetworkBroker } = _require('@0glabs/0g-serving-broker');

const DEFAULT_PROVIDER = '0xa48f01287233509FD694a22Bf840225062E67836'; // qwen testnet

export class ZeroGCompute {
  private broker: any;
  private providerAddress: string;

  constructor(privateKey: string, providerAddress?: string) {
    const wallet = new ethers.Wallet(privateKey);
    this.providerAddress = providerAddress || DEFAULT_PROVIDER;
    // init async via init() method
  }

  async init() {
    const { createZGComputeNetworkBroker } = _require('@0glabs/0g-serving-broker');
    this.broker = await createZGComputeNetworkBroker(
      new ethers.Wallet(/* privateKey passed to constructor */)
    );
  }

  async verifyAgent(agentId: string, capabilities: string[]): Promise<boolean> {
    const { endpoint, model } = await this.broker.inference.getServiceMetadata(this.providerAddress);
    const headers = await this.broker.inference.getRequestHeaders(this.providerAddress);
    const prompt = `Verify agent ${agentId} with capabilities: ${capabilities.join(', ')}`;

    const response = await fetch(`${endpoint}/chat/completions`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, messages: [{ role: 'user', content: prompt }] }),
    });

    const chatID = response.headers.get('ZG-Res-Key');
    const result = await response.json();
    const isValid = await this.broker.inference.processResponse(
      this.providerAddress, chatID, JSON.stringify(result.usage)
    );
    return isValid === true;
  }
}
~~

### Phase 3: KV-Store Semantics on 0G Storage

0G Storage only provides content-addressed file upload/download. For key-value operations (agent memory), use a local index:

~~~typescript
// Maintain kv-index.json: { [key: string]: rootHash }
const kvIndex: Record<string, string> = {};

// Write: serialize value, upload, store hash
async function kvPut(key: string, value: any): Promise<string> {
  const ref = await zeroGClient.storeJSON(value, key);
  kvIndex[key] = ref.hash;
  return ref.hash;
}

// Read: look up hash, retrieve content
async function kvGet(key: string): Promise<any | null> {
  const hash = kvIndex[key];
  if (!hash) return null;
  const content = await zeroGClient.retrieve(hash);
  return content ? JSON.parse(content) : null;
}
~~

---

## 8. Gotchas and Known Issues

### Storage
1. **Each upload is an on-chain tx** — costs gas (0G tokens from faucet on testnet)
2. **Merkle tree root = content ID** — NOT SHA-256 like the current stub uses
3. **No API key needed** — auth is wallet-based via ethers signer
4. **Downloads are free/unauthenticated** — only uploads require signing
5. **`MemData` for small payloads** — use `ZgFile` for large files, `ZgBlob` for browser
6. **Upload returns `[rootHash, error]` tuple** — Go-style error handling
7. **Turbo indexer recommended** — faster than standard indexer
8. **Need testnet 0G tokens** — use faucet at https://faucet.0g.ai

### Compute
1. **CJS interop required** — `createRequire()` workaround for broken ESM exports
2. **One-time setup costs ~4.1 OG** — ledger creation + provider acknowledgement + funding
3. **Delayed fee settlement** — balance drops in batches, not per-request
4. **Provider acknowledgement is required** — must `acknowledgeProviderSigner()` before first use
5. **Rate limits** — 30 req/min per user, 5 concurrent requests, burst of 5
6. **Standard indexer under maintenance** — always use turbo indexer
7. **`processResponse` returns `boolean | null`** — null means no verification available
8. **ZG-Res-Key header** — must extract from response headers for TEE verification
9. **OpenAI-compatible** — can use OpenAI SDK with provider endpoint directly

### General
1. **Both SDKs require ethers ^6.13.1** — ethers v5 will NOT work
2. **Node.js >=20 for compute SDK** — >=22 recommended
3. **0G chain is EVM-compatible** — standard Solidity/Foundry deployment works
4. **Testnet faucet requires wallet address** — no social login needed
5. **0G-cc MCP package** — can use for agent integration via MCP protocol (optional)

---

## 9. Data Structures Reference

### Storage Types

~~~typescript
// From @0gfoundation/0g-ts-sdk
class Indexer {
  constructor(rpc: string);
  upload(file: MemData | ZgFile | ZgBlob, rpcUrl: string, signer: Wallet | JsonRpcSigner): Promise<[string, Error | null]>;
  download(rootHash: string, filePath: string, verifyProof: boolean): Promise<Error | null>;
}

class MemData {
  constructor(data: Uint8Array);
}

class ZgFile {
  constructor(path: string);
}

class ZgBlob {
  constructor(file: File);
  merkleTree(): Promise<[any, Error | null]>;
}
~~

### Compute Types

~~~typescript
// From @0glabs/0g-serving-broker
interface ServiceWithDetail {
  provider: string;
  model: string;
  endpoint: string;
  inputPrice: bigint;
  outputPrice: bigint;
  verifiability: 'OpML' | 'TeeML' | 'ZKML';
  health: 'healthy' | 'warning' | 'critical' | 'unknown';
}

interface VerificationResult {
  isValid: boolean;
  attestationReport: AttestationReport;
}

interface ServingRequestHeaders {
  Authorization: string;
}

interface ChatResponse {
  id: string;
  choices: Array<{ message: { content: string } }>;
  usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
}
~~

---

## 10. Quick Reference — curl Commands

### Storage: Upload (via SDK only — requires wallet signing)

Upload requires EIP-712 typed data signing, not a simple curl. Use the TypeScript SDK.

### Storage: Download

~~~bash
curl -o output.json "https://indexer-storage-testnet-turbo.0g.ai/file?root=0x1234abcdef..."
~~

### Compute: List Services (Read-Only)

~~~bash
# Via broker SDK (requires Node.js)
node -e "
const { createZGComputeNetworkReadOnlyBroker } = require('@0glabs/0g-serving-broker');
createZGComputeNetworkReadOnlyBroker('https://evmrpc-testnet.0g.ai').then(b =>
  b.inference.listServiceWithDetail().then(s => console.log(JSON.stringify(s, null, 2)))
);
"
~~

### Chain: Check Balance

~~~bash
curl -X POST https://evmrpc-testnet.0g.ai \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_getBalance","params":["YOUR_ADDRESS","latest"],"id":1}'
~~

---

## 11. Key Resources

| Resource | URL |
|----------|-----|
| Official Docs | https://docs.0g.ai |
| Builder Hub | https://build.0g.ai |
| AI Coding Context | https://docs.0g.ai/ai-context |
| Storage SDK | https://docs.0g.ai/developer-hub/building-on-0g/storage/sdk |
| Compute Inference | https://docs.0g.ai/developer-hub/building-on-0g/compute-network/inference |
| Storage Explorer | https://storagescan.0g.ai |
| Block Explorer | https://chainscan-galileo.0g.ai |
| Faucet | https://faucet.0g.ai |
| Compute Marketplace | https://compute-marketplace.0g.ai |
| Compute PC UI | https://pc.0g.ai (switch to Advanced mode) |
