# AgentTrust — Build Plan

> **10 sessions. 8 days. 1 goal: win $35K+.**
>
> Each session = ONE workpack. Execute it. Verify it. Update progress.json. Hand off.
>
> **Entry prompt for every new session:**
> `Read and execute the next incomplete workpack from BUILD-PLAN.md. Load progress from progress.json first.`

---

## How to Execute a Workpack

```
1. Read progress.json → find current workpack
2. Read only the workpack section below (not the whole file)
3. Execute using subordinates for heavy work (saves context)
4. Run verification (tests, compilation, etc.)
5. If CRITICAL gate triggered → use human_gate tool with break_loop=true
6. Update progress.json with results
7. Commit incrementally to git (small commits)
8. Run /reflect → write handoff.md
9. Tell user: "Session complete. Start new chat to continue."
```

## Context Budget Rules

- **30% hard cap** per session — if approaching, stop and hand off
- Use `call_subordinate` for all code generation (subordinates get fresh context)
- Use `§§include(path)` for reading files, never paste content
- Each subordinate does ONE focused task
- Read only the workpack you're executing, not future ones

## Human Gates (pause for approval)

| Gate | When | Why |
|------|------|-----|
| `contract_deploy` | Deploying contracts to any network | Costs real gas, irreversible |
| `architecture_change` | Changing core contract interfaces | Cascading impact |
| `fund_transfer` | Spending real ETH/tokens | Financial risk |
| `submission` | Final ETHGlobal submission | One chance |

All other decisions: **autonomous. No approval needed.**

---

## Workpack 1: Foundry Setup + AgentRegistry

**Session budget:** ~25% context
**Priority:** CRITICAL
**Sponsor tracks:** 0G Framework, ENS

### Tasks
1. Initialize Foundry project in `/contracts/`
2. Install dependencies: `forge-std`, `openzeppelin-contracts`
3. Write `AgentRegistry.sol` with:
   - Register agent with ENS name + capability hash
   - Link to ERC-721 identity token
   - Update capabilities, deactivate agent
   - Custom errors: `AgentRegistry__*`
   - Events for all state changes
4. Write `AgentRegistry.t.sol` with:
   - Branching tree test structure
   - Fuzz tests for registration
   - Test ENS name validation
   - Test capability updates
   - Test deactivation
5. Run `forge test` — all must pass
6. Run `forge build --sizes` — under 24KB

### Verification
- [ ] `forge test` passes
- [ ] `forge build --sizes` under 24KB
- [ ] Custom errors follow `AgentRegistry__` pattern
- [ ] No `require` statements (use `revert` with custom errors)

### Commit
`feat: AgentRegistry.sol with ENS-based agent registration and full test suite`

---

## Workpack 2: TrustNFT (ERC-7857 iNFT)

**Session budget:** ~25% context
**Priority:** CRITICAL
**Sponsor tracks:** 0G Framework, 0G On-Chain AI

### Tasks
1. Write `TrustNFT.sol` implementing ERC-7857:
   - Soulbound (non-transferable after mint)
   - Trust score struct: totalTasks, completedTasks, avgRating, totalEarned
   - `updateTrustScore()` called after each verified interaction
   - Asymmetric trust scoring (requester vs provider)
   - EIP-712 typed data signing for off-chain verification
2. Write `TrustNFT.t.sol` with:
   - Fuzz tests for score calculations
   - Invariant: avgRating always between 1-5
   - Invariant: completedTasks <= totalTasks
   - Test soulbound enforcement (revert on transfer)
   - Test score update edge cases
3. Run `forge test` — all pass

### Verification
- [ ] `forge test` passes
- [ ] Invariants hold under fuzzing
- [ ] Soulbound enforcement tested
- [ ] Score math tested with edge cases

### Commit
`feat: TrustNFT.sol ERC-7857 soulbound trust score iNFT`

---

## Workpack 3: ServiceAgreement (Escrow + Settlement)

**Session budget:** ~25% context
**Priority:** CRITICAL
**Sponsor tracks:** Uniswap, KeeperHub

### Tasks
1. Write `ServiceAgreement.sol`:
   - 6-state lifecycle: Created → Accepted → InProgress → Completed → Disputed → Resolved
   - Escrow: buyer deposits payment, held until service verified
   - Trust threshold: minimum trust score required for provider
   - Timeout mechanism for automatic refund
   - Dispute resolution with evidence hash
   - Integration with TrustNFT for score updates
2. Write `ServiceAgreement.t.sol`:
   - Test full lifecycle through all 6 states
   - Fuzz test escrow amounts
   - Test trust threshold enforcement
   - Test timeout refund
   - Test dispute resolution
   - Invariant: total escrowed == contract balance
