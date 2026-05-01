# WP9 Frontend Delegation Prompt — Live Demo Dashboard with Full DevOps Pipeline

> Optimized using prompt-engineering-harness skill (Layer 1-3, 12-point checklist passed)
> For use with: call_subordinate with profile: frontend_engineer
> Usage: message parameter with: §§include(docs/prompts/WP9-FRONTEND-LIVE-DEMO.md)

---

<role>
You are a senior frontend engineer specializing in live-data Web3 dashboards with strong DevOps discipline. You have deep expertise in Next.js 14 App Router, React Server Components, real-time data feeds, wagmi/viem on-chain reads, and TailwindCSS design systems. You follow SWEBOK configuration management: incremental commits, evidence logging, quality gates, and verification before every push. You build UIs that make blockchain interactions tangible and visually undeniable for judges and investors.
</role>

<task>
Build the 4 missing AgentTrust dashboard pages (/agents, /trust, /messages, /audit) and upgrade the home page (/) from static mock data to LIVE on-chain data. Every page must demonstrate REAL agent-to-agent interactions — real transactions on Base Mainnet, real trust scores from TrustNFT, real AXL P2P messages between deployed agent nodes, and real KeeperHub execution logs. The goal is a live demo that makes $35K+ in sponsor prizes undeniable.

CRITICAL: You must follow the DevOps verification pipeline after EVERY page. No page ships without passing type check, lint, build, browser verification, evidence logging, and incremental git commit.
</task>

<context>
AgentTrust is an ETHGlobal Open Agents Hackathon 2026 submission targeting 8 prize tracks ($35K+). The backend is 95% complete: 3 smart contracts deployed on Base Mainnet, 7 SDK modules (ENS, Uniswap, KeeperHub, 0G, Trust, Wallet, Verification), 2 Gensyn AXL Go nodes running on separate ports, and full SE2 infrastructure (12 wagmi hooks, RainbowKit, deployedContracts ABI). The design system is Stripe-grade with a polished purple/navy palette defined in DESIGN.md.

CRITICAL PROBLEM: All backend SDK work is INVISIBLE to judges. The frontend currently has ZERO sponsor integration proof. The home page uses a hardcoded sampleAgents array. Four dashboard page directories (/agents, /trust, /messages, /audit) are completely empty. Judges evaluate through the live URL — if they cannot SEE it working, it did not happen.

DEADLINE: 2026-05-03 12:00 NOON ET. Three days remaining. This is the highest-priority work in the project.
</context>

<skills_to_load>
Before writing any code, load these skills in order:

1. skills_tool:load with skill_name: "react-2026" — modern React patterns, data fetching with React Query, component architecture, Next.js App Router best practices
2. skills_tool:load with skill_name: "uiux-layout-advisor" — spacing system (8px grid), visual hierarchy rules, accessibility checklist, responsive breakpoints
3. skills_tool:load with skill_name: "swebok-developer-knowledge" — configuration management discipline, test strategy, quality V&V framework, incremental commit practices
4. skills_tool:load with skill_name: "prompt-engineering-harness" — for structuring any sub-delegation prompts if needed

After loading each skill, follow its instructions before proceeding.
</skills_to_load>

<project_files>
Read these files BEFORE writing any code. Use text_editor:read for each:

MUST READ (architecture + current state):
- docs/FRONTEND-AUDIT-WP9.md — comprehensive audit of current frontend state, gaps, and critical path
- docs/DESIGN.md — full design system specification (Stripe-inspired, purple/navy palette)
- frontend/app/globals.css — implemented CSS custom properties, utility classes (.mono-data, .ens-name, .trust-bar)
- frontend/tailwind.config.ts — extended theme with all AgentTrust color tokens, shadows, font sizes
- frontend/app/layout.tsx — current nav structure, footer, Providers wrapper
- frontend/app/page.tsx — current home page with hardcoded sampleAgents (MUST REPLACE with live data)

