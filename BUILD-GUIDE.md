# AgentTrust — Cross-Tool Build Guide

> **Single reference for building AgentTrust across Agent Zero, Windsurf, GitHub Copilot, and Codex.**
> **Design system:** Stripe-inspired, defined in `DESIGN.md`
> - **Gensyn AXL Research:** `docs/reference/gensyn-axl-deep-research.md`
> **Last updated:** 2026-04-26

---

## AUDIT SUMMARY (2026-04-26)

| Area | Status | Details |
|------|--------|---------|
| Git repo | 11 commits | All scaffold/placeholder - no real dev work yet |
| Contracts | REAL code | AgentRegistry (149L), TrustNFT (205L), ServiceAgreement (213L) |
| Contract tests | REAL tests | AgentRegistry.t.sol (116L), TrustNFT.t.sol (128L), ServiceAgreement.t.sol (147L) |
| Deploy script | STUB | Deploy.s.sol (25L) - needs real deployment logic |
| SDK modules | REAL code | ens.ts (56L), keeperhub.ts (74L), trust.ts (78L), uniswap.ts (80L), zerog.ts (59L) |
| AXL modules | SKELETON (needs rewrite) | protocol.ts ✅ (89L), node-config.ts ❌ (needs AXLClient), trust-verify.ts ⚠️ (needs on-chain), message-handler.ts ⚠️ (needs polling). See docs/reference/gensyn-axl-deep-research.md |
| **DESIGN.md** | **DONE** | **1051 lines - Stripe design system with Tailwind config + agent prompts** |
| **stripe-preview.html** | **DONE** | **803 lines - visual reference** |
| Frontend | EMPTY | Only .gitkeep files, no package.json |
| Foundry | NOT installed | forge command not found in Agent Zero |
| Node deps | NOT installed | No node_modules |
| Uncommitted | 5 modified + 7 untracked | Includes DESIGN.md, BUILD-GUIDE.md, stripe-preview.html |
| progress.json | All 12 pending | 0 sessions completed |

**Bottom line:** Code exists but has NEVER been compiled, tested, or typechecked. No real dev has started.

---

## ASE HARNESS SESSION RULES (Critical - Read Before Every Session)

### The 30% Context Cap
Agent Zero has a finite context window. Once you exceed ~30%, quality degrades fast.
**If you feel the conversation getting long or complex, STOP and start a new chat.**

**Warning signs you are approaching 30%:**
- The agent has made 8-10+ tool calls in this session
- You have loaded/submitted multiple large files
- The agent seems to be repeating itself or losing focus
- More than 20 minutes of back-and-forth

**What to do when approaching 30%:**
1. Tell the agent: `Wrap up this session. Commit all work. Update progress.json. Generate handoff.md.`
2. The agent will run `/reflect` to generate handoff.md
3. Start a **new chat** with the session entry prompt
4. The new session picks up from progress.json automatically

### When to Start a New Chat
| Situation | Action |
|-----------|--------|
| Workpack complete | Start new chat for next workpack |
| Approaching 30% context | Wrap up, commit, /reflect, new chat |
| Agent seems confused/looping | New chat immediately (context is polluted) |
| Switching to a different tool (Windsurf/Copilot) | Commit, push, switch |
| After a human gate approval | New chat to continue cleanly |
| Between workpacks | Always new chat |

### Slash Commands (Use During Sessions)
| Command | When to Use | What It Does |
|---------|-------------|--------------|
| `/audit` | After writing contracts or critical SDK code | Runs code review against Cyfrin Solidity standards + code-review-skill |
| `/reflect` | **End of EVERY session** | Generates handoff.md with what was done, what is next, issues found |
| `/workpack` | Alternative session start | Auto-generates workpack from goal |
| `/diagram` | During architecture discussions | ASCII state machine visualization |

### Incremental Commit Cadence
**ETHGlobal requires small, incremental commits. No batch pushes.**

