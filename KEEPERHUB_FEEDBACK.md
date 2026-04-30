# KeeperHub Feedback — AgentTrust

## Builder Information
- **Project:** AgentTrust
- **Event:** ETHGlobal Open Agents 2026
- **Integrations:** KeeperHub MCP Server (HTTP), x402 Payment Protocol

---

## Integration Experience

### Setup Time
About 20 minutes to get the MCP client connecting to the server. The HTTP-based MCP protocol is simpler than I expected — no WebSocket or SSE complexity. I pointed the client at `https://mcp.keeperhub.com/v1` and started making POST requests with task payloads. The first `submitTask` call went through on the second attempt (first failed because I didn't include the `Authorization` header).

### Configuration Complexity
Low. The MCP server URL and an optional API key are the only required config values. I added `maxRetries` and `baseDelay` for exponential backoff control, which took another 10 minutes. The config object is small enough that I didn't need a separate config file — just passed it in the constructor.

### Documentation Clarity
The MCP protocol docs are clear about the request/response shapes. Where they could improve: no concrete example of a full task lifecycle (submit → poll → result). I had to piece together the flow from three separate doc pages. The error response format is documented, but I found that some error responses come back as plain text instead of JSON when the server is under load.

---

## MCP Usage

### Server Connection
- Connection method: HTTP (POST/GET/DELETE to REST endpoints)
- Configuration format: JSON config object with `mcpUrl` and optional `apiKey`
- Tool discovery: Not used — we hardcoded the task endpoints. Would have liked a capability discovery endpoint.

### Tools Used
- [x] Task execution (submit, status, list, cancel)
- [ ] Resource management
- [x] Payment processing (x402 init and verify)
- [x] Status monitoring (polling-based)

### MCP Protocol Issues
1. **No capability discovery** — the client has to know the endpoint structure in advance. A `GET /capabilities` endpoint listing available task types and payment methods would help.
2. **Tool response format** — responses are inconsistent. Some return `{taskId, status, result}`, others return a bare string or nothing (204). A consistent envelope would reduce client-side parsing logic.
3. **Error handling behavior** — 500 errors sometimes return HTML (probably a reverse proxy error page), sometimes JSON. Client code needs to handle both.
4. **Streaming support** — no SSE or WebSocket support for long-running tasks. Had to implement polling with `getTaskStatus`, which adds latency.

---

## CLI Usage

### Installation
Did not install the CLI — went straight to the HTTP API for programmatic access. The CLI seems oriented toward manual testing, which doesn't fit our agent-to-agent use case.

### Commands Used
- `keeperhub task create` — not used (used API instead)
- `keeperhub task status` — not used
- `keeperhub agent register` — not used

### CLI Pain Points
1. No programmatic output format flag (like `--json`) that would make CLI output parseable by scripts
2. No documentation on how CLI maps to API endpoints — had to guess
3. Error messages from CLI don't include the HTTP status code, making debugging harder

---

## x402/MPP Payments

### Payment Flow
We integrated x402 payments for agent task execution. When a requester agent submits a task to KeeperHub, it initializes a payment with `initPayment(amount, token, recipient)`. The payment hash is tracked. Once the task completes, we verify the payment settled with `verifyPayment(hash)`, which polls with exponential backoff.

The flow is: task submitted → payment initialized → task executed → payment confirmed → task result returned to requester.

### Payment Setup
- Payment type: x402
- Token: USDC (Base mainnet, 6 decimals)
- Network: Base mainnet

### Issues
1. **Payment initialization sometimes returns before the on-chain tx is indexed** — `verifyPayment` needs to retry, and the delay varies. On Base, it's usually under 5 seconds, but I've seen up to 30 seconds.
2. **Settlement timing is opaque** — no webhook or callback when a payment confirms. Polling is the only option.
3. **Fee transparency** — the payment receipt doesn't break down gas fees vs. service fees. For agent cost-benefit analysis, this matters.
4. **Error recovery** — if `initPayment` succeeds but `verifyPayment` times out, there's no idempotency key to safely retry without double-paying.

---

## What Worked

1. **Simple HTTP transport** — no complex WebSocket lifecycle management. A single `fetch()` call per operation.
2. **Task status tracking** — the `GET /tasks/{id}` endpoint returns full state including retry count and result, which made building the audit trail straightforward.
3. **x402 payment concept** — the idea of paying per API call with on-chain settlement is clean. No API key billing, no subscription.
4. **Fast response times** — task submission responds in under 200ms. Status polling adds latency but the API itself is quick.

---

## What Didn't Work

1. **No retry/acknowledgment built into the protocol** — if a task submission fails due to network error, the client has no way to know if the server received it. Idempotency keys would solve this.
2. **Missing webhook/callback for task completion** — polling adds complexity and latency. An SSE channel or webhook URL in the task submission would be better.
3. **Rate limiting** — hit a 429 after submitting ~20 tasks in rapid succession. No documentation on rate limits or how to request higher limits.
4. **No task type validation** — I submitted a task with `taskType: "typo_execution"` and it was accepted. Server-side validation of task types would catch configuration errors early.

---

## Suggestions

1. **Add `GET /v1/capabilities`** — return supported task types, payment tokens, max retry count, and rate limits. Let clients configure dynamically.
2. **Standardize response envelope** — every response should be `{success: boolean, data: ..., error: ...}`. Currently inconsistent between endpoints.
3. **Add webhook URL to task submission** — `POST /tasks` should accept an optional `callbackUrl` field. When the task completes, POST the result there instead of requiring polling.
4. **CLI `--json` output flag** — make CLI output machine-parseable for scripting.
5. **MCP protocol versioning** — add a protocol version header or field. I have no way to know if the API I'm calling today will change tomorrow.
