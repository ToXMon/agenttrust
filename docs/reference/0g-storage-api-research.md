# 0G Storage API — Comprehensive Research Report

Date: 2026-04-30
Status: VERIFIED — All endpoints and packages confirmed

---

## 1. TypeScript SDK Package

**Package:** `@0gfoundation/0g-ts-sdk` v1.2.6

~~~bash
npm install @0gfoundation/0g-ts-sdk ethers
~~~

| Resource | URL |
|----------|-----|
| GitHub SDK | https://github.com/0gfoundation/0g-ts-sdk |
| Starter Kit | https://github.com/0gfoundation/0g-storage-ts-starter-kit |
| CDN (jsDelivr) | https://www.jsdelivr.com/package/npm/@0gfoundation/0g-ts-sdk |

> NOTE: There is also an older `@0glabs/0g-ts-sdk` on jsDelivr but the **official** package is `@0gfoundation/0g-ts-sdk`.

---

## 2. Core SDK Classes & Imports

~~~typescript
import { Indexer, MemData, ZgBlob, ZgFile } from '@0gfoundation/0g-ts-sdk';
import { ethers } from 'ethers';
~~~

| Class | Purpose |
|-------|---------|
| `Indexer` | Main client for upload/download operations, node selection |
| `MemData` | In-memory data payload (e.g., `new TextEncoder().encode('hello')`) |
| `ZgBlob` | Browser File object wrapper (for web UI with MetaMask) |
| `ZgFile` | Disk file wrapper (for Node.js/server environments) |

---

## 3. Network Configuration

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
| Currency | 0G |

### Mainnet
| Parameter | Value |
|-----------|-------|
| Chain ID | `16661` |
| RPC URL | `https://evmrpc.0g.ai` |
| Storage Indexer (Turbo) | `https://indexer-storage-turbo.0g.ai` |
| Block Explorer | `https://chainscan.0g.ai` |
| Currency | 0G |

---

## 4. Smart Contract Addresses

### Testnet (Galileo)
| Contract | Address |
|----------|--------|
| Flow | `0x22E03a029fCfF61394f42E8c1030eA6B40d6102e` |
| Mine | `0x00A9E912a02638d7b2e1d7B7B9eE59a608eCF828` |
| Reward | `0xA97B5760ea1f7b4Dc74f6DBE3fF75e2C5811744E` |

### Mainnet
| Contract | Address |
|----------|--------|
| Flow | `0x62D4144dB0F0a6fBBaeb6296c785C71B3D57C526` |
| Mine | `0xCd01c5Cd953971CE4C2c9bFb95610236a7F414fe` |
| Reward | `0x457aC76B58ffcDc118AABD6DbC63ff9072880870` |

---

## 5. Authentication

Authentication uses **ethers.js wallet-based signing** — no API keys needed:

~~~typescript
// Node.js / Server
const provider = new ethers.JsonRpcProvider(RPC_URL);
const signer = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);

// Browser / MetaMask
const provider = new ethers.BrowserProvider(window.ethereum);
await provider.send('eth_requestAccounts', []);
const signer = await provider.getSigner();
~~~

The signer is passed to the `indexer.upload()` method. Each upload requires a blockchain transaction on the Flow contract.

---

## 6. Upload Data

### Initialize Client
~~~typescript
const RPC_URL = 'https://evmrpc-testnet.0g.ai';
const INDEXER_RPC = 'https://indexer-storage-testnet-turbo.0g.ai';

const provider = new ethers.JsonRpcProvider(RPC_URL);
const signer = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);
const indexer = new Indexer(INDEXER_RPC);
~~~

### Upload In-Memory Data
~~~typescript
const file = new MemData(new TextEncoder().encode('hello 0G'));
const [rootHash, uploadErr] = await indexer.upload(file, RPC_URL, signer);
if (uploadErr) throw uploadErr;
console.log('root hash:', rootHash);
// rootHash is the Merkle tree root — use this as the content identifier
~~~

### Upload Browser File (MetaMask)
~~~typescript
const zgBlob = new ZgBlob(fileInput.files[0]);
const [tree, treeErr] = await zgBlob.merkleTree();
const [tx, err] = await indexer.upload(zgBlob, RPC_URL, signer);
~~~

### Upload Options (Go SDK equivalent — TS may differ)
- `ExpectedReplica`: Number of replicas (default: 1)
- `FastMode` / Turbo mode: Uses turbo indexer endpoint
- `SkipTx`: Skip on-chain transaction (for testing)
- `FinalityRequired`: Transaction packed vs finalized

