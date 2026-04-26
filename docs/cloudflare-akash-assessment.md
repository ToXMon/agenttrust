# AgentTrust — Cloudflare + Akash Assessment

> Evaluation of Cloudflare and Akash Network as alternatives to Vercel + Railway
> for the ETHGlobal hackathon demo (30-day judging period)
> Date: 2026-04-26

## Executive Summary

**Recommendation: Hybrid Cloudflare + Akash architecture.**

Move the frontend + API + real-time layer to Cloudflare (costs $5/mo for SSE support). Move the heavy agent worker to Akash Network (user has credits, runs Docker containers natively). This eliminates Railway entirely and reduces the stack from 3 providers to 2.

| Component | Current Plan | Recommended | Monthly Cost |
|-----------|-------------|-------------|-------------|
| Frontend + API + SSE | Vercel (Free) | Cloudflare Pages + Workers ($5/mo) | $5 |
| Agent Worker | Railway (~$0.50/3d) | Akash Network (credits) | $0 |
| State Store | Vercel KV (Free, 30K cmds/d) | Cloudflare D1 (Free, 5M reads/d) | $0 |
| Real-time Feed | SSE via Vercel (10s timeout) | Cloudflare Durable Objects (Free) | $0 |
| Object Storage | None | Cloudflare R2 (Free, 10GB) | $0 |
| **Total** | **~$0.50 for 3 days** | **$5 for 30 days** | **$5** |

The $5 cost buys you 30 full days of judging (vs 3 days on current plan), real WebSocket support via Durable Objects, a proper SQL database instead of Redis hacks, and zero egress object storage.

---

## 1. Cloudflare Workers — Next.js API Routes + SSR

### Capability Assessment

| Feature | Status | Notes |
|---------|--------|-------|
| Next.js 14 App Router | Supported | Via OpenNext (`@opennextjs/cloudflare`) |
| API Route Handlers | Supported | `route.ts` files work natively |
| SSR | Supported | Node.js runtime (not Edge) |
| ISR / SSG | Supported | Full static generation support |
| Middleware | Supported | Except Node Middleware (Next.js 15.2) |
| Image Optimization | Supported | Via Cloudflare Images or `next/image` |

### Limits

| Resource | Free | Paid ($5/mo Standard) |
|----------|------|----------------------|
| CPU Time | 10 ms | 30s default, up to 5 min |
| Memory | 128 MB | 128 MB |
| Script Size (compressed) | 3 MB | 10 MB |
| Subrequests | 50 | 10,000 (configurable to 10M) |
| Requests/day | 100,000 | Unlimited |
| Wall Time | Unlimited (while connected) | Same |

**Critical**: CPU timer does NOT tick during `await` (I/O wait). A 30-second blockchain RPC call uses near-zero CPU. The 10ms free limit is the blocker — API routes that do real work need the paid plan.

### External API Calls

Workers call any public URL via `fetch()`. No CORS restrictions (server-side V8 isolates).

- Base RPC: Works. No CORS, no preflight.
- AXL nodes: Works. Long-polling fine (I/O wait = zero CPU).
- 0G Storage: Works.
- Uniswap API: Works.
- Any blockchain RPC: Works.

Stream large responses via `response.body` piping to stay under 128MB memory.

### Verdict for AgentTrust

Workers can host all Next.js API routes. The $5/mo paid plan is required because:
1. API routes doing blockchain reads need >10ms CPU
2. SSE streaming needs >10ms CPU for the TransformStream
3. Subrequest limit of 50 on free tier is too low for demo runs that hit 7+ external services

---

## 2. Cloudflare Pages — Next.js 14 Hosting

### Deployment Method

Use **OpenNext for Cloudflare** (`@opennextjs/cloudflare`), NOT the legacy `@cloudflare/next-on-pages`.

```bash
npm install @opennextjs/cloudflare
npx @opennextjs/cloudflare  # builds + transforms for workerd
npx wrangler dev            # local dev
npx wrangler deploy         # deploy
```