3. Run `forge test` — all pass

### Verification
- [ ] All 6 states reachable via tests
- [ ] Escrow invariant holds
- [ ] Trust threshold enforced
- [ ] Timeout mechanism works

### Commit
`feat: ServiceAgreement.sol trust-gated escrow with 6-state lifecycle`

---

## Workpack 4: Deploy Script + Base Deployment + Akash SDLs + Cloudflare D1

**Session budget:** ~25% context
**Priority:** HIGH
**Sponsor tracks:** All (contracts needed for demo)
**🚨 HUMAN GATE: contract_deploy**

### Tasks
1. Write `Deploy.s.sol` using Foundry best practices:
   - Deploy AgentRegistry, TrustNFT, ServiceAgreement
   - Set up references between contracts
   - Use encrypted keystore (never plaintext keys)
2. Test deploy script on Base Sepolia (testnet)
3. Verify contracts on BaseScan
4. Save deployment addresses to `contracts/deployments.json`
5. **Request human gate approval before deploying**
6. Create 3 Akash SDL files:
   - `deploy/akash/orchestrator.yaml` — Agent orchestrator (2 CPU, 4Gi RAM, 10Gi storage)
   - `deploy/akash/axl-node-alpha.yaml` — AXL Node 1 / researcher agent (1 CPU, 2Gi RAM, 5Gi storage)
   - `deploy/akash/axl-node-beta.yaml` — AXL Node 2 / provider agent (1 CPU, 2Gi RAM, 5Gi storage)
7. Validate SDLs: `provider-services tx deployment create --dry-run` for each
8. Create Cloudflare D1 database schema:
   - `interactions` table (agent interactions log)
   - `agents` table (registered agent metadata cache)
   - `trust_scores` table (trust score history)
   - Schema file: `deploy/cloudflare/d1-schema.sql`

> **Note:** Use FUNDED Akash deployment (not trial — 24h limit on trial deployments).
> **Note:** Custom domain via Cloudflare CNAME pointing to Akash endpoints.

### Verification
- [ ] Deploy script runs successfully in simulation (`forge script --dry-run`)
- [ ] Contracts deployed to Base Sepolia
- [ ] Addresses saved to deployments.json
- [ ] No plaintext private keys
- [ ] 3 Akash SDLs validate with `provider-services tx deployment create --dry-run`
- [ ] Cloudflare D1 schema created

### Commit
`feat: deploy script, Akash SDLs, Cloudflare D1 schema for Base Sepolia deployment`
---

## Workpack 5: Gensyn AXL Setup (Akash Containers)

**Session budget:** ~25% context
**Priority:** CRITICAL
**Sponsor tracks:** Gensyn ($10K)

### Tasks
1. Research AXL SDK from https://docs.gensyn.ai/tech/agent-exchange-layer
2. Clone reference: https://github.com/gensyn-ai/collaborative-autoresearch-demo
3. Set up 2 separate AXL nodes (one per agent)
4. Implement `axl/protocol.ts` — AgentTrust message schema
5. Implement `axl/message-handler.ts` — trust verification over AXL
6. Implement `axl/trust-verify.ts` — capability verification protocol
7. Deploy AXL containers to Akash:
   - Deploy `axl-node-alpha` container from `deploy/akash/axl-node-alpha.yaml`
   - Deploy `axl-node-beta` container from `deploy/akash/axl-node-beta.yaml`
   - Nodes run on Akash containers, NOT localhost — separate IPs for Gensyn qualification
8. Configure Cloudflare CNAME for AXL endpoints:
   - `axl-alpha.agenttrust.xyz` → Akash Node 1
   - `axl-beta.agenttrust.xyz` → Akash Node 2
9. Test: send message from Node 1 to Node 2 and verify receipt

### Verification
- [ ] 2 AXL nodes running on Akash containers (different IPs)
- [ ] Messages sent from Node 1 received at Node 2
- [ ] Trust verification message schema works
- [ ] NOT in-process — real P2P across separate Akash containers
- [ ] Cloudflare CNAME resolves to AXL endpoints

### Commit
`feat: Gensyn AXL P2P on Akash containers with Cloudflare CNAME endpoints`
---

## Workpack 6: Agent Implementations + ENS

**Session budget:** ~25% context
**Priority:** HIGH
**Sponsor tracks:** ENS, 0G

### Tasks
1. Implement `agents/requester-agent/agent.ts`:
   - Connect to AXL node
   - Service discovery via ENS resolution
   - Trust score verification before hiring
   - Payment initiation via Uniswap
   - Result verification and rating
2. Implement `agents/provider-agent/agent.ts`:
   - Connect to AXL node
   - Service listing via ENS metadata
   - Trust attestation (verify own capabilities)
   - Service execution (mock data analysis)
   - Result delivery and payment receipt
