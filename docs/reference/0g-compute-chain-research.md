# 0G Compute + OpenClaw + Chain Deployment — Research Report

**Date:** 2026-04-30
**Purpose:** AgentTrust hackathon implementation reference

---

# Task 1: 0G Compute / AI Serving Network

## 1.1 NPM Package

| Package | Version | Status | Purpose |
|---------|---------|--------|----------|
| `@0glabs/0g-serving-broker` | npm v0.3.3 / GitHub v0.7.5 | **USE THIS** | TS user SDK for inference, ledger, fine-tuning |
| `0g-serving-broker` (no scope) | v0.2.11 | DEPRECATED | Do not use |
| `github.com/0gfoundation/0g-serving-broker` | N/A | Go PROVIDER broker | Server-side only |

**Source repo:** https://github.com/0glabs/0g-serving-user-broker (note: **user**-broker)
**Install:** `pnpm add @0glabs/0g-serving-broker ethers@^6.13.1`

## 1.2 SDK Architecture

~~~typescript
// Authenticated (needs wallet)
import { createZGComputeNetworkBroker } from '@0glabs/0g-serving-broker';
const broker = await createZGComputeNetworkBroker(wallet);
broker.ledger      // LedgerBroker — on-chain payments
broker.inference   // InferenceBroker — AI inference + TEE + LoRA
broker.fineTuning  // FineTuningBroker — training pipeline

// Read-only (no wallet)
import { createZGComputeNetworkReadOnlyBroker } from '@0glabs/0g-serving-broker';
const ro = await createZGComputeNetworkReadOnlyBroker('https://evmrpc-testnet.0g.ai');
ro.inference.listService()       // List all AI services
ro.inference.listServiceWithDetail() // Services + health + pricing
~~~

## 1.3 Complete Inference Flow (5 Steps)

### Step 0: One-Time Setup (~4.1 OG)

~~~typescript
import { ethers } from 'ethers';
import { createZGComputeNetworkBroker } from '@0glabs/0g-serving-broker';

// IMPORTANT: CJS interop required in Node >=22 due to broken ESM exports
import { createRequire } from 'module';
const _require = createRequire(import.meta.url);
const { createZGComputeNetworkBroker } = _require('@0glabs/0g-serving-broker');

const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
const broker = await createZGComputeNetworkBroker(wallet);

// One-time ledger creation (3 OG minimum)
await broker.ledger.addLedger(3);

// One-time provider acknowledgement (on-chain tx)
const provider = '0xa48f01287233509FD694a22Bf840225062E67836'; // qwen-2.5-7b
await broker.inference.acknowledgeProviderSigner(provider);

// Fund provider sub-account
await broker.ledger.transferFund(provider, 'inference', ethers.parseEther('1'));
~~~

### Step 1-5: Per-Inference Flow

~~~typescript
// Step 1: Get provider metadata
const { endpoint, model } = await broker.inference.getServiceMetadata(provider);
// endpoint: 'https://some-provider-url.com'
// model: 'qwen-2.5-7b-instruct'

// Step 2: Generate signed auth headers
const headers = await broker.inference.getRequestHeaders(provider, userMessage);
// headers: { Authorization: '<signed_token>' }

// Step 3: Call OpenAI-compatible endpoint
const response = await fetch(endpoint + '/chat/completions', {
  method: 'POST',
  headers: {
    ...headers,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    model: model,
    messages: [{ role: 'user', content: userMessage }],
    stream: false,
  }),
});

// Step 4: Extract TEE verification key
const zgResKey = response.headers.get('ZG-Res-Key');
const data = await response.json();

// Step 5: Verify TEE proof + cache fees
const isValid = await broker.inference.processResponse(provider, zgResKey, data.choices?.[0]?.message?.content);
// isValid: true/false — cryptographically verified response came from TEE
~~~

## 1.4 Key API Reference

### InferenceBroker Methods