OpenNext uses Node.js runtime (not Edge), giving access to full Node.js APIs. This matters for ethers.js, viem, and other blockchain libraries.

### Verdict for AgentTrust

Pages can host the entire Next.js frontend. Supports App Router, SSR, SSG, ISR, dynamic routes, middleware. Pages Functions share identical limits with Workers.

---

## 3. Cloudflare KV — Key-Value Store

### Free Tier

| Metric | Limit |
|--------|-------|
| Reads | 100K/day |
| Writes | 1K/day |
| Storage | 1 GB |
| Max value | 25 MiB |

### Limitations

**KV is NOT a Redis replacement.**

- Eventual consistency (up to 60s propagation)
- 1 write/sec per key
- No pub/sub
- No atomic counters
- No sorted sets
- No transactions

### Verdict for AgentTrust

KV is useful only for:
- Feature flags and config
- Cached blockchain reads (tx receipts, agent metadata)
- Session tokens

Do NOT use KV for:
- Demo run state (use D1 — strong consistency, transactions)
- Activity feed (use Durable Objects — real-time pub/sub)
- Atomic counters (D1 has `UPDATE ... RETURNING`)

The 1K writes/day free limit means ~30K writes over 30 days. AgentTrust's current plan writes to KV after each of 7 demo steps, plus activity feed entries. At ~10 demo runs/day, that's ~70-100 writes/day — well within limits.

---

## 4. Cloudflare D1 — SQLite Database

### Free Tier

| Metric | Limit |
|--------|-------|
| Rows read | 5M/day |
| Rows written | 100K/day |
| Storage | 5 GB (500 MB per DB, up to 10 DBs) |
| Databases | 10 |

### Capabilities

- Full SQLite: transactions via `db.batch([...])` with auto-rollback
- JSON columns: `json_extract()`, `->>` operator, `json_each()`
- Strong consistency (single-writer model)
- Free read replication
- Native Workers binding (no external API call, sub-millisecond latency)
- Read latency: 20-30ms

### Schema for AgentTrust

```sql
-- Replace all Vercel KV patterns with structured tables
CREATE TABLE demo_runs (
  id TEXT PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'idle', -- idle, running, completed, failed
  current_step INTEGER DEFAULT 0,
  started_at TEXT,
  completed_at TEXT,
  result JSON -- step results, tx hashes
);

CREATE TABLE agents (
  address TEXT PRIMARY KEY,
  name TEXT,
  trust_score INTEGER DEFAULT 0,
  registered_at TEXT,
  metadata JSON
);

CREATE TABLE interactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  agent_a TEXT NOT NULL,
  agent_b TEXT NOT NULL,
  interaction_type TEXT NOT NULL,
  result JSON,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE activity_feed (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_type TEXT NOT NULL,
  data JSON NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);
```

### Comparison: D1 vs Vercel KV

| Factor | Vercel KV (Redis) | Cloudflare D1 (SQLite) |
|--------|-------------------|----------------------|
| Free reads | 30K cmds/day | 5M rows/day |
| Free writes | Included in 30K | 100K rows/day |
| Consistency | Strong (single-region) | Strong |
| Queries | Key-value only | Full SQL, JOINs, JSON |
| Transactions | Multi-command (Redis) | `db.batch()` |
| Latency | <5ms | 20-30ms |
| Structured data | Manual JSON serialize | Native columns + JSON |
| 30-day budget | 900K commands | 150M reads, 3M writes |

**D1 wins decisively** for AgentTrust. The SQL query capability alone ("get last 50 interactions ordered by time") eliminates all the manual JSON array management in KV.

---

## 5. Cloudflare Durable Objects — Real-time Connections

### Free Tier (Since April 2025)

| Metric | Limit |
|--------|-------|
| Requests | 100K/day |
| Compute | 13K GB-sec/day |
| Storage | Included (SQLite) |

### WebSocket Hibernation API

This is the key feature for AgentTrust's live activity feed.

