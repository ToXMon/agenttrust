# AgentTrust — Project Steering Document

> Verifiable Agent Commerce Protocol | ETHGlobal Open Agents Hackathon 2026

---

## 1. Hackathon Critical Information

### Deadlines (ALL Eastern Time)

| Milestone | Date/Time | Notes |
|-----------|-----------|-------|
| **Hacking Begins** | April 24, 2026 | Already started |
| **Check-in 1** | Week of April 28 | Required per team, on dashboard |
| **Live Feedback Call 1** | Tuesday April 29, 2-4pm ET | Zoom, optional but recommended |
| **Check-in 2** | Week of April 28 | Required per team, on dashboard |
| **Live Feedback Call 2** | Thursday May 1, 9-11am ET | Zoom, optional but recommended |
| **SUBMISSION DEADLINE** | **Sunday May 3, 12:00 PM NOON ET** | NOT end of day. NOON. |
| **Finalist Notifications** | Sunday May 3, end of day | Check dashboard + Discord |
| **Finalist Live Judging** | Monday May 4, 12-2:30pm ET | Mandatory Zoom call |

### Rules (Critical)

1. **From scratch only** — Cannot build on existing project, add features to prior work, or clone your own repo
2. **Auditable commit history** — Small incremental commits, NOT batch pushes of thousands of lines
3. **AI agent usage is ALLOWED** — But must disclose and commit incrementally (no massive agent dumps)
4. **Demo video: 4 minutes max** — Walk through who you are, why this project, how it works
5. **Live deployment required** for finalist track
6. **Team size**: up to 5 people, all must be RSVPd
7. **All code owned by team** — Neither ETHGlobal nor sponsors claim rights

### Finalist Track Perks (aim for this)

- $1,000 per team member
- ETHGlobal Plus membership (1 year)
- $500 flight credit to next in-person hackathon
- $15,000 in developer credits
- On-chain proof of finalist status
- Access to exclusive founder/protocol events

### Communication

- **Discord**: All communication happens here (ethglobal.com/discord)
- **Dashboard**: ethglobal.com — submissions, check-ins, team management
- **Workshops**: Recorded on youtube.com/ethglobal + available on ethglobal.tv
- **Sponsors on Discord**: Engineers, DevRels, PMs, founders available for questions

---

## 2. Product Vision

### One-Liner
> *"The trust layer for agent-to-agent commerce."*

### Elevator Pitch
> Forbes said the missing layer in agentic commerce is trust, settlement, and interoperability. AgentTrust builds exactly that. Agents discover each other via ENS, verify capabilities through 0G iNFTs, negotiate safely over Gensyn AXL, execute reliably through KeeperHub, settle payments via Uniswap — with a full on-chain trust/reputation trail.

### Why This Wins Over AgentSwap

| Factor | AgentSwap (original) | AgentTrust (pivot) |
|--------|---------------------|-------------------|
| Novelty | Moderate (Virtuals Protocol exists) | HIGH (zero competitors in trust lane) |
| Scope | Too broad for hackathon | Tight, focused trust layer |
| 0G Framework fit | Weak (not a framework) | Strong (trust framework + iNFTs) |
| Narrative | Generic marketplace | Timed with Forbes article on missing layer |
| Prize potential | $10-15K | $20-35K |

### Market Timing

- Forbes (27 days ago): "The Missing Layer in Agentic Commerce"
- $30T agent economy projected by 2030
- 15% of daily financial decisions autonomous by 2030
- Zero hackathon competitors building agent trust infrastructure

---

## 3. Sponsor Prize Strategy

### Prize Tracks Targeted (7 tracks, $35K+)