| When | Commit Message Format |
|------|-----------------------|
| After each subordinate completes a task | `feat(contracts): AgentRegistry.sol registration logic` |
| After tests pass | `test(contracts): AgentRegistry fuzz tests passing` |
| After fixing a bug | `fix(sdk): ens.ts resolution edge case` |
| After each frontend component | `feat(frontend): agent discovery page` |
| Every 30-60 minutes of active work | Whatever was just completed |
| At end of session | `chore: update progress.json, handoff for workpack N` |

**Never leave a session without committing.** If Agent Zero crashes, uncommitted work is lost.

### The Full Session Lifecycle
```
1. START: New chat with session entry prompt
2. LOAD: Agent reads progress.json -> BUILD-PLAN.md -> SKILL-PROFILE-MAP.md
3. DELEGATE: Agent calls subordinate for heavy work (saves YOUR context)
   - Subordinate gets FRESH context (full window)
   - Include skill loading instructions in every subordinate call
   - Each subordinate does ONE focused task
4. VERIFY: Run tests, compile, check design compliance
5. REVIEW: Run /audit on contracts and critical code
6. COMMIT: Small incremental commits (every task completion)
7. GATE: If human gate needed, use human_gate tool with break_loop=true
8. UPDATE: Update progress.json with results
9. REFLECT: Run /reflect to generate handoff.md
10. HANDOFF: Tell user "Session complete. Start new chat to continue."
11. NEW CHAT: User starts new chat -> cycle repeats from step 1
```

### Subordinate Delegation (Preserves Context)
Every heavy task should be delegated to a subordinate. This is HOW you stay under 30%.

**Template for every subordinate call:**
```
You are working on AgentTrust (ETHGlobal Open Agents Hackathon 2026).
Repo: /a0/usr/workdir/agenttrust

## Your Task
[specific task - ONE thing only]

## Skills to Load First
Before writing any code, load these skills:
1. skills_tool:load with skill_name "solidity" (if Solidity)
2. skills_tool:load with skill_name "code-review-skill"

Then follow all instructions from the loaded skill(s).

## Standards
- Custom errors with ContractName__ prefix
- No 'any' types, proper interfaces
- 300 lines max per file

## Files to Read
- Read BUILD-PLAN.md workpack [N] for full spec
- Read only the files you need to modify

## Output
- Write code to correct file paths
- Run verification (forge test, tsc, etc.)
- Report: files changed, test results, issues
```

**Key profiles to use (from SKILL-PROFILE-MAP.md):**
- `web3_engineer` — Solidity contracts, Foundry
- `frontend_engineer` — React, Next.js, browser testing
- `backend_engineer` — TypeScript, APIs, SDKs
- `qa_engineer` — Test writing, coverage
- `researcher` — SDK analysis, docs research

---

## THE DESIGN SYSTEM (Read First)

The Stripe design system is defined in **`DESIGN.md`** at the project root. Every tool must read this file before building UI.

### Key Design Tokens
- **Primary:** Stripe Purple `#533afd`, Navy `#061b31`, Slate `#64748d`
- **Font:** Sohne/SF Pro Display (primary), Source Code Pro (mono for on-chain data)
- **Cards:** White bg, 6px radius, subtle shadow, hover elevation
- **Buttons:** Primary (purple bg), Ghost (purple border), 4px radius
- **Trust gradient:** Slate (low) -> Purple-light (mid) -> Purple (high)
- **Tailwind config:** In DESIGN.md Appendix, copy to `frontend/tailwind.config.ts`

### Visual Reference
Open `docs/reference/stripe-preview.html` in a browser to see all tokens rendered.

---

## STEP 0: BOOTSTRAP (5 minutes, Agent Zero only)

**Do this ONCE before any other work.**

### 0A. Install Foundry
```bash
curl -L https://foundry.paradigm.xyz | bash
source /root/.bashrc
foundryup
```

### 0B. Install Node Dependencies
```bash
cd /a0/usr/workdir/agenttrust && npm install
```

### 0C. Baseline Compile + Test
```bash
cd contracts && forge build && forge test -vvv
cd .. && npx tsc --noEmit
```