| Method | Description |
|--------|-------------|
| `listService()` | List all registered AI services |
| `listServiceWithDetail()` | Services + health metrics + pricing |
| `getServiceMetadata(provider)` | Get `{endpoint, model}` for a provider |
| `getRequestHeaders(provider, content?)` | Generate EIP-191 signed auth headers |
| `processResponse(provider, chatID?, content?)` | Verify TEE proof + cache fees |
| `acknowledgeProviderSigner(provider)` | One-time setup (on-chain tx) |
| `acknowledged(provider)` | Check if provider signer is acknowledged |
| `startAutoFunding(provider, config?)` | Background balance management |
| `verifyService(provider, outputDir?)` | Full TEE attestation verification |
| `chatWithFineTunedModel(provider, adapter, msg)` | Chat via LoRA adapter |

### LedgerBroker Methods

| Method | Description |
|--------|-------------|
| `addLedger(balance)` | Create ledger (min 3 OG) |
| `getLedger()` | Get current ledger info |
| `depositFund(amount)` | Top up main account |
| `transferFund(provider, 'inference', amountWei)` | Fund provider sub-account |
| `getProvidersWithBalance('inference')` | List funded providers |
| `retrieveFund('inference')` | Withdraw from all sub-accounts |
| `retrieveFundFromProvider('inference', provider)` | Withdraw from specific provider |

## 1.5 Authentication Model

- **Ephemeral tokens** (default): tokenId=255, 24h validity, auto-managed
- **Persistent API keys**: tokenId 0-254, individually revocable, custom expiry
- **Signing**: EIP-191 wallet signature of serialized session token
- **Header**: `Authorization: <serialized_signed_token>`

## 1.6 Payment / Settlement Flow

1. `addLedger(3 OG)` — on-chain, creates main account
2. `acknowledgeProviderSigner(provider)` — on-chain, one-time per provider
3. `transferFund(provider, 'inference', 1 OG)` — on-chain, creates sub-account
4. Per-request: SDK generates signed auth headers (no gas)
5. Provider verifies token + balance off-chain
6. Provider serves inference off-chain
7. Provider settles payment on-chain (batch, delayed)
8. `processResponse()` caches fee locally

**Important:** Fees are NOT deducted immediately. Provider settles in batches.

## 1.7 Available Testnet Providers

| Provider Address | Model | Notes |
|-----------------|-------|-------|
| `0xa48f01287233509FD694a22Bf840225062E67836` | qwen-2.5-7b-instruct | Fast, cheap |
| `0x8e60d466FD16798Bec4868aa4CE38586D5590049` | gpt-oss-20b | Mid-range |
| `0x69Eb5a0BD7d0f4bF39eD5CE9Bd3376c61863aE08` | gemma-3-27b-it | Best quality |

## 1.8 Verification Modes

| Mode | Description |
|------|-------------|
| **TeeML** | AI model runs directly inside TEE. TEE guarantees model + computation protection. Responses signed by TEE private key. Used by self-hosted models. |
| **TeeTLS** | Broker runs in TEE, proxies to centralized LLM via HTTPS. Cryptographic proof of authentic routing. CA/TLS verified. |

## 1.9 Gotchas

1. **ESM/CJS interop REQUIRED** for Node >=22 — SDK has broken ESM named exports
2. Every storage write costs gas (batch where possible)
3. Standard indexer is down — use turbo endpoint
4. `file.merkleTree()` required before ZgFile uploads for storage
5. Rate limits: 30 req/min per user, 5 burst, 5 concurrent
6. Fees settle in batches, not per-request
7. Sub-account balance may appear higher than true available before settlement

---

# Task 2: OpenClaw / 0G-CLAW Reference Implementation

## 2.1 Key Finding

The repo at `github.com/0glabs/openclaw` does NOT exist.

- **OpenClaw** = separate org at `github.com/openclaw` (personal AI assistant, 366k stars)
- **0G-CLAW** = fork by `DarienPerezGit` that integrates 0G Storage + Compute
- **0g-compute** = community skill for OpenClaw's skill marketplace

**Source:** https://github.com/DarienPerezGit/0G-CLAW

## 2.2 Architecture

