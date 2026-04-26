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

## Workpack 4: Deploy Script + Base Deployment

**Session budget:** ~20% context
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

### Verification
- [ ] Deploy script runs successfully in simulation (`forge script --dry-run`)
- [ ] Contracts deployed to Base Sepolia
- [ ] Addresses saved to deployments.json
- [ ] No plaintext private keys

### Commit
`feat: deploy script with Base Sepolia deployment`

---

## Workpack 5: Gensyn AXL Setup

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
7. Test: send message from Node 1 to Node 2 and verify receipt

### Verification
- [ ] 2 AXL nodes running on different ports
- [ ] Messages sent from Node 1 received at Node 2
- [ ] Trust verification message schema works
- [ ] NOT in-process — real P2P across nodes

### Commit
`feat: Gensyn AXL P2P communication with trust verification protocol`

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

## Workpack 7: Uniswap + KeeperHub Integration

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

### Verification
- [ ] Uniswap quote API returns valid quotes
- [ ] KeeperHub MCP connection established
- [ ] Transaction retry logic works
- [ ] FEEDBACK.md has real integration notes

### Commit
`feat: Uniswap API + KeeperHub MCP integration with trust-gated payments`

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

## Workpack 9: Frontend Dashboard

**Session budget:** ~25% context
**Priority:** MEDIUM
**Sponsor tracks:** All (visual demo for judges)

### Tasks
1. Set up Next.js 14 in `/frontend/` with TailwindCSS
2. Install Stripe DESIGN.md: `npx getdesign@latest add stripe`
3. Build pages:
   - `/` — Marketplace home (agent cards, trust scores)
   - `/agents` — Agent profiles with ENS identity
   - `/trust` — Trust score explorer (iNFT visualization)
   - `/messages` — AXL message log (P2P communication)
   - `/audit` — Transaction audit trail (KeeperHub)
4. Build components:
   - `AgentCard.tsx` — Agent with trust score badge
   - `TrustScore.tsx` — Visual trust score gauge
   - `MessageLog.tsx` — AXL message feed
   - `TransactionFeed.tsx` — On-chain transaction history
5. Deploy to Vercel

### Verification
- [ ] All 5 pages render correctly
- [ ] Trust scores display from on-chain data
- [ ] Messages show AXL communication
- [ ] Live URL accessible

### Commit
`feat: Next.js frontend dashboard with Stripe-inspired design`

---

## Workpack 10: Demo + Submit

**Session budget:** ~20% context
**Priority:** CRITICAL
**Sponsor tracks:** All
**🚨 HUMAN GATE: submission**

### Tasks
1. Implement `demo/scenario.ts`:
   - Full 7-step automated demo flow
   - Register both agents → discover → verify → negotiate → agree → pay → trust update
   - Run against deployed contracts on Base
2. Run end-to-end demo and capture:
   - Terminal output showing each step
   - Screenshots of frontend dashboard
   - Transaction hashes on Base
3. Record demo video (4 minutes max):
   - Who we are + why this project
   - How it works (architecture walkthrough)
   - Live demo of the 7-step flow
   - Sponsor alignment summary
4. Finalize all feedback docs:
   - `FEEDBACK.md` (Uniswap — MANDATORY)
   - `KEEPERHUB_FEEDBACK.md`
   - `AI_USAGE.md`
5. Update README.md with:
   - Architecture diagram
   - Setup instructions
   - Demo results
   - Sponsor qualification evidence
6. **Request human gate approval for submission**
7. Submit at https://ethglobal.com/events/openagents/submit

### Verification
- [ ] Demo runs end-to-end without errors
- [ ] Video under 4 minutes
- [ ] FEEDBACK.md complete and detailed
- [ ] README shows all sponsor qualifications
- [ ] All contracts deployed and verified
- [ ] Frontend live and accessible
- [ ] Submitted before 12pm NOON ET May 3

### Final Commit
`chore: final submission — demo video, feedback docs, README polish`

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