### 0D. Commit Everything
```bash
git add -A
git commit -m "chore: bootstrap - design system, planning docs, integration guides"
git push origin main
```

**After Step 0:** You know what compiles, what fails, and have a clean git state.

---

## STEP 1: EXECUTE WORKPACKS (The Build)

Each workpack is a session. Follow the prompts below for your tool.

### Workpack Order and Dependencies

```
WP0 (SE2 Frontend)  -->  WP9 (Dashboard)
WP1 (AgentRegistry)  
WP2 (TrustNFT)       >--> WP4 (Deploy)
WP3 (ServiceAgreement)/
WP5 (AXL Setup)      
WP6 (Agents + ENS)   --> WP7 (Uniswap + KeeperHub) --> WP8 (0G + Wallet)
All ---------------------> WP10 (Demo + Submit)
All ---------------------> WP11 (Triple-Layer Deploy)
```

### Which Tool for Which Workpack

| Workpack | Best Tool | Why |
|----------|-----------|-----|
| 0 SE2 Frontend | **Agent Zero** | Needs browser verification |
| 1 AgentRegistry | **Windsurf/Copilot** | Pure Solidity, fast iteration |
| 2 TrustNFT | **Windsurf/Copilot** | Pure Solidity |
| 3 ServiceAgreement | **Windsurf/Copilot** | Pure Solidity |
| 4 Deploy Script | **Agent Zero** | Human gate required |
| 5 Gensyn AXL | **Codex/Windsurf** | TypeScript SDK |
| 6 Agents + ENS | **Codex/Windsurf** | TypeScript |
| 7 Uniswap + KeeperHub | **Codex/Windsurf** | TypeScript SDK |
| 8 0G + Wallet | **Codex/Windsurf** | TypeScript SDK |
| 9 Frontend Dashboard | **Agent Zero** | Needs browser + DESIGN.md |
| 10 Demo + Submit | **Agent Zero** | Human gate required |
| 11 Triple-Layer Deploy | **Agent Zero** | Deployment orchestration |

---

## PROMPTS FOR EACH TOOL

### Agent Zero Prompts

#### Starting ANY session:
```
Read and execute the next incomplete workpack from BUILD-PLAN.md. Load progress from progress.json first.
```

#### Workpack 0 (SE2 Frontend - must reference DESIGN.md):
```
Read and execute the next incomplete workpack from BUILD-PLAN.md. Load progress from progress.json first.
IMPORTANT: Read DESIGN.md before building any UI. All frontend components must follow the Stripe design system defined in DESIGN.md.
The TailwindCSS config is in DESIGN.md Appendix. Use those exact color tokens, font families, and component styles.
```

#### Workpack 9 (Frontend Dashboard - must reference DESIGN.md):
```
Read and execute the next incomplete workpack from BUILD-PLAN.md. Load progress from progress.json first.
CRITICAL: Read DESIGN.md before starting. Every page and component must match the Stripe design system.
Use the ready-to-use prompts from DESIGN.md Section 8 (Agent Prompt Guide) to build each component.
Components: AgentCard, TrustScoreBar, MessageLog, TransactionFeed, Navigation.
```

#### Workpack 4 (Deploy - human gate):
```
Read and execute workpack 4 from BUILD-PLAN.md. This requires a human gate before deployment.
Do NOT deploy without explicit approval.
```

#### Workpack 10 (Demo + Submit - human gate):
```
Read and execute workpack 10 from BUILD-PLAN.md. This requires human gate for final submission.
Do NOT submit without explicit approval.
```

---

### Windsurf Prompts

#### Starting ANY workpack:
```
I'm working on AgentTrust (ETHGlobal Open Agents Hackathon 2026).
Repo: /path/to/agenttrust

Read progress.json to see the current state.
The next workpack is [N]. Read that section from BUILD-PLAN.md.

Execute all tasks for workpack [N]. Follow the verification checklist.
Update progress.json when done (set status to "completed", add timestamp).
Commit incrementally every 30-60 minutes.
```

