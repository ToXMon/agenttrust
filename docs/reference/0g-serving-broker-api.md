# 0G Serving Broker SDK — Complete API Reference

**Package:** `@0glabs/0g-serving-broker`  
**Source Repo:** https://github.com/0glabs/0g-serving-user-broker  
**License:** ISC | **Node:** >=20.0.0 | **Peer Deps:** ethers ^6.13.1

## NPM Package Clarification

| Package | Version | Status | Purpose |
|---------|---------|--------|----------|
| `@0glabs/0g-serving-broker` | v0.3.3 (npm) / v0.7.5 (GitHub) | **USE THIS** | TypeScript user SDK for inference, ledger, fine-tuning |
| `0g-serving-broker` (no scope) | v0.2.11 | DEPRECATED | Older package, do not use |
| `0gfoundation/0g-serving-broker` (GitHub) | N/A | Go PROVIDER broker | Server-side provider software (not an npm package) |

**Recommendation:** Always use `@0glabs/0g-serving-broker`. The GitHub source (v0.7.5) may be ahead of npm published version.

---

## Factory Functions (Entry Points)

### `createZGComputeNetworkBroker` (Authenticated — Requires Wallet)

~~~typescript
function createZGComputeNetworkBroker(
  signer: JsonRpcSigner | Wallet,
  ledgerCA?: string,        // auto-detected from chain
  inferenceCA?: string,     // auto-detected from chain
  fineTuningCA?: string,    // auto-detected from chain
  gasPrice?: number,
  maxGasPrice?: number,
  step?: number
): Promise<ZGComputeNetworkBroker>
~~

### `createZGComputeNetworkReadOnlyBroker` (No Wallet Needed)

~~~typescript
function createZGComputeNetworkReadOnlyBroker(
  rpcUrl: string,   // e.g. 'https://evmrpc-testnet.0g.ai'
  chainId?: number  // auto-detected from RPC
): Promise<ZGComputeNetworkReadOnlyBroker>
~~

### Main Classes

~~~typescript
class ZGComputeNetworkBroker {
  ledger: LedgerBroker;
  inference: InferenceBroker;
  fineTuning?: FineTuningBroker;
}

class ZGComputeNetworkReadOnlyBroker {
  inference: ReadOnlyInferenceBroker;
  fineTuning: ReadOnlyFineTuningBroker;
}
~~

---

## InferenceBroker — Complete API

### Service Discovery (Read-Only Compatible)

| Method | Signature | Description |
|--------|-----------|-------------|
| `listService` | `(offset?: number, limit?: number, includeUnacknowledged?: boolean) => Promise<ServiceStructOutput[]>` | List all registered AI services |
| `listServiceWithDetail` | `(offset?: number, limit?: number, includeUnacknowledged?: boolean) => Promise<ServiceWithDetail[]>` | Services + health metrics + model info |

### Account Management

| Method | Signature | Description |
|--------|-----------|-------------|
| `getAccount` | `(providerAddress: string) => Promise<AccountStructOutput>` | Get account info for a provider |
| `getAccountWithDetail` | `(providerAddress: string) => Promise<[AccountStructOutput, {amount: bigint, remainTime: bigint}[]]>` | Account + funding tier details |

### TEE Signer Acknowledgement (Required One-Time Setup)

| Method | Signature | Description |
|--------|-----------|-------------|
| `acknowledged` | `(providerAddress: string) => Promise<boolean>` | Check if provider signer is acknowledged |
| `checkProviderSignerStatus` | `(providerAddress: string, gasPrice?: number) => Promise<{isAcknowledged: boolean, teeSignerAddress: string}>` | Full TEE signer status check |
| `acknowledgeProviderSigner` | `(providerAddress: string, gasPrice?: number) => Promise<void>` | **Required one-time**: acknowledge provider's TEE signer |
| `acknowledgeProviderTEESigner` | `(providerAddress: string, gasPrice?: number) => Promise<void>` | Owner-only: set TEE signer |
| `revokeProviderTEESignerAcknowledgement` | `(providerAddress: string, gasPrice?: number) => Promise<void>` | Owner-only: revoke TEE signer |

### Core Inference Flow (5 Steps)

| Method | Signature | Description |
|--------|-----------|-------------|
| `getServiceMetadata` | `(providerAddress: string) => Promise<{endpoint: string, model: string}>` | Step 1: Get provider endpoint URL + model name |
| `getRequestHeaders` | `(providerAddress: string, content?: string) => Promise<ServingRequestHeaders>` | Step 2: Generate EIP-191 signed auth headers |
| *(HTTP fetch)* | `POST {endpoint}/chat/completions` with OpenAI-compatible body | Step 3: Call provider directly |
| *(extract key)* | `response.headers.get('ZG-Res-Key')` | Step 4: Get verification key from response |
| `processResponse` | `(providerAddress: string, chatID?: string, content?: string) => Promise<boolean \| null>` | Step 5: Verify TEE proof + cache fees |