| # | Sponsor | Track | Prize | Key Qualification |
|---|---------|-------|-------|------------------|
| 1 | 0G | Best Agent Framework, Tooling & Core Extensions | $7,500 | Extend OpenClaw, 0G Storage/Compute, ERC-7857 iNFTs |
| 2 | 0G | Best On-Chain AI Application | $7,500 | Full agent marketplace with on-chain settlement, AI matching |
| 3 | Gensyn | Best Use of AXL | $10,000 | AXL across SEPARATE nodes, real P2P, not in-process |
| 4 | ENS | Best ENS Integration for AI Agents | $2,500 | ENS as identity mechanism, records for agent metadata |
| 5 | ENS | Best ENS Subname Ecosystem | $2,500 | agenttrust.eth parent, subnames for registered agents |
| 6 | Uniswap | Best Uniswap API Integration | $5,000 | Autonomous token swaps, FEEDBACK.md MANDATORY |
| 7 | KeeperHub | Best Agent Execution | $2,500 | MCP/CLI integration, retry, gas optimization, audit trail |
| 8 | KeeperHub | Best Feedback | $2,500 | Detailed integration write-up |

### Qualification Checklist Per Sponsor

#### 0G (must do ALL)
- [ ] Deploy on 0G chain
- [ ] Use 0G Storage for agent memory/audit logs
- [ ] Use 0G Compute for AI inference (agent decision-making)
- [ ] ERC-7857 iNFT for agent trust score
- [ ] Reference OpenClaw framework in architecture

#### Gensyn AXL (must do ALL)
- [ ] AXL as PRIMARY communication layer (not HTTP/websocket replacement)
- [ ] Communication across SEPARATE AXL nodes (not in-process)
- [ ] Real utility — service negotiation, trust verification
- [ ] Reference: github.com/gensyn-ai/collaborative-autoresearch-demo

#### ENS (must do ALL)
- [ ] ENS is the IDENTITY mechanism (not cosmetic)
- [ ] ENS records store agent metadata (capabilities, endpoint, pricing, status)
- [ ] Service discovery via ENS resolution
- [ ] Subnames: agenttrust.eth → researcher.agenttrust.eth
- [ ] No hard-coded values — everything resolves through ENS

#### Uniswap (must do ALL)
- [ ] Use Uniswap API for token swaps (agent pays agent)
- [ ] Autonomous settlement without human intervention
- [ ] **FEEDBACK.md in repo root** (MANDATORY — auto-disqualified without it)
- [ ] Cover: what worked, bugs, docs gaps, DX friction, missing endpoints, feature wishes
- [ ] Real execution using Uniswap v4 on Base

#### KeeperHub (must do ALL)
- [ ] Use MCP server or CLI meaningfully
- [ ] All on-chain actions routed through KeeperHub
- [ ] Retry logic for failed transactions
- [ ] Gas optimization and private routing
- [ ] x402 or MPP for autonomous agent payments
- [ ] Full audit trail for every agent action

---

## 4. Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    AgentTrust Protocol                       │
│                                                             │
│  ┌──────────────┐     AXL      ┌──────────────┐           │
│  │  Agent Alpha  │◄────────────►│  Agent Beta   │           │
│  │ (Requester)   │   trust      │ (Provider)    │           │
│  └──────┬───────┘   verify      └──────┬───────┘           │
│         │         Akash Containers    │                     │
│    ENS Identity                ENS Identity                 │
│    + Trust iNFT                + Trust iNFT                 │
│         │                            │                      │
│         ▼                            ▼                      │
│  ┌──────────────────────────────────────────────────┐      │
│  │           Uniswap Payment Settlement              │      │
│  │    (trust-gated: only after verification)         │      │
│  └──────────────────┬───────────────────────────────┘      │
│                     │                                       │
│                     ▼                                       │
│  ┌──────────────────────────────────────────────────┐      │
│  │        KeeperHub Execution Layer                  │      │
│  │  (reliable execution + audit trail = trust)       │      │
│  └──────────────────┬───────────────────────────────┘      │
│                     │                                       │
│                     ▼                                       │
│  ┌──────────────────────────────────────────────────┐      │
│  │         0G Storage & Compute                      │      │
│  │  (trust memory + AI verification + iNFT state)    │      │
│  └──────────────────┬───────────────────────────────┘      │
│                     │                                       │
│                     ▼                                       │
│  ┌──────────────────────────────────────────────────┐      │
│  │    Cloudflare (Pages + Workers + D1 + DO + R2)    │      │
│  │    Akash (Orchestrator + AXL Node 1 + AXL Node 2) │      │
│  │    Base Sepolia (Smart Contracts)                  │      │
│  └──────────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

