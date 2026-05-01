# OpenClaw + 0G Integration — Deep Research Report

> Source: https://github.com/DarienPerezGit/0G-CLAW (fork), https://github.com/openclaw (main org)
> Retrieved: 2026-04-30
> Purpose: Reference implementation for AgentTrust's 0G Storage + Compute integration

---

## 1. Project Overview

**0G-CLAW** is a fork/extension of [OpenClaw](https://github.com/openclaw/openclaw) (366k stars, personal AI assistant) that replaces centralized dependencies with 0G's decentralized infrastructure:

- **Memory**: Moves from local disk to 0G Storage (via Indexer upload/download)
- **Compute**: Moves from OpenAI/Anthropic to 0G Compute Network (Qwen3, GLM-5, Gemma)
- **Result**: A portable, sovereign AI assistant that runs the same from any machine, forever

### Why This Matters for AgentTrust

AgentTrust needs the same pattern: agents persist trust data/memory on 0G Storage and use 0G Compute for AI verification. 0G-CLAW provides a working reference for both.

---

## 2. Project Structure (0G-CLAW)

~~~
0G-CLAW/
├── adapters/
│   ├── memory/
│   │   ├── IMemoryAdapter.ts          # Interface: saveSession, loadSession, appendMessage, etc.
│   │   ├── 0GMemoryAdapter.ts          # 0G Storage implementation (KV + Log)
│   │   ├── LocalMemoryAdapter.ts       # Local filesystem fallback
│   │   └── OpenClawSyncBridge.ts       # Bridges OpenClaw events → IMemoryAdapter
│   ├── compute/
│   │   ├── IComputeAdapter.ts          # Interface: chat, healthCheck, getModel
│   │   ├── 0GComputeAdapter.ts         # 0G Compute Network implementation
│   │   └── LocalComputeAdapter.ts      # Echo-back fallback for testing
│   └── (tests for each adapter)
├── examples/
│   └── basic-agent/
│       └── agent.ts                    # Multi-turn agent with adapter selection
├── scripts/
│   ├── setup-compute-broker.ts         # One-time 0G Compute broker setup
│   └── check-testnet.ts                # Testnet connectivity check
├── openclaw/                           # Git submodule (OpenClaw core)
├── package.json
├── tsconfig.json
├── vitest.config.ts
├── Dockerfile
├── docker-compose.yml
├── .env.example
└── CLAUDE.md                           # AI coding instructions
~~~

### Key Files for AgentTrust Reference

| File | Purpose | Relevance to AgentTrust |
|------|---------|------------------------|
| `adapters/memory/IMemoryAdapter.ts` | Memory interface with KV + Log methods | Define our trust data interface |
| `adapters/memory/0GMemoryAdapter.ts` | Full 0G Storage implementation | Copy pattern for trust store |
| `adapters/compute/IComputeAdapter.ts` | Compute interface with verification | Define our verification interface |
| `adapters/compute/0GComputeAdapter.ts` | Full 0G Compute with TEE verification | Copy pattern for agent verification |
| `scripts/setup-compute-broker.ts` | Broker funding + provider setup | Required for testnet setup |
| `.env.example` | All config vars needed | Our .env template |
| `package.json` | Dependencies with exact versions | Our dependency baseline |

---

## 3. Architecture Diagram

~~~
┌─────────────────────────────────────────────────────────────────────┐
│                        0G-CLAW / Agent Runtime                      │
│                                                                     │
│  ┌──────────────────┐    ┌───────────────────┐                      │
│  │   Agent (TS)     │    │  OpenClawSyncBridge│                      │
│  │  - Multi-turn    │    │  - Event listener  │                      │
│  │  - Session mgmt  │    │  - Auto-persist    │                      │
│  └────────┬─────────┘    └────────┬──────────┘                      │
│           │                       │                                  │
│           │    ┌──────────────────┘                                  │
│           ▼    ▼                                                      │
│  ┌──────────────────────────────────┐                                │
│  │       IMemoryAdapter             │                                │
│  │  - saveSession / loadSession     │                                │
│  │  - appendMessage / loadHistory   │                                │
│  │  - saveConfig / loadConfig       │                                │
│  └──────────┬───────────────────────┘                                │
│             │                                                         │
│    ┌────────┴────────┐                                               │
│    ▼                 ▼                                               │
│  ┌──────────┐  ┌──────────────┐                                      │
│  │ 0G Storage│  │ Local FS     │                                      │
│  │ (Indexer) │  │ (JSON files) │                                      │
│  └─────┬────┘  └──────────────┘                                      │
│        │                                                              │
│        │  upload(data) → rootHash                                     │
│        │  download(rootHash) → data                                   │
│        │  Local kv-index.json maps keys → rootHashes                  │
└────────┼──────────────────────────────────────────────────────────────┘
         │
┌────────┼──────────────────────────────────────────────────────────────┐
│        ▼         0G Protocol Layer                                     │
│  ┌─────────────────────────┐    ┌─────────────────────────────────┐  │
│  │    0G Storage            │    │      0G Compute Network          │  │
│  │                          │    │                                   │  │
│  │  Indexer API             │    │  Broker SDK                      │  │
│  │  ├─ upload() → rootHash  │    │  ├─ createZGComputeNetworkBroker │  │
│  │  ├─ download() → bytes   │    │  ├─ ledger.addLedger(3 OG)      │  │
│  │  ├─ upload(enc) → cipher │    │  ├─ inference.getServiceMetadata│  │
│  │  └─ downloadToBlob()     │    │  ├─ inference.getRequestHeaders │  │
│  │                          │    │  └─ inference.processResponse    │  │
│  │  SDK: @0gfoundation/     │    │                                   │  │
│  │       0g-ts-sdk v1.2.6   │    │  Provider (TEE enclave)          │  │
│  │                          │    │  ├─ /chat/completions (OpenAI)    │  │
│  │  KV Client (optional)    │    │  └─ ZG-Res-Key (verification)    │  │
│  │  ├─ kv.set()             │    │                                   │  │
│  │  └─ kv.get()             │    │  SDK: @0glabs/                    │  │
│  │                          │    │       0g-serving-broker v0.7.5   │  │
│  └─────────────────────────┘    └─────────────────────────────────┘  │
│                                                                       │
│  Testnet Endpoints:                                                   │
│  • EVM RPC: https://evmrpc-testnet.0g.ai                              │
│  • Storage: https://indexer-storage-testnet-turbo.0g.ai               │
│  • Faucet:  https://faucet.0g.ai                                      │
└───────────────────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────────────────┐
│                    Inference Flow (0G Compute)                         │
│                                                                       │
│  1. Get metadata    → broker.inference.getServiceMetadata(provider)   │
│  2. Get auth headers → broker.inference.getRequestHeaders(provider)   │
│  3. POST to endpoint → {endpoint}/chat/completions                    │
│  4. Extract ZG-Res-Key from response headers                          │
│  5. Verify response  → broker.inference.processResponse(provider, key)│
│     → Returns true (valid TEE proof) or false/null                    │
└───────────────────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────────────────┐
│                    Storage Flow (0G Storage)                           │
│                                                                       │
│  KV Write:                                                            │
│  1. Serialize value → Uint8Array                                      │
│  2. Wrap in MemData(data)                                              │
│  3. indexer.upload(memData, rpcUrl, signer) → { rootHash, txHash }    │
│  4. Store mapping: key → rootHash in local kv-index.json              │
│                                                                       │
│  KV Read:                                                             │
│  1. Look up rootHash from local kv-index.json                         │
│  2. indexer.download(rootHash, tmpFile, false)                        │
│  3. Read tmpFile → deserialize → value                                │
│                                                                       │
│  Log Append:                                                           │
│  1. Read existing array of base64 entries                              │
│  2. Push new base64-encoded entry                                      │
│  3. Upload entire array (full replacement)                             │
│  ⚠ Each log append = full 0G Storage upload (gas cost)                │
└───────────────────────────────────────────────────────────────────────┘
~~~

---

## 4. 0G Storage Integration — Code Patterns

### 4.1 SDK Import

~~~typescript
import { Indexer, MemData, ZgFile, ZgBlob, KvClient, StorageNode } from '@0gfoundation/0g-ts-sdk';
import { ethers } from 'ethers';
~~~

### 4.2 Initialization

~~~typescript
const indexer = new Indexer('https://indexer-storage-testnet-turbo.0g.ai');
const provider = new ethers.JsonRpcProvider('https://evmrpc-testnet.0g.ai');
const signer = new ethers.Wallet(privateKey, provider);
~~~

### 4.3 Upload Data (In-Memory)

~~~typescript
const data = new TextEncoder().encode(JSON.stringify({ hello: 'world' }));
const memData = new MemData(data);
const [result, err] = await indexer.upload(memData, rpcUrl, signer);
if (err !== null) throw new Error(`Upload failed: ${err}`);
console.log('rootHash:', result.rootHash);  // Permanent content-addressed ID
console.log('txHash:', result.txHash);      // On-chain transaction
~~~

### 4.4 Upload File

~~~typescript
const file = await ZgFile.fromFilePath('./trust-data.json');
await file.merkleTree();  // MUST call before upload!
const [result, err] = await indexer.upload(file, rpcUrl, signer);
~~~

### 4.5 Download

~~~typescript
const tmpFile = join(tmpdir(), `download-${Date.now()}.tmp`);
const err = await indexer.download(rootHash, tmpFile, false);
if (err !== null) throw new Error(`Download failed: ${err}`);
const data = await fs.readFile(tmpFile);
~~~

### 4.6 Encrypted Upload (AES-256)

~~~typescript
const key = new Uint8Array(32);
crypto.getRandomValues(key);
const [result, err] = await indexer.upload(file, rpcUrl, signer, {
  encryption: { type: 'aes256', key }
});

// Download with decryption:
const [blob, err] = await indexer.downloadToBlob(rootHash, {
  decryption: { type: 'aes256', key }
});
~~~

### 4.7 KV Pattern (0GMemoryAdapter approach)

~~~typescript
// The 0G-CLAW approach: local index file mapping keys → rootHashes
// This avoids needing a separate KV RPC node

private readonly _kvIndex = new Map<string, string>();  // key → rootHash

async _kvSet(key: string, value: Uint8Array): Promise<void> {
  const memData = new MemData(value);
  const [result, err] = await indexer.upload(memData, rpcUrl, signer);
  if (err) throw err;
  
  this._kvIndex.set(key, result.rootHash);
  await this._persistIndex();  // Write kv-index.json to disk
}

async _kvGet(key: string): Promise<Uint8Array | null> {
  const rootHash = this._kvIndex.get(key);
  if (!rootHash) return null;
  
  const tmpFile = join(tmpdir(), `0gclaw-${Date.now()}.tmp`);
  const err = await indexer.download(rootHash, tmpFile, false);
  if (err) return null;
  return new Uint8Array(await fs.readFile(tmpFile));
}

// Index persistence
async _persistIndex(): Promise<void> {
  const entries = Object.fromEntries(this._kvIndex);
  await fs.writeFile('kv-index.json', JSON.stringify(entries, null, 2));
}
~~~

### 4.8 Log Append Pattern

~~~typescript
async _logAppend(key: string, value: Uint8Array): Promise<void> {
  // Read existing entries
  const existing = await this._kvGet(key);
  let entries: string[] = existing
    ? JSON.parse(new TextDecoder().decode(existing))
    : [];
  
  // Append new entry (base64 encoded)
  entries.push(Buffer.from(value).toString('base64'));
  
  // Re-upload entire array (⚠ gas cost per append!)
  await this._kvSet(key, new TextEncoder().encode(JSON.stringify(entries)));
}
~~~

---

## 5. 0G Compute Integration — Code Patterns

### 5.1 SDK Import (CJS Interop Required!)

~~~typescript
// ⚠ MUST use createRequire because @0glabs/0g-serving-broker
// has broken ESM named exports in Node >=22
import { createRequire } from 'module';

const _require = createRequire(import.meta.url);
const sdk = _require('@0glabs/0g-serving-broker');
~~~

### 5.2 Broker Initialization

~~~typescript
const { ethers } = await import('ethers');
const provider = new ethers.JsonRpcProvider('https://evmrpc-testnet.0g.ai');
const wallet = new ethers.Wallet(privateKey, provider);
const broker = await sdk.createZGComputeNetworkBroker(wallet);
~~~

### 5.3 One-Time Broker Setup (~4.1 OG)

~~~typescript
// 1. Create ledger with minimum 3 OG
await broker.ledger.addLedger(3);

// 2. Acknowledge the provider's signer
await broker.inference.acknowledgeProviderSigner(providerAddress);

// 3. Transfer funds to provider for inference
await broker.ledger.transferFund(
  providerAddress,
  'inference',
  ethers.parseEther('1')
);
~~~

### 5.4 Inference Flow (Full)

~~~typescript
async function inference(messages: ChatMessage[]): Promise<InferenceResult> {
  const providerAddress = '0xa48f01287233509FD694a22Bf840225062E67836';
  
  // 1. Get provider metadata (endpoint URL + model name)
  const { endpoint, model } = await broker.inference.getServiceMetadata(providerAddress);
  // e.g., { endpoint: 'https://...', model: 'qwen/qwen-2.5-7b-instruct' }
  
  // 2. Get authenticated request headers (signed by wallet)
  const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');
  const headers = await broker.inference.getRequestHeaders(
    providerAddress,
    lastUserMsg?.content ?? ''
  );
  
  // 3. Call OpenAI-compatible endpoint
  const response = await fetch(`${endpoint}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.7,
      max_tokens: 2048,
    }),
  });
  
  if (!response.ok) {
    throw new Error(`Inference failed: HTTP ${response.status}`);
  }
  
  // 4. Extract verification key from response headers
  const zgResKey = response.headers.get('ZG-Res-Key');
  const completion = await response.json();
  const content = completion?.choices?.[0]?.message?.content ?? '';
  
  // 5. Verify TEE proof (proves computation ran in secure enclave)
  const isValid = await broker.inference.processResponse(
    providerAddress,
    zgResKey,
    content
  );
  
  return {
    content,
    model,
    verificationHash: isValid === true ? zgResKey : undefined,
    usage: completion?.usage,
  };
}
~~~

### 5.5 Health Check

~~~typescript
async function healthCheck(): Promise<boolean> {
  try {
    const { endpoint } = await broker.inference.getServiceMetadata(providerAddress);
    const res = await fetch(`${endpoint}/models`);
    return res.status < 500;
  } catch {
    return false;
  }
}
~~~

---

## 6. Interfaces (Reference Implementations)

### 6.1 IMemoryAdapter

~~~typescript
export interface SessionMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}

export interface AgentSession {
  sessionId: string;
  agentId: string;
  createdAt: number;
  updatedAt: number;
  messages: SessionMessage[];
  metadata: Record<string, string>;
}

export interface IMemoryAdapter {
  // KV operations
  saveSession(session: AgentSession): Promise<void>;
  loadSession(agentId: string, sessionId: string): Promise<AgentSession | null>;
  listSessions(agentId: string): Promise<string[]>;
  deleteSession(agentId: string, sessionId: string): Promise<void>;
  saveConfig(agentId: string, config: string): Promise<void>;
  loadConfig(agentId: string): Promise<string | null>;
  // Log operations
  appendMessage(agentId: string, sessionId: string, message: SessionMessage): Promise<void>;
  loadHistory(agentId: string, sessionId: string): Promise<SessionMessage[]>;
}
~~~

### 6.2 IComputeAdapter

~~~typescript
export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface InferenceOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface InferenceResult {
  content: string;
  model: string;
  usage: { promptTokens: number; completionTokens: number; totalTokens: number; };
  verificationHash: string | undefined;  // ZG-Res-Key if TEE verification passed
}

export interface IComputeAdapter {
  chat(messages: ChatMessage[], options?: InferenceOptions): Promise<InferenceResult>;
  healthCheck(): Promise<boolean>;
  getModel(): string;
}
~~~

---

## 7. Configuration & Deployment

### 7.1 Environment Variables

~~~bash
# 0G Storage
OG_STORAGE_RPC=https://evmrpc-testnet.0g.ai
OG_STORAGE_INDEXER=https://indexer-storage-testnet-turbo.0g.ai
OG_PRIVATE_KEY=<your-funded-wallet-private-key>

# 0G Compute
# Provider addresses (Galileo testnet):
#   0xa48f01287233509FD694a22Bf840225062E67836  — qwen/qwen-2.5-7b-instruct
#   0x8e60d466FD16798Bec4868aa4CE38586D5590049  — openai/gpt-oss-20b
#   0x69Eb5a0BD7d0f4bF39eD5CE9Bd3376c61863aE08  — google/gemma-3-27b-it
OG_COMPUTE_PROVIDER=<choose-one>
ENABLE_0G_COMPUTE_TESTS=false

# Adapter selection
MEMORY_ADAPTER=0g|local
COMPUTE_ADAPTER=0g|local

# ENS (optional)
# ENS_AGENT_LABEL=my-agent

# Fallback
# OPENAI_API_KEY=
# LOCAL_STORAGE_PATH=~/.openclaw
~~~

### 7.2 Docker Deployment

~~~yaml
# docker-compose.yml
services:
  agent:
    build: .
    env_file: .env
    volumes:
      - ./data:/app/.0g-claw
    restart: unless-stopped
~~~

~~~dockerfile
# Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile
COPY . .
RUN pnpm build
ENV NODE_ENV=production
CMD ["node", "dist/examples/basic-agent/agent.js"]
~~~

### 7.3 TypeScript Config

~~~json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "noImplicitAny": true,
    "esModuleInterop": true,
    "declaration": true,
    "sourceMap": true
  },
  "include": ["adapters/**/*", "examples/**/*", "scripts/**/*"],
  "exclude": ["node_modules", "dist", "openclaw"]
}
~~~

---

## 8. Dependencies & Versions

### Production Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `@0gfoundation/0g-ts-sdk` | ^1.2.6 | 0G Storage (Indexer, MemData, ZgFile) |
| `@0glabs/0g-serving-broker` | ^0.7.5 | 0G Compute Network (Broker, Inference, Ledger) |
| `@0glabs/0g-ts-sdk` | ^0.3.3 | 0G Storage (alternate/older SDK) |
| `@ensdomains/ensjs` | ^4.0.2 | ENS name resolution |
| `ethers` | ^6.13.5 | Wallet, signing, RPC |
| `openai` | ^4.97.0 | OpenAI-compatible API client |

### Dev Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `@types/node` | ^22.15.3 | Node.js types |
| `dotenv` | ^17.4.2 | Environment loading |
| `tsx` | ^4.19.3 | TypeScript execution |
| `typescript` | ^5.8.3 | Compiler |
| `vitest` | ^3.1.2 | Testing framework |

### Package Manager

- **pnpm** v10.9.0
- **Node** >=18
- **ESM** modules (`"type": "module"`)

---

## 9. Testnet Endpoints & Providers

### Network: 0G Galileo Testnet

| Service | URL |
|---------|-----|
| EVM RPC | `https://evmrpc-testnet.0g.ai` |
| Storage Indexer (Turbo) | `https://indexer-storage-testnet-turbo.0g.ai` |
| Storage Indexer (Standard) | `https://indexer-storage-testnet-standard.0g.ai` (under maintenance) |
| Faucet | `https://faucet.0g.ai` |

### Available Compute Providers

| Address | Model |
|---------|-------|
| `0xa48f01287233509FD694a22Bf840225062E67836` | qwen/qwen-2.5-7b-instruct |
| `0x8e60d466FD16798Bec4868aa4CE38586D5590049` | openai/gpt-oss-20b |
| `0x69Eb5a0BD7d0f4bF39eD5CE9Bd3376c61863aE08` | google/gemma-3-27b-it |

---

## 10. 0G Compute CLI (OpenClaw Skill)

From the [0g-compute skill](https://github.com/openclaw/skills/blob/main/skills/in-liberty420/0g-compute/SKILL.md):

### Install

~~~bash
npm i -g @0glabs/0g-serving-broker
# Binary command: 0g-compute-cli
~~~

### Key Commands

~~~bash
# Discover available models
0g-compute-cli inference list-providers

# Verify provider TEE attestation
0g-compute-cli inference verify --provider <address>

# Check wallet status
0g-compute-cli status

# Fund broker
0g-compute-cli deposit --amount 3
0g-compute-cli transfer-fund --provider <address> --amount 1
~~~

---

## 11. Key Insights for AgentTrust

### Storage Strategy

1. **Use `indexer.upload()`/`indexer.download()` directly** — no need for KV RPC node
2. **Local `kv-index.json`** maps human-readable keys to content-addressed rootHashes
3. **Each write = full 0G upload** (gas cost per write) — batch where possible
4. **AES-256 encryption** available for sensitive trust data
5. **`MemData`** for in-memory data, **`ZgFile`** for file-based uploads

### Compute Strategy

1. **CJS interop required** — use `createRequire()` for `@0glabs/0g-serving-broker`
2. **TEE verification** via `processResponse()` — returns ZG-Res-Key as proof
3. **OpenAI-compatible API** — drop-in replacement for any OpenAI client
4. **~4.1 OG setup cost** — ledger creation + provider funding
5. **Provider selection** — choose based on model capability needed

### Adapter Pattern (Recommended for AgentTrust)

~~~typescript
// Define interface
interface ITrustStore {
  saveTrustScore(agentId: string, score: TrustScore): Promise<void>;
  loadTrustScore(agentId: string): Promise<TrustScore | null>;
  appendAuditEvent(agentId: string, event: AuditEvent): Promise<void>;
  loadAuditLog(agentId: string): Promise<AuditEvent[]>;
}

// Implement with 0G Storage
class OGTrustStore implements ITrustStore {
  // Follow 0GMemoryAdapter pattern: kv-index.json + indexer.upload/download
}

// Implement with local fallback
class LocalTrustStore implements ITrustStore {
  // Follow LocalMemoryAdapter pattern: JSON files on disk
}

// Select via env var
const store = process.env.TRUST_STORE === '0g'
  ? new OGTrustStore(config)
  : new LocalTrustStore(config);
~~~

### Verification Strategy (AgentTrust)

~~~typescript
// Use 0G Compute for agent verification
interface IVerificationProvider {
  verify(data: string): Promise<VerificationResult>;
}

class OGVerificationProvider implements IVerificationProvider {
  // Follow 0GComputeAdapter pattern: broker → inference → processResponse
  // Return verificationHash (ZG-Res-Key) as on-chain verifiable proof
}
~~~

---

## 12. Known Issues & Gotchas

1. **ESM/CJS Interop**: `@0glabs/0g-serving-broker` has broken ESM named exports in Node >=22. MUST use `createRequire()`.
2. **Gas per write**: Every 0G Storage upload costs gas. The log append pattern re-uploads the entire array each time.
3. **Standard indexer down**: `indexer-storage-testnet-standard.0g.ai` is under maintenance. Use turbo indexer.
4. **Provider availability**: Testnet providers may be intermittent. Always implement fallback.
5. **No KV RPC in 0G-CLAW**: The KV pattern uses `indexer.upload/download` + local index file, not the separate `KvClient` RPC.
6. **`file.merkleTree()`**: MUST call before upload when using `ZgFile` — not needed for `MemData`.

---

## 13. Related Resources

| Resource | URL |
|----------|-----|
| 0G-CLAW Fork | https://github.com/DarienPerezGit/0G-CLAW |
| OpenClaw Main | https://github.com/openclaw/openclaw |
| 0G Storage Starter Kit | https://github.com/0gfoundation/0g-storage-ts-starter-kit |
| 0G Compute Skill | https://github.com/openclaw/skills/blob/main/skills/in-liberty420/0g-compute/SKILL.md |
| 0G Official Docs | https://docs.0g.ai |
| OpenClaw Docs | https://docs.openclaw.ai |
| ClawHub (Skills) | https://clawhub.ai |
| 0G Faucet | https://faucet.0g.ai |
