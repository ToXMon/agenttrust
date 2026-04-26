# AgentTrust — Skill & Profile Map

> **Purpose:** Maps each workpack to the correct subordinate profile + skills to load.
> **Why:** Subordinates get fresh context. They need explicit instructions on which skills to use.

---

## Available Subordinate Profiles

| Profile | Best For | Skills to Load |
|---------|----------|---------------|
| `web3_engineer` | Solidity contracts, Foundry, deployment | `solidity`, `code-review-skill` |
| `frontend_engineer` | React, Next.js, TailwindCSS, browser testing | `code-review-skill` |
| `backend_engineer` | TypeScript, APIs, SDKs, integrations | `code-review-skill`, `swebok-developer-knowledge` |
| `security_auditor` | Contract audits, vulnerability scanning | `solidity`, `code-review-skill` |
| `qa_engineer` | Test writing, coverage, edge cases | `solidity` (for contract tests), `swebok-developer-knowledge` |
| `architect` | System design, interface contracts | `swebok-developer-knowledge` |
| `researcher` | Documentation research, SDK analysis | — |
| `developer` | General implementation, wallet integration | `code-review-skill` |
| `ai-engineer` | 0G Compute, AI inference, agent logic | `code-review-skill` |

---

## Workpack → Profile + Skills Map

### Workpack 1: Foundry + AgentRegistry
| Task | Profile | Skills | ASE Commands |
|------|---------|--------|-------------|
| Write AgentRegistry.sol | `web3_engineer` | `solidity`, `code-review-skill` | `/audit` after |
| Write tests | `qa_engineer` | `solidity` | — |
| Verify + commit | — (main agent) | — | — |

### Workpack 2: TrustNFT (ERC-7857)
| Task | Profile | Skills | ASE Commands |
|------|---------|--------|-------------|
| Write TrustNFT.sol | `web3_engineer` | `solidity`, `code-review-skill` | `/audit` after |
| Write fuzz + invariant tests | `qa_engineer` | `solidity` | — |

### Workpack 3: ServiceAgreement
| Task | Profile | Skills | ASE Commands |
|------|---------|--------|-------------|
| Write ServiceAgreement.sol | `web3_engineer` | `solidity`, `code-review-skill` | `/audit` after |
| Write lifecycle tests | `qa_engineer` | `solidity` | — |

### Workpack 4: Deploy Script + Akash SDLs + Cloudflare D1
| Task | Profile | Skills | ASE Commands |
|------|---------|--------|-------------|
| Write Deploy.s.sol | `web3_engineer` | `solidity` | — |
| Create Akash SDLs (3 files) | `devops_engineer` | `akash` | — |
| Create Cloudflare D1 schema | `devops_engineer` | — | — |
| Deploy to Base Sepolia | — (main agent) | — | 🚨 GATE |
### Workpack 5: Gensyn AXL
| Task | Profile | Skills | ASE Commands |
|------|---------|--------|-------------|
| Research AXL SDK | `researcher` | — | — |
| Implement AXL modules | `backend_engineer` | `code-review-skill` | `/audit` after |
| Test P2P communication | `qa_engineer` | `swebok-developer-knowledge` | — |

### Workpack 6: Agents + ENS
| Task | Profile | Skills | ASE Commands |
|------|---------|--------|-------------|
| Research ENS SDK | `researcher` | — | — |
| Implement agent + ENS modules | `backend_engineer` | `code-review-skill` | `/audit` after |

### Workpack 7: Uniswap + KeeperHub
| Task | Profile | Skills | ASE Commands |
|------|---------|--------|-------------|
| Research Uniswap API + KeeperHub | `researcher` | — | — |
| Implement SDK modules | `backend_engineer` | `code-review-skill` | `/audit` after |
| Write FEEDBACK.md notes | `developer` | — | — |

### Workpack 8: 0G + Wallet
| Task | Profile | Skills | ASE Commands |
|------|---------|--------|-------------|
| Research 0G SDK | `researcher` | — | — |
| Implement 0G + wallet modules | `backend_engineer` | `code-review-skill` | `/audit` after |
| AI inference integration | `ai-engineer` | `code-review-skill` | — |

### Workpack 9: Frontend Dashboard (Cloudflare Pages)
| Task | Profile | Skills | ASE Commands |
|------|---------|--------|-------------|
| Set up Next.js + Stripe design | `frontend_engineer` | `code-review-skill` | — |
| Configure Cloudflare adapter (D1, DO, R2, Workers) | `devops_engineer` | Cloudflare Pages/Workers/D1/Durable Objects knowledge | — |
| Build all pages + components | `frontend_engineer` | `code-review-skill` | `/audit` after |
| Deploy to Cloudflare Pages | `devops_engineer` | Cloudflare Pages knowledge | — |
### Workpack 10: Demo + Submit (Cloudflare + Akash)
| Task | Profile | Skills | ASE Commands |
|------|---------|--------|-------------|
| Deploy to Akash (3 containers) | `devops_engineer` | `akash` | — |
| Deploy to Cloudflare (Pages + Workers + D1 + DO + R2 + Queues) | `devops_engineer` | Cloudflare knowledge | — |
| Wire demo scenario | `fullstack_engineer` | `code-review-skill` | — |
| Run end-to-end demo | — (main agent) | — | — |
| Finalize docs | `developer` | — | — |
| Submit | — (main agent) | — | 🚨 GATE |
---

## Subordinate Call Template

When delegating a task, use this template in the `message` field:

```
You are working on AgentTrust (ETHGlobal Open Agents Hackathon 2026).
Repo: /a0/usr/workdir/agenttrust

## Your Task
[specific task description]

## Skills to Load
Before starting, load these skills:
- Run: skills_tool:load with skill_name "solidity" (if writing Solidity)
- Run: skills_tool:load with skill_name "code-review-skill" (for review)

## Standards
- [Solidity]: Custom errors with ContractName__ prefix, ReentrancyGuardTransient, fuzz tests, branching tree technique
- [TypeScript]: No 'any' types, proper interfaces, JSDoc comments
- [General]: 300 lines max per file, commit on green, no AI slop

## Files to Read
- Read BUILD-PLAN.md workpack [N] for full task spec
- Read only the files you need to modify

## Output
- Write the code to the correct file paths
- Run verification (forge test, tsc, etc.)
- Report: files changed, test results, any issues
```

## ASE Harness Commands in Workflow

| Command | When | Purpose |
|---------|------|---------|
| `/audit` | After each contract or SDK module | Code review against standards |
| `/reflect` | End of every session | Generate handoff.md for next session |
| `/workpack` | Start of session (alternative entry) | Auto-generate workpack from goal |
| `/diagram` | During architecture sessions | ASCII state machine visualization |

### Session Flow with ASE Harness

```
1. Read progress.json
2. Read workpack from BUILD-PLAN.md
3. Read SKILL-PROFILE-MAP.md for delegation plan
4. Delegate to subordinate with skill loading instructions
5. Verify results (forge test, tsc, etc.)
6. Run /audit if contract or critical code
7. Human gate if needed
8. Update progress.json
9. Commit incrementally
10. Run /reflect → generate handoff.md
11. Tell user: "Session complete. Start new chat."
```