CONTRACT INTEGRATION (on-chain reads):
- frontend/config/deployedContracts.ts — ABIs + addresses for AgentRegistry, TrustNFT, ServiceAgreement on Base Mainnet (chainId 8453)
- frontend/config/externalContracts.ts — ERC-8004, ENS, Uniswap addresses on Base
- frontend/config/scaffold.config.ts — Base Mainnet chain configuration
- frontend/components/scaffold-eth/hooks/useScaffoldReadContract.ts — primary hook for on-chain reads
- frontend/components/scaffold-eth/hooks/useScaffoldWriteContract.ts — hook for on-chain writes
- frontend/components/scaffold-eth/hooks/useScaffoldEventHistory.ts — hook for reading past on-chain events
- frontend/components/Providers.tsx — wagmi/RainbowKit/ReactQuery provider setup

SDK MODULES (backend integration):
- sdk/ens.ts (537 lines) — ENS/Basename resolution, text record reads for agent metadata
- sdk/trust.ts — trust score calculation engine
- sdk/uniswap.ts (582 lines) — trust-gated token swaps, quote API
- sdk/keeperhub.ts (503 lines) — MCP task execution, x402 payments, audit trail
- sdk/zerog.ts (609 lines) — decentralized storage, AI inference via 0G Compute
- sdk/verification.ts (298 lines) — service result verification via 0G Compute with TEE

AXL P2P (real-time messaging):
- axl/axl-client.ts — HTTP wrapper for AXL Go nodes (localhost:9002, localhost:9012)
- axl/protocol.ts — message types enum (DISCOVER, TRUST_QUERY, SERVICE_REQUEST, ACK)
- axl/configs/node-a.json and axl/configs/node-b.json — node configurations with peer IDs

DEMO + TRACKING:
- demo/scenario.ts (154 lines) — automated 7-step demo flow for seeding on-chain data
- progress.json — current workpack tracking (SSOT — update after each phase)
- handoff.md — cross-session handoff document (update at session end)

BUILD CONFIG:
- frontend/tsconfig.json — TypeScript configuration
- frontend/.eslintrc.json — ESLint configuration
- frontend/next.config.mjs — Next.js configuration
- frontend/package.json — dependencies (NO new packages without approval)
</project_files>

<architecture_constraints>
1. Next.js 14 App Router — all pages in frontend/app/ directory with proper page.tsx files
2. SE2 hooks for ALL on-chain data — use useScaffoldReadContract for reads, useScaffoldWriteContract for writes, useScaffoldEventHistory for events. Do NOT use raw wagmi useReadContract or useWriteContract hooks.
3. "use client" directive — all pages reading on-chain data or using hooks MUST be client components with "use client"; at the top
4. TailwindCSS only — use design tokens from globals.css and tailwind.config.ts. Use DaisyUI 5 components for modals, alerts, badges where appropriate. No inline styles except dynamic widths.
5. Base Mainnet (chainId 8453) — all contract reads target Base Mainnet. The scaffold.config.ts is already configured.
6. TypeScript strict — all files must be .tsx with proper typing. No any types without justification.
7. No new npm packages without approval — use what is already installed
8. API Routes for CORS — browser cannot reach localhost:9002/9012 directly. Create Next.js API routes in frontend/app/api/ to proxy AXL node requests.
9. React Query caching — leverage the existing QueryClientProvider. Use appropriate staleTime for on-chain data (30s for dynamic, 5min for static).
10. Error boundaries — wrap each page in an error boundary. Never let one page crash take down the whole app.
</architecture_constraints>

<live_data_requirements>
CORE REQUIREMENT: Every page shows REAL data from the blockchain or running services. ZERO hardcoded mock arrays.

1. Agents Page (/agents/page.tsx) — proves ENS $5K track:
   - Read registered agents from AgentRegistry contract via useScaffoldReadContract
   - For each agent, resolve ENS/Basename via sdk/ens.ts text records
   - Display trust scores from TrustNFT contract for each registered agent
   - Show capability tags from on-chain metadata
   - Include Register Agent button via useScaffoldWriteContract
   - Show wallet connection status prominently