### Auto-Funding (Background Balance Management)

~~~typescript
interface AutoFundingConfig {
  interval?: number;        // default: 30000ms (30s)
  bufferMultiplier?: number; // default: 2
}
~~

| Method | Signature | Description |
|--------|-----------|-------------|
| `startAutoFunding` | `(providerAddress: string, config?: AutoFundingConfig, gasPrice?: number) => Promise<void>` | Start background auto-funding |
| `stopAutoFunding` | `(providerAddress?: string) => void` | Stop auto-funding (omit provider = stop all) |

### LoRA Adapter Operations

| Method | Signature | Description |
|--------|-----------|-------------|
| `listAdapters` | `(providerAddress: string) => Promise<AdapterInfo[]>` | List deployed LoRA adapters |
| `getAdapterStatus` | `(providerAddress: string, adapterName: string) => Promise<AdapterStatusResponse>` | Check adapter status |
| `resolveAdapterName` | `(providerAddress: string, taskId: string, baseModel: string) => Promise<string>` | Resolve fine-tune task to adapter name |
| `deployAdapter` | `(providerAddress: string, baseModel: string, taskId: string, options?: DeployAdapterOptions) => Promise<DeployResponse>` | Deploy LoRA adapter from fine-tune task |
| `deployAdapterByName` | `(providerAddress: string, adapterName: string, options?: DeployAdapterOptions) => Promise<DeployResponse>` | Deploy by adapter name |
| `chatWithFineTunedModel` | `(providerAddress: string, adapterName: string, message: string, options?: ChatOptions) => Promise<ChatResponse>` | Chat using a fine-tuned LoRA adapter |

### TEE Verification

| Method | Signature | Description |
|--------|-----------|-------------|
| `verifyService` | `(providerAddress: string, outputDir?: string, onLog?: (step: VerificationStep) => void) => Promise<VerificationResult \| null>` | Full TEE attestation verification |
| `downloadQuoteReport` | `(providerAddress: string, outputPath: string) => Promise<void>` | Download TEE quote report |
| `getSignerRaDownloadLink` | `(providerAddress: string) => Promise<string>` | Get download URL for signer RA report |
| `getChatSignatureDownloadLink` | `(providerAddress: string, chatID: string) => Promise<string>` | Get download URL for chat signature |

### API Key / Token Management

| Method | Signature | Description |
|--------|-----------|-------------|
| `revokeApiKey` | `(providerAddress: string, tokenId: number, gasPrice?: number) => Promise<void>` | Revoke a persistent API key |
| `revokeAllTokens` | `(providerAddress: string, gasPrice?: number) => Promise<void>` | Revoke all tokens |

### Service Management (Provider Owner Only)

| Method | Signature | Description |
|--------|-----------|-------------|
| `removeService` | `(gasPrice?: number) => Promise<void>` | Remove your service listing |
| `updateService` | `(options: {url?: string, model?: string, inputPrice?: bigint, outputPrice?: bigint, gasPrice?: number}) => Promise<void>` | Update service parameters |

---

## LedgerBroker — Complete API

~~~typescript
class LedgerBroker {
  // Constants
  static readonly MIN_LEDGER_BALANCE_OG = 3;     // 3 0G minimum to create
  static readonly MIN_TRANSFER_AMOUNT_OG: bigint; // 1 0G minimum transfer
}
~~

### Ledger Lifecycle

| Method | Signature | Description |
|--------|-----------|-------------|
| `addLedger` | `(balance: number, gasPrice?: number) => Promise<void>` | Create ledger with initial balance (min 3 OG) |
| `deleteLedger` | `(gasPrice?: number) => Promise<void>` | Delete ledger, refund all sub-accounts |
| `getLedger` | `() => Promise<LedgerStructOutput>` | Get current ledger info |

### Main Account Funding

| Method | Signature | Description |
|--------|-----------|-------------|
| `depositFund` | `(amount: number, gasPrice?: number) => Promise<void>` | Deposit OG to main account |
| `refund` | `(amount: number, gasPrice?: number) => Promise<void>` | Withdraw OG from main account |
| `depositFundFor` | `(recipient: AddressLike, amount: number, gasPrice?: number) => Promise<void>` | Deposit to another user's account |

### Provider Sub-Account Transfers

