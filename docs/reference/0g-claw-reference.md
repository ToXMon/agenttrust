# 0G-CLAW Reference — Full File Contents

> Source: https://github.com/DarienPerezGit/0G-CLAW
> Retrieved: 2026-04-30

---

## Key API Patterns Extracted

### 0G Storage SDK (`@0gfoundation/0g-ts-sdk` v1.2.6)

**Import:**
```typescript
import { Indexer, MemData, ZgFile, ZgBlob, KvClient, StorageNode } from '@0gfoundation/0g-ts-sdk';
```

**Upload (file):**
```typescript
const indexer = new Indexer(indexerUrl);
const signer = new ethers.Wallet(privateKey, provider);
const file = await ZgFile.fromFilePath('./file.txt');
await file.merkleTree(); // MUST call before upload
const [result, err] = await indexer.upload(file, rpcUrl, signer);
// result.rootHash = permanent file identifier
// result.txHash = on-chain tx
```

**Upload (in-memory data):**
```typescript
const memData = new MemData(new TextEncoder().encode('Hello!'));
const [result, err] = await indexer.upload(memData, rpcUrl, signer);
```

**Download:**
```typescript
const err = await indexer.download(rootHash, outputPath, false);
```

**Download to blob (for decryption):**
```typescript
const [blob, err] = await indexer.downloadToBlob(rootHash, { proof: true });
```

**Encryption (AES-256):**
```typescript
const key = new Uint8Array(32);
crypto.getRandomValues(key);
const [tx, err] = await indexer.upload(file, rpcUrl, signer, {
  encryption: { type: 'aes256', key }
});
```

### 0G Compute SDK (`@0glabs/0g-serving-broker` v0.7.5)

**Broker initialization:**
```typescript
const { createRequire } = await import('module');
const _require = createRequire(import.meta.url);
const sdk = _require('@0glabs/0g-serving-broker');
const broker = await sdk.createZGComputeNetworkBroker(wallet);
```

**Ledger setup (one-time):**
```typescript
await broker.ledger.addLedger(3); // 3 OG minimum
await broker.inference.acknowledgeProviderSigner(providerAddress);
await broker.ledger.transferFund(providerAddress, 'inference', parseEther('1'));
```

**Inference flow:**
```typescript
// 1. Get provider metadata
const { endpoint, model } = await broker.inference.getServiceMetadata(providerAddress);

// 2. Get billing headers (signed by wallet)
const headers = await broker.inference.getRequestHeaders(providerAddress, content);

// 3. Call OpenAI-compatible endpoint
const response = await fetch(`${endpoint}/chat/completions`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', ...headers },
  body: JSON.stringify({ model, messages, temperature, max_tokens }),
});

// 4. Verify TEE proof
const zgResKey = response.headers.get('ZG-Res-Key');
const isValid = await broker.inference.processResponse(providerAddress, zgResKey, content);
```

### Testnet Endpoints

| Service | URL |
|---------|-----|
| EVM RPC | `https://evmrpc-testnet.0g.ai` |
| Storage Indexer (Turbo) | `https://indexer-storage-testnet-turbo.0g.ai` |
| Storage Indexer (Standard) | `https://indexer-storage-testnet-standard.0g.ai` (under maintenance) |
| Faucet | `https://faucet.0g.ai` |

### Providers (Galileo Testnet)

| Address | Model |
|---------|-------|
| `0xa48f01287233509FD694a22Bf840225062E67836` | qwen/qwen-2.5-7b-instruct |
| `0x8e60d466FD16798Bec4868aa4CE38586D5590049` | openai/gpt-oss-20b |
| `0x69Eb5a0BD7d0f4bF39eD5CE9Bd3376c61863aE08` | google/gemma-3-27b-it |

### 0G-CLAW Adapter Pattern

The 0G-CLAW project uses a clean adapter pattern:
- `IMemoryAdapter` interface → `OGMemoryAdapter` (0G Storage KV/Log) or `LocalMemoryAdapter` (fallback)
- `IComputeAdapter` interface → `OGComputeAdapter` (0G Compute) or `LocalComputeAdapter` (fallback)
- Adapters selected via env vars: `MEMORY_ADAPTER=0g|local`, `COMPUTE_ADAPTER=0g|local`

**Key insight:** The 0GMemoryAdapter uses `indexer.upload/download` only (no KV RPC). It stores a local `kv-index.json` mapping keys to rootHashes. This is a pragmatic hackathon approach — each write is a full 0G Storage upload.
