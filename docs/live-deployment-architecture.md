# AgentTrust — Live Deployment Architecture

> ETHGlobal Hackathon Judging Demo
> Target: 3-day live deployment under $50

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Backend Architecture](#2-backend-architecture)
3. [Frontend Real-time Features](#3-frontend-real-time-features)
4. [Background Agent Orchestration](#4-background-agent-orchestration)
5. [Interactive Demo Trigger](#5-interactive-demo-trigger)
6. [Live Data Pipeline](#6-live-data-pipeline)
7. [Deployment Strategy](#7-deployment-strategy)
8. [Cost Analysis](#8-cost-analysis)
9. [Fallback Plan](#9-fallback-plan)
10. [Implementation Order](#10-implementation-order)
11. [Risk Assessment Matrix](#11-risk-assessment-matrix)

---

## 1. System Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                        JUDGE'S BROWSER                          │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────────────┐  │
│  │ Activity Feed│  │ Trust Scores │  │  "Run Demo" Button     │  │
│  │  (SSE live)  │  │  (polling)   │  │  → triggers full flow  │  │
│  └──────┬───────┘  └──────┬───────┘  └───────────┬────────────┘  │
└─────────┼─────────────────┼───────────────────────┼──────────────┘
          │ SSE stream       │ GET /api/...          │ POST /api/demo
          ▼                 ▼                       ▼
┌──────────────────────────────────────────────────────────────────┐
│                     VERCEL (Next.js 14)                          │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  /app/api/                                                │   │
│  │    api/activity/stream  → SSE endpoint (activity feed)   │   │
│  │    api/demo/trigger     → POST: start 7-step flow        │   │
│  │    api/demo/status      → GET: current run progress      │   │
│  │    api/agents           → GET: registered agents list    │   │
│  │    api/trust/[address]  → GET: on-chain trust score      │   │
│  │    api/tx/[hash]        → GET: tx status + Basescan link │   │
│  │    api/interactions     → GET: recent interaction history│   │
│  └──────────────────────────────────────────────────────────┘   │
│                         │ reads/writes                         │
│                    Vercel KV (Redis)                             │
│              activity-feed | demo-runs | agent-cache             │
└─────────────────────────┬───────────────────────────────────────┘
                          │ HTTP callback (Railway → Vercel KV)
                          ▼
┌──────────────────────────────────────────────────────────────────┐
│                  RAILWAY (Node.js Worker)                        │
│                                                                  │
│  ┌─────────────────┐    ┌──────────────────────────────────────┐│
│  │ Auto-Demo       │    │  Demo Orchestrator                   ││
│  │ Scheduler       │    │  (receives trigger, runs 7 steps)    ││
│  │ (cron: 4min)    │    │                                      ││
│  │                 │    │  1. REGISTER  → AgentRegistry.sol     ││
│  │ Fires demo run  │    │  2. DISCOVER  → AXL P2P message      ││
│  │ every 4 minutes │    │  3. NEGOTIATE → trust threshold check ││
│  │                 │    │  4. ESCROW   → ServiceAgreement.sol  ││
│  └────────┬────────┘    │  5. EXECUTE  → KeeperHub MCP call    ││
│           │             │  6. VERIFY   → 0G Storage hash       ││
│           └────────────→│  7. SETTLE   → Uniswap swap on Base  ││
│                         └──────────────┬───────────────────────┘│
│                                        │                        │
│  ┌─────────────────────────────────────┘                        │
│  │ After each step: push result to Vercel KV                   │
│  │ Activity feed consumers pick up via SSE                     │
│  └─────────────────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────────────────┐
│                      BASE SEPOLIA (L2)                           │
│                                                                  │
│  AgentRegistry.sol    TrustNFT.sol        ServiceAgreement.sol   │
│  (ERC-721 identity)   (Soulbound 0-100)   (Escrow state machine)│
│                                                                  │
│  Basescan: https://sepolia.basescan.org/tx/{hash}               │
└──────────────────────────────────────────────────────────────────┘

External Services:
  Gensyn AXL  ←→ P2P messages between agent nodes
  KeeperHub   ←→ MCP task execution
  0G Storage  ←→ output hash verification
  Uniswap v4  ←→ payment settlement swap
  ENS         ←→ agenttrust.eth subnames
```

---

## 2. Backend Architecture

### 2.1 API Routes

All routes live in the Next.js app under `/app/api/`:

```
frontend/app/api/
├── activity/
│   └── stream/route.ts        # GET — SSE endpoint for live activity feed
├── demo/
│   ├── trigger/route.ts       # POST — judge triggers a demo run
│   └── status/route.ts        # GET — poll current demo run progress
├── agents/
│   └── route.ts               # GET — list registered agents + trust scores
├── trust/
│   └── [address]/route.ts     # GET — fetch on-chain trust score for address
├── tx/
│   └── [hash]/route.ts        # GET — tx receipt status + Basescan URL
└── interactions/
    └── route.ts               # GET — paginated interaction history
```

#### Route Details

| Route | Method | Purpose | Response Time |
|-------|--------|---------|---------------|
| `/api/activity/stream` | GET | SSE: sends new events as they happen | Continuous |
| `/api/demo/trigger` | POST | Queue a 7-step demo run, returns `runId` | < 200ms |
| `/api/demo/status?runId=xxx` | GET | Current step, tx hashes, timestamps | < 100ms |
| `/api/agents` | GET | Cached list of registered agents | < 100ms |
| `/api/trust/[address]` | GET | On-chain trust score (cached 30s) | < 500ms |
| `/api/tx/[hash]` | GET | Tx status from Base Sepolia RPC | < 1s |
| `/api/interactions` | GET | Last 50 interactions from KV store | < 100ms |

### 2.2 Agent Worker Process

The worker runs on Railway as a single long-running Node.js process:

```
worker/
├── src/
│   ├── index.ts              # Entry point: starts scheduler + HTTP listener
│   ├── orchestrator.ts       # Runs the 7-step demo flow
│   ├── scheduler.ts          # Cron-like auto-demo timer
│   ├── steps/
│   │   ├── 1-register.ts     # AgentRegistry registerAgent()
│   │   ├── 2-discover.ts     # AXL P2P discovery message
│   │   ├── 3-negotiate.ts    # ServiceAgreement createAgreement()
│   │   ├── 4-escrow.ts       # Deposit funds into escrow
│   │   ├── 5-execute.ts      # KeeperHub MCP task dispatch
│   │   ├── 6-verify.ts       # Upload to 0G, get hash
│   │   └── 7-settle.ts       # Uniswap swap, release payment
│   ├── state.ts              # Write step results to Vercel KV
│   └── wallet.ts             # Funded wallets for demo agents
├── package.json
└── tsconfig.json
```

The worker does **not** run inside Vercel. It's a separate deployment on Railway because:
- Demo runs take 30-90 seconds (exceeds Vercel's 10s serverless limit on hobby)
- Needs persistent state for AXL P2P connections
- Cron scheduling requires a long-running process

### 2.3 Job Queue

Hackathon-grade: no RabbitMQ, no BullMQ. Use a simple flag in Vercel KV.

```
KV key: "demo:current-run"
Value: { runId, status: "running"|"idle", step: 3, startedAt, ... }
```

When a judge hits "Run Demo":
1. `POST /api/demo/trigger` sets `demo:current-run` status to `queued`
2. Worker polls KV every 2 seconds, picks up queued runs
3. Worker sets status to `running`, executes steps
4. Each step updates KV with progress
5. Worker sets status to `idle` when done

**Concurrency guard**: Only one demo runs at a time. If status is `running`, the trigger API returns `429` with a message like "Demo already in progress, watch it below."

### 2.4 State Management

All state lives in **Vercel KV** (Redis under the hood, free tier: 30K commands/month):

| Key Pattern | Data | TTL |
|-------------|------|-----|
| `activity:feed` | JSON array of last 50 events | No expiry (capped) |
| `demo:current-run` | Current demo run state | No expiry |
| `demo:history` | Array of past run summaries | No expiry |
| `agent:{address}` | Cached agent metadata + trust score | 30 seconds |
| `tx:{hash}` | Cached tx receipt | 60 seconds |
| `interactions:all` | Paginated interaction records | No expiry |

The worker writes to KV after each step. The Vercel API routes read from KV. SSE endpoint polls KV for new events every 500ms and pushes to connected clients.

---

## 3. Frontend Real-time Features

### 3.1 Transport Choice: Server-Sent Events

**SSE wins over WebSocket for this use case.**

| Factor | SSE | WebSocket | Polling |
|--------|-----|-----------|---------|
| Vercel compatibility | Native (streaming API routes) | Requires external server | Works |
| Direction | Server → Client only | Bidirectional | Client → Server |
| Complexity | Low | Medium | Lowest |
| Connection persistence | Auto-reconnect built-in | Manual reconnect | N/A |
| Latency for activity feed | < 1s | < 1s | 2-5s |

We don't need bidirectional communication. The frontend receives activity updates and sends HTTP POST for demo triggers. SSE handles the read path; standard API calls handle the write path.

Polling is too slow for the "wow" factor — judges need to see things appear instantly.

### 3.2 SSE Implementation

```
frontend/app/api/activity/stream/route.ts

GET /api/activity/stream
  Headers: Content-Type: text/event-stream

Events:
  event: step-complete
  data: { runId, step: 3, stepName: "NEGOTIATE", txHash: "0x...", timestamp }

  event: trust-update
  data: { address, oldScore: 50, newScore: 52, reason: "service fulfilled" }

  event: agent-registered
  data: { address, ensName, tokenUri }

  event: payment-settled
  data: { from, to, amount, token, txHash }

  event: heartbeat
  data: { ts: 1745000000 }
```

The SSE endpoint:
1. Client connects via `EventSource('/api/activity/stream')`
2. Server reads KV `activity:feed`, sends last 10 events as `history` events
3. Server polls KV every 500ms for new events (compares against last sent ID)
4. New events are pushed immediately
5. Heartbeat every 15 seconds keeps the connection alive (Vercel drops idle connections at 30s)

### 3.3 Activity Feed Component

```
frontend/app/components/
├── ActivityFeed.tsx          # Main feed container, connects to SSE
├── ActivityItem.tsx          # Single event row (icon + text + time + link)
├── StepProgress.tsx          # 7-step progress bar for current demo
├── TrustScoreBadge.tsx       # Animated score badge (0-100)
└── TxLink.tsx                # Basescan link component
```

**ActivityFeed.tsx** design:
- Fixed-height scrollable container (last 50 events)
- New events slide in from top with CSS transition
- Events are color-coded by type (register=blue, escrow=amber, settle=green, trust=cyan)
- Each event has a clickable Basescan tx link
- Auto-scrolls to latest event
- Shows timestamp relative to now ("12s ago", "1m ago")

**StepProgress.tsx** design:
- Horizontal 7-step indicator: REGISTER → DISCOVER → NEGOTIATE → ESCROW → EXECUTE → VERIFY → SETTLE
- Completed steps: filled green with checkmark
- Current step: pulsing amber
- Future steps: gray outline
- Below each step: tx hash link (when available)

### 3.4 Live Trust Score Updates

Trust scores update via two mechanisms:
1. **SSE `trust-update` event** — pushed immediately when the worker detects an on-chain score change
2. **Periodic poll** — every 30 seconds, the frontend fetches `/api/agents` to refresh all scores

The `TrustScoreBadge` component:
- Shows current score as a number inside a circular badge
- Color gradient: red (0-30) → amber (31-60) → green (61-100)
- When score changes, the number animates (count up/down) over 500ms
- Badge color transitions smoothly

### 3.5 Transaction Status Polling

When a step produces a tx hash:
1. SSE delivers the hash immediately
2. Frontend shows "Pending..." with a spinner
3. Polls `/api/tx/{hash}` every 3 seconds
4. On confirmation: spinner → green checkmark + Basescan link
5. Typical Base Sepolia confirmation: 2-5 seconds

---

## 4. Background Agent Orchestration

### 4.1 Auto-Demo Scheduler

The site must look alive even when no judge is clicking. An auto-demo runs every 4 minutes.

```
worker/src/scheduler.ts

const DEMO_INTERVAL_MS = 4 * 60 * 1000;  // 4 minutes
const AGENT_PAIRS = [
  { requester: "agent-alpha.agenttrust.eth", provider: "agent-beta.agenttrust.eth" },
  { requester: "agent-gamma.agenttrust.eth", provider: "agent-delta.agenttrust.eth" },
  { requester: "agent-epsilon.agenttrust.eth", provider: "agent-zeta.agenttrust.eth" },
];

// Rotates through pairs so each run looks different
let pairIndex = 0;

setInterval(async () => {
  const pair = AGENT_PAIRS[pairIndex % AGENT_PAIRS.length];
  pairIndex++;
  await runDemo(pair.requester, pair.provider);
}, DEMO_INTERVAL_MS);
```

**Why 4 minutes?**
- Full 7-step flow takes 30-90 seconds
- 4-minute interval gives ~2.5 minutes of idle time (feed stays populated)
- Over 3 days: ~1,080 auto-demo runs
- Base Sepolia gas is free, so no cost concern

### 4.2 Demo Variations

To keep the feed interesting, each auto-demo rotates:
- Different agent pairs (3 pairs)
- Different service descriptions ("code review", "data analysis", "API integration")
- Different payment amounts (0.001–0.01 ETH)
- Different trust score outcomes (sometimes +2, sometimes -1)

### 4.3 Pre-Seeded Warm Start

On deployment, immediately run 3 demo sequences back-to-back. This ensures:
- The activity feed has content from second 0
- Trust scores are already > 50 (shows the system working)
- Multiple agents are registered and visible

---

## 5. Interactive Demo Trigger

### 5.1 Judge Flow

```
Judge clicks "Run Demo" button
       │
       ▼
POST /api/demo/trigger
       │
       ├── 429 → "Demo in progress" (show current run)
       │
       └── 200 → { runId: "judge-abc123" }
              │
              ▼
         Frontend subscribes to SSE
         Shows 7-step progress bar
              │
              ▼
    Step 1: REGISTER
      → SSE: { step: 1, txHash: "0xaaa..." }
      → Frontend: tx pending... confirmed! [Basescan link]
              │
              ▼
    Step 2: DISCOVER
      → SSE: { step: 2, axlMessageId: "msg-xyz" }
      → Frontend: "Agent Alpha discovered Agent Beta via AXL"
              │
              ▼
    Steps 3-7: same pattern
              │
              ▼
    Step 7: SETTLE complete
      → SSE: { step: 7, txHash: "0xggg...", payment: "0.005 ETH" }
      → Frontend: "Payment settled! Trust scores updated."
              │
              ▼
    Summary card appears:
      "Your demo completed in 47 seconds.
       7 transactions on Base Sepolia.
       Trust scores: Alpha 50→52, Beta 50→51."
```

### 5.2 Judge Attribution

Judge-triggered runs get a special `runId` prefix (`judge-*`). The activity feed marks them with a badge: "Triggered by a judge" with a unique color. This gives judges ownership of their interaction.

### 5.3 Error Handling in UI

If a step fails:
- SSE sends an `error` event with step number and error message
- Progress bar marks the failed step in red
- "Retry" button appears
- After 10 seconds, auto-retries once
- If retry fails, shows "This step encountered an issue. Auto-demo continues in background."

---

## 6. Live Data Pipeline

### 6.1 Data Flow

```
┌─────────────────────────────────────────────────────┐
│                    RAILWAY WORKER                   │
│                                                     │
│  orchestrator.ts executes each step:                │
│    1. Sends tx to Base Sepolia                      │
│    2. Waits for tx receipt (poll RPC, 2s interval)  │
│    3. Reads on-chain events from receipt logs       │
│    4. Compiles step result:                         │
│       { step, stepName, txHash, events, timestamp } │
│    5. Pushes to Vercel KV:                          │
│       - Append to activity:feed (LPUSH + LTRIM 50)  │
│       - Update demo:current-run                     │
│       - Update agent:{addr} if trust changed         │
│    6. If step 6 (VERIFY): read TrustNFT score change│
│       from on-chain, push trust-update event         │
└──────────────────────┬──────────────────────────────┘
                       │ writes
                       ▼
┌─────────────────────────────────────────────────────┐
│                   VERCEL KV                          │
│                                                     │
│  activity:feed  →  [{id, type, data, ts}, ...]      │
│  demo:current   →  {runId, step, status, ...}       │
│  agent:0x...    →  {address, ens, trustScore, ...}  │
└──────────────────────┬──────────────────────────────┘
                       │ reads
                       ▼
┌─────────────────────────────────────────────────────┐
│              VERCEL NEXT.JS (API ROUTES)             │
│                                                     │
│  SSE endpoint polls KV every 500ms:                 │
│    - Compare latest event ID vs last sent           │
│    - New events → push to EventSource clients       │
│                                                     │
│  GET endpoints read KV for REST queries:            │
│    - /api/agents → cached agent list                │
│    - /api/trust/[addr] → cached or on-chain         │
│    - /api/demo/status → current run state           │
└──────────────────────┬──────────────────────────────┘
                       │ SSE + HTTP
                       ▼
┌─────────────────────────────────────────────────────┐
│                 JUDGE'S BROWSER                      │
│  EventSource → ActivityFeed.tsx → real-time updates │
└─────────────────────────────────────────────────────┘
```

### 6.2 Event Detection

The worker detects on-chain events by:

1. **Transaction receipts** — After sending each tx, poll the Base Sepolia RPC for receipt. Parse logs for contract-specific events.
2. **Trust score changes** — After step 6 (VERIFY), call `TrustNFT.getTrustScore(agentAddress)` directly via eth_call.
3. **No event listener needed** — We don't use `eth_subscribe` because the worker itself triggers every tx. It already knows when things happen.

This is simpler than running a full event indexer. The worker is the sole producer of on-chain state during the demo.

### 6.3 Caching Strategy

| Data | Source | Cache Duration | Invalidation |
|------|--------|----------------|-------------|
| Activity feed | Worker writes to KV | No cache (SSE reads KV directly) | On new event |
| Agent list | KV cache | 30s TTL | After register step |
| Trust scores | On-chain read → KV | 30s TTL | After verify step |
| Tx status | Base Sepolia RPC → KV | 5s TTL | After receipt confirmed |
| Demo status | KV | No cache | On step completion |

---

## 7. Deployment Strategy

### 7.1 Component Mapping

```
┌─────────────────────────────────────────────┐
│              VERCEL (Free Hobby)             │
│                                             │
│  frontend/  (Next.js 14 app)                │
│  - Static pages                             │
│  - API routes (serverless functions)        │
│  - SSE streaming                            │
│  - Vercel KV integration                    │
│                                             │
│  Domain: agenttrust.vercel.app              │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│           RAILWAY (Starter Plan)             │
│                                             │
│  worker/  (Node.js process)                 │
│  - Auto-demo scheduler                      │
│  - Demo orchestrator (7-step flow)          │
│  - AXL P2P node connections                 │
│  - Writes to Vercel KV                      │
│                                             │
│  $5/month, billed per usage                 │
│  3 days ≈ $0.50                             │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│           BASE SEPOLIA (Free)                │
│                                             │
│  Smart Contracts:                           │
│  - AgentRegistry.sol                        │
│  - TrustNFT.sol                             │
│  - ServiceAgreement.sol                     │
│                                             │
│  Gas: Free (testnet ETH from faucet)        │
└─────────────────────────────────────────────┘
```

### 7.2 Environment Variables

```bash
# Vercel (frontend + API routes)
KV_REST_API_URL=          # Vercel KV REST URL (auto-configured)
KV_REST_API_TOKEN=        # Vercel KV token (auto-configured)
BASE_SEPOLIA_RPC_URL=     # https://sepolia.base.org
CONTRACT_REGISTRY=        # 0x... deployed AgentRegistry address
CONTRACT_TRUST_NFT=       # 0x... deployed TrustNFT address
CONTRACT_SERVICE_AGREEMENT= # 0x... deployed ServiceAgreement address
AGENTTRUST_ENS_DOMAIN=    # agenttrust.eth
WORKER_URL=               # https://agenttrust-worker.up.railway.app

# Railway (worker)
KV_REST_API_URL=          # Same Vercel KV credentials
KV_REST_API_TOKEN=
BASE_SEPOLIA_RPC_URL=
CONTRACT_REGISTRY=
CONTRACT_TRUST_NFT=
CONTRACT_SERVICE_AGREEMENT=
AGENT_PRIVATE_KEYS=       # JSON array of funded private keys for demo agents
KEEPERHUB_MCP_URL=        # KeeperHub MCP endpoint
ZEROG_STORAGE_URL=        # 0G Storage API endpoint
AXL_NODE_CONFIG=          # JSON: AXL peer addresses and keys
UNISWAP_V4_ROUTER=        # Uniswap v4 router address on Base Sepolia
```

### 7.3 Vercel KV Setup

```bash
# One-time setup via Vercel CLI
vercel env add KV_REST_API_URL
vercel env add KV_REST_API_TOKEN
vercel kv create agenttrust-kv
# Vercel auto-injects KV_* env vars into your project
```

### 7.4 CI/CD Pipeline

```
GitHub Push → Vercel Auto-Deploy (frontend)
GitHub Push → Railway Auto-Deploy (worker)

No custom CI needed. Both platforms auto-deploy from main branch.
```

Branch strategy:
- `main` → auto-deploys to production
- `dev` → manual merge to main when ready
- During hackathon: push directly to main for speed

### 7.5 Build Configuration

**Vercel (next.config.ts):**
```typescript
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
};
```

**Railway (railway.toml or Procfile):**
```
web: node dist/index.js
build: npm run build
```

---

## 8. Cost Analysis

### 8.1 Cost Breakdown (3-Day Judging Period)

| Component | Service | Cost | Notes |
|-----------|---------|------|-------|
| Frontend + API | Vercel Hobby | **$0** | Free tier: 100GB bandwidth, serverless functions |
| Key-value store | Vercel KV (Hobby) | **$0** | Free tier: 30K commands/day, 256MB storage |
| Agent worker | Railway Starter | **~$1.50** | $5/month prorated, or usage-based |
| Base Sepolia gas | Testnet faucet | **$0** | Free testnet ETH from Coinbase faucet |
| AXL P2P | Gensyn | **$0** | Hackathon free tier |
| 0G Storage | 0G | **$0** | Testnet free |
| KeeperHub MCP | KeeperHub | **$0** | Hackathon free tier |
| Uniswap swaps | Base Sepolia | **$0** | Testnet, no real value |
| ENS subnames | ENS | **$0** | agenttrust.eth already owned |
| Domain (optional) | Vercel subdomain | **$0** | agenttrust.vercel.app |
| Custom domain (optional) | Namecheap | **$0** (skip) | Not needed, Vercel subdomain works |

**Total estimated cost: $1.50** (well under the $50 budget)

### 8.2 Resource Limits to Watch

| Resource | Free Limit | Expected Usage | Headroom |
|----------|------------|----------------|----------|
| Vercel bandwidth | 100 GB | ~0.5 GB | 99% |
| Vercel function invocations | Unlimited (hobby) | ~5K/day | Plenty |
| Vercel KV commands | 30K/day | ~10K/day | 66% |
| Railway compute | 832 hours/month | ~72 hours | 91% |
| Base Sepolia RPC calls | Rate-limited | ~1K/day | Fine |

---

## 9. Fallback Plan

### 9.1 Graceful Degradation Matrix

Each component can fail independently. Here's what still works:

| Component Down | What Breaks | What Still Works | Fallback |
|----------------|-------------|-----------------|----------|
| **Railway worker** | Auto-demos stop, judge triggers fail | Static agent list, cached activity feed, UI loads | Show last 50 cached events. Display banner: "Live demos paused — cached data shown" |
| **AXL P2P** | Step 2 (DISCOVER) fails | Steps 1, 3-7 work fine | Mock AXL response: "Simulated P2P discovery". Log clearly that AXL was unavailable |
| **KeeperHub MCP** | Step 5 (EXECUTE) fails | Steps 1-4, 6-7 work | Mock execution result. Show "Simulated task execution" in feed |
| **0G Storage** | Step 6 (VERIFY) fails | Steps 1-5, 7 work | Use a keccak256 hash of output as fake 0G hash. Mark as simulated |
| **Uniswap v4** | Step 7 (SETTLE) fails | Steps 1-6 complete | Direct ETH transfer instead of swap. Trust scores still update |
| **Base Sepolia RPC** | Everything on-chain fails | UI loads, shows cached data | Display cached feed with timestamps. Banner: "Network issues — showing last known state" |
| **Vercel KV** | SSE breaks, API reads fail | Static site loads | Client-side state only. Demo trigger returns error with message |
| **Vercel (entire)** | Nothing loads | N/A | Keep a static HTML page on Railway as backup. Redirect DNS |

### 9.2 Pre-Seeded Data Strategy

On deployment, the worker immediately runs 5 warm-up demos before judges arrive:

```
worker/src/index.ts:

async function warmUp() {
  for (let i = 0; i < 5; i++) {
    await runDemo(AGENT_PAIRS[i % AGENT_PAIRS.length]);
    await sleep(5000);  // 5s between warm-up runs
  }
}
```

This populates:
- 35+ activity feed events (7 steps × 5 runs)
- 6 registered agents with identity NFTs
- Trust scores ranging from 48-55 (showing variance)
- Multiple Basescan tx links judges can click

If anything breaks during judging, the feed still has content.

### 9.3 Health Check Endpoint

```
GET /api/health

Returns:
{
  status: "ok" | "degraded",
  components: {
    railway: "ok",      // pinged worker /health
    baseSepolia: "ok",  // latest block number check
    axl: "ok",          // AXL node connectivity
    kv: "ok",           // KV read/write test
  },
  lastDemoRun: "2026-04-26T08:00:00Z",
  nextAutoDemo: "2026-04-26T08:04:00Z"
}
```

Frontend shows a small status indicator in the corner. Green = all good. Yellow = degraded. Red = manual intervention needed.

---

## 10. Implementation Order

Build in this order. Each phase is independently testable.

### Phase 1: Foundation (Day 1 morning)

**Priority: Get contracts deployed, API skeleton up**

| Step | Task | Files | Done When |
|------|------|-------|-----------|
| 1.1 | Deploy contracts to Base Sepolia | `contracts/script/Deploy.s.sol` | Basescan shows all 3 contracts |
| 1.2 | Fund 6 demo agent wallets | `worker/src/wallet.ts` | Each has 0.1 testnet ETH |
| 1.3 | Create Vercel project, connect KV | Vercel dashboard | `vercel dev` works locally |
| 1.4 | Scaffold API routes (return mock data) | `frontend/app/api/*/route.ts` | All routes return 200 |
| 1.5 | Build ActivityFeed component (static) | `frontend/app/components/ActivityFeed.tsx` | Renders mock events |

### Phase 2: Live Data Pipeline (Day 1 afternoon)

**Priority: Get KV + SSE working end-to-end**

| Step | Task | Files | Done When |
|------|------|-------|-----------|
| 2.1 | Implement KV read/write helpers | `frontend/lib/kv.ts` | Can read/write from API routes |
| 2.2 | Build SSE endpoint | `frontend/app/api/activity/stream/route.ts` | `curl` receives SSE events |
| 2.3 | Connect ActivityFeed to SSE | `frontend/app/components/ActivityFeed.tsx` | Events appear in real-time |
| 2.4 | Build StepProgress component | `frontend/app/components/StepProgress.tsx` | Shows 7 steps with status |

### Phase 3: Worker + Auto-Demo (Day 1 evening)

**Priority: Agent runs automatically, writes to KV**

| Step | Task | Files | Done When |
|------|------|-------|-----------|
| 3.1 | Scaffold Railway worker | `worker/src/index.ts` | `npm start` runs without crash |
| 3.2 | Implement step 1 (REGISTER) | `worker/src/steps/1-register.ts` | Agent registers on-chain, KV updated |
| 3.3 | Implement step 3 (NEGOTIATE/ESCROW) | `worker/src/steps/3-negotiate.ts`, `4-escrow.ts` | Agreement created, funds escrowed |
| 3.4 | Implement step 7 (SETTLE) | `worker/src/steps/7-settle.ts` | Payment settled on-chain |
| 3.5 | Wire up auto-scheduler | `worker/src/scheduler.ts` | Demo runs every 4 minutes |
| 3.6 | Deploy worker to Railway | Railway dashboard | Worker running, auto-demos visible in Vercel KV |

### Phase 4: Interactive Demo (Day 2 morning)

**Priority: Judge can trigger a run**

| Step | Task | Files | Done When |
|------|------|-------|-----------|
| 4.1 | Build demo trigger API | `frontend/app/api/demo/trigger/route.ts` | POST queues a run |
| 4.2 | Worker picks up queued runs | `worker/src/orchestrator.ts` | Judge trigger → worker runs it |
| 4.3 | Build "Run Demo" button + progress UI | `frontend/app/components/DemoTrigger.tsx` | Click → full flow visible |
| 4.4 | Add Basescan links | `frontend/app/components/TxLink.tsx` | Each step shows clickable tx link |

### Phase 5: Integration Polish (Day 2 afternoon)

**Priority: AXL, 0G, KeeperHub, Uniswap wired up**

| Step | Task | Files | Done When |
|------|------|-------|-----------|
| 5.1 | Wire AXL P2P (step 2) | `worker/src/steps/2-discover.ts` | Real AXL messages flow |
| 5.2 | Wire KeeperHub MCP (step 5) | `worker/src/steps/5-execute.ts` | Real MCP task runs |
| 5.3 | Wire 0G Storage (step 6) | `worker/src/steps/6-verify.ts` | Real hash stored on 0G |
| 5.4 | Wire Uniswap swap (step 7) | `worker/src/steps/7-settle.ts` | Real swap executes |

### Phase 6: Fallbacks + Hardening (Day 2 evening)

**Priority: Survive 3 days unattended**

| Step | Task | Files | Done When |
|------|------|-------|-----------|
| 6.1 | Add fallback mocks for AXL/0G/KeeperHub | `worker/src/steps/2-discover.ts`, etc. | Graceful failure if external service down |
| 6.2 | Add health check endpoint | `frontend/app/api/health/route.ts` | Shows component status |
| 6.3 | Warm-up script (5 auto-runs on deploy) | `worker/src/index.ts` | Feed populated from second 0 |
| 6.4 | Error recovery in orchestrator | `worker/src/orchestrator.ts` | Failed run doesn't block next run |
| 6.5 | Trust score animations | `frontend/app/components/TrustScoreBadge.tsx` | Score changes animate |

### Phase 7: Demo Day Polish (Day 3 morning)

**Priority: Visual punch, last-mile fixes**

| Step | Task | Files | Done When |
|------|------|-------|-----------|
| 7.1 | Stripe-inspired design polish | All components | Clean, professional look |
| 7.2 | Mobile responsive | CSS media queries | Works on judges' phones |
| 7.3 | Pre-seed agent avatars + bios | KV seed data | Agents look real, not generic |
| 7.4 | Final smoke test | Manual | Full flow works end-to-end |

---

## 11. Risk Assessment Matrix

### High Severity

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Base Sepolia RPC rate-limited during demo | Medium | High — no txs confirmed | Cache multiple RPC endpoints (Alchemy, Infura, public). Rotate on failure |
| Railway worker crashes | Medium | High — no auto-demos, no judge triggers | Railway auto-restarts. Add `process.on('uncaughtException')` with retry logic |
| AXL P2P nodes offline | High | Medium — step 2 fails silently | Mock AXL response. Feed shows "simulated discovery" |

### Medium Severity

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Vercel KV command limit exceeded | Low | Medium — SSE breaks | Pre-seed data reduces reads. Use in-memory cache within API route lifecycle |
| Testnet ETH faucet exhausted | Low | Medium — can't send txs | Pre-fund 6 wallets with 0.5 ETH each. That's enough for ~500 runs |
| Vercel SSE connection drops | Medium | Low — feed stops updating | EventSource auto-reconnects. Poll `/api/interactions` as fallback |
| Judge triggers demo while one running | High | Low — bad UX | Return 429 with progress of current run. Show current run below button |

### Low Severity

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| 0G Storage slow | Medium | Low — step 6 takes longer | Accept latency. Show "Verifying output..." with progress |
| Uniswap v4 pool not deployed on Base Sepolia | Medium | Low — swap fails | Direct ETH transfer as fallback |
| Custom domain DNS propagation delay | Low | Low — use .vercel.app | Don't bother with custom domain |
| Mobile layout broken | Low | Low — most judges on laptop | Basic responsive CSS, test on phone before demo day |

---

## Appendix A: File Tree (Live Deployment)

```
agenttrust/
├── frontend/                    # Next.js 14 app (deployed to Vercel)
│   ├── app/
│   │   ├── api/
│   │   │   ├── activity/
│   │   │   │   └── stream/route.ts      # SSE endpoint
│   │   │   ├── agents/route.ts          # Agent list
│   │   │   ├── demo/
│   │   │   │   ├── trigger/route.ts     # POST: start demo
│   │   │   │   └── status/route.ts      # GET: demo progress
│   │   │   ├── health/route.ts          # Health check
│   │   │   ├── interactions/route.ts    # Interaction history
│   │   │   ├── trust/[address]/route.ts # Trust score
│   │   │   └── tx/[hash]/route.ts       # Tx status
│   │   ├── agents/page.tsx              # Agent directory page
│   │   ├── trust/page.tsx               # Trust dashboard page
│   │   ├── audit/page.tsx               # Audit trail page
│   │   ├── messages/page.tsx            # AXL messages page
│   │   └── layout.tsx                   # Root layout + SSE provider
│   ├── components/
│   │   ├── ActivityFeed.tsx             # Live activity feed
│   │   ├── ActivityItem.tsx             # Single event row
│   │   ├── StepProgress.tsx             # 7-step progress bar
│   │   ├── TrustScoreBadge.tsx          # Animated score badge
│   │   ├── TxLink.tsx                   # Basescan link
│   │   ├── DemoTrigger.tsx              # "Run Demo" button + state
│   │   ├── AgentCard.tsx                # Agent identity card
│   │   └── HealthIndicator.tsx          # System status dot
│   ├── lib/
│   │   ├── kv.ts                       # Vercel KV helpers
│   │   ├── base.ts                     # Base Sepolia RPC + contract ABIs
│   │   ├── sse.ts                      # SSE client hook (useActivityFeed)
│   │   └── types.ts                    # Shared TypeScript types
│   ├── next.config.ts
│   ├── package.json
│   └── vercel.json                     # Vercel-specific config
│
├── worker/                      # Agent worker (deployed to Railway)
│   ├── src/
│   │   ├── index.ts              # Entry: scheduler + warm-up
│   │   ├── orchestrator.ts       # 7-step demo flow
│   │   ├── scheduler.ts          # Auto-demo timer
│   │   ├── state.ts              # KV state management
│   │   ├── wallet.ts             # Agent wallet management
│   │   └── steps/
│   │       ├── 1-register.ts     # AgentRegistry
│   │       ├── 2-discover.ts     # AXL P2P
│   │       ├── 3-negotiate.ts    # Trust-gated agreement
│   │       ├── 4-escrow.ts       # Fund deposit
│   │       ├── 5-execute.ts      # KeeperHub MCP
│   │       ├── 6-verify.ts       # 0G Storage
│   │       └── 7-settle.ts       # Uniswap swap
│   ├── package.json
│   ├── tsconfig.json
│   └── railway.toml
│
├── contracts/                   # Foundry project (local deploy)
│   ├── src/
│   │   ├── AgentRegistry.sol
│   │   ├── TrustNFT.sol
│   │   └── ServiceAgreement.sol
│   ├── script/
│   │   └── Deploy.s.sol
│   └── foundry.toml
│
├── sdk/                         # Shared SDK (used by worker)
│   ├── ens.ts
│   ├── uniswap.ts
│   ├── keeperhub.ts
│   ├── trust.ts
│   └── zerog.ts
│
├── axl/                         # AXL P2P modules (used by worker)
│   ├── protocol.ts
│   ├── message-handler.ts
│   ├── trust-verify.ts
│   └── node-config.ts
│
├── docs/
│   └── live-deployment-architecture.md  # This document
│
├── package.json                 # Monorepo root (npm workspaces)
└── tsconfig.json
```

## Appendix B: Key Technical Decisions

| Decision | Choice | Why |
|----------|--------|-----|
| Real-time transport | SSE | Vercel-native, simpler than WebSocket, server-push only is sufficient |
| State store | Vercel KV | Free, Redis-fast, same platform as frontend |
| Agent worker host | Railway | Long-running process, cheap, auto-deploy from Git |
| Job queue | KV flag + polling | No infrastructure needed, one-at-a-time demos |
| Monorepo structure | npm workspaces | SDK shared between frontend and worker, simple tooling |
| Tx confirmation | RPC receipt polling | Worker already knows when it sent txs, no need for event listeners |
| Warm-up strategy | 5 sequential runs on deploy | Activity feed populated from second 0 |
| Fallback pattern | Per-component mock | Each external service (AXL, 0G, KeeperHub) has a mock path |
