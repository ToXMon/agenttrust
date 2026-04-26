# AgentTrust Architecture

## System Overview

AgentTrust is a trust-scored agent commerce protocol enabling verifiable, escrowed interactions between autonomous AI agents on Base (Ethereum L2).

### Design Principles

1. **Identity-first**: Every agent has a verifiable on-chain identity via ENS + ERC-7857
2. **Trust-gated**: Service agreements enforce trust thresholds before execution
3. **Escrowed payments**: Funds locked until verified delivery
4. **Decentralized audit**: All interactions recorded on-chain and on 0G Storage
5. **Protocol-agnostic**: Agents communicate via AXL, execute via any MCP-compatible runner
6. **Edge-native**: Frontend on Cloudflare edge (Pages + Workers), agents on Akash decentralized cloud

---

## Deployment Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     AgentTrust Deployment                        │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              Cloudflare Edge (Frontend + API)             │   │
│  │                                                           │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐              │   │
│  │  │  Pages    │  │ Workers  │  │    D1    │              │   │
│  │  │ (Next.js) │  │(API routes)│  │ (SQLite) │              │   │
│  │  └──────────┘  └──────────┘  └──────────┘              │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐              │   │
│  │  │ Durable  │  │  Queues  │  │    R2    │              │   │
│  │  │ Objects  │  │(demo trig)│  │(audit log)│              │   │
│  │  │(WebSocket)│  │          │  │          │              │   │
│  │  └──────────┘  └──────────┘  └──────────┘              │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                  │
│                    Cloudflare DNS + SSL                         │
│                   (agenttrust.xyz)                              │
│                              │                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              Akash Decentralized Cloud (Agents)           │   │
│  │                                                           │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐              │   │
│  │  │Container 1│  │Container 2│  │Container 3│              │   │
│  │  │Orchestr.  │  │AXL Alpha │  │AXL Beta  │              │   │
│  │  │2CPU/4Gi   │  │1CPU/2Gi  │  │1CPU/2Gi  │              │   │
│  │  │+cron sched│  │Researcher│  │Provider  │              │   │
│  │  └──────────┘  └──────────┘  └──────────┘              │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              Base Sepolia (Smart Contracts)               │   │
│  │                                                           │   │
│  │  AgentRegistry  │  TrustNFT (ERC-7857)  │  ServiceAgreement│   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Layer 1: Smart Contracts (Base Sepolia)

### AgentRegistry (ERC-721)
- Registers agents with ENS names
- Stores capabilities hash and metadata
- Issues identity NFTs
- Supports activation/deactivation

### TrustNFT (ERC-7857 / Soul-bound)
- Non-transferable trust score NFTs
- Score range: 0-100 (starts at 50)
- Updated by ServiceAgreement on completion
- Trust levels: New → Bronze → Silver → Gold → Platinum

### ServiceAgreement (Custom Escrow)
- Trust-gated escrow with 6 states: Pending → Active → Fulfilled → Settled
- ERC-20 token support with SafeERC20
- Dispute and cancellation mechanisms
- ReentrancyGuardTransient protection

### Trust Score Algorithm
```
successRate = completed / (completed + disputed)
targetScore = 50 + (successRate * 50)

if targetScore > currentScore:
    newScore = currentScore + (targetScore - currentScore) / 10  // Slow rise
else:
    newScore = currentScore - (currentScore - targetScore) / 5   // Fast fall
```

Design: Trust is hard to build, easy to lose. Asymmetric scoring.

---

## Layer 2: Cloudflare Edge (Frontend + API)

### Cloudflare Pages — Frontend Hosting
- Next.js 14 with `@opennextjs/cloudflare` adapter
- Edge-rendered pages for global low-latency
- Custom domain: agenttrust.xyz via Cloudflare DNS
- SSL via Cloudflare (automatic)

### Cloudflare Workers — API Routes
- `/api/agents` — Agent listing from D1 cache
- `/api/interactions` — Interaction history from D1
- `/api/trust-scores` — Trust score data from D1
- `/api/demo-trigger` — Enqueue demo job to Cloudflare Queue
- Replaces Vercel serverless functions

### Cloudflare D1 — SQLite Database
- `interactions` table: Agent interaction log (agent IDs, timestamps, results)
- `agents` table: Registered agent metadata cache (ENS names, capabilities, status)
- `trust_scores` table: Trust score history (agent ID, score, timestamp, delta)
- Schema file: `deploy/cloudflare/d1-schema.sql`
- Bound via `wrangler.toml`

### Cloudflare Durable Objects — WebSocket Real-time Feed
- `AgentTrustRoom` DO class manages WebSocket connections
- Replaces SSE polling with true WebSocket push
- Real-time updates for: AXL message log, trust score changes, transaction status
- WebSocket Hibernation API for cost efficiency (pay only while active)
- Connection flow: Client → Workers → Durable Object → WebSocket

### Cloudflare Queues — Demo Trigger Jobs
- Queue: `demo-trigger-queue`
- Consumer: Workers function → HTTP POST to Akash orchestrator
- Used for scheduled demo execution and warm-start
- At-least-once delivery guarantee

### Cloudflare R2 — Audit Log Storage
- Bucket: `agenttrust-audit-logs`
- Stores: Interaction logs, transaction receipts, dispute evidence
- Zero egress cost (S3-compatible API)
- Bound via `wrangler.toml`

---

## Layer 3: Akash Decentralized Cloud (Agent Workers)

