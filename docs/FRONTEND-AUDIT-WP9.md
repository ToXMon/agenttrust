# AgentTrust Frontend Audit — Workpack 9 Pre-Build Assessment

> **Date:** 2026-04-30 09:52 ET
> **Auditor:** ASE Frontend Engineer (Agent Zero)
> **Status:** CRITICAL — WP9 NOT STARTED
> **Deadline:** 2026-05-03 12:00 NOON ET (3 days remaining)

---

## 1. Executive Summary

### Overall Assessment: 🔴 CRITICAL RISK

**The frontend is the #1 risk to winning.** All backend SDK modules (WP0-8) are complete, but ZERO sponsor integration proof exists in the UI. Judges at ETHGlobal evaluate primarily through the live demo — if they can't SEE it working, it didn't happen.

**Workpack 9 has NOT been started.** All 4 custom dashboard pages (`/agents`, `/trust`, `/messages`, `/audit`) have empty directories. Only the home page (static mock data) and debug page (developer CRUD) exist.

### Key Numbers

| Metric | Status |
|--------|--------|
| Dashboard pages built | 1 of 5 (only home, static) |
| Pages with on-chain reads | 0 of 5 |
| Sponsor tracks with frontend proof | 0 of 8 |
| Live demo readiness | 15% (layout + debug only) |
| Shared components | 0 (empty directory) |
| Time remaining | ~3 days |

---

## 2. What's Built (The Good News)

### Infrastructure ✅ EXCELLENT

| Component | Status | Quality |
|-----------|--------|---------|
| Next.js 14 App Router | ✅ Working | Production-grade |
| TailwindCSS + Design System | ✅ Polished | Stripe-grade, custom CSS vars |
| SE2 Hooks (12 hooks) | ✅ Working | useScaffoldRead, useScaffoldWrite, etc. |
| RainbowKit Wallet | ✅ Working | Custom purple theme |
| Base Mainnet Config | ✅ Done | chainId 8453, correct RPC |
| Deployed Contracts ABI | ✅ Generated | All 3 contracts with full ABI |
| External Contracts | ✅ Wired | ERC-8004, ENS, Uniswap addresses |
| Wagmi/viem Config | ✅ Working | v2 of both libraries |
| DaisyUI 5 | ✅ Installed | Not yet used in components |

### Design System ✅ POLISHED

The `DESIGN.md` specification and `globals.css` implementation are exceptional:
- Professional purple/navy palette with semantic colors
- Custom shadow system (subtle, ambient-card, card)
- Monospace typography for on-chain data
- Trust score color bands (gradient for 86+, solid for 56+, light for 26+)
- Frosted glass nav bar with backdrop blur
- Clean footer with ETHGlobal branding

### Backend SDK ✅ COMPLETE (but invisible to judges)

| SDK Module | Lines | Status | Frontend Integration |
|-----------|-------|--------|---------------------|
| ENS/Basenames | 537 | ✅ Complete | ❌ NOT WIRED |
| Uniswap | 582 | ✅ Complete | ❌ NOT WIRED |
| KeeperHub | 503 | ✅ Complete | ❌ NOT WIRED |
| 0G Storage/Compute | 609 | ✅ Complete | ❌ NOT WIRED |
| AI Verification | 298 | ✅ Complete | ❌ NOT WIRED |
| Wallet | 284 | ✅ Complete | ❌ NOT WIRED |
| Trust Scoring | — | ✅ Complete | ❌ NOT WIRED |

### Home Page Quality ✅ VISUALLY POLISHED (but static)

- Hero section with clear value proposition
- 3 sample agent cards with trust score bars and ENS names
- Protocol overview (Discover → Verify → Transact)
- Clean CTAs (Explore Agents, Read Docs)
- Professional typography and spacing

**Critical Flaw:** ALL data is hardcoded `sampleAgents` array — zero `useScaffoldRead` calls, zero wallet interaction, zero on-chain data.

---

## 3. What's Missing (The Critical Gaps)