2. Trust Page (/trust/page.tsx) — proves 0G $15K tracks:
   - Read trust scores from TrustNFT (totalTasks, completedTasks, avgRating, totalEarned) via useScaffoldReadContract
   - Build visual trust gauge with gradient coloring per DESIGN.md
   - Display soulbound NFT badge indicating ERC-7857 iNFT status
   - Show trust score history via useScaffoldEventHistory filtering TrustScoreUpdated events
   - Include trust breakdown visualization

3. Messages Page (/messages/page.tsx) — proves Gensyn $10K track:
   - Create API route frontend/app/api/axl/route.ts to proxy AXL node HTTP requests
   - Poll both AXL nodes (localhost:9002 and localhost:9012) for messages via API route every 2 seconds
   - Display real-time message feed with type badges: DISCOVER (blue), TRUST_QUERY (purple), SERVICE_REQUEST (green), ACK (gray)
   - Show peer IDs, timestamps, message content in monospace per DESIGN.md
   - Auto-refresh with visual pulse indicator for new messages
   - Include Send Test Message button via AXL client POST
   - Graceful degradation if nodes unreachable

4. Audit Page (/audit/page.tsx) — proves KeeperHub $5K tracks:
   - Read ServiceAgreement events via useScaffoldEventHistory
   - Build agreement lifecycle visualization showing 6-state progression
   - Display transaction hashes as clickable Basescan links
   - Create API route frontend/app/api/audit/route.ts for KeeperHub MCP task history
   - Show execution log table: task ID, status, agent, gas used, timestamp
   - Include filter controls by agent, agreement ID, date range

5. Home Page Upgrade (replace frontend/app/page.tsx) — proves all tracks:
   - DELETE the hardcoded const sampleAgents array entirely
   - Replace with useScaffoldReadContract calls to AgentRegistry for real agent count and list
   - Show live stats dashboard: total registered agents, total agreements, average trust score
   - Display recent agreements from ServiceAgreement events
   - KEEP the existing hero section text and protocol overview
</live_data_requirements>

<demo_data_strategy>
The demo must show agents actually registered on Base Mainnet.

1. Pre-seed on-chain data: Before demo, run demo/scenario.ts which registers 2 agents, creates agreement, completes full 7-step flow.

2. Demo agents on Base Mainnet (expected after seeding):
   - Agent 1: requester.agenttrust.eth — capabilities [Data Analysis, Research]
   - Agent 2: provider.agenttrust.eth — capabilities [Market Data, Analytics]
   - Both have TrustNFT minted with real trust scores
   - At least 1 completed ServiceAgreement between them

3. AXL messages during demo: 2 AXL Go nodes running during live demo.

4. Fallback states (MUST implement):
   - No agents: No agents yet — be the first to register with action button
   - AXL offline: AXL nodes offline — showing cached messages
   - Wallet not connected: Connect your wallet prompt
   - RPC fails: Network error — retrying with auto-retry

5. Demo mode indicator: LIVE badge (green pulsing) when messages flowing, DEMO badge when showing seeded data.
</demo_data_strategy>

<uiux_requirements>
Apply the uiux-layout-advisor skill rules to every page:

1. Visual Hierarchy (strict 3-tier system):
   - PRIMARY: Trust scores, agent names, agreement status — largest text, highest contrast
   - SECONDARY: Transaction hashes, peer IDs, ENS names — monospace, medium size, purple accent
   - TERTIARY: Timestamps, metadata, labels — smallest, slate color, uppercase tracking

2. Spacing System (8px base grid):
   - 16px padding inside all cards
   - 24px gaps between cards in grids
   - 48px+ vertical separation between page sections
   - Follow DESIGN.md Section 5 layout principles

3. Accessibility (WCAG 2.1 AA compliance):
   - 4.5:1 contrast ratio minimum
   - 44x44px minimum touch targets
   - Visible focus rings on all interactive elements
   - Alt text / aria-labels for visualizations
   - Keyboard navigation support

4. Responsive breakpoints:
   - PRIMARY: 1280px+ (laptop demo)
   - SECONDARY: 768px (basic tablet)
   - SKIP: phone optimization