### Container 1: Orchestrator
- **SDL**: `deploy/akash/orchestrator.yaml`
- **Resources**: 2 CPU, 4Gi RAM, 10Gi storage
- **Purpose**: Agent orchestrator + cron demo scheduler
- **Runs**: Agent coordination logic, auto-demo every 4 minutes
- **Endpoint**: `orchestrator.agenttrust.xyz` (Cloudflare CNAME)

### Container 2: AXL Node Alpha (Researcher Agent)
- **SDL**: `deploy/akash/axl-node-alpha.yaml`
- **Resources**: 1 CPU, 2Gi RAM, 5Gi storage
- **Purpose**: Gensyn AXL node for researcher/requester agent
- **Runs**: AXL P2P communication, service discovery, trust verification
- **Endpoint**: `axl-alpha.agenttrust.xyz` (Cloudflare CNAME)

### Container 3: AXL Node Beta (Provider Agent)
- **SDL**: `deploy/akash/axl-node-beta.yaml`
- **Resources**: 1 CPU, 2Gi RAM, 5Gi storage
- **Purpose**: Gensyn AXL node for provider agent
- **Runs**: AXL P2P communication, service execution, result delivery
- **Endpoint**: `axl-beta.agenttrust.xyz` (Cloudflare CNAME)

### Why Separate Akash Containers?
- Gensyn AXL prize requires communication across **separate nodes** (not in-process)
- Each container gets a **different IP address** → qualifies as real P2P
- Isolated failure domains — one container crash doesn't take down both agents
- **Funded deployment** (not trial — 24h limit on trial)

---

## Layer 4: Agent Communication (Gensyn AXL)

### Protocol Messages
| Type | Direction | Purpose |
|------|-----------|----------|
| DISCOVER | Broadcast | Agent announces presence |
| TRUST_QUERY | Requester → Provider | Check trust score |
| SERVICE_REQUEST | Requester → Provider | Propose service |
| SERVICE_ACCEPT/REJECT | Provider → Requester | Accept/decline |
| SERVICE_RESULT | Provider → Requester | Deliver output hash |
| AGREEMENT_CREATE | On-chain | Create escrow |
| AGREEMENT_SETTLE | On-chain | Release payment |

### Trust Verification
- Every AXL message includes sender ENS
- Trust scores checked before accepting agreements
- Trust verification is configurable per-threshold
- Nodes communicate via Cloudflare CNAME endpoints

---

## Layer 5: SDK Integrations

### ENS SDK
- Agent identity registration and resolution
- Metadata: capabilities, trust score, agent type
- Primary name management

### Uniswap SDK
- Trust-gated token swaps
- Max swap amount scales with trust level
- Quote fetching and execution

### KeeperHub SDK
- MCP-based task execution
- x402 payment initialization
- Task status monitoring

### 0G Storage SDK
- Decentralized output storage
- Content hash verification
- Audit trail persistence

### Trust SDK
- Score querying and verification
- Trust level classification
- Escrow limit calculation by level

---

## Data Flow

```
Requester                AXL (Akash)              Provider
(AXL Alpha)          (Cloudflare CNAME)          (AXL Beta)
    |                         |                         |
    |-- DISCOVER ------------>|                         |
    |                         |<------------ INTRODUCE -|
    |                         |                         |
    |<--- TRUST_RESPONSE -----|---- TRUST_QUERY ------->|
    |                         |                         |
    |-- SERVICE_REQUEST ----->|-- SERVICE_REQUEST ----->|
    |                         |                         |
    |                         |<-- SERVICE_ACCEPT ------|
    |                         |                         |
    |-- AGREEMENT_CREATE ---> [ServiceAgreement on Base]
    |                         |                         |
    |                         |<-- SERVICE_RESULT ------|
    |-- VERIFY (0G hash) ---> [TrustNFT Score Update]
    |                         |                         |
    |-- AGREEMENT_SETTLE ---> [Payment via Uniswap]
    |                         |                         |
    └──── Dashboard update ──> [Cloudflare DO WebSocket]
```

---

## Cost Analysis

| Service | Tier | Monthly Cost |
|---------|------|-------------|
| Cloudflare Pages | Free | $0 |
| Cloudflare Workers | Free (100K req/day) | $0 |
| Cloudflare D1 | Free (5GB, 5M reads) | $0 |
| Cloudflare Durable Objects | Free (1M req) | $0 |
| Cloudflare Queues | Free (1M ops) | $0 |
| Cloudflare R2 | Free (10GB, 1M class A) | $0 |
| Akash (3 containers) | Trial credits ($100) | $0 |
| Base Sepolia | Testnet (free ETH) | $0 |
| **Custom Domain** | Cloudflare Registrar | ~$10/year |
| **TOTAL** | | **~$0/month** |

---

## Security Considerations

- **Reentrancy**: ReentrancyGuardTransient on all state-changing functions
- **Access Control**: Ownable2Step for admin functions
- **Escrow Safety**: SafeERC20 for all token transfers
- **Trust Integrity**: Only ServiceAgreement can update trust scores
- **Soul-bound**: TrustNFTs cannot be transferred or sold
- **Custom Errors**: Gas-efficient error handling throughout
- **Cloudflare**: DDoS protection, WAF, SSL termination built-in
- **Akash**: Isolated containers, no shared state, encrypted certificates
- **No secrets in frontend**: All sensitive keys in Akash orchestrator env vars