| Method | Signature | Description |
|--------|-----------|-------------|
| `transferFund` | `(provider: AddressLike, serviceTypeStr: 'inference' \| 'fine-tuning', amount: bigint, gasPrice?: number) => Promise<void>` | Transfer to provider sub-account (amount in wei) |
| `getProvidersWithBalance` | `(serviceTypeStr: 'inference' \| 'fine-tuning') => Promise<[string, bigint, bigint][]>` | List providers with active balances |
| `retrieveFund` | `(serviceTypeStr: 'inference' \| 'fine-tuning', gasPrice?: number) => Promise<void>` | Retrieve all funds from all provider sub-accounts |
| `retrieveFundFromProvider` | `(serviceTypeStr: 'inference' \| 'fine-tuning', providerAddress: string, gasPrice?: number) => Promise<void>` | Retrieve funds from specific provider |

---

## FineTuningBroker — Complete API

### Service Discovery

| Method | Signature | Description |
|--------|-----------|-------------|
| `listService` | `(includeUnacknowledged?: boolean) => Promise<ServiceStructOutput[]>` | List fine-tuning providers |
| `listModel` | `() => Promise<[string, {[key: string]: string}][][]>` | List available models [standard, custom] |

### Account & Acknowledgement

| Method | Signature | Description |
|--------|-----------|-------------|
| `getAccount` | `(providerAddress: string) => Promise<AccountDetailsStructOutput>` | Get fine-tuning account |
| `getAccountWithDetail` | `(providerAddress: string) => Promise<FineTuningAccountDetail>` | Account + refund details |
| `getLockedTime` | `() => Promise<bigint>` | Get locked time period |
| `acknowledgeProviderSigner` | `(providerAddress: string, gasPrice?: number) => Promise<void>` | Acknowledge fine-tuning provider |

### Dataset Operations

| Method | Signature | Description |
|--------|-----------|-------------|
| `uploadDataset` | `(dataPath: string, gasPrice?: number, maxGasPrice?: number) => Promise<string>` | Upload dataset to 0G Storage, returns root hash |
| `downloadDataset` | `(dataPath: string, dataRoot: string) => Promise<void>` | Download dataset from 0G Storage |
| `calculateToken` | `(datasetPath: string, preTrainedModelName: string, usePython: boolean, providerAddress?: string) => Promise<void>` | Calculate dataset token count |
| `uploadDatasetToTEE` | `(providerAddress: string, datasetPath: string) => Promise<{datasetHash: string, message: string}>` | Upload dataset directly to TEE |

### Task Lifecycle

| Method | Signature | Description |
|--------|-----------|-------------|
| `createTask` | `(providerAddress: string, preTrainedModelName: string, datasetHash: string, trainingPath: string, gasPrice?: number) => Promise<string>` | Create fine-tuning task, returns task ID |
| `cancelTask` | `(providerAddress: string, taskID: string) => Promise<string>` | Cancel running task |
| `listTask` | `(providerAddress: string) => Promise<Task[]>` | List all tasks for a provider |
| `getTask` | `(providerAddress: string, taskID?: string) => Promise<Task>` | Get task details |
| `getLog` | `(providerAddress: string, taskID?: string) => Promise<string>` | Get task execution log |

### Model Delivery

| Method | Signature | Description |
|--------|-----------|-------------|
| `acknowledgeModel` | `(providerAddress: string, taskId: string, dataPath: string, options?: {gasPrice?: number, downloadMethod?: 'tee' \| '0g-storage' \| 'auto'}) => Promise<void>` | Download + acknowledge fine-tuned model |
| `downloadLoRAFromTEE` | `(providerAddress: string, taskId: string, outputPath: string) => Promise<void>` | Download LoRA via TEE |
| `downloadModelFrom0GStorage` | `(providerAddress: string, taskId: string, dataPath: string) => Promise<void>` | Download model from 0G Storage |
| `decryptModel` | `(providerAddress: string, taskId: string, encryptedModelPath: string, decryptedModelPath: string) => Promise<void>` | Decrypt downloaded model |

---

## Authentication & Request Signing

### Two Token Modes

1. **Ephemeral** (default): tokenId=255, not individually revocable, no quota consumption, up to 24h validity
2. **Persistent API Keys**: tokenId 0-254, individually revocable, 255 available slots, custom expiry

### Session Token Structure

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

interface CachedSession {
  token: SessionToken;
  signature: string;    // EIP-191 signature
  rawMessage: string;   // The signed message
}
~~

### Authorization Header

~~~typescript
interface ServingRequestHeaders {
  Authorization: string;  // Serialized + signed session token
  // All other fields deprecated, kept for backward compat
}
~~