### Core Components

| Component | Technology | Purpose | Sponsor Track |
|-----------|-----------|---------|--------------|
| Agent Identity | ENS + ERC-7857 iNFT | Trust score + capability verification | ENS + 0G |
| Agent Communication | Gensyn AXL | Encrypted P2P trust negotiation | Gensyn |
| Payment Settlement | Uniswap v4 API | Trust-gated token swaps | Uniswap |
| Execution Layer | KeeperHub MCP | Reliable execution + audit trail | KeeperHub |
| Memory & Verification | 0G Storage + Compute | Trust memory + AI verification | 0G |
| Agent Framework | OpenClaw / custom | Agent orchestration on 0G dAIOS | 0G |
| Frontend | Cloudflare Pages | Next.js 14 dashboard | — |
| API Layer | Cloudflare Workers | Serverless API routes | — |
| Real-time Feed | Cloudflare Durable Objects | WebSocket Hibernation | — |
| Database | Cloudflare D1 | SQLite state (interactions, agents, scores) | — |
| Queue | Cloudflare Queues | Demo trigger jobs | — |
| Object Storage | Cloudflare R2 | Audit logs (zero egress) | — |
| Agent Worker | Akash Container 1 | Orchestrator + cron scheduler | — |
| AXL Node 1 | Akash Container 2 | Researcher agent (separate IP) | — |
| AXL Node 2 | Akash Container 3 | Provider agent (separate IP) | — |

---

## 5. Smart Contracts (Foundry)

### AgentRegistry.sol
- Register agents with ENS name + capability hash
- Link to ERC-7857 iNFT (trust score)
- Update capabilities, deactivate agent
- ENS subname delegation (agenttrust.eth)

### ServiceAgreement.sol
- Create agreement with trust threshold
- Escrow payment until service verified
- Complete/dispute agreement
- Update trust score on completion

### TrustNFT.sol (ERC-7857)
- Mint trust score as iNFT
- On-chain reputation (total tasks, completion rate, avg rating)
- Update after each verified interaction
- Embedded intelligence via 0G Compute

---

## 6. Demo Flow (7 Steps)

1. **Register** — Agent Alpha registers → ENS subname + Trust iNFT minted with capability claims
2. **Discover** — Alpha searches for data analysis → finds Beta via ENS + reads trust score from iNFT
3. **Verify** — Alpha verifies Beta's capability claims via 0G Compute + iNFT credentials
4. **Negotiate** — Agents negotiate via Gensyn AXL P2P across separate nodes
5. **Agree** — ServiceAgreement.sol created on-chain with terms, escrow, trust threshold
6. **Pay & Execute** — Uniswap swap + KeeperHub execution with retry/audit
7. **Trust Update** — 0G Storage persists result + iNFT reputation score updated on-chain

---

## 7. Repository Structure

```
agenttrust/
├── README.md
├── PROJECT.md                    # This file — full project steering
├── FEEDBACK.md                   # Uniswap API feedback (MANDATORY)
├── KEEPERHUB_FEEDBACK.md         # KeeperHub feedback for bonus prize
├── AI_USAGE.md                   # Disclosure of AI agent usage
├── contracts/
│   ├── foundry.toml
│   ├── remappings.txt
│   ├── src/
│   │   ├── AgentRegistry.sol
│   │   ├── ServiceAgreement.sol
│   │   └── TrustNFT.sol
│   ├── test/
│   │   ├── AgentRegistry.t.sol
│   │   ├── ServiceAgreement.t.sol
│   │   └── TrustNFT.t.sol
│   ├── script/
│   │   └── Deploy.s.sol
│   └── lib/
├── agents/
│   ├── requester-agent/
│   │   ├── agent.ts
│   │   ├── capabilities.json
│   │   └── ens-setup.ts
│   └── provider-agent/
│       ├── agent.ts
│       ├── capabilities.json
│       └── ens-setup.ts
├── axl/
│   ├── node-config.ts
│   ├── message-handler.ts
│   ├── protocol.ts
│   └── trust-verify.ts
├── sdk/
│   ├── ens.ts
│   ├── uniswap.ts
│   ├── keeperhub.ts
│   ├── zerog.ts
│   └── trust.ts
├── wallet/
│   ├── src/
│   │   ├── lib/
│   │   ├── balance.js
│   │   ├── transfer.js
│   │   ├── swap.js
│   │   └── contract.js
│   └── SKILL.md
├── frontend/
│   ├── app/
│   │   ├── page.tsx
│   │   ├── agents/
│   │   ├── trust/
│   │   ├── messages/
│   │   └── audit/
│   └── components/
│       ├── AgentCard.tsx
│       ├── TrustScore.tsx
│       ├── MessageLog.tsx
│       └── TransactionFeed.tsx
├── demo/
│   └── scenario.ts
├── video/
│   └── demo-script.md
└── docs/
    ├── architecture.md
    └── sponsor-alignment.md
```