#### For Solidity contracts (Workpacks 1-3):
```
I'm working on AgentTrust (ETHGlobal Open Agents Hackathon 2026).
Read progress.json and BUILD-PLAN.md workpack [N].

Standards to follow:
- Custom errors with ContractName__ prefix
- ReentrancyGuardTransient, Ownable2Step
- Fuzz tests with branching tree technique
- No require() statements, use revert with custom errors
- Strict pragma for contracts, floating for tests
- Security contact in natspec

Read the existing contract code first, then enhance/complete it.
Run forge build && forge test after changes.
Commit incrementally. Update progress.json when done.
```

#### For TypeScript SDK (Workpacks 5-8):
```
I'm working on AgentTrust (ETHGlobal Open Agents Hackathon 2026).
Read progress.json and BUILD-PLAN.md workpack [N].

Standards:
- No 'any' types, proper interfaces
- JSDoc comments on all exports
- 300 lines max per file
- Run npx tsc --noEmit after changes

Read the existing SDK code first, then enhance/complete it.
Commit incrementally. Update progress.json when done.
```

#### For Frontend (if doing UI work in Windsurf):
```
I'm working on AgentTrust (ETHGlobal Open Agents Hackathon 2026).
Read progress.json and BUILD-PLAN.md workpack [N].

CRITICAL: Read DESIGN.md before building any UI.
All components must follow the Stripe design system.
Use the TailwindCSS config from DESIGN.md Appendix.
Use the ready-to-use component prompts from DESIGN.md Section 8.

Commit incrementally. Update progress.json when done.
```

---

### GitHub Copilot (VS Code) Prompts

#### Starting ANY workpack:
```
@workspace Read progress.json and BUILD-PLAN.md workpack [N].
Implement all tasks for this workpack. Follow the verification checklist.
Commit when done. Update progress.json with status "completed".
```

#### For Solidity contracts:
```
@workspace Read progress.json, BUILD-PLAN.md workpack [N], and the existing contracts/src/*.sol files.
Enhance the contracts following Cyfrin Solidity standards:
- Custom errors with ContractName__ prefix
- ReentrancyGuardTransient, Ownable2Step
- Fuzz tests, branching tree technique
- No require() - use revert with custom errors
Run forge build && forge test.
```

#### For Frontend UI:
```
@workspace Read DESIGN.md first. Then read BUILD-PLAN.md workpack [N].
Build all components following the Stripe design system tokens from DESIGN.md.
Use the TailwindCSS config from DESIGN.md Appendix.
```

---

### Codex (OpenAI) Prompts

#### Starting ANY workpack:
```
Clone https://github.com/ToXMon/agenttrust.
Read progress.json and BUILD-PLAN.md.
Execute workpack [N]. Commit incrementally.
Update progress.json when done.
```

#### For TypeScript SDK:
```
Clone https://github.com/ToXMon/agentrust.
Read progress.json, BUILD-PLAN.md workpack [N], and existing sdk/*.ts files.
Standards: No 'any' types, JSDoc on exports, 300 lines max per file.
Complete the SDK modules. Run npx tsc --noEmit.
Commit incrementally. Update progress.json when done.
```

---

## PARALLEL WORK STRATEGY

You can run 2-3 workpacks simultaneously:

### Track A: Contracts (Windsurf or Copilot)
Branch: `wp1-contracts`
```bash
git checkout -b wp1-contracts
```
Execute Workpacks 1 -> 2 -> 3 sequentially on this branch.

### Track B: SDK + AXL (Codex or second Windsurf tab)
Branch: `wp5-sdk`
```bash
git checkout -b wp5-sdk
```
Execute Workpacks 5 -> 6 -> 7 -> 8 sequentially on this branch.

### Track C: Frontend (Agent Zero only)
Branch: `main`
Workpack 0 must complete before Workpack 9.

### Merging Parallel Branches
```bash
# After Track A completes
git checkout main
git merge wp1-contracts
# Resolve any conflicts
git push origin main

# After Track B completes
git checkout main
git merge wp5-sdk
# Resolve any conflicts
git push origin main
```

