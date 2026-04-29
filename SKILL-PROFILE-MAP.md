# AgentTrust — Skill & Profile Map

> **Purpose:** Maps each workpack to the correct subordinate profile + skills to load.
> **Why:** Subordinates get fresh context. They need explicit instructions on which skills to use.

---

## Available Subordinate Profiles

| Profile | Best For | Skills to Load |
|---------|----------|---------------|
| `web3_engineer` | Solidity contracts, Foundry, deployment | `solidity`, `code-review-skill` |
| `frontend_engineer` | React, Next.js, TailwindCSS, browser testing | `code-review-skill` |
| `frontend_engineer` (SE2) | SE2 component cherry-pick, Foundry bridge, DaisyUI | `code-review-skill` + read `docs/SE2-INTEGRATION-GUIDE.md` |
| `backend_engineer` | TypeScript, APIs, SDKs, integrations | `code-review-skill`, `swebok-developer-knowledge` |
| `security_auditor` | Contract audits, vulnerability scanning | `solidity`, `code-review-skill` |
| `qa_engineer` | Test writing, coverage, edge cases | `solidity` (for contract tests), `swebok-developer-knowledge` |
| `architect` | System design, interface contracts | `swebok-developer-knowledge` |
| `researcher` | Documentation research, SDK analysis | — |
| `developer` | General implementation, wallet integration | `code-review-skill` |
| `ai-engineer` | 0G Compute, AI inference, agent logic | `code-review-skill` |

---

## Workpack → Profile + Skills Map

### Workpack 0: SE2 Frontend Foundation + ethskills
| Task | Profile | Skills | ASE Commands |
|------|---------|--------|-------------|
| Cherry-pick SE2 components + hooks | `frontend_engineer` | `code-review-skill` + read `docs/SE2-INTEGRATION-GUIDE.md` | — |
| Write Foundry bridge script | `developer` | `code-review-skill` | — |
| Fetch ethskills + create externalContracts.ts | `backend_engineer` | `code-review-skill` + read `docs/ETHSKILLS-REFERENCE.md` | — |
| Verify: npm run dev, Debug Contracts, wallet | `frontend_engineer` | — | Browser verify |

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

### Workpack 4: Deploy Script
| Task | Profile | Skills | ASE Commands |
|------|---------|--------|-------------|
| Write Deploy.s.sol | `web3_engineer` | `solidity` | — |
| Deploy to Base Sepolia | — (main agent) | — | 🚨 GATE |

### Workpack 5: Gensyn AXL Integration
| Task | Profile | Skills | ASE Commands |
|------|---------|--------|-------------|
| Build & deploy AXL Go nodes | `devops_engineer` | read `docs/reference/gensyn-axl-deep-research.md` | — |
| AXLClient TypeScript wrapper + ACK layer | `backend_engineer` | `code-review-skill` + read `docs/reference/gensyn-axl-deep-research.md` | `/audit` after |
| Wire message-handler to AXL polling | `backend_engineer` | `code-review-skill` | — |
| Integration test across 2 nodes | `qa_engineer` | `swebok-developer-knowledge` | — |

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

### Workpack 9: Frontend Dashboard (SE2-Enhanced)
| Task | Profile | Skills | ASE Commands |
|------|---------|--------|-------------|
| Build custom dashboard pages (agents, trust, messages, audit) | `frontend_engineer` | `code-review-skill` + read `docs/SE2-INTEGRATION-GUIDE.md` | Browser verify |
| Wire SE2 hooks to custom components | `frontend_engineer` | `code-review-skill` | — |
| DaisyUI 5 theming + responsive design | `frontend_engineer` | `code-review-skill` | — |

### Workpack 10: Demo + Submit
| Task | Profile | Skills | ASE Commands |
|------|---------|--------|-------------|
| Wire demo scenario | `fullstack_engineer` | `code-review-skill` | — |
| Run end-to-end demo | — (main agent) | — | — |
| Finalize docs | `developer` | — | — |
| Submit | — (main agent) | — | 🚨 GATE |

### Workpack 11: Triple-Layer Deployment
| Task | Profile | Skills | ASE Commands |
|------|---------|--------|-------------|
| Vercel deployment | `frontend_engineer` | — | — |
| Akash Docker + SDL | `devops_engineer` | read `docs/DEPLOYMENT-STRATEGY.md` | — |
| IPFS + ENS setup | `web3_engineer` | — | — |

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

## Integration Guide References

When delegating tasks for SE2 or ethskills integration, include these references in subordinate prompts:

| Integration | Doc to Include | How |
|-------------|---------------|------|
| SE2 cherry-pick | `docs/SE2-INTEGRATION-GUIDE.md` | `§§include(/a0/usr/projects/agentrust/docs/SE2-INTEGRATION-GUIDE.md)` or "Read docs/SE2-INTEGRATION-GUIDE.md before starting" |
| ethskills usage | `docs/ETHSKILLS-REFERENCE.md` | "Read docs/ETHSKILLS-REFERENCE.md for verified addresses and patterns" |
| Deployment | `docs/DEPLOYMENT-STRATEGY.md` | "Read docs/DEPLOYMENT-STRATEGY.md for SDL and Dockerfile" |
| Foundry bridge | SE2 guide section 7 | "Follow the foundry-bridge.js script in docs/SE2-INTEGRATION-GUIDE.md section 7" |
| Gensyn AXL | `docs/reference/gensyn-axl-deep-research.md` | "Read docs/reference/gensyn-axl-deep-research.md for AXL architecture, endpoints, and deployment" |

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
2.5. If workpack references integration guides (SE2, ethskills, deployment), read those docs too
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
