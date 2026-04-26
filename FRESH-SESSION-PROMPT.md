# AgentTrust — Fresh Session Entry Point

> **INSTRUCTIONS:** Start every new Agent Zero chat session in the agenttrust project with this exact prompt:
>
> `Read and execute the next workpack from BUILD-PLAN.md. Load progress from progress.json first.`
>
> That's it. One line. The agent reads BUILD-PLAN.md, checks progress.json, and continues from where the last session left off.

---

## How This Works

```
Session 1: "Read and execute the next workpack from BUILD-PLAN.md. Load progress from progress.json first."
  → Agent reads BUILD-PLAN.md → finds Workpack 1 → executes → updates progress.json → /reflect

Session 2: "Read and execute the next workpack from BUILD-PLAN.md. Load progress from progress.json first."
  → Agent reads BUILD-PLAN.md → finds Workpack 2 → executes → updates progress.json → /reflect

... repeat until all workpacks done ...

Final Session: "Execute the submission checklist from BUILD-PLAN.md. Load progress from progress.json first."
  → Agent verifies all workpacks → runs final checks → submits
```

## Context Budget Rules

- **Never exceed 30% context window per session**
- Each session = ONE workpack only
- Use `§§include(path)` for large files instead of pasting content
- Delegate heavy work to subordinates (they get fresh context)
- End session with reflection + progress update
- If context feels heavy (>20%), wrap up and hand off immediately

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