Provider verifies: signature validity, expiration, generation match, revocation bitmap (persistent tokens).

---

## Account Model

### Two-Layer System

**Main Ledger Account** (per wallet):
- Created: `ledger.addLedger(3)` — minimum 3 0G
- Funded: `depositFund()`, `depositFundFor()`
- Deleted: `deleteLedger()` refunds all

**Provider Sub-Accounts** (per provider x service type):
- Created implicitly on first `transferFund()`
- Minimum transfer: 1 0G (`MIN_TRANSFER_AMOUNT_OG`)
- Service types: `'inference'` or `'fine-tuning'`
- Provider validates: `balance >= unsettledFee + currentFee + MIN_LOCKED_BALANCE`

---

## Payment Settlement Flow

~~~
1. User -> addLedger(3 OG)                    [on-chain tx]
2. User -> acknowledgeProviderSigner(provider) [on-chain tx, one-time]
3. User -> transferFund(provider, 'inference', 1 OG) [on-chain tx]
4. User -> getServiceMetadata(provider)        [read, no tx]
5. User -> getRequestHeaders(provider, content) [local signing, no tx]
6. User -> POST /chat/completions               [off-chain HTTP]
7. Provider verifies token, checks balance     [off-chain]
8. Provider serves AI inference                 [off-chain]
9. Provider settles payment on-chain            [provider tx]
10. User -> processResponse(provider, chatID)   [fee caching]
~~~

---

## All Exported Interfaces & Types

### Session & Auth
- `SessionToken` — token with generation/tokenId for revocation
- `CachedSession` — token + EIP-191 signature
- `ApiKeyInfo` — persistent API key (tokenId, createdAt, expiresAt, rawToken)
- `SessionTokenOptions` — mode, duration, tokenId
- `ServingRequestHeaders` — HTTP headers for auth requests
- `SessionMode` enum: `Ephemeral` | `Persistent`

### Service & Health
- `ServiceWithDetail` — blockchain data + health + model info + pricing
- `ProviderModelInfo` — model metadata from /v1/models
- `ServiceHealthMetric` — uptime, latency, tokens_per_second
- `PricingTier` — tiered pricing per input token count
- `TieredPricingInfo` — complete tiered pricing config
- `CacheTokenBillingInfo` — cache token discount
- `VerifiabilityEnum`: `OpML` | `TeeML` | `ZKML`
- `HealthStatus`: `'healthy' | 'warning' | 'critical' | 'unknown'`

### Verification
- `VerificationResult` — TEE attestation results
- `VerificationStep` — step-by-step log entries
- `AttestationReport` — raw TEE report data
- `SignerReportMatch` — address match result

### LoRA
- `AdapterInfo` — adapter metadata (state, baseModel, storagePath)
- `ChatResponse` — OpenAI-compatible response
- `DeployResponse` — deployment result
- `AdapterState`: `'init' | 'pending' | 'downloading' | 'ready' | 'active' | 'loading' | 'offloaded' | 'archived' | 'failed'`

### Fine-Tuning
- `FineTuningAccountDetail` — account + refund details
- `Task` — task data (id, dataset, params, progress)
- `CustomizedModel` — custom model metadata
- `StorageConfig` — 0G Storage RPC/indexer config

---

## Contract Addresses

~~~typescript
const CONTRACT_ADDRESSES = {
  testnet: {
    ledger: "0xE70830508dAc0A97e6c087c75f402f9Be669E406",
    inference: "0xa79F4c8311FF93C06b8CfB403690cc987c93F91E",
    fineTuning: "0xC6C075D8039763C8f1EbE580be5ADdf2fd6941bA",
  },
  mainnet: {
    ledger: "0x2dE54c845Cd948B72D2e32e39586fe89607074E3",
    inference: "0x47340d900bdFec2BD393c626E12ea0656F938d84",
    fineTuning: "0x4e3474095518883744ddf135b7E0A23301c7F9c0",
  },
};

const TESTNET_CHAIN_ID = 16602n;
const MAINNET_CHAIN_ID = 16661n;
~~

---

## OpenAI SDK Compatibility

The provider endpoint is OpenAI-compatible. You can use the OpenAI SDK directly:

~~~typescript
import OpenAI from 'openai'

const client = new OpenAI({
  baseURL: `${process.env.ZG_SERVICE_URL}/v1/proxy`,
  apiKey: process.env.ZG_API_SECRET,    // app-sk-... from CLI
})

const completion = await client.chat.completions.create({
  model: 'qwen/qwen-2.5-7b-instruct',
  messages: [{ role: 'user', content: 'Hello, frontier.' }],
})
~~~