### 3.1 Dashboard Pages — ALL EMPTY

| Route | Purpose | Sponsor Proof | Status |
|-------|---------|---------------|--------|
| `/agents` | Agent discovery, ENS profiles, trust badges | ENS, 0G | ❌ EMPTY DIR |
| `/trust` | Trust score visualization, NFT badges, history | 0G, ERC-7857 | ❌ EMPTY DIR |
| `/messages` | AXL P2P message log, real-time feed | Gensyn | ❌ EMPTY DIR |
| `/audit` | On-chain event history, KeeperHub logs | KeeperHub, 0G | ❌ EMPTY DIR |
| `/` (home) | Dashboard overview | All | ⚠️ STATIC ONLY |

### 3.2 On-Chain Data Integration — ZERO

The home page uses `const sampleAgents = [...]` hardcoded array. It does NOT:
- Read from `AgentRegistry.sol` via `useScaffoldReadContract`
- Resolve ENS names via `sdk/ens.ts`
- Display real trust scores from `TrustNFT.sol`
- Show service agreements from `ServiceAgreement.sol`
- Connect to AXL nodes via `axl/axl-client.ts`

### 3.3 Live Demo Flow — NON-EXISTENT

The `demo/scenario.ts` (154 lines) runs as a console script, NOT as a UI walkthrough. Judges cannot:
- Click through the 7-step protocol visually
- See agent registration happen in real-time
- Watch AXL messages appear in a message feed
- See trust scores update on-chain
- View payment settlement via Uniswap

### 3.4 Prize Track Visual Proof — ZERO OF 8

| # | Sponsor | Track | Frontend Proof Needed | Status |
|---|---------|-------|----------------------|--------|
| 1 | 0G | Agent Framework | Agent cards with iNFT badges, 0G storage indicator | ❌ |
| 2 | 0G | On-Chain AI | AI verification results, trust score computation | ❌ |
| 3 | Gensyn | Best AXL | Real-time P2P message feed across 2 nodes | ❌ |
| 4 | ENS | Best ENS Integration | ENS name resolution, agent profiles from ENS records | ❌ |
| 5 | ENS | Subname Ecosystem | agenttrust.eth subnames displayed, subname registration | ❌ |
| 6 | Uniswap | Best API Integration | Trust-gated swap UI, quote display, FEEDBACK.md link | ❌ |
| 7 | KeeperHub | Best Agent Execution | Task execution dashboard, retry status, audit trail | ❌ |
| 8 | KeeperHub | Best Feedback | Link to KEEPERHUB_FEEDBACK.md from UI | ❌ |

### 3.5 Shared Components — EMPTY

The `components/shared/` directory has zero files. No reusable:
- TrustScoreBadge component
- AgentCard component
- ENSName component
- TrustBar component
- MessageBubble component
- EventRow component

### 3.6 Mobile Responsiveness — UNTESTED

The home page uses responsive grid classes (`grid-cols-1 md:grid-cols-2 lg:grid-cols-3`) but:
- No mobile nav (hamburger menu missing, links hidden at `md:flex`)
- No mobile-specific testing
- Footer may overflow on small screens

---

## 4. Prize Track Impact Analysis

### What Judges Need to SEE to Award Prizes

#### 0G ($15K — 2 tracks)

**What they need:** On-chain agent framework with iNFTs, AI verification visual

**Current state:** Contracts deployed, SDK built, but UI shows nothing. A judge visiting the live URL sees only static mock data.

**Critical gap:** TrustNFT visualization — the soulbound token with trust score breakdown. This is THE centerpiece for 0G tracks. Must show: totalTasks, completedTasks, avgRating, totalEarned as a visual trust gauge.

**Demo need:** An `/trust` page that reads from TrustNFT on Base Mainnet and displays real trust scores.

#### Gensyn ($10K — 1 track, but biggest single prize)

**What they need:** AXL as PRIMARY communication across SEPARATE nodes, real P2P

**Current state:** 2 Go AXL nodes running, TypeScript client built, integration tests pass. BUT zero visual proof.