```
Agent → IMemoryAdapter → 0G Storage (Indexer upload/download)
                       → Local FS (JSON fallback)

Agent → IComputeAdapter → 0G Compute (Broker → TEE Provider → ZG-Res-Key)
                        → Local (echo fallback)
```

## 2.3 Key Files

| File | Purpose |
|------|---------|
| `adapters/IMemoryAdapter.ts` | Interface: saveSession, loadSession, appendMessage |
| `adapters/IComputeAdapter.ts` | Interface: chat, healthCheck, getModel |
| `adapters/OGMemoryAdapter.ts` | 0G Storage implementation (upload/download via Indexer) |
| `adapters/OGComputeAdapter.ts` | 0G Compute implementation (5-step inference flow) |
| `adapters/LocalMemoryAdapter.ts` | Filesystem JSON/JSONL fallback |
| `adapters/LocalComputeAdapter.ts` | Local echo fallback |
| `OpenClawSyncBridge.ts` | Syncs OpenClaw session events to memory adapter |

## 2.4 0G Storage Usage Pattern (from OGMemoryAdapter)

~~~typescript
import { ZgFile, Indexer } from '@0gfoundation/0g-ts-sdk';

// Upload data to 0G Storage
const indexer = new Indexer('https://indexer-storage-testnet-turbo.0g.ai');
const zgFile = new ZgFile(dataBuffer);
await zgFile.merkleTree(); // REQUIRED before upload
const [txHash, rootHash] = await indexer.upload(zgFile, rpcUrl, signer);

// Download data from 0G Storage
const downloaded = await indexer.download(rootHash, tmpPath, false);

// KV pattern via local kv-index.json mapping keys → rootHashes
// No separate KV RPC needed
~~~

## 2.5 0G Compute Usage Pattern (from OGComputeAdapter)

~~~typescript
// Uses the 5-step flow from Task 1.3 above
// Plus TEE verification returning verificationHash as on-chain proof
// Plus AES-256 encryption support via upload options

// Auto-funding pattern
await broker.inference.startAutoFunding(providerAddress, {
  interval: 30000,      // check every 30s
  bufferMultiplier: 2,  // fund 2x expected usage
});
~~~

## 2.6 AgentTrust Adapter Recommendations

Based on 0G-CLAW patterns:

~~~typescript
// ITrustStore interface (like IMemoryAdapter) for trust scores + audit log
interface ITrustStore {
  saveTrustScore(agentId: string, score: number): Promise<string>; // returns rootHash
  loadTrustScore(agentId: string): Promise<number>;
  appendAuditEntry(agentId: string, entry: AuditEntry): Promise<string>;
}

// OGTrustStore implementation using 0G Storage KV pattern
class OGTrustStore implements ITrustStore { /* ... */ }

// IVerificationProvider interface (like IComputeAdapter) for TEE verification
interface IVerificationProvider {
  verify(agentId: string, claim: string): Promise<VerificationResult>;
  healthCheck(): Promise<boolean>;
}

// OGVerificationProvider using 0G Compute broker
class OGVerificationProvider implements IVerificationProvider { /* ... */ }
~~~

---

# Task 3: 0G Chain Deployment Details

## 3.1 Chain IDs (CONFIRMED)

| Network | Chain ID | RPC URL |
|---------|----------|---------|
| **Galileo Testnet** (recommended) | **16602** | `https://evmrpc-testnet.0g.ai` |
| Newton Testnet (older) | 16600 | Different RPC |
| **Mainnet** | **16661** | `https://evmrpc.0g.ai` |

## 3.2 Block Explorers

| Network | URL |
|---------|-----|
| Testnet | `https://chainscan-galileo.0g.ai` |
| Mainnet | `https://chainscan.0g.ai` |

## 3.3 Gas Token

- **0G Token** (native token)
- Same address format as Ethereum (0x...)
- EVM-compatible gas pricing

## 3.4 Foundry Configuration