```javascript
export class ActivityFeedDO {
  constructor(state) {
    this.state = state;
    this.sessions = new Set();
  }

  async fetch(request) {
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    this.sessions.add(server);
    server.accept();
    return new Response(null, { status: 101, webSocket: client });
  }

  async alarm() {
    // Hibernation: runs when a message arrives
    // Idle connections cost $0
  }

  async webSocketMessage(ws, message) {
    // Broadcast to all connected clients
    for (const session of this.sessions) {
      session.send(message);
    }
  }
}
```

**Hibernation means idle connections cost nothing.** 100 concurrent judges watching the feed for 30 days = $0 in duration charges. Only incoming messages trigger billing (20:1 ratio — 100 messages = 5 billed requests).

### SSE via Durable Objects

For browsers that prefer SSE over WebSocket:

```javascript
export class SSEFeedDO {
  constructor(state) {
    this.state = state;
  this.connections = [];
  }

  async fetch(request) {
    const { readable, writable } = new TransformStream();
    this.connections.push(writable.getWriter());
    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
      },
    });
  }

  broadcast(data) {
    const msg = `data: ${JSON.stringify(data)}\n\n`;
    for (const writer of this.connections) {
      writer.write(new TextEncoder().encode(msg));
    }
  }
}
```

### Verdict for AgentTrust

Durable Objects replace the SSE polling hack in the current architecture. Instead of:
- SSE endpoint polling KV every 500ms for new events

You get:
- WebSocket/SSE connections with instant push
- No polling, no latency, no wasted KV reads
- Hibernation = idle connections are free

---

## 6. Cloudflare Queues — Message Queue

### Free Tier

| Metric | Limit |
|--------|-------|
| Operations | 10K/day (updated Feb 2026) |
| Message size | 128 KB |
| Retention | 24h (free) / 14 days ($5/mo) |

### How It Works

- Push-based consumers: triggers a Worker automatically when messages arrive
- At-least-once delivery
- Dead Letter Queue built-in
- Batch processing
- Each 64KB chunk = 1 operation

### Verdict for AgentTrust

Queues can replace the "poll KV every 2 seconds" job mechanism in the current architecture:

```
Current:  POST /api/demo/trigger → set KV flag → worker polls KV → picks up job
Queues:   POST /api/demo/trigger → enqueue message → Worker auto-triggered → process job
```

10K ops/day = ~3,333 messages/day (3 ops per msg: write, read, delete). At ~10-50 demo runs/day, this is well within limits.

---

## 7. Cloudflare Workers + SSE Streaming

### Pattern

```javascript
export default {
  async fetch(request) {
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    const encoder = new TextEncoder();

    // MANDATORY: 30-second heartbeat to prevent CDN proxy disconnects
    const heartbeat = setInterval(() => {
      writer.write(encoder.encode(': keep-alive\n\n')).catch(() => clearInterval(heartbeat));
    }, 30000);

    writable.closed.finally(() => clearInterval(heartbeat));

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  },
};
```

### Timeout Reality

| Scenario | Limit | Affects SSE? |
|----------|-------|-------------|
| CDN proxy idle (524 error) | 100 seconds | Only through CDN proxy |
| Workers HTTP wall-clock | No hard limit | SSE runs indefinitely |
| Workers CPU (free) | 10 ms | Too short — won't work |
| Workers CPU (paid) | 30s | Fine — I/O wait = zero CPU |

**Without 30s heartbeats**: 78% disconnect rate. **With 30s heartbeats**: 0% disconnect rate.

**Requires paid plan ($5/mo)** — the free 10ms CPU limit kills SSE streaming.

### Recommended: Use Durable Objects Instead

For AgentTrust, Durable Objects with WebSocket hibernation is superior to raw Workers SSE:
- Idle connections cost nothing
- No heartbeat management
- Built-in broadcast pattern
- SSE is still possible via DO if browsers need it

---

## 8. Cloudflare R2 — Object Storage

### Free Tier

| Metric | Limit |
|--------|-------|
| Storage | 10 GB |
| Class A ops (writes) | 1M/month |
| Class B ops (reads) | 10M/month |
| Egress | **Zero — always, all plans** |