---

## HANDOFF PROTOCOL

### Switching FROM Agent Zero TO Windsurf/Copilot/Codex:
1. In Agent Zero: commit and push all changes
2. Update progress.json with current workpack status
3. In the other tool: `git pull origin main`
4. Start with the appropriate prompt from above

### Switching FROM Windsurf/Copilot/Codex TO Agent Zero:
1. In the other tool: commit, push, update progress.json
2. In Agent Zero new chat: `Read and execute the next incomplete workpack from BUILD-PLAN.md. Load progress from progress.json first.`

### The Golden Rule:
**progress.json + BUILD-PLAN.md + git log = single source of truth**
Every tool reads the same files. Every tool commits to the same repo.

---

## COMMIT CONVENTIONS

```
feat(contracts): AgentRegistry.sol with ENS registration
feat(sdk): uniswap.ts trust-gated swap integration
feat(axl): protocol.ts message schema
feat(frontend): agent discovery page with Stripe design
test(contracts): AgentRegistry fuzz tests
chore(setup): install foundry + npm deps
docs(design): DESIGN.md Stripe design system
docs(feedback): FEEDBACK.md Uniswap integration notes
```

ETHGlobal requires incremental commits every 30-60 minutes. No batch pushes.

---

## WORKPACK COMPLETION CHECKLIST

For EVERY workpack, before marking complete:
- [ ] Code compiles (forge build / tsc --noEmit / npm run build)
- [ ] Tests pass (forge test / npm test)
- [ ] UI follows DESIGN.md (if frontend workpack)
- [ ] progress.json updated (status: completed, timestamp)
- [ ] Git committed with proper message
- [ ] Git pushed to origin

---

## FILES THAT PERSIST STATE

| File | Purpose | Updated By |
|------|---------|------------|
| `progress.json` | SSOT for workpack status | Every tool |
| `BUILD-PLAN.md` | Task specs per workpack | Rarely changed |
| `DESIGN.md` | Stripe design system | Rarely changed |
| `BUILD-GUIDE.md` | This file - cross-tool instructions | Rarely changed |
| `handoff.md` | Session handoff notes | Agent Zero |
| `FEEDBACK.md` | Uniswap sponsor feedback | Workpack 7 |
| `KEEPERHUB_FEEDBACK.md` | KeeperHub feedback | Workpack 7 |
| `AI_USAGE.md` | AI tool disclosure | Throughout |

---

## RECOMMENDED 8-DAY SCHEDULE

| Day | Workpack | Tool | Focus |
|-----|----------|------|-------|
| 1 | Step 0 (bootstrap) + WP0 | Agent Zero | Foundry install, npm install, SE2 frontend foundation |
| 2 | WP1 + WP2 | Windsurf | AgentRegistry + TrustNFT contracts |
| 3 | WP3 + WP4 | Windsurf -> Agent Zero | ServiceAgreement + deploy (gate) |
| 4 | WP5 + WP6 | Codex | Gensyn AXL + Agents/ENS |
| 5 | WP7 + WP8 | Codex | Uniswap/KeeperHub + 0G/Wallet |
| 6 | WP9 | Agent Zero | Frontend dashboard with DESIGN.md |
| 7 | WP10 | Agent Zero | Demo scenario + video (gate) |
| 8 | WP11 | Agent Zero | Triple-layer deploy |

---

## TROUBLESHOOTING

### forge not found
```bash
curl -L https://foundry.paradigm.xyz | bash && source ~/.bashrc && foundryup
```

### npm install fails
```bash
node --version  # Must be 20+
rm -rf node_modules package-lock.json && npm install
```

### TypeScript errors
```bash
npx tsc --noEmit 2>&1 | head -30
```

### Forge test failures
```bash
cd contracts && forge test -vvvv
```

### Design not matching
```bash
# Re-read DESIGN.md and check tailwind.config.ts matches the Appendix
```

---
*This guide is the single reference for cross-tool development. Keep it updated.*