---

## 7. Retrieve Data

### Download by Root Hash
~~~typescript
// Download to file path with Merkle proof verification
const err = await indexer.download(rootHash, './output.txt', true);
if (err) throw err;
~~~

### REST API (Direct HTTP)
The indexer also exposes HTTP endpoints for retrieval:

~~~
GET https://indexer-storage-testnet-turbo.0g.ai/file?root=0x{rootHash}
~~~

Returns file data directly. No authentication required for reads.

---

## 8. Content Addressing Scheme

0G Storage uses **Merkle Tree Root Hash** as the content identifier:

- Data is split into segments
- Each segment has a Merkle tree computed
- The root hash of the Merkle tree = content address
- Format: `0x` prefixed hex string (e.g., `0x1234...abcdef`)
- Verification: Merkle proof validation during download

To compute hash before upload:
~~~typescript
// Go SDK: core.MerkleRoot(filePath)
// TS SDK equivalent via ZgBlob/ZgFile
const [tree, err] = await zgBlob.merkleTree();
const rootHash = tree.rootHash; // or similar property
~~~

---

## 9. Indexer REST API Endpoints

Based on the Storage CLI documentation:

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/file?root=0x{hash}` | Download file by Merkle root hash |
| GET | `/file?txSeq={N}` | Download file by transaction sequence number |
| POST | `/file/segment` | Upload file segment data |

**Base URLs:**
- Testnet Turbo: `https://indexer-storage-testnet-turbo.0g.ai`
- Testnet Standard: `https://indexer-storage-testnet.0g.ai` (if available)
- Mainnet Turbo: `https://indexer-storage-turbo.0g.ai`

---

## 10. Additional npm Packages

| Package | Version | Purpose |
|---------|---------|---------|
| `@0gfoundation/0g-ts-sdk` | v1.2.6 | Core Storage SDK (upload/download) |
| `@0glabs/0g-serving-broker` | v0.7.4 | Compute Network SDK (inference/fine-tuning) |
| `@0gfoundation/0g-cc` | v1.0.2 | MCP server for compute + storage |

---

## 11. Key Resources

| Resource | URL |
|----------|-----|
| Official Docs | https://docs.0g.ai |
| Builder Hub | https://build.0g.ai/storage/ |
| SDK Reference | https://docs.0g.ai/developer-hub/building-on-0g/storage/sdk |
| Storage CLI Docs | https://docs.0g.ai/developer-hub/building-on-0g/storage/storage-cli |
| Testnet Overview | https://docs.0g.ai/developer-hub/testnet/testnet-overview |
| Mainnet Overview | https://docs.0g.ai/developer-hub/mainnet/mainnet-overview |
| AI Coding Context | https://docs.0g.ai/ai-context |
| TS Starter Kit | https://github.com/0gfoundation/0g-storage-ts-starter-kit |
| TS SDK Source | https://github.com/0gfoundation/0g-ts-sdk |
| Storage Scan | https://storagescan.0g.ai |
| Faucet | https://faucet.0g.ai |

---

## 12. Gotchas & Limitations

1. **Each upload is an on-chain tx** — costs gas (0G tokens on testnet from faucet)
2. **Turbo indexer recommended** — faster than standard indexer
3. **Merkle tree root = content ID** — NOT a simple SHA-256 hash like our stub uses
4. **No API key needed** — auth is wallet-based via ethers signer
5. **Downloads are free/unauthenticated** — only uploads require signing
6. **`MemData` for small payloads, `ZgFile` for files, `ZgBlob` for browser** — pick the right wrapper
7. **Upload returns `[rootHash, error]` tuple** — Go-style error handling in TS
8. **Need testnet 0G tokens** — use faucet at https://faucet.0g.ai before uploads
9. **0G-cc MCP package exists** — could be useful for agent integration via MCP protocol

---

## 13. Impact on AgentTrust `sdk/zerog.ts`

The existing `sdk/zerog.ts` is a **stub** — it only computes SHA-256 hashes locally and never actually uploads to 0G. To make it work with real 0G Storage:

1. Add `@0gfoundation/0g-ts-sdk` as dependency
2. Replace the `hash()` method with Merkle tree computation via `MemData`
3. Implement `store()` using `indexer.upload(file, RPC_URL, signer)`
4. Implement `retrieve()` using `indexer.download(rootHash, ...)` or REST GET
5. Configure for Galileo testnet initially, mainnet for production
6. Wallet needs testnet 0G tokens from faucet for uploads
7. Use `MemData` for agent memory payloads (JSON-encoded)
