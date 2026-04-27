# AgentTrust — Build Plan

> **12 sessions. 8 days. 1 goal: win $35K+.**
>
> Each session = ONE workpack. Execute it. Verify it. Update progress.json. Hand off.
>
> **Entry prompt for every new session:**
> `Read and execute the next incomplete workpack from BUILD-PLAN.md. Load progress from progress.json first.`

> **Key Integration Guides (read before executing):**
> - SE2 Cherry-Pick: `docs/SE2-INTEGRATION-GUIDE.md`
> - ethskills Reference: `docs/ETHSKILLS-REFERENCE.md`
> - Deployment Strategy: `docs/DEPLOYMENT-STRATEGY.md`

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

## Workpack 0: SE2 Frontend Foundation + ethskills Setup

**Session budget:** ~25% context
**Priority:** CRITICAL (unblocks all frontend work)
**Sponsor tracks:** All (provides Debug Contracts page + wallet UI)
**Reference docs:** `docs/SE2-INTEGRATION-GUIDE.md`, `docs/ETHSKILLS-REFERENCE.md`

### Why This Workpack Exists
AgentTrust's frontend (`frontend/`) is completely empty — only `.gitkeep` placeholders.
Cherry-picking scaffold-eth-2 (SE2) components provides:
- **Debug Contracts page** — auto-generated CRUD UI for AgentRegistry, TrustNFT, ServiceAgreement (saves 16+ hours)
- **10 wagmi/viem hooks** — type-safe blockchain interaction (saves 12 hours)
- **RainbowKit wallet UI** — wallet connect + network switching (saves 4 hours)
- **Provider/wagmi config** — Base chain setup (saves 3 hours)
- **Total: ~37 hours saved vs building from scratch**

ethskills provides verified Base chain addresses, ERC-8004 commerce flow code, and security patterns — zero coupling, pure reference.

### Tasks
1. **SE2 Cherry-Pick** — Follow `docs/SE2-INTEGRATION-GUIDE.md` step by step:
   - Step 1: Clone SE2 reference: `git clone --depth 1 https://github.com/scaffold-eth/scaffold-eth-2.git /tmp/se2-reference`
   - Step 2: Install npm dependencies (wagmi@2, viem@2, @rainbow-me/rainbowkit@2, @tanstack/react-query@5, zustand@5, daisyui@5, @scaffold-ui/debug-contracts)
   - Step 3: Create directory structure in `frontend/` (see SE2 guide section 4)
   - Step 4: Copy ~35 core files from SE2 into AgentTrust:
     - 10 hooks (useScaffoldRead, useScaffoldWrite, useScaffoldContract, useScaffoldEventHistory, useWatchContractEvent, useTransactor, useDeployedContractInfo, useTargetNetwork, useSelectedNetwork, useFetchBlocks)
     - 7 utils (contract.ts, contractsData.ts, networks.ts, notification.tsx, getParsedError.ts, block.ts, common.ts)
     - 3 services (wagmiConfig.tsx, wagmiConnectors.tsx, store.ts)
     - 4 wallet UI files (RainbowKitCustomConnectButton + 3 subcomponents, BlockieAvatar)
     - 3 debug page files (page.tsx, DebugContracts.tsx, ContractUI.tsx)
     - 3 config files (scaffold.config.ts, abi.d.ts, postcss.config.js)
   - Step 5: Write the Foundry bridge script (`scripts/foundry-bridge.js`) — reads Forge broadcast + ABI artifacts → generates `frontend/config/deployedContracts.ts`. Full script code is in SE2 guide section 7.
   - Step 6: Configure `scaffold.config.ts` for Base chain (chainId 8453, Base Sepolia 84532 for testnet)
   - Step 7: Adapt imports (search-replace patterns in SE2 guide section 9)
   - Step 8: Verify — `npm run dev`, Debug Contracts page loads at `/debug`, wallet connects