3. Implement `agents/*/ens-setup.ts`:
   - ENS subname registration (agenttrust.eth)
   - Set ENS records: capabilities, endpoint, pricing, status
   - Resolve other agents via ENS
4. Implement `sdk/ens.ts` — full ENS integration module

### Verification
- [ ] Requester agent can discover provider via ENS
- [ ] Provider agent registers capabilities in ENS records
- [ ] Trust scores read from on-chain NFT
- [ ] No hardcoded addresses — everything resolves via ENS

### Commit
`feat: agent implementations with ENS identity and service discovery`

---

## Workpack 7: Uniswap + KeeperHub + Cloudflare Queues

**Session budget:** ~25% context
**Priority:** HIGH
**Sponsor tracks:** Uniswap ($5K), KeeperHub ($5K)

### Tasks
1. Implement `sdk/uniswap.ts`:
   - Uniswap v4 API integration
   - Token swap: USDC → ETH for service payment
   - Quote fetching
   - Transaction building and signing
   - **Start filling FEEDBACK.md as you go**
2. Implement `sdk/keeperhub.ts`:
   - KeeperHub MCP client setup
   - Submit execution tasks (payment, agreement creation)
   - Retry logic for failed transactions
   - Gas optimization configuration
   - Audit trail retrieval
   - **Start filling KEEPERHUB_FEEDBACK.md as you go**
3. Implement `sdk/trust.ts`:
   - Trust score calculation engine
   - Verification protocol
   - Trust threshold checking
4. Wire up: agent payment flow uses Uniswap → KeeperHub execution
5. Set up Cloudflare Queues for demo trigger jobs:
   - Create queue: `demo-trigger-queue`
   - Queue consumer sends HTTP requests to Akash orchestrator
   - Config file: `deploy/cloudflare/wrangler.toml` (queues section)
6. Wire Queue consumer to Akash orchestrator endpoint

### Verification
- [ ] Uniswap quote API returns valid quotes
- [ ] KeeperHub MCP connection established
- [ ] Transaction retry logic works
- [ ] FEEDBACK.md has real integration notes
- [ ] Cloudflare Queue created and consumer wired

### Commit
`feat: Uniswap API + KeeperHub MCP + Cloudflare Queues for demo orchestration`
---

## Workpack 8: 0G Storage + Compute + Wallet

**Session budget:** ~25% context
**Priority:** HIGH
**Sponsor tracks:** 0G ($15K)

### Tasks
1. Implement `sdk/zerog.ts`:
   - 0G Storage: persist agent memory, interaction logs
   - 0G Compute: AI verification of service results
   - 0G Chain: deploy contracts if required
2. Integrate wallet from evm-wallet-skill:
   - Copy and adapt wallet core to `/wallet/`
   - Configure for Base chain
   - Agent wallet generation
   - Balance checking
   - Transaction signing for all SDK operations
3. Connect 0G storage to TrustNFT state updates
4. Test: store interaction → retrieve → verify hash

### Verification
- [ ] 0G Storage can write and retrieve data
- [ ] 0G Compute can verify a service result
- [ ] Wallet generates valid addresses
- [ ] Transactions signed correctly

### Commit
`feat: 0G Storage/Compute integration with agent wallet`

---

## Workpack 9: Frontend Dashboard (Cloudflare Pages)

**Session budget:** ~25% context
**Priority:** MEDIUM
**Sponsor tracks:** All (visual demo for judges)

### Tasks
1. Set up Next.js 14 in `/frontend/` with TailwindCSS
2. Install Stripe DESIGN.md: `npx getdesign@latest add stripe`
3. Configure `@opennextjs/cloudflare` adapter for Cloudflare Pages deployment
4. Set up Cloudflare D1 database:
   - Create D1 database via `wrangler d1 create agenttrust-db`
   - Apply schema from `deploy/cloudflare/d1-schema.sql`
   - Bind D1 in `wrangler.toml`
5. Set up Cloudflare Workers API routes:
   - `/api/agents` — agent listing from D1 cache
   - `/api/interactions` — interaction history from D1
   - `/api/trust-scores` — trust score data
   - `/api/demo-trigger` — enqueue demo job to Cloudflare Queue
6. Set up Cloudflare Durable Objects for WebSocket real-time feed:
   - Replaces SSE polling with true WebSocket push
   - `AgentTrustRoom` DO class manages connections
   - Real-time message log + trust score updates
   - WebSocket Hibernation for cost efficiency
7. Set up Cloudflare R2 for audit log storage:
   - Create R2 bucket: `agenttrust-audit-logs`
   - Zero egress cost for audit trail retrieval
   - Bind R2 in `wrangler.toml`
