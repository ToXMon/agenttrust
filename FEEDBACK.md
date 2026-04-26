# Uniswap API Feedback — AgentTrust

## Builder Information
- **Project:** AgentTrust
- **Event:** ETHGlobal Open Agents 2026
- **Integrations:** Uniswap V3 Router, Token API, Quote API

---

## Builder Experience

### Overall Impression
[How was the developer experience integrating Uniswap APIs?]

### Time to First Working Integration
[How long did it take to get a basic swap working?]

### Documentation Quality
[Was the documentation sufficient? What was clear, what was confusing?]

---

## What Worked

1. [API endpoint or feature that worked well]
2. [Documentation section that was helpful]
3. [SDK or tool that accelerated development]
4. [Feature that met expectations perfectly]

---

## What Didn't Work

1. [API endpoint or feature that caused issues]
2. [Documentation gap or misleading info]
3. [SDK limitation or unexpected behavior]
4. [Feature that didn't work as expected]

---

## Bugs Found

### Bug 1: [Title]
- **Endpoint:** [API endpoint]
- **Expected:** [What should happen]
- **Actual:** [What happened instead]
- **Reproduction:** [Steps to reproduce]

### Bug 2: [Title]
- **Endpoint:** [API endpoint]
- **Expected:** [What should happen]
- **Actual:** [What happened instead]
- **Reproduction:** [Steps to reproduce]

---

## Documentation Gaps

1. [Topic not covered or insufficiently explained]
2. [Missing example or code sample]
3. [Unclear parameter description]
4. [Missing error handling guidance]

---

## Developer Experience (DX) Friction

1. [Authentication complexity]
2. [Rate limiting behavior]
3. [Error message clarity]
4. [Testing/sandbox availability]

---

## Missing Endpoints

1. [Endpoint needed but not available]
2. [Data accessible only through The Graph that should have a REST API]
3. [WebSocket support needed]

---

## Feature Wishes

1. [Feature that would make building easier]
2. [API improvement suggestion]
3. [New endpoint or capability]
4. [SDK enhancement request]

---

## Trust-Gated Swap Specifics

### Our Use Case
We use Uniswap for trust-gated token swaps between AI agents. An agent's trust score determines:
- Maximum swap amount
- Allowed token pairs
- Slippage tolerance

### API Features Used
- [x] Quote API for price estimation
- [ ] Swap API for on-chain execution
- [ ] Token API for metadata
- [ ] Pool analytics

### Challenges Specific to Agent-to-Agent Trading
1. [Challenge with automated swap decisions]
2. [Challenge with trust-based routing]
3. [Challenge with gas estimation for agents]