S3-compatible API. Workers binding = sub-millisecond internal routing (no public internet).

### Use Cases for AgentTrust

- Store agent interaction data (large JSON blobs)
- Audit logs for the 7-step demo flow
- Demo recordings / screenshots for judges
- AXL P2P message archives
- 0G Storage verification artifacts

### Verdict

Nice-to-have, not required for MVP. Add if judges need to review past demo runs in detail.

---

## 9. Free Tier Summary — 30-Day Judging Period

| Service | Free Allowance | 30-Day Total | Sufficient for Demo? |
|---------|---------------|-------------|---------------------|
| Workers (Pages Functions) | 100K req/day | 3M requests | Yes (but need $5 for CPU) |
| Pages hosting | Unlimited | Unlimited | Yes |
| KV | 100K reads, 1K writes/day | 3M reads, 30K writes | Yes (for caching) |
| D1 | 5M reads, 100K writes/day | 150M reads, 3M writes | Yes (primary store) |
| R2 | 10GB, 10M reads/mo | 10GB storage | Yes (optional) |
| Queues | 10K ops/day | 300K ops | Yes (job queue) |
| Durable Objects | 100K req/day | 3M requests | Yes (real-time feed) |
| Custom domains | Free | Free | Yes |
| SSL | Free, automatic | Free | Yes |

**Total Cloudflare cost: $5/month** (Workers Standard plan, required for CPU time).

All data services are well within free limits for a hackathon demo receiving ~100 demo runs/day.

---

## 10. Custom Domains + SSL

- Custom domains: Free on ALL plans including Workers Free
- SSL: Fully automatic, auto-provisioned, auto-renewed
- DNS: Change nameservers at registrar → Cloudflare handles everything

```toml
# wrangler.toml
[[routes]]
pattern = "demo.agenttrust.eth"
custom_domain = true
```

Deploy — DNS record and SSL cert are auto-created. No manual cert management.

---

## 11. Akash Network — Railway Replacement

### Why Akash Instead of Railway

| Factor | Railway | Akash Network |
|--------|---------|--------------|
| Cost | ~$0.50/3 days ($5/mo) | $0 (user has credits) |
| Duration | Continuous | No limit (funded deployments) |
| Container support | Native Docker | Native Docker + Kubernetes |
| Custom domains | Railway subdomain | CloudFlare CNAME (free) |
| Persistent storage | Volume mounts | Persistent storage (beta2/beta3) |
| GPU | None | Available (if needed) |
| Trial | $5 free credit | $100 free credits (30-day trial) |
| Execution model | Always-on container | Always-on container (funded) |

### Akash Deployment for AgentTrust Worker

```yaml
version: "2.0"

services:
  agent-worker:
    image: node:20-alpine
    env:
      - NODE_ENV=production
      - DATABASE_URL=https://your-worker.your-subdomain.workers.dev/api/internal/update
      - AXL_NODE_URL=wss://axl.gensyn.ai
      - BASE_RPC_URL=https://sepolia.base.org
      - ZERO_G_API=https://api.0g.ai
    command:
      - "sh"
      - "-c"
      - |
        npm install && node dist/index.js
    expose:
      - port: 3000
        as: 80
        to:
          - global: true
            accept:
              host: worker.agenttrust.xyz

profiles:
  compute:
    agent-worker:
      resources:
        cpu:
          units: 0.5
        memory:
          size: 512Mi
        storage:
          size: 1Gi
  placement:
    akash:
      pricing:
        agent-worker:
          denom: uact
          amount: 1000

deployment:
  agent-worker:
    akash:
      profile: agent-worker
      count: 1
```

### Akash + Cloudflare Integration

1. Deploy worker on Akash with `accept` hostname
2. Point `worker.agenttrust.xyz` CNAME to Akash deployment URL
3. Cloudflare handles DNS + SSL + proxy
4. Worker calls Cloudflare D1 API to update state
5. Durable Objects push updates to browser via WebSocket

### Akash Limitations