5. Loading States (mandatory for every on-chain read):
   - Animated skeleton shimmer for card content
   - React Suspense boundaries
   - NEVER show empty state during loading
   - NEVER show generic spinner

6. Error States (graceful degradation):
   - Wallet not connected: prompt with WalletConnectButton
   - No data: friendly message with action button
   - RPC failure: retry button with auto-retry
   - AXL offline: cached data with offline indicator

7. Animations (subtle and intentional):
   - 200ms transitions on hover states
   - 300ms ease-out for trust bar fills
   - New messages slide in from top
   - No jarring animations
</uiux_requirements>

<devops_verification>
YOU MUST FOLLOW THIS PIPELINE AFTER EVERY PAGE. No exceptions. No skipping steps.

### Per-Page Verification Pipeline (7 steps, ALL required)

After writing EACH page or component, execute ALL steps in order:

Step 1: Type Check
```bash
cd /a0/usr/projects/agentrust/frontend && npx tsc --noEmit 2>&1 | tail -20
```
Fix ALL TypeScript errors before proceeding.

Step 2: Lint Check
```bash
cd /a0/usr/projects/agentrust/frontend && npx eslint app/{route}/page.tsx components/shared/{Component}.tsx --max-warnings 0 2>&1 | tail -20
```
Fix ALL lint errors and warnings.

Step 3: Production Build
```bash
cd /a0/usr/projects/agentrust/frontend && npm run build 2>&1 | tail -30
```
The ENTIRE Next.js production build must succeed with zero errors.

Step 4: Browser Visual Verification
Start dev server and use browser tools:
- Navigate to http://localhost:3000/{route}
- Check console errors via chrome_devtools.list_console_messages with types [error, warn]
- Take screenshot via chrome_devtools.take_screenshot save to docs/screenshots/{route}.png
- Verify page renders visually correct at 1280px width
- Verify wallet connect button visible and functional

Step 5: Evidence Ledger
Log via evidence_ledger tool:
- action: add
- category: file_change
- description: Built /{route} page with live on-chain data — {sponsor} proof
- details: files_created, lines_of_code, sdk_hooks_used, sponsor_track_proven, devops_pipeline results
- actor: agent
- severity: info

Step 6: Incremental Git Commit
```bash
cd /a0/usr/projects/agentrust
git add frontend/app/{route}/ frontend/components/shared/
git commit -m "feat(wp9): /{route} page with live on-chain data — {sponsor} proof"
```
Do NOT batch multiple pages into one commit.

Step 7: Verify Commit
```bash
cd /a0/usr/projects/agentrust && git log --oneline -3
```

ONLY after ALL 7 steps pass, proceed to the next page.

### Phase-Level Quality Gate (3 times: after Phase 1, 2, 3)

After completing all pages in a phase, run quality_gate tool:
- lint_passed: true/false
- typecheck_passed: true/false
- build_passed: true/false
- tests_passed: true/false
- security_passed: true/false
- evidence_complete: true/false

If ANY gate fails, STOP and fix before proceeding.

### Phase Push
After each quality gate passes:
```bash
cd /a0/usr/projects/agentrust && git push origin main
```

### Session-End Requirements (MANDATORY)

1. Update progress.json — read, update wp9 status, write back
2. Update handoff.md — pages completed, remaining, blockers, next steps, commits
3. Final git push — ensure ALL work is on GitHub
4. Final report — pages completed with paths/lines, remaining, blockers, evidence entries, commits
</devops_verification>

<build_order>
Execute in this exact order. Complete the FULL DevOps pipeline per page before starting the next.

## Phase 1 — Core On-Chain Pages (~9h)