2. **ethskills Fetch** — Follow `docs/ETHSKILLS-REFERENCE.md`:
   - Fetch priority skills to `docs/reference/ethskills/`:
     ```bash
     mkdir -p docs/reference/ethskills
     curl -o docs/reference/ethskills/standards.md https://ethskills.com/standards/SKILL.md
     curl -o docs/reference/ethskills/addresses.md https://ethskills.com/addresses/SKILL.md
     curl -o docs/reference/ethskills/security.md https://ethskills.com/security/SKILL.md
     curl -o docs/reference/ethskills/testing.md https://ethskills.com/testing/SKILL.md
     curl -o docs/reference/ethskills/building-blocks.md https://ethskills.com/building-blocks/SKILL.md
     curl -o docs/reference/ethskills/indexing.md https://ethskills.com/indexing/SKILL.md
     ```
   - Extract ERC-8004 addresses on Base into `frontend/config/externalContracts.ts`
   - Extract verified addresses (USDC, WETH, Uniswap V2/V3/V4, ENS, Aerodrome on Base)
3. **Wire external contracts** — Create `frontend/config/externalContracts.ts` with:
   - ERC-8004 IdentityRegistry (`0x8004A169FB4a3325136EB29fA0ceB6D2e539a432`) + ReputationRegistry (`0x8004BAa17C55a88189AE136b182e5fdA19dE9b63`) on Base
   - ENS registry address
   - Uniswap V2/V3/V4 router addresses on Base
   - USDC + WETH token addresses on Base

### Files Created/Modified
```
frontend/
├── app/debug/page.tsx              ← SE2 Debug Contracts
├── components/scaffold-eth/         ← ~15 hook files + 7 utils + 3 services
├── components/wallet/               ← 4 RainbowKit UI files
├── config/
│   ├── scaffold.config.ts          ← Base chain config
│   ├── deployedContracts.ts        ← Placeholder (generated after contract deploy)
│   └── externalContracts.ts        ← ERC-8004, ENS, Uniswap addresses
├── utils/scaffold/                  ← SE2 utility functions
scripts/foundry-bridge.js           ← Foundry → deployedContracts.ts bridge
docs/reference/ethskills/            ← 6 fetched skill documents
```

### Subordinate Delegation
| Task | Profile | Reference |
|------|---------|----------|
| Cherry-pick SE2 components | `frontend_engineer` | `docs/SE2-INTEGRATION-GUIDE.md` |
| Write Foundry bridge script | `developer` | SE2 guide section 7 |
| Fetch ethskills + wire addresses | `backend_engineer` | `docs/ETHSKILLS-REFERENCE.md` |

### Verification
- [ ] `npm run dev` starts without errors
- [ ] Debug Contracts page renders at `/debug`
- [ ] RainbowKit wallet connect button appears in layout
- [ ] Base chain configured in scaffold.config.ts
- [ ] Foundry bridge script runs without errors
- [ ] ethskills reference docs fetched to `docs/reference/ethskills/`
- [ ] externalContracts.ts has ERC-8004 + Uniswap + ENS addresses on Base

### Commit
`feat: scaffold-eth-2 frontend foundation with ethskills reference integration`

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

## Workpack 9: Frontend Dashboard (SE2-Enhanced)

**Session budget:** ~25% context
**Priority:** HIGH (was MEDIUM — elevated because SE2 foundation makes this faster)
**Sponsor tracks:** All (visual demo for judges)
**Prerequisites:** Workpack 0 completed (SE2 foundation + ethskills in place)
**Reference docs:** `docs/SE2-INTEGRATION-GUIDE.md`, `docs/DEPLOYMENT-STRATEGY.md`

### What SE2 Already Provides (from Workpack 0)
- ✅ Debug Contracts page at `/debug` (auto-generated CRUD for all 3 contracts)
- ✅ RainbowKit wallet connection
- ✅ 10 type-safe wagmi/viem hooks
- ✅ Base chain provider configuration
- ✅ Transaction notification system

### Tasks — Build Custom Dashboard Pages
1. **Agent Discovery Page** (`/agents`):
   - Use `useScaffoldRead` hook to query AgentRegistry
   - Agent cards with trust score badges from TrustNFT
   - ENS name resolution display
   - Capability tags from agent metadata
   - Search/filter by capability