---

## 8. Build Schedule (8 remaining days)

### Day 1-2 (April 26-27): Foundation
- [x] Create GitHub repo with initial commit
- [ ] Initialize Foundry project
- [ ] Write + test AgentRegistry.sol
- [ ] Write + test TrustNFT.sol (ERC-7857)
- [ ] ENS subname setup (agenttrust.eth)

### Day 3-4 (April 28-29): Communication + Contracts
- [ ] Gensyn AXL node setup (2 separate nodes)
- [ ] AXL message protocol implementation
- [ ] Write + test ServiceAgreement.sol
- [ ] Trust verification protocol
- [ ] **Check-in 1** (April 28-29)
- [ ] **Live Feedback Call** (Tuesday April 29, 2-4pm ET)

### Day 5-6 (April 30 - May 1): Integration
- [ ] 0G Storage integration (agent memory)
- [ ] 0G Compute integration (AI verification)
- [ ] Uniswap API integration (trust-gated swaps)
- [ ] KeeperHub MCP integration (execution + audit)
- [ ] Wallet skill integration
- [ ] **Live Feedback Call** (Thursday May 1, 9-11am ET)

### Day 7-8 (May 2-3): Demo + Submit
- [ ] Full end-to-end demo flow
- [ ] Frontend dashboard
- [ ] Demo video (4 minutes)
- [ ] README + architecture diagrams
- [ ] FEEDBACK.md (Uniswap)
- [ ] KEEPERHUB_FEEDBACK.md
- [ ] AI_USAGE.md
- [ ] **SUBMIT by 12pm NOON ET May 3**

---

## 9. Wallet Integration

Using `evm-wallet-skill` as base (verified safe):
- Self-custody, single dependency (viem)
- 6 chains (ETH, Base, Polygon, Arbitrum, Optimism, MegaETH)
- Full lifecycle: generate, balance, transfer (native + ERC20), DEX swap (Odos), contract interaction
- Smart EIP-1559 gas estimation
- Agent-ready: --json on all commands

### Enhancements needed:
- Encrypted key storage
- Human gate before large transactions
- MEV protection for swaps
- Position tracker
- Risk engine (max loss per trade)
- Trade journal integration

### Deployment Infrastructure (Cloudflare + Akash)

#### Cloudflare Services
| Service | Purpose | Configuration |
|---------|---------|-------------|
| Cloudflare Pages | Frontend hosting (Next.js 14) | `@opennextjs/cloudflare` adapter |
| Cloudflare Workers | API routes + Queue consumer | wrangler.toml |
| Cloudflare D1 | SQLite database | interactions, agents, trust_scores tables |
| Cloudflare Durable Objects | WebSocket real-time feed | AgentTrustRoom DO class, Hibernation API |
| Cloudflare Queues | Demo trigger jobs | demo-trigger-queue → Akash orchestrator |
| Cloudflare R2 | Audit log storage | agenttrust-audit-logs bucket, zero egress |
| Cloudflare DNS | Custom domain + SSL | agenttrust.xyz CNAME to Pages + Akash |

