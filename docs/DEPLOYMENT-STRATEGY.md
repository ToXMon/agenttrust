# Deployment Strategy for AgentTrust

> **Purpose**: Triple-layer deployment strategy for the ETHGlobal Open Agents Hackathon demo.
> **Audience**: Autonomous agents and developers deploying AgentTrust to production.
> **Critical**: All three layers should be deployed before demo day.

---

## 1. Architecture Decision: Client-Side Only

AgentTrust has **NO backend services**. Everything runs client-side in the browser or on-chain.

### Component Backend Requirements

| Component | Needs Backend? | How It Works |
|-----------|---------------|--------------|
| Smart Contracts | No | Deployed on Base (chain 8453), interacted via viem/wagmi |
| Agent Discovery (ENS) | No | ENS resolution via public RPC, viem client-side |
| Trust Verification | No | On-chain reads via IdentityRegistry + ReputationRegistry |
| AXL P2P Messages | No | Gensyn AXL SDK runs browser-to-browser (WebSocket P2P) |
| Uniswap Swaps | No | Uniswap API + viem wallet client, all in-browser |
| KeeperHub Execution | No | MCP protocol from browser via HTTP (KeeperHub hosts the MCP server) |
| 0G Storage | No | 0G JS SDK uploads from browser, proofs verified on-chain |
| Trust Scores UI | No | Computed client-side from on-chain ReputationRegistry data |
| Audit Trail | No | Events indexed from chain, displayed via viem getLogs |
| Frontend (Next.js) | Static export | No API routes needed — all data fetched client-side |

### Implications

- **No server to maintain** — just static file hosting
- **No database** — all state on-chain or in browser localStorage
- **No API keys exposed** — all RPC calls use public endpoints
- **Perfect for IPFS** — static files only
- **Perfect for Vercel** — zero-config deployment

---

## 2. Triple-Layer Deployment Strategy

```
┌─────────────────────────────────────────────────────────┐
│                    JUDGES / USERS                        │
└───────────┬──────────────┬──────────────┬───────────────┘
            │              │              │
     ┌──────▼──────┐ ┌─────▼──────┐ ┌─────▼──────┐
     │   VERCEL     │ │   AKASH    │ │  IPFS+ENS  │
     │  (primary)   │ │  (backup)  │ │ (permanent)│
     ├──────────────┤ ├────────────┤ ├────────────┤
     │ 5-min deploy │ │ Docker     │ │ Fleek pin  │
     │ Preview URLs │ │ $100 trial │ │ ENS hash   │
     │ Free tier    │ │ Decentral. │ │ Immutable  │
     │ Reliable     │ │ Demo point │ │ Ethos      │
     └──────────────┘ └────────────┘ └────────────┘
            │              │              │
     ┌──────▼──────────────▼──────────────▼───────┐
     │           BASE CHAIN (8453)                 │
     │  AgentRegistry · TrustNFT · ServiceAgreement│
     │  IdentityRegistry · ReputationRegistry      │
     │  Uniswap V4 · ENS · KeeperHub               │
     └─────────────────────────────────────────────┘
```

### Layer Comparison

| Feature | Vercel | Akash | IPFS + ENS |
|---------|--------|-------|------------|
| Deploy time | 5 min | 30 min | 15 min |
| Cost | Free | $100 trial credits | Free (Fleek) |
| Uptime | 99.99% | Trial: 24h limit | Permanent |
| Custom domain | ✅ agenttrust.vercel.app | ✅ Custom possible | ✅ agenttrust.eth |
| SSL | Auto | Auto | Via gateway |
| Demo reliability | Highest | Medium | Low (gateway deps) |
| Judge impression | Professional | Decentralized ✨ | Ethereum ethos ✨ |
| Fallback for | N/A | If Vercel down | If both down |
| Setup complexity | Trivial | Medium | Low |

---

## 3. Vercel Deployment Steps

### Prerequisites

- GitHub repository: `https://github.com/ToXMon/agenttrust`
- Vercel account (free tier works)
- Frontend builds successfully: `cd frontend && npm run build`

### Step-by-Step

#### 3.1. Prepare Frontend for Vercel

Ensure `frontend/next.config.js` (or `next.config.mjs`) has correct settings:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export', // Static export — no server needed
  images: {
    unoptimized: true, // Required for static export
  },
  env: {
    NEXT_PUBLIC_CHAIN_ID: '8453',
    NEXT_PUBLIC_RPC_URL: 'https://mainnet.base.org',
  },
};

