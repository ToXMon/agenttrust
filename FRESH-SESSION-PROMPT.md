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

*This file is read at the start of every new session. Keep it concise.*