- **Trial deployments: 24-hour max** — must use funded deployment (credits → uact) for 30-day run
- **No guaranteed uptime** — providers can go offline; choose reputable providers
- **Deployment management** — more complex than Railway; needs CLI or Console API
- **Cold start** — if provider goes down, re-deploy needed

### Mitigation

- Use funded deployment with sufficient uact escrow for 30 days
- Choose providers with high uptime scores
- Keep a backup SDL ready for quick re-deployment
- Health check endpoint on worker → Cloudflare Worker monitors + alerts

---

## 12. Architecture Comparison

### Current Plan (Vercel + Railway + Vercel KV)

```
Judge Browser
  │
  ├── SSE stream ← Vercel API (polls KV every 500ms)
  ├── GET /api/*   ← Vercel Serverless (10s timeout, hobby)
  └── POST trigger ← Vercel API → sets KV flag
                                │
                     Railway Worker (polls KV every 2s)
                       ├── Runs 7-step demo flow
                       ├── Calls Base RPC, AXL, 0G, Uniswap
                       └── Writes results to Vercel KV
                                │
                     Vercel KV (Redis, 30K cmds/day)
                       ├── activity-feed
                       ├── demo-runs
                       └── agent-cache
```

### Recommended (Cloudflare + Akash + D1)

```
Judge Browser
  │
  ├── WebSocket ← Cloudflare Durable Objects (instant push, no polling)
  ├── GET /api/*  ← Cloudflare Workers ($5/mo, 30s CPU)
  └── POST trigger ← Cloudflare Workers → Cloudflare Queue
                                    │
                     Akash Worker (triggered by Queue, no polling)
                       ├── Runs 7-step demo flow
                       ├── Calls Base RPC, AXL, 0G, Uniswap
                       └── Writes results to D1 + broadcasts via DO
                                    │
                     Cloudflare D1 (SQLite, 5M reads/day)
                       ├── demo_runs (structured table)
                       ├── interactions (with JOINs)
                       └── activity_feed (with timestamps)
                                    │
                     Cloudflare DO (WebSocket hub)
                       └── Broadcasts to all connected judges
```

### Key Improvements

| Problem in Current Plan | Solution in New Architecture |
|------------------------|----------------------------|
| SSE polls KV every 500ms (wasteful) | Durable Objects push instantly (no polling) |
| KV flag for job queue (fragile) | Cloudflare Queues (guaranteed delivery) |
| Redis for structured data (JSON hacks) | D1 SQLite (proper SQL, JOINs, JSON columns) |
| Vercel 10s serverless timeout | Workers 30s CPU (paid) / unlimited wall time |
| Railway costs $0.50/3d | Akash credits cover 30 days |
| No audit log storage | R2 object storage (free, zero egress) |

---

## 13. Cost Comparison

### Current Plan — 30 Days

| Service | Cost | Notes |
|---------|------|-------|
| Vercel Hobby | $0 | Free tier, 10s serverless timeout |
| Railway | ~$5.00 | $0.50/3 days × 10 billing cycles (estimated) |
| Vercel KV | $0 | Free tier, 30K cmds/day |
| Custom domain | $0 | Already owned |
| **Total** | **~$5.00** | |

### Recommended Plan — 30 Days

| Service | Cost | Notes |
|---------|------|-------|
| Cloudflare Workers Standard | $5.00 | Required for SSE / CPU time |
| Cloudflare Pages | $0 | Free tier |
| Cloudflare D1 | $0 | Free tier (5M reads/day) |
| Cloudflare KV | $0 | Free tier (caching only) |
| Cloudflare Durable Objects | $0 | Free tier (WebSocket hibernation) |
| Cloudflare Queues | $0 | Free tier (10K ops/day) |
| Cloudflare R2 | $0 | Free tier (10GB) |
| Akash Network | $0 | User has credits |
| Custom domain + SSL | $0 | Free on Cloudflare |
| **Total** | **$5.00** | |

### Same Cost, Vastly Better Architecture