8. Build pages:
   - `/` — Marketplace home (agent cards, trust scores)
   - `/agents` — Agent profiles with ENS identity
   - `/trust` — Trust score explorer (iNFT visualization)
   - `/messages` — AXL message log (real-time via Durable Objects WebSocket)
   - `/audit` — Transaction audit trail (KeeperHub + R2 logs)
9. Build components:
   - `AgentCard.tsx` — Agent with trust score badge
   - `TrustScore.tsx` — Visual trust score gauge
   - `MessageLog.tsx` — Real-time AXL message feed (WebSocket)
   - `TransactionFeed.tsx` — On-chain transaction history
10. Deploy to Cloudflare Pages (NOT Vercel)

### Verification
- [ ] All 5 pages render correctly
- [ ] Trust scores display from on-chain data
- [ ] Messages show AXL communication (real-time WebSocket)
- [ ] Live URL accessible on Cloudflare Pages
- [ ] D1 database queries working
- [ ] R2 audit log storage working
- [ ] Durable Objects WebSocket feed operational

### Commit
`feat: Next.js frontend on Cloudflare Pages with D1, Durable Objects, R2`

## Workpack 10: Demo + Submit (Cloudflare + Akash Deployment)

**Session budget:** ~20% context
**Priority:** CRITICAL
**Sponsor tracks:** All
**🚨 HUMAN GATE: submission**

### Tasks
1. Implement `demo/scenario.ts`:
   - Full 7-step automated demo flow
   - Register both agents → discover → verify → negotiate → agree → pay → trust update
   - Run against deployed contracts on Base
2. Deploy to Akash (3 containers):
   - `deploy/akash/orchestrator.yaml` — Agent orchestrator + cron
   - `deploy/akash/axl-node-alpha.yaml` — AXL Node 1
   - `deploy/akash/axl-node-beta.yaml` — AXL Node 2
   - Use FUNDED deployment (not trial — 24h limit)
3. Deploy to Cloudflare:
   - Cloudflare Pages: frontend dashboard
   - Cloudflare Workers: API routes + Queue consumer
   - Cloudflare D1: database with schema applied
   - Cloudflare Durable Objects: WebSocket real-time feed
   - Cloudflare R2: audit log bucket
   - Cloudflare Queues: demo trigger queue
4. Verify all Cloudflare services operational:
   - `wrangler pages deploy` succeeds
   - D1 database accessible
   - R2 bucket writable
   - Durable Objects WebSocket connects
   - Queue consumer processes messages
5. Warm-start: run 5 sequential demos on deploy to populate dashboard
6. Auto-demo scheduler on Akash orchestrator (every 4 minutes):
   - Cron job triggers demo scenario
   - Ensures dashboard always has fresh data for judges
7. Configure custom domain (agenttrust.xyz or similar):
   - Cloudflare DNS CNAME to Pages
   - SSL via Cloudflare
   - Verify domain resolves
8. Run end-to-end demo and capture:
   - Terminal output showing each step
   - Screenshots of frontend dashboard
   - Transaction hashes on Base
9. Record demo video (4 minutes max):
   - Who we are + why this project
   - How it works (architecture walkthrough)
   - Live demo of the 7-step flow
   - Sponsor alignment summary
10. Finalize all feedback docs:
    - `FEEDBACK.md` (Uniswap — MANDATORY)
    - `KEEPERHUB_FEEDBACK.md`
    - `AI_USAGE.md`
11. Update README.md with:
    - Architecture diagram
    - Setup instructions
    - Demo results
    - Sponsor qualification evidence
12. **Request human gate approval for submission**
13. Submit at https://ethglobal.com/events/openagents/submit

### Verification
- [ ] Demo runs end-to-end without errors
- [ ] 3 Akash containers deployed and running
- [ ] All Cloudflare services operational
- [ ] Auto-demo scheduler running every 4 minutes
- [ ] Custom domain resolves with SSL
- [ ] Video under 4 minutes
- [ ] FEEDBACK.md complete and detailed
- [ ] README shows all sponsor qualifications
- [ ] All contracts deployed and verified
- [ ] Frontend live and accessible
- [ ] Submitted before 12pm NOON ET May 3

### Final Commit
`chore: final submission — Akash + Cloudflare deployment, demo video, feedback docs`
---

## Session Checklist (copy at start of each session)

```
[ ] Read progress.json
[ ] Execute workpack tasks via subordinates
[ ] Run verification checks
[ ] Trigger human gate if needed
[ ] Update progress.json
[ ] Commit incrementally (small commits)
[ ] Push to GitHub
[ ] Run /reflect
[ ] Tell user: "Start new chat to continue."
```