module.exports = nextConfig;
```

> **Note**: If you need SSR features (not required for AgentTrust), remove `output: 'export'` and use standard Vercel deployment.

#### 3.2. Deploy via Vercel CLI

```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy from frontend directory
cd /a0/usr/projects/agenttrust/frontend

# First deploy (creates project)
vercel

# Follow prompts:
#   - Set up and deploy? Yes
#   - Which scope? (your account)
#   - Link to existing project? No
#   - Project name? agenttrust
#   - Which directory is your code in? ./
#   - Want to modify settings? No

# Production deploy
vercel --prod
```

#### 3.3. Deploy via Vercel Dashboard (Alternative)

1. Go to https://vercel.com/new
2. Import `ToXMon/agentrust` repository
3. Set **Root Directory** to `frontend`
4. Framework: **Next.js** (auto-detected)
5. Environment variables:
   - `NEXT_PUBLIC_CHAIN_ID` = `8453`
   - `NEXT_PUBLIC_RPC_URL` = `https://mainnet.base.org`
6. Click **Deploy**

#### 3.4. Custom Domain (Optional)

```bash
# Add custom domain
vercel domains add agenttrust.xyz

# Point DNS to Vercel:
# CNAME: agenttrust.xyz → cname.vercel-dns.com
```

#### 3.5. Verify

```bash
# Check deployment
curl -s -o /dev/null -w "%{http_code}" https://agenttrust.vercel.app
# Should return 200

# Test key pages
curl -s https://agentrust.vercel.app/debug | head -5
curl -s https://agenttrust.vercel.app/agents | head -5
```

---

## 4. Akash Deployment Steps

Akash provides decentralized cloud hosting. This layer serves as a **backup** and demonstrates decentralized infrastructure to judges.

### 4.1. Dockerfile for Next.js

Create `frontend/Dockerfile`:

```dockerfile
# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci

# Copy source
COPY . .

# Build arguments for environment variables
ARG NEXT_PUBLIC_CHAIN_ID=8453
ARG NEXT_PUBLIC_RPC_URL=https://mainnet.base.org

ENV NEXT_PUBLIC_CHAIN_ID=$NEXT_PUBLIC_CHAIN_ID
ENV NEXT_PUBLIC_RPC_URL=$NEXT_PUBLIC_RPC_URL

# Build static export
RUN npm run build

# Stage 2: Serve with nginx
FROM nginx:1.25-alpine

# Copy built static files
COPY --from=builder /app/out /usr/share/nginx/html

# Copy nginx config for SPA routing
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

### 4.2. Nginx Configuration

Create `frontend/nginx.conf`:

```nginx
server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    # SPA routing — serve index.html for all routes
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
}
```

### 4.3. SDL (Stack Definition Language)

Create `deploy/akash.yaml`:

```yaml
version: "2.0"

services:
  web:
    image: toxmon/agenttrust:latest  # Build and push to Docker Hub first
    expose:
      - port: 80
        as: 80
        to:
          - global: true
    env:
      - "NEXT_PUBLIC_CHAIN_ID=8453"
      - "NEXT_PUBLIC_RPC_URL=https://mainnet.base.org"

profiles:
  compute:
    web:
      resources:
        cpu:
          units: 0.5
        memory:
          size: 512Mi
        storage:
          size: 1Gi
  placement:
    dcloud:
      pricing:
        web:
          denom: uact
          amount: 1000

deployment:
  web:
    dcloud:
      profile: web
      count: 1
```

### 4.4. Build and Push Docker Image

```bash
# Build image
cd /a0/usr/projects/agentrust/frontend
docker build -t toxmon/agenttrust:latest .

# Push to Docker Hub
docker push toxmon/agenttrust:latest
```

### 4.5. Deploy via Console API (Credit Card)

The easiest method for hackathon — no wallet or CLI needed:

```bash
# 1. Sign up at https://console.akash.network
# 2. Add credit card for $100 trial credits
# 3. Click "Create Deployment"
# 4. Paste the SDL from deploy/akash.yaml
# 5. Select a provider
# 6. Deploy
```

### 4.6. Deploy via CLI (Alternative)

```bash
# Install Akash provider-services
# See: https://akash.network/docs/getting-started/quickstart-guides/AkashCLI/

# Create certificate
provider-services tx cert create client --from my-key

# Create deployment
provider-services tx deployment create deploy/akash.yaml \
  --dseq $DSEQ \
  --from my-key

# Send manifest
provider-services send-manifest deploy/akash.yaml \
  --dseq $DSEQ \
  --provider $PROVIDER \
  --from my-key