Or use wallet-based auth with the broker SDK directly (no API key needed):

~~~typescript
const { endpoint, model } = await broker.inference.getServiceMetadata(PROVIDER)
const headers = await broker.inference.getRequestHeaders(PROVIDER)

const res = await fetch(`${endpoint}/chat/completions`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', ...headers },
  body: JSON.stringify({ model, messages: [{ role: 'user', content: 'Hello!' }] }),
})
~~~

---

## Known Testnet Providers

| Provider Address | Model | Notes |
|-----------------|-------|-------|
| `0xa48f01287233509FD694a22Bf840225062E67836` | qwen/qwen-2.5-7b-instruct | Default, most reliable |
| `0x8e60d466FD16798Bec4868aa4CE38586D5590049` | openai/gpt-oss-20b | |
| `0x69Eb5a0BD7d0f4bF39eD5CE9Bd3376c61863aE08` | google/gemma-3-27b-it | |

Testnet endpoints:
- EVM RPC: `https://evmrpc-testnet.0g.ai`
- Storage Indexer: `https://indexer-storage-testnet-turbo.0g.ai`
- Faucet: `https://faucet.0g.ai`
- Compute Marketplace: `https://compute-marketplace.0g.ai`

---

## Complete Code Examples

### 1. Initialization (CJS Interop Required for ESM)

~~~typescript
import { createRequire } from 'module';
const _require = createRequire(import.meta.url);
const { createZGComputeNetworkBroker } = _require('@0glabs/0g-serving-broker');

const wallet = new ethers.Wallet(PRIVATE_KEY);
const broker = await createZGComputeNetworkBroker(wallet);
~~

### 2. Read-Only (No Wallet)

~~~typescript
const { createZGComputeNetworkReadOnlyBroker } = _require('@0glabs/0g-serving-broker');
const broker = await createZGComputeNetworkReadOnlyBroker('https://evmrpc-testnet.0g.ai');
const services = await broker.inference.listServiceWithDetail();
~~

### 3. One-Time Setup (~4.1 OG Total)

~~~typescript
await broker.ledger.addLedger(3);                                                    // 3 OG
await broker.inference.acknowledgeProviderSigner(providerAddress);                   // on-chain tx
await broker.ledger.transferFund(providerAddress, 'inference', parseEther('1'));      // 1 OG
~~

### 4. Complete Inference Flow

~~~typescript
const { endpoint, model } = await broker.inference.getServiceMetadata(providerAddress);
const headers = await broker.inference.getRequestHeaders(providerAddress, 'Hello');
const response = await fetch(`${endpoint}/chat/completions`, {
  method: 'POST',
  headers: { ...headers, 'Content-Type': 'application/json' },
  body: JSON.stringify({ model, messages: [{ role: 'user', content: 'Hello' }] }),
});
const result = await response.json();
const chatID = response.headers.get('ZG-Res-Key') || result.id;
const isValid = await broker.inference.processResponse(providerAddress, chatID, JSON.stringify(result.usage));
~~

### 5. Auto-Funding

~~~typescript
await broker.inference.startAutoFunding(providerAddress, { interval: 15000, bufferMultiplier: 3 });
// ... make requests normally ...
broker.inference.stopAutoFunding(providerAddress);
~~

### 6. Fine-Tuning Pipeline

~~~typescript
const datasetHash = await broker.fineTuning.uploadDataset('./dataset.jsonl');
const taskId = await broker.fineTuning.createTask(providerAddress, 'meta-llama/Llama-2-7b-chat-hf', datasetHash, './config');
await broker.fineTuning.acknowledgeModel(providerAddress, taskId, './output', { downloadMethod: 'auto' });
await broker.fineTuning.decryptModel(providerAddress, taskId, './output/encrypted.bin', './output/decrypted');
~~

### 7. LoRA Chat with Fine-Tuned Model

~~~typescript
const deploy = await broker.inference.deployAdapter(providerAddress, 'meta-llama/Llama-2-7b-chat-hf', taskId);
const chat = await broker.inference.chatWithFineTunedModel(providerAddress, deploy.adapterName!, 'What is the meaning of life?');
console.log(chat.choices[0].message.content);
~~

---

## Key Dependencies

- ethers ^6.13.1 (peer dependency)
- axios ^1.7.9
- eciesjs ^0.4.13 (EC encryption for model delivery)
- crypto-js ^4.2.0
- circomlibjs ^0.1.6 (ZK verification)
- adm-zip ^0.5.16, brotli ^1.3.3
- express 5.1.0, form-data ^4.0.1
- Native: 0g-storage-client, dcap-qvl-web_bg.wasm (Intel DCAP TEE verification)
