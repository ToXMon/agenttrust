# KeeperHub Feedback — AgentTrust

## Builder Information
- **Project:** AgentTrust — Verifiable Agent Commerce Protocol
- **Event:** ETHGlobal Open Agents 2026
- **Integrations:** KeeperHub MCP Client, x402 Payments, Task Execution
- **Network:** Base mainnet (8453)

---

## Integration Experience

### Setup Time
About 45 minutes to get the MCP client working. The REST-style MCP interface is straightforward — POST JSON to /tasks, GET /tasks/{id} for status. No complex WebSocket or SSE setup needed for our use case.

### Configuration Complexity
Minimal. The client takes an MCP URL, API key, and agent address. We wrapped it in a TypeScript class with retry logic (exponential backoff on 429/5xx). The x-api-key and x-agent-address headers are all that's needed for auth.

### Documentation Clarity
The KeeperHub docs explain the MCP protocol and x402 payment flow well. The task lifecycle (pending → running → completed/failed) is clearly documented. Where it falls short is error handling — the docs list HTTP status codes but don't specify what error bodies look like in practice.

---

## MCP Usage

### Server Connection
- Connection method: HTTP (REST-style MCP)
- Configuration format: JSON with apiKey, mcpUrl, agentAddress
- Tool discovery: N/A — we use a fixed set of endpoints (/tasks, /payments, /health)

### Tools Used
- [x] Task execution (submitTask, getTaskStatus, listTasks, cancelTask)
- [ ] Resource management (not needed for our flow)
- [x] Payment processing (initPayment, verifyPayment via x402)
- [x] Status monitoring (healthCheck endpoint)

### MCP Protocol Issues
1. **No standard error schema** — Error responses vary between endpoints. Sometimes we get `{"error": "message"}`, sometimes `{"detail": "message"}`, sometimes just a status code with empty body.
2. **Task status polling required** — No webhook or SSE option for task completion notifications. We poll every 5 seconds, which works but adds latency.
3. **Error handling** — 429 responses don't include a Retry-After header. We implemented exponential backoff (1s, 2s, 4s) but a server-recommended delay would be better.
4. **No streaming support** — For long-running tasks, we can't get progress updates. Just pending/running/completed.

---

## CLI Usage

### Installation
We used the MCP REST API directly rather than the CLI. The REST approach integrates better with our TypeScript SDK.

### Commands Used
N/A — Direct API integration via our KeeperHubClient class.

### CLI Pain Points
1. The CLI seems designed for manual testing, not programmatic integration. We'd prefer a TypeScript SDK.
2. No `--json` output format documented for scripting.
3. Error messages in the CLI don't map cleanly to API error codes.

---

## x402/MPP Payments

### Payment Flow
AgentTrust uses x402 payments for agent-to-agent task execution. When a service provider agent completes a task, the requester agent pays via KeeperHub's payment endpoint. The payment hash is logged in our audit trail alongside the ServiceAgreement on-chain record.

### Payment Setup
- Payment type: x402
- Token: USDC on Base
- Network: Base mainnet

### Issues
1. **Payment initiation returns immediately** — No way to know if the underlying transaction succeeded without polling verifyPayment.
2. **Settlement timing** — Payments can take 10-30 seconds to confirm. Our retry logic handles this but it adds complexity.
3. **Fee transparency** — The API doesn't break down KeeperHub fees vs gas fees vs network fees.
4. **Error recovery** — When a payment fails, there's no automatic retry. We had to implement our own retry wrapper.

---

## What Worked

1. **REST-style MCP interface** — Simple HTTP calls with JSON bodies. No complex protocol setup. We had our client working in under an hour.

2. **Task lifecycle management** — The pending → running → completed/failed state machine maps well to our agent workflow. Cancelling tasks works cleanly.

3. **x402 payment model** — Pay-per-task aligns with agent commerce. The payment hash gives us an on-chain verifiable receipt.

4. **Health check endpoint** — Simple GET /health returns status and version. Useful for monitoring.

---

## What Didn't Work

1. **No TypeScript SDK** — We had to write our own client. A reference implementation would save integration time.

2. **Inconsistent error responses** — Different endpoints return errors in different formats. A standard error envelope would help.

3. **No task progress updates** — Long-running tasks (trust verification, data persistence) just show "running". Progress percentage or stage info would improve UX.

4. **Rate limiting opacity** — We hit 429s during testing but the docs don't specify rate limits. A rate limit headers (X-RateLimit-Remaining) would help.

---

## Suggestions

1. **TypeScript SDK** — A published npm package with types for all request/response shapes. Would cut integration time in half.

2. **Webhook for task completion** — Instead of polling, let us register a callback URL. Reduces latency and API calls.

3. **Standard error envelope** — `{"error": {"code": "STRING", "message": "...", "details": {...}}}` across all endpoints.

4. **Rate limit headers** — Standard X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset headers on every response.

5. **Task progress events** — SSE or WebSocket stream for task progress updates during long-running operations.