2. **Trust Score Explorer** (`/trust`):
   - Visual trust score gauge component
   - TrustNFT iNFT visualization
   - Score breakdown (totalTasks, completedTasks, avgRating, totalEarned)
   - Score history chart (if data available)
   - Use `useScaffoldRead` to read trust scores
3. **AXL Message Log** (`/messages`):
   - Real-time message feed from Gensyn AXL P2P
   - Message type indicators (discovery, trust-verify, negotiate, payment)
   - Sender/receiver ENS names
   - Trust verification status per message
   - Connect to `axl/message-handler.ts`
4. **Audit Trail** (`/audit`):
   - Transaction history from on-chain events
   - Service agreement lifecycle visualization
   - KeeperHub execution logs
   - Event filters by agent, agreement, date
   - Use `useScaffoldEventHistory` for on-chain events
5. **Marketplace Home** (`/`):
   - Hero section with project overview
   - Featured agents with highest trust scores
   - Recent service agreements
   - Quick action: register agent, create agreement
   - Stats dashboard (total agents, agreements, trust score average)
6. **Layout + Navigation**:
   - Sidebar or top nav with all routes
   - Wallet connection in header (from SE2 RainbowKit)
   - Network indicator (Base Mainnet / Base Sepolia)
   - Responsive design with TailwindCSS + DaisyUI 5
7. **Install DaisyUI 5** (if not done in Workpack 0):
   - `npm install daisyui@5`
   - Add to Tailwind config
   - Use DaisyUI components for cards, badges, modals, alerts

### Verification
- [ ] All 5 custom pages render correctly
- [ ] Trust scores display from on-chain TrustNFT data
- [ ] Messages show AXL communication in real-time
- [ ] Audit trail shows on-chain events
- [ ] Wallet connects via RainbowKit
- [ ] Debug Contracts page still works at `/debug`
- [ ] Responsive on mobile
- [ ] DaisyUI 5 theme applied

### Commit
`feat: AgentTrust dashboard pages — agents, trust, messages, audit, marketplace`

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
6. Verify deployment on all 3 layers (Workpack 11)
7. **Request human gate approval for submission**
8. Submit at https://ethglobal.com/events/openagents/submit

### Verification
- [ ] Demo runs end-to-end without errors
- [ ] Video under 4 minutes
- [ ] FEEDBACK.md complete and detailed
- [ ] README shows all sponsor qualifications
- [ ] All contracts deployed and verified
- [ ] Frontend live and accessible
- [ ] Deployment live on Vercel (primary) + Akash (backup)
- [ ] Submitted before 12pm NOON ET May 3

### Final Commit
`chore: final submission — demo video, feedback docs, README polish`

---

## Workpack 11: Triple-Layer Deployment

**Session budget:** ~15% context
**Priority:** HIGH
**Sponsor tracks:** All (live URL required for finalist track)
**Reference doc:** `docs/DEPLOYMENT-STRATEGY.md`

### Tasks
1. **Vercel Deployment (Primary)**:
   - Connect GitHub repo to Vercel
   - Set root directory to `frontend/`
   - Add environment variables (NEXT_PUBLIC_CHAIN_ID, RPC URLs, contract addresses)
   - Deploy and verify live URL
2. **Akash Deployment (Decentralized Backup)**:
   - Build Docker image for Next.js frontend
   - Write Akash SDL (see DEPLOYMENT-STRATEGY.md section 4)
   - Deploy via Console API (credit card) or CLI (funded wallet)
   - Note: If using trial, 24h auto-closure — redeploy daily
3. **IPFS + ENS (Permanent)**:
   - Build static export of frontend
   - Pin to IPFS via Fleek or Pinata
   - Set `agenttrust.eth` contenthash to IPFS CID
   - Verify resolution at `agenttrust.eth.limo`
4. **Verify all 3 URLs work** and update README with links

### Verification
- [ ] Vercel URL live and serving frontend
- [ ] Akash URL live (or SDL ready to deploy)
- [ ] IPFS hash pinned and resolving via ENS
- [ ] All 3 URLs show the same frontend
- [ ] Demo video shows at least 2 deployment layers

### Commit
`feat: triple-layer deployment — Vercel + Akash + IPFS/ENS`

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