# Get lease status
provider-services query lease list \
  --owner $ADDRESS \
  --state active
```

### ⚠️ Trial Duration Warning

Akash trial deployments auto-close after **24 hours**. During hackathon week:

| Day | Action |
|-----|--------|
| Day 1-6 | Not needed yet |
| Day 7 (April 30) | Deploy to Akash for testing |
| Day 8 (May 1) | Redeploy if needed for demo prep |
| Demo Day (May 2-3) | Deploy fresh morning of demo |

> **Tip**: The 24h limit only applies to trial/credit card deployments. Regular funded deployments have no duration limit.

---

## 5. IPFS + ENS Deployment Steps

This layer provides **permanent, immutable** hosting aligned with Ethereum's ethos.

### 5.1. Build Static Export

```bash
cd /a0/usr/projects/agenttrust/frontend

# Ensure next.config.js has output: 'export'
npm run build

# Output goes to frontend/out/
ls -la out/
# Should contain: index.html, _next/, agents/, trust/, etc.
```

### 5.2. Pin to IPFS via Fleek

**Option A: Fleek (Recommended)**

```bash
# Install Fleek CLI
npm install -g @fleek-platform/cli

# Login
fleek login

# Deploy to IPFS
fleek sites deploy \
  --path ./out \
  --name agenttrust

# Returns IPFS CID:
# > CID: QmXYZ123...
# > URL: https://agenttrust.on-fleek.co
```

**Option B: Pinata (Alternative)**

```bash
# Install Pinata CLI
npm install -g pinata-cli

# Upload directory
pinata upload ./out

# Returns IPFS CID
```

**Option C: Manual IPFS Add**

```bash
# If you have a local IPFS node
ipfs add -r out/

# Note the root CID from the last line of output
```

### 5.3. Set ENS Content Hash

Point `agentrust.eth` to the IPFS CID:

```typescript
// scripts/set-ens-contenthash.ts
import { createPublicClient, createWalletClient, http, custom, encodeAbiParameters } from "viem";
import { base, mainnet } from "wagmi/chains";
import { normalize } from "viem/ens";

const ENS_REGISTRY = "0x00000000000C2e074eC69A0dFb2997BA6C7d2e1e" as const;
const ENS_RESOLVER_ABI = [
  {
    name: "setContenthash",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "node", type: "bytes32" },
      { name: "hash", type: "bytes" },
    ],
    outputs: [],
  },
];

async function setENSContentHash(ipfsCID: string) {
  const walletClient = createWalletClient({
    chain: mainnet,
    transport: custom(window.ethereum),
  });

  const [account] = await walletClient.getAddresses();

  // Convert IPFS CID to contenthash format
  const contentHash = encodeAbiParameters(
    [{ name: "hash", type: "bytes" }],
    [
      // ipfs:// prefix + CID in bytes
      `0xe30101701220${Buffer.from(ipfsCID).toString("hex")}`
    ]
  );

  // Get resolver address for agenttrust.eth
  const publicClient = createPublicClient({
    chain: mainnet,
    transport: http(),
  });

  const resolverAddress = await publicClient.getEnsResolver({
    name: "agenttrust.eth",
  });

  // Set contenthash
  const { request } = await publicClient.simulateContract({
    address: resolverAddress,
    abi: ENS_RESOLVER_ABI,
    functionName: "setContenthash",
    args: [
      // namehash of agenttrust.eth
      "0x...", // compute via namehash
      contentHash,
    ],
    account,
  });

  const hash = await walletClient.writeContract(request);
  console.log(`ENS contenthash set! TX: ${hash}`);
  console.log(`Access at: https://agenttrust.eth.link`);
}
```

### 5.4. Access via ENS

After setting the contenthash, the site is accessible via:

| Gateway | URL |
|---------|-----|
| ENS Direct | `https://agenttrust.eth` (needs ENS-enabled browser) |
| ETH.link | `https://agenttrust.eth.link` |
| ETH.limo | `https://agenttrust.eth.limo` |
| IPFS Gateway | `https://cloudflare-ipfs.com/ipfs/<CID>` |
| dweb | `https://dweb.link/ipfs/<CID>` |

---

## 6. Deployment Order

### Hackathon Timeline