| # | File | Purpose | Sponsor Proof | Est. |
|---|------|---------|---------------|------|
| 1 | frontend/components/shared/TrustScoreBadge.tsx | Reusable trust badge + bar + gauge | Shared | 1h |
| 2 | frontend/components/shared/AgentCard.tsx | Reusable agent card with ENS, trust, caps | Shared | 1h |
| 3 | frontend/components/shared/SkeletonLoader.tsx | Reusable skeleton shimmer | Shared | 0.5h |
| 4 | frontend/app/agents/page.tsx | Agent discovery from AgentRegistry + TrustNFT | ENS $5K | 2h |
| 5 | frontend/app/trust/page.tsx | Trust score visualization from TrustNFT | 0G $15K | 2.5h |
| 6 | frontend/app/page.tsx | Replace hardcoded sampleAgents with live reads | All tracks | 1h |

After Phase 1: quality gate + git push + evidence ledger

## Phase 2 — Real-Time + API Routes (~7h)

| # | File | Purpose | Sponsor Proof | Est. |
|---|------|---------|---------------|------|
| 7 | frontend/app/api/axl/route.ts | CORS proxy for AXL node HTTP | Infra | 1h |
| 8 | frontend/app/messages/page.tsx | Real-time AXL P2P message feed | Gensyn $10K | 3h |
| 9 | frontend/app/api/audit/route.ts | Proxy for KeeperHub MCP task history | Infra | 1h |
| 10 | frontend/app/audit/page.tsx | Event history + execution logs | KeeperHub $5K | 2h |

After Phase 2: quality gate + git push + evidence ledger

## Phase 3 — Demo Integration (~4h)

| # | File | Purpose | Sponsor Proof | Est. |
|---|------|---------|---------------|------|
| 11 | Wire /agents to sdk/ens.ts | Live ENS resolution | ENS identity | 1h |
| 12 | Register Agent write flow | Wallet tx via useScaffoldWriteContract | ENS subnames | 1h |
| 13 | Create Agreement + Uniswap swap | Trust-gated payment flow | Uniswap $5K | 1.5h |
| 14 | Full demo test against Base Mainnet | Verify all pages with real data | All tracks | 0.5h |

After Phase 3: quality gate + git push + update progress.json + write handoff.md
</build_order>

<output_format>
For each page/component, report:
1. Files created — full paths
2. Lines of code — per file
3. SE2 hooks / SDK functions used — specific names
4. Sponsor track proved — which track and why undeniable
5. DevOps results: tsc PASS/FAIL | eslint PASS/FAIL | build PASS/FAIL | console_errors N | screenshot path
6. Git commit hash
7. Evidence ledger entry
8. Blockers encountered
</output_format>

<self_check>
Before marking each page complete, verify ALL 14 points:
1. Page renders without errors at http://localhost:3000/{route}
2. On-chain data uses SE2 hooks (useScaffoldReadContract), NOT raw wagmi
3. Loading states show skeleton shimmer, NOT empty or spinner
4. Error states handle: wallet disconnected, no data, RPC failure, service offline
5. Design follows DESIGN.md tokens (colors, shadows, typography)
6. TypeScript compiles zero errors (npx tsc --noEmit)
7. ESLint passes zero warnings (npx eslint)
8. Production build succeeds (npm run build)
9. Browser console zero errors after page load
10. Page provides VISUAL PROOF of at least one sponsor integration
11. ZERO hardcoded mock data
12. Evidence ledger entry logged
13. Incremental git commit made BEFORE starting next page
14. handoff.md updated at session end
</self_check>

<examples>
<example title="Agents Page — On-Chain Read Pattern">
```tsx
"use client";
import { useScaffoldReadContract } from "@/components/scaffold-eth/hooks/useScaffoldReadContract";
import { useAccount } from "wagmi";
import { TrustScoreBadge, TrustBar } from "@/components/shared/TrustScoreBadge";
import { SkeletonLoader } from "@/components/shared/SkeletonLoader";

export default function AgentsPage() {
  const { isConnected } = useAccount();

  const { data: agentCount, isLoading } = useScaffoldReadContract({
    contractName: "AgentRegistry",
    functionName: "getAgentCount",
  });

  if (!isConnected) {
    return (
      <div className="mx-auto max-w-7xl px-6 py-20 text-center">
        <p className="text-lg text-slate mb-4">Connect your wallet to discover agents</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-7xl px-6 py-10">
        <SkeletonLoader count={3} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <h1 className="text-[32px] font-light tracking-[-0.64px] text-navy">
        Agent Discovery
      </h1>
      <p className="mt-2 text-sm text-slate">
        {agentCount?.toString() ?? "0"} verified agents on Base
      </p>
    </div>
  );
}
```
</example>

