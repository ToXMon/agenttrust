# AgentTrust — Fresh Session Entry Point

> **INSTRUCTIONS:** Start every new Agent Zero chat session in the agenttrust project with this exact prompt:
>
> `Read and execute the next workpack from BUILD-PLAN.md. Load progress from progress.json first.`
>
> That's it. One line. The agent reads BUILD-PLAN.md, checks progress.json, and continues from where the last session left off.

---

## How This Works

```
Session N: "Read and execute the next incomplete workpack from BUILD-PLAN.md. Load progress from progress.json first."
  → Agent reads progress.json → finds current workpack N
  → Agent reads SKILL-PROFILE-MAP.md → gets delegation plan for workpack N
  → Agent delegates to subordinate with profile + skill loading instructions
  → Subordinate loads skills via skills_tool:load → executes → returns results
  → Main agent verifies → updates progress.json → commits → /reflect
```

## Context Budget Rules

- **Never exceed 30% context window per session**
- Each session = ONE workpack only
- **Read SKILL-PROFILE-MAP.md** before every subordinate call to get the right profile + skills
- **Include skill loading instructions** in every subordinate message (see template below)
- Use `§§include(path)` for large files instead of pasting content
- Delegate heavy work to subordinates (they get fresh context)
- End session with reflection + progress update
- If context feels heavy (>20%), wrap up and hand off immediately

## Subordinate Delegation Template

For EVERY subordinate call, include this in the message:

```
## Skills to Load First
Before writing any code, load these skills using skills_tool:load:
1. skills_tool:load with skill_name "[skill from SKILL-PROFILE-MAP.md]"
2. skills_tool:load with skill_name "code-review-skill"

Then follow all instructions from the loaded skill(s).
```

This ensures every subordinate has the right standards loaded (Solidity Cyfrin rules, TypeScript rules, etc.).

## Human Gates

The agent will pause and ask for approval before:
1. Deploying contracts to any network
2. Spending real ETH or tokens
3. Making architecture changes
4. Pushing to GitHub after contract changes
5. Final submission

All other decisions are made autonomously.

## Files That Persist State

| File | Purpose |
|------|----------|
| `progress.json` | Machine-readable task completion status |
| `BUILD-PLAN.md` | Session-by-session workpack definitions |
| `PROJECT.md` | Full project steering document |
| `FRESH-SESSION-PROMPT.md` | This file — session entry point |
| `handoff.md` | Auto-generated after each session via /reflect |
| `work_logs/` | Detailed session logs |

---

## Integration Guide Index

Before executing any workpack, check if it references these integration guides:

| Guide | Path | Used By |
|-------|------|----------|
| SE2 Cherry-Pick | `docs/SE2-INTEGRATION-GUIDE.md` | Workpack 0, Workpack 9 |
| ethskills Reference | `docs/ETHSKILLS-REFERENCE.md` | Workpack 0, Workpacks 1-3 (contract patterns) |
| Deployment Strategy | `docs/DEPLOYMENT-STRATEGY.md` | Workpack 11 |

### Integration Guide Loading Rules

1. **Workpack 0** — Must read BOTH `docs/SE2-INTEGRATION-GUIDE.md` AND `docs/ETHSKILLS-REFERENCE.md` before starting
2. **Workpacks 1-3** (Contracts) — Load `docs/ETHSKILLS-REFERENCE.md` for security checklists and testing patterns. Also load `docs/reference/ethskills/security.md` and `docs/reference/ethskills/testing.md` if fetched
3. **Workpack 4** (Deploy) — After deployment, run `scripts/foundry-bridge.js` to regenerate `frontend/config/deployedContracts.ts`
4. **Workpack 9** (Frontend) — Read `docs/SE2-INTEGRATION-GUIDE.md` for hook usage patterns and component locations
5. **Workpack 11** (Deploy) — Read `docs/DEPLOYMENT-STRATEGY.md` for Dockerfile, SDL, and ENS setup

### ethskills in Subordinate Prompts

When delegating contract work (Workpacks 1-3), include in the subordinate message:
```
## Reference Materials
Read these files before starting:
- docs/reference/ethskills/standards.md — ERC-8004 commerce flow, x402 patterns
- docs/reference/ethskills/security.md — 22-item pre-deploy checklist
- docs/reference/ethskills/testing.md — Foundry fuzz/invariant test templates
- docs/reference/ethskills/addresses.md — Verified Base chain addresses
```

### SE2 Hook Quick Reference

When building frontend components (Workpack 9), these hooks are available:
- `useScaffoldRead` — Read contract state (replaces raw `useReadContract`)
- `useScaffoldWrite` — Write to contracts (replaces raw `useWriteContract`)
- `useScaffoldEventHistory` — Query historical events
- `useWatchContractEvent` — Subscribe to real-time events
- `useTransactor` — TX wrapper with notifications
- `useDeployedContractInfo` — Get ABI + address for a contract

---

*This file is read at the start of every new session. Keep it concise.*