| Date | Deploy Action | Layer |
|------|--------------|-------|
| **Day 1-4** (Apr 24-27) | No deployment needed — building | — |
| **Day 5** (Apr 28) | First Vercel deploy (staging) | Layer 1 |
| **Day 6** (Apr 29) | Test Vercel deploy, fix issues | Layer 1 |
| **Day 7** (Apr 30) | Deploy to Akash (test run) | Layer 2 |
| **Day 8** (May 1) | Build static export, pin to IPFS | Layer 3 |
| **Day 8** (May 1) | Set ENS contenthash | Layer 3 |
| **Demo Day** (May 2-3) | Redeploy all 3 layers (fresh) | All |
| **Demo +2h** (May 3, 12:00 ET) | Deadline — all layers must be live | All |

### Critical Path

```
Day 5: Vercel ────→ Day 6: Verify ────→ Day 7: Akash ────→ Day 8: IPFS+ENS
   │                                      │                    │
   └── Judges see this URL ◄──────────────┘                    │
   └── Fallback URL ◄─────────────────────────────────────────┘
```

### Pre-Demo Checklist

- [ ] Vercel: `https://agenttrust.vercel.app` returns 200
- [ ] Vercel: Debug Contracts page loads at `/debug`
- [ ] Vercel: Wallet connects on Base
- [ ] Akash: Deployment URL returns 200
- [ ] Akash: Same functionality as Vercel
- [ ] IPFS: Site loads via gateway
- [ ] ENS: `agenttrust.eth` resolves to IPFS content
- [ ] Contracts: All 3 contracts verified on Basescan
- [ ] Contracts: AgentRegistry has test agents registered
- [ ] Demo scenario: Test walk-through completes end-to-end

---

## 7. Demo Considerations

### Primary URL for Judges

```
https://agenttrust.vercel.app
```

This is the most reliable URL. Show this first.

### Demo Flow for Judges

1. **Start at Vercel URL** — fastest loading, most reliable
2. **Mention Akash** — "We're also deployed on Akash Network for decentralized hosting"
3. **Show ENS** — "And the site is permanently available at agenttrust.eth via IPFS"
4. **Connect wallet** — MetaMask on Base
5. **Walk through flow**: Discover agent → Check trust → Initiate service → Pay via Uniswap → Receive result → Rate
6. **Show Debug Contracts** — Prove everything is on-chain

### Judge Talking Points

| Layer | Points to Make |
|-------|---------------|
| Vercel | "Instant preview URLs, 5-minute deploy, zero config" |
| Akash | "Decentralized compute, $100 trial credits, Docker-based, true Web3 infrastructure" |
| IPFS + ENS | "Content-addressed, immutable, permanent, Ethereum-native" |
| Base | "Low gas fees, fast finality, Coinbase ecosystem" |

### Backup Plan During Demo

If Vercel goes down during the demo:

1. **Switch to Akash URL** — show decentralized resilience
2. **Frame it as a feature** — "This is exactly why we deployed on multiple layers"
3. **Last resort** — Show IPFS gateway URL

Keep all 3 URLs visible in a browser bookmark folder.

---

## 8. Rollback Plan

### Vercel Rollback

```bash
# List deployments
vercel ls

# Rollback to previous deployment
vercel rollback <deployment-url>

# Or redeploy from a specific commit
vercel --prod --yes
```

### Akash Rollback

```bash
# Close current deployment
provider-services tx deployment close \
  --dseq $DSEQ \
  --from my-key

# Redeploy with updated SDL
provider-services tx deployment create deploy/akash.yaml \
  --dseq $NEW_DSEQ \
  --from my-key
```

### IPFS Rollback

IPFS content is **immutable** — each CID is permanent. To "rollback":

1. Build a new static export
2. Pin to IPFS (gets new CID)
3. Update ENS contenthash to new CID

```bash
# Rebuild
npm run build

# Re-pin
fleek sites deploy --path ./out --name agenttrust

# Update ENS (see Section 5.3)
npx tsx scripts/set-ens-contenthash.ts <NEW_CID>
```

### Emergency Rollback Matrix

| Scenario | Action | Time |
|----------|--------|------|
| Vercel down | Switch demo URL to Akash | 5 seconds |
| Akash trial expired | Redeploy via Console API | 5 minutes |
| Both down | Use IPFS gateway | 10 seconds |
| Contract bug | Use Debug Contracts to verify state | Immediate |
| Wallet won't connect | Switch to backup wallet / Burner | 30 seconds |
| RPC rate limited | Switch to Alchemy/Infura RPC | 1 minute |

### Demo Day Emergency Kit

Keep these ready in a text file:

```
=== AGENTTRUST DEPLOYMENT URLS ===
Primary:   https://agenttrust.vercel.app
Backup:    https://<akash-lease-url>
Permanent: https://agenttrust.eth.limo
IPFS:      https://cloudflare-ipfs.com/ipfs/<CID>

=== RPC ENDPOINTS ===
Primary:   https://mainnet.base.org
Backup:    https://base-mainnet.g.alchemy.com/v2/<KEY>

=== CONTRACTS ON BASE ===
AgentRegistry:      0x...
ServiceAgreement:   0x...
TrustNFT:           0x...
IdentityRegistry:   0x8004A169FB4a3325136EB29fA0ceB6D2e539a432
ReputationRegistry: 0x8004BAa17C55a88189AE136b182e5fdA19dE9b63

=== VERIFICATION ===
Basescan: https://basescan.org/address/<addr>
```

---

## 5. Gensyn AXL Node Deployment

> **Critical**: AXL nodes are Go binaries — they CANNOT run in the browser. They require server-side deployment.

### Architecture

```
Browser (Vercel/Akash) ──HTTPS──→ Nginx/CORS Proxy ──→ AXL Node A (:9002)
                                                       ↕ P2P Mesh
                                  Nginx/CORS Proxy ──→ AXL Node B (:9012)
```

### AXL Node Docker Setup

See `docs/reference/gensyn-axl-deep-research.md` Appendix A for Dockerfile.

Build and run:
```bash
# Build AXL binary
git clone https://github.com/gensyn-ai/axl.git /tmp/axl && cd /tmp/axl
make build

# Generate keys
openssl genpkey -algorithm ed25519 -out /data/private-a.pem
openssl genpkey -algorithm ed25519 -out /data/private-b.pem

# Node A
./node -config /config/node-a.json &

# Node B
./node -config /config/node-b.json &
```

### Akash SDL for AXL Nodes

Recommended: 2 separate Akash deployments (one per node) or 1 deployment with 2 services.

```yaml
version: "2.0"
services:
  axl-node-a:
    image: agenttrust/axl-node:latest
    expose:
      - port: 9002
        as: 80
        to:
          - global: true
      - port: 7000
        as: 7000
        to:
          - global: true
    env:
      - "NODE_CONFIG=/config/node-a.json"
  axl-node-b:
    image: agenttrust/axl-node:latest
    expose:
      - port: 9012
        as: 80
        to:
          - global: true
      - port: 7010
        as: 7010
        to:
          - global: true
    env:
      - "NODE_CONFIG=/config/node-b.json"
profiles:
  compute:
    axl-node:
      resources:
        cpu:
          units: 1
        memory:
          size: 2Gi
        storage:
          size: 5Gi
  placement:
    dcloud:
      pricing:
        axl-node:
          denom: uact
          amount: 1000
deployment:
  axl-node-a:
    dcloud:
      profile: axl-node
      count: 1
  axl-node-b:
    dcloud:
      profile: axl-node
      count: 1
```

### CORS Proxy (Required)

AXL nodes do NOT support CORS. Use one of:

1. **Nginx reverse proxy** (recommended for Akash):
```nginx
server {
    listen 80;
    location /api/node-a/ {
        proxy_pass http://127.0.0.1:9002/;
        add_header Access-Control-Allow-Origin *;
        add_header Access-Control-Allow-Methods "GET, POST, OPTIONS";
        add_header Access-Control-Allow-Headers *;
        if ($request_method = OPTIONS) { return 204; }
    }
    location /api/node-b/ {
        proxy_pass http://127.0.0.1:9012/;
        add_header Access-Control-Allow-Origin *;
        add_header Access-Control-Allow-Methods "GET, POST, OPTIONS";
        add_header Access-Control-Allow-Headers *;
        if ($request_method = OPTIONS) { return 204; }
    }
}
```

2. **Cloudflare Tunnel** (free, adds CORS automatically):
```bash
cloudflared tunnel --url http://localhost:9002 &  # Node A
cloudflared tunnel --url http://localhost:9012 &  # Node B
```

### Key Configuration

| Setting | Node A | Node B |
|---------|--------|--------|
| API Port | 9002 | 9012 |
| TCP Port | 7000 | 7010 |
| Private Key | private-a.pem | private-b.pem |
| Bootstrap Peers | tls://34.46.48.224:9001, tls://136.111.135.206:9001 | (same) |

### Pre-Demo Checklist
- [ ] Both AXL nodes started 5+ minutes before demo
- [ ] `/topology` endpoint shows both nodes peered
- [ ] CORS proxy verified from browser console
- [ ] Test message round-trip confirmed