Both plans cost ~$5 for 30 days. The Cloudflare + Akash plan gives you:
- Real-time WebSocket (no polling)
- SQL database (no JSON hacks)
- Message queues (no KV flag hacks)
- Object storage (no audit log loss)
- Decentralized compute (Akash instead of Railway)

---

## 14. Risk Assessment

### Cloudflare Risks

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Workers CPU limit hit | Low | High | Profile CPU usage; I/O wait = zero CPU |
| OpenNext compatibility issue | Medium | High | Test early; fallback to Pages static + Workers API |
| D1 latency spike | Low | Low | 20-30ms is acceptable for demo |
| KV eventual consistency | Low | Low | Only used for caching, not state |
| Worker size > 10MB compressed | Low | Medium | Monitor bundle size; code-split if needed |

### Akash Risks

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Provider goes offline | Medium | High | Choose high-uptime provider; keep backup SDL |
| Trial 24h limit | Low | Critical | Use funded deployment, NOT trial |
| Re-deployment needed | Medium | Medium | Automate with CLI script |
| No persistent storage across redeploys | Medium | Medium | State lives in D1, not on Akash |

### Overall Risk: **Low-Medium**

The biggest risk is Akash provider reliability. Mitigate by:
1. State lives in Cloudflare D1 (not on Akash) — redeploying the worker loses nothing
2. Keep a one-command re-deploy script ready
3. Health check: Cloudflare Worker pings Akash worker every 60s, alerts on failure

---

## 15. Migration Path

### Phase 1: Swap State Layer (Day 1)

1. Replace Vercel KV with Cloudflare D1
2. Create schema (demo_runs, agents, interactions, activity_feed)
3. Update API routes to query D1 instead of KV

### Phase 2: Swap Frontend (Day 1-2)

1. Install `@opennextjs/cloudflare`
2. Update `wrangler.toml` with D1/KV/DO bindings
3. Test SSR + API routes locally with `wrangler dev`
4. Deploy to Cloudflare Pages

### Phase 3: Add Real-time (Day 2-3)

1. Create Durable Object for activity feed WebSocket
2. Replace SSE polling with DO broadcast
3. Set up Cloudflare Queue for demo triggers

### Phase 4: Swap Worker (Day 3-4)

1. Dockerize the agent worker
2. Deploy to Akash with funded deployment
3. Point DNS via Cloudflare CNAME
4. Worker writes to D1 API + broadcasts via DO

### Phase 5: Verify (Day 4-5)

1. Run full 7-step demo flow end-to-end
2. Verify real-time activity feed
3. Test custom domain + SSL
4. Load test with simulated judges

---

## 16. Final Recommendation

### Go with Cloudflare + Akash if:
- You want 30 days of judging (not 3)
- You want proper real-time (WebSocket, not polling)
- You want SQL (not Redis JSON hacks)
- You have Akash credits available
- You're comfortable with Docker + CLI deployment

### Stick with Vercel + Railway if:
- The hackathon only needs 3-5 days of live demo
- You want zero config deployment (push to deploy)
- You don't need WebSocket
- You prefer Vercel's developer experience
- Time is extremely tight (<2 days to implement)

### Hybrid Option (Safest)

Keep Vercel for frontend, move only the worker to Akash, and add Cloudflare D1 as the database:

```
Vercel (frontend + API, free) + Akash (worker, credits) + Cloudflare D1 (state, free)
```

This gives you the SQL database benefit without the OpenNext migration risk. Add Durable Objects later if real-time becomes critical.

---

## Research Sources

- `/a0/usr/workdir/cloudflare-workers-nextjs-sse-research.md` — Workers, Pages, SSE, external APIs, custom domains
- `/a0/usr/workdir/cloudflare-storage-services-research.md` — KV, D1, R2, Queues, Durable Objects
- `/a0/usr/workdir/agenttrust/docs/live-deployment-architecture.md` — Current architecture baseline
- Cloudflare docs: `github.com/cloudflare/cloudflare-docs`
- Akash skill: `/a0/usr/skills/akash/`