**Critical gap:** The `/messages` page with real-time AXL message feed. Judges need to SEE messages flowing between Node A and Node B in real-time. This is the #1 differentiator for the $10K Gensyn prize.

**Demo need:** Real-time message feed that polls `/recv` on both AXL nodes, showing DISCOVER, TRUST_QUERY, SERVICE_REQUEST message types with peer IDs and timestamps.

#### ENS ($5K — 2 tracks)

**What they need:** ENS as identity mechanism, subname ecosystem

**Current state:** SDK built with Basenames on Base L2, but UI shows hardcoded `dataoracle.agenttrust.eth` strings.

**Critical gap:** ENS resolution happening LIVE. When a judge visits `/agents`, they should see agent names resolve from ENS records, not from a hardcoded array.

**Demo need:** `/agents` page that calls `sdk/ens.ts` to resolve agents and display their ENS text records (capabilities, endpoint, pricing, status).

#### Uniswap ($5K — 1 track)

**What they need:** Autonomous token swaps, FEEDBACK.md

**Current state:** SDK built with trust-gated swaps, FEEDBACK.md written (156 lines). BUT no swap UI.

**Critical gap:** Judges need to SEE a trust-gated swap happen. A button that says "Pay Agent 10 USDC" → shows quote → executes swap → shows tx hash.

**Demo need:** Trust-gated payment UI on agreement detail, showing Uniswap quote and execution.

#### KeeperHub ($5K — 2 tracks)

**What they need:** MCP integration, x402 payments, audit trail

**Current state:** MCP client built, KEEPERHUB_FEEDBACK.md written (112 lines). BUT no execution dashboard.

**Critical gap:** `/audit` page showing KeeperHub task execution logs with status, retry attempts, gas optimization data.

**Demo need:** Audit trail page pulling from KeeperHub MCP showing task history.

---

## 5. Live Demo Readiness Assessment

### Can You Demo Right Now? ❌ NO

If a judge visits the live URL today, they would see:
1. ✅ Professional-looking home page with mock data
2. ✅ Debug Contracts page (developer CRUD — impressive to technical judges)
3. ✅ Wallet connection via RainbowKit
4. ❌ Clicking "Agents" → 404
5. ❌ Clicking "Trust" → 404
6. ❌ Clicking "Messages" → 404
7. ❌ Clicking "Audit" → 404

**This is a showstopper for finalist selection.** The finalist track ($1K/team + perks) requires a live deployment that impresses judges.

### Minimum Viable Demo (MVD) Requirements

To deliver a winning demo in 3 days, you need AT MINIMUM:

1. **`/agents` page** — Reads from AgentRegistry, shows real agents with ENS names
2. **`/trust` page** — Reads from TrustNFT, shows trust score visualization
3. **`/messages` page** — Shows AXL message log (can be pre-populated)
4. **Home page with live data** — Replace `sampleAgents` with `useScaffoldReadContract`

### Nice-to-Have (Priority Order)

5. **`/audit` page** — On-chain event history
6. **Trust-gated payment UI** — Uniswap swap integration
7. **KeeperHub task dashboard** — Execution logs
8. **Mobile responsive nav** — Hamburger menu
9. **Demo walkthrough mode** — Guided 7-step flow

---

## 6. Critical Path to Winning

### Phase 1: Core Pages (Day 1 — MUST DO)

Build the 4 missing pages with real on-chain data:

1. `/agents/page.tsx` — `useScaffoldReadContract` on AgentRegistry
2. `/trust/page.tsx` — `useScaffoldReadContract` on TrustNFT
3. `/messages/page.tsx` — AXL message feed (API route + polling)
4. Fix home page — Replace `sampleAgents` with live data

**Estimated effort:** 4-6 hours with SE2 hooks

### Phase 2: Visual Proof (Day 2 — MUST DO)

Add sponsor-specific visual elements:

5. Trust score gauge component (0G + ENS proof)
6. AXL message type badges (Gensyn proof)
7. ENS name resolution display (ENS proof)
8. Uniswap swap button on agreement detail (Uniswap proof)
9. Audit trail table (KeeperHub proof)

**Estimated effort:** 4-6 hours

### Phase 3: Demo Polish (Day 3 — SHOULD DO)

10. Replace home page with live dashboard stats
11. Add mobile hamburger nav
12. Seed demo data via demo/scenario.ts
13. Record demo video using live UI (not terminal)
14. Deploy to Vercel

**Estimated effort:** 3-4 hours

---

## 7. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Can't wire on-chain reads in time | LOW | CRITICAL | SE2 hooks make this trivial — useScaffoldReadContract |
| AXL nodes not reachable from browser | MEDIUM | HIGH | Need API route proxy for CORS |
| No demo data to display | HIGH | CRITICAL | Run demo/scenario.ts first to seed on-chain data |
| Mobile layout breaks | MEDIUM | LOW | Skip mobile, optimize for laptop demo |
| Vercel deploy fails | LOW | HIGH | Test deploy early, have Akash backup |
| Judges can't connect wallet | MEDIUM | MEDIUM | Have pre-connected demo browser ready |

---

## 8. Strengths to Leverage

### What's Already Excellent

1. **Design system is competition-grade** — Stripe-level polish with custom CSS vars, shadows, typography
2. **SE2 hooks are plug-and-play** — `useScaffoldReadContract` makes on-chain reads trivial
3. **Contracts are deployed on Base Mainnet** — Real on-chain data exists
4. **All SDK modules are built** — Just need UI wrappers
5. **Debug page is a technical flex** — Shows judges the full contract CRUD
6. **Wallet UX works** — RainbowKit with custom purple theme
7. **Feedback docs are written** — FEEDBACK.md (156 lines), KEEPERHUB_FEEDBACK.md (112 lines)

### The Path to Victory

The backend is 95% complete. The frontend needs to be the WINDOW into that backend. Each page should make one sponsor track undeniable:

- `/agents` = ENS track undeniable
- `/trust` = 0G track undeniable  
- `/messages` = Gensyn track undeniable
- `/audit` = KeeperHub track undeniable
- Home = Uniswap + overall finalist track undeniable

---

## 9. Recommended Build Order for WP9

Based on prize value and visual impact:

| Priority | Page | Sponsor Value | Complexity | Est. Hours |
|----------|------|--------------|------------|------------|
| 1 | `/agents` | ENS $5K | Low (SE2 read hook) | 2h |
| 2 | Home fix (live data) | All tracks | Low (replace mock data) | 1h |
| 3 | `/trust` | 0G $15K | Medium (score visualization) | 3h |
| 4 | `/messages` | Gensyn $10K | High (API route + CORS proxy) | 4h |
| 5 | `/audit` | KeeperHub $5K | Medium (event history) | 3h |
| 6 | Uniswap swap UI | Uniswap $5K | High (swap flow) | 4h |

**Total estimated:** 17 hours over 3 days = ~6 hours/day. Tight but achievable.

---

## 10. Audit Conclusion

### Verdict: 🔴 HIGH RISK / HIGH REWARD

The project has exceptional backend infrastructure and design polish, but is currently **invisible to judges** because no sponsor integration proof exists in the UI. This is the classic hackathon trap: building great tech but failing to make it demonstrable.

**The good news:** SE2 hooks make on-chain reads trivial. The design system is competition-grade. All SDK modules exist and just need UI wrappers. With focused execution on WP9 over the next 3 days, this project can win $35K+.

**The bad news:** 4 pages need to be built from scratch, each wiring to different SDK modules. The AXL message feed requires API route proxy work. The Uniswap swap UI requires a full transaction flow.

**Recommendation:** Execute WP9 immediately with maximum priority. Use subordinates for parallel page development. Skip mobile optimization. Focus on laptop-demo-quality pages that make each sponsor track undeniable.

> **"If the judges can't see it, it didn't happen."** — Build the window into your backend.