~~~toml
# foundry.toml
[profile.default]
src = "src"
out = "out"
libs = ["lib"]
solc_version = "0.8.28"
optimizer = true
optimizer_runs = 200
evm_version = "cancun"

[fuzz]
runs = 256

[invariant]
runs = 64
depth = 128
fail_on_revert = false

# 0G Testnet (Galileo)
[profile.0g-testnet]
eth_rpc_url = "https://evmrpc-testnet.0g.ai"
chain_id = 16602

# 0G Mainnet
[profile.0g-mainnet]
eth_rpc_url = "https://evmrpc.0g.ai"
chain_id = 16661

# Base (existing)
[profile.base]
eth_rpc_url = "https://mainnet.base.org"
chain_id = 8453

[profile.base-sepolia]
eth_rpc_url = "https://sepolia.base.org"
chain_id = 84532
~~~

## 3.5 Deploy Commands

~~~bash
# Deploy to 0G testnet
forge create --rpc-url https://evmrpc-testnet.0g.ai \
  --private-key $PRIVATE_KEY \
  --evm-version cancun \
  src/AgentRegistry.sol:AgentRegistry

# Deploy via script
forge script script/Deploy.s.sol --rpc-url https://evmrpc-testnet.0g.ai \
  --private-key $PRIVATE_KEY \
  --broadcast --evm-version cancun

# Verify on testnet explorer
forge verify-contract <ADDRESS> src/AgentRegistry.sol:AgentRegistry \
  --verifier-url https://chainscan-galileo.0g.ai/open/api \
  --chain-id 16602
~~~

## 3.6 Contract Addresses (0G Testnet)

| Contract | Address |
|----------|--------|
| Ledger (Compute) | `0xE70830508dAc0A97e6c087c75f402f9Be669E406` |
| Inference (Compute) | `0xa79F4c8311FF93C06b8CfB403690cc987c93F91E` |
| FineTuning (Compute) | `0xC6C075D8039763C8f1EbE580be5ADdf2fd6941bA` |

## 3.7 0G Storage Endpoints

| Endpoint | URL |
|----------|-----|
| Testnet RPC | `https://evmrpc-testnet.0g.ai` |
| Testnet Storage Indexer (turbo) | `https://indexer-storage-testnet-turbo.0g.ai` |
| Mainnet RPC | `https://evmrpc.0g.ai` |

## 3.8 EVM Compatibility Notes

- **evm_version = "cancun"** required for compilation
- Supports Pectra and Cancun-Deneb
- 11,000 TPS per shard
- Sub-second finality
- Standard Ethereum tooling works (Hardhat, Foundry, Remix, ethers.js)
- Precompiles available: DASigners (0x...1000), Wrapped0GBase (0x...1002)

---

# Integration Steps for AgentTrust

## Phase 1: Setup (suggested)

1. Add foundry profile for 0G testnet (chain_id 16602)
2. Deploy AgentRegistry + TrustNFT + ServiceAgreement to 0G testnet
3. Install `@0glabs/0g-serving-broker` + `@0gfoundation/0g-ts-sdk`
4. Create broker wallet and fund with testnet 0G

## Phase 2: Compute Integration

1. Implement OGVerificationProvider using 5-step inference flow
2. Use TEE verification for agent capability claims
3. Store verification hashes on-chain as trust proof

## Phase 3: Storage Integration

1. Implement OGTrustStore using 0G Storage KV pattern
2. Store trust scores and audit logs on 0G Storage
3. Use root hashes as content-addressed references

## Phase 4: Frontend

1. Display trust scores from 0G Storage
2. Show TEE verification badges
3. Audit trail with root hash references

---

# Additional References

- Full SDK API: `docs/reference/0g-serving-broker-api.md` (497 lines)
- OpenClaw Research: `docs/reference/openclaw-0g-deep-research.md` (690 lines)
- 0G-CLAW Quick Ref: `docs/reference/0g-claw-reference.md`
- 0G Official Docs: https://docs.0g.ai
- Builder Hub: https://build.0g.ai
- Deployment Scripts: https://github.com/0glabs/0g-deployment-scripts