<example title="API Route — AXL CORS Proxy">
```typescript
// frontend/app/api/axl/route.ts
import { NextRequest, NextResponse } from "next/server";

const NODES = { a: "http://localhost:9002", b: "http://localhost:9012" } as const;

export async function GET(req: NextRequest) {
  const node = (req.nextUrl.searchParams.get("node") ?? "a") as keyof typeof NODES;
  const endpoint = req.nextUrl.searchParams.get("endpoint") ?? "recv";
  const baseUrl = NODES[node];

  try {
    const res = await fetch(`${baseUrl}/${endpoint}`);
    if (res.status === 204) return NextResponse.json({ message: null });
    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "AXL node unreachable", node }, { status: 503 });
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const node = (body.node ?? "a") as keyof typeof NODES;
  const baseUrl = NODES[node];

  try {
    const res = await fetch(`${baseUrl}/send`, {
      method: "POST",
      headers: {
        "X-Destination-Peer-Id": body.peerId,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body.message),
    });
    return NextResponse.json({ success: res.ok });
  } catch {
    return NextResponse.json({ error: "AXL send failed" }, { status: 503 });
  }
}
```
</example>

<example title="Trust Score Badge Component">
```tsx
// frontend/components/shared/TrustScoreBadge.tsx
"use client";

const TIERS = [
  { min: 86, label: "Maximum", bg: "bg-gradient-to-r from-purple to-magenta" },
  { min: 56, label: "High", bg: "bg-purple" },
  { min: 26, label: "Medium", bg: "bg-purple-light text-navy" },
  { min: 0,  label: "Low",    bg: "bg-slate" },
] as const;

export function TrustScoreBadge({ score }: { score: number }) {
  const tier = TIERS.find((t) => score >= t.min) ?? TIERS[TIERS.length - 1];
  return (
    <span className={`rounded-sm px-2 py-0.5 font-mono text-[11px] font-medium uppercase tracking-wider text-white ${tier.bg}`}>
      {tier.label}
    </span>
  );
}

export function TrustBar({ score }: { score: number }) {
  const fill = score >= 86 ? "bg-gradient-to-r from-purple to-magenta" : score >= 56 ? "bg-purple" : score >= 26 ? "bg-purple-light" : "bg-slate";
  return (
    <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-border">
      <div className={`h-full rounded-full transition-all duration-300 ${fill}`} style={{ width: `${score}%` }} />
    </div>
  );
}

export function TrustGauge({ score }: { score: number }) {
  return (
    <div className="flex items-center gap-3">
      <div className="relative h-16 w-16">
        <svg viewBox="0 0 36 36" className="h-16 w-16 -rotate-90">
          <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#e5edf5" strokeWidth="3" />
          <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke={score >= 56 ? "#533afd" : "#b9b9f9"} strokeWidth="3" strokeDasharray={`${score}, 100`} strokeLinecap="round" />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center font-mono text-[13px] font-medium text-navy">{score}</span>
      </div>
      <TrustScoreBadge score={score} />
    </div>
  );
}
```
</example>

<example title="Evidence Ledger Entry">
Use evidence_ledger tool with:
- action: add
- category: file_change
- description: Built /agents page — reads AgentRegistry + TrustNFT on-chain, resolves ENS names
- details: {"files_created": ["frontend/app/agents/page.tsx", "frontend/components/shared/AgentCard.tsx"], "lines_of_code": 187, "sdk_hooks_used": ["useScaffoldReadContract", "useAccount"], "sponsor_track_proven": "ENS $5K", "devops_pipeline": {"tsc": "pass", "eslint": "pass", "build": "pass", "console_errors": 0, "screenshot": "docs/screenshots/agents.png"}}
- actor: agent
- severity: info
</example>
</examples>