#### Akash Containers
| Container | SDL File | Resources | Purpose |
|-----------|----------|-----------|--------|
| Orchestrator | `deploy/akash/orchestrator.yaml` | 2 CPU, 4Gi RAM, 10Gi storage | Agent orchestrator + cron demo scheduler |
| AXL Node Alpha | `deploy/akash/axl-node-alpha.yaml` | 1 CPU, 2Gi RAM, 5Gi storage | Researcher agent (separate IP) |
| AXL Node Beta | `deploy/akash/axl-node-beta.yaml` | 1 CPU, 2Gi RAM, 5Gi storage | Provider agent (separate IP) |

#### Cost
- **Akash**: $0 with trial credits ($100 free) — **must use funded deployment, not trial (24h limit)**
- **Cloudflare**: $0 on free tier (Pages, Workers, D1, DO, Queues, R2 all have free tiers)
- **Custom Domain**: ~$10/year via Cloudflare Registrar

---

## 10. Key Resources

### Documentation
| Tech | URL |
|------|-----|
| 0G Docs | https://docs.0g.ai |
| 0G Storage | https://docs.0g.ai/0g-storage |
| 0G Compute | https://docs.0g.ai/0g-compute |
| AXL Docs | https://docs.gensyn.ai/tech/agent-exchange-layer |
| AXL Demo | https://github.com/gensyn-ai/collaborative-autoresearch-demo |
| ENS Docs | https://docs.ens.domains |
| ENS SDK | https://docs.ens.domains/dapp-developer-guide/ens-enabling-your-dapp |
| Uniswap API | https://docs.uniswap.org/api |
| Uniswap v4 | https://docs.uniswap.org/contracts/v4/overview |
| Uniswap SDK | https://docs.uniswap.org/sdk |
| KeeperHub Docs | https://docs.keeperhub.com |
| KeeperHub MCP | https://docs.keeperhub.com/mcp |
| KeeperHub x402 | https://docs.keeperhub.com/x402 |
| OpenClaw | https://github.com/0glabs/openclaw |
| **Cloudflare Pages** | https://developers.cloudflare.com/pages/ |
| **Cloudflare Workers** | https://developers.cloudflare.com/workers/ |
| **Cloudflare D1** | https://developers.cloudflare.com/d1/ |
| **Cloudflare Durable Objects** | https://developers.cloudflare.com/durable-objects/ |
| **Cloudflare Queues** | https://developers.cloudflare.com/queues/ |
| **Cloudflare R2** | https://developers.cloudflare.com/r2/ |
| **OpenNext Cloudflare** | https://opennext.js.org/cloudflare |
| **Akash Docs** | https://akash.network/docs/ |
| **Akash SDL** | https://akash.network/docs/getting-started/stack-definition-language/ |
| **Akash Console** | https://console.akash.network/ |

### Event Links
| Resource | URL |
|----------|-----|
| Event Page | https://ethglobal.com/events/openagents |
| Prizes | https://ethglobal.com/events/openagents/prizes |
| Submit | https://ethglobal.com/events/openagents/submit |
| Discord | https://discord.gg/ethglobal |
| Rules | https://ethglobal.com/rules |
| YouTube | https://youtube.com/ethglobal |

---

## 11. AI Usage Disclosure

This project uses AI agents (Agent Zero + Claude/LLMs) for:
- Code generation and scaffolding
- Architecture design and review
- Documentation writing
- Test generation
- Debugging assistance

All AI-generated code is reviewed, tested, and committed incrementally.
Full commit history available in the GitHub repository.

---

## 12. Success Metrics

| Metric | Target |
|--------|--------|
| Sponsor tracks qualified | 7+ |
| Trust-verified agent interactions | 3+ complete flows |
| On-chain transactions | Real on Base |
| AXL messages | Across 2+ separate nodes |
| ENS names registered | 3+ (agenttrust.eth + 2 agents) |
| iNFTs minted | 2+ (one per agent) |
| Demo video | < 4 minutes |
| KeeperHub executions | 2+ with audit trails |
| 0G storage entries | 5+ trust records |
| FEEDBACK.md | Complete and detailed |
| Live deployment | Accessible URL |

---

*AgentTrust — Building the trust layer for the $30T agent economy.*
