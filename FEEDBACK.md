# Uniswap API Feedback — AgentTrust

## Builder Information
- **Project:** AgentTrust
- **Event:** ETHGlobal Open Agents 2026
- **Integrations:** Uniswap Trading API (POST /v1/quote, POST /v1/swap), Permit2 approvals

---

## Builder Experience

### Overall Impression
The Trading API is a significant step up from interacting with the Universal Router directly. I was able to get a quote request working within 30 minutes of reading the docs. The POST-based API is straightforward: send `{type, amount, tokenIn, tokenOut, swapper}`, get back a structured quote with routing info, gas estimates, and permit data. That said, the gateway URL (`trade-api.gateway.uniswap.org`) differs from the docs URL I first found (`trade-api.uniswap.org`), and it took me a failed request to sort that out.

### Time to First Working Integration
About 45 minutes from opening the API docs to having a trust-gated quote call that correctly blocks low-score agents. The quote endpoint itself worked on the first try once I had the right base URL and API key header. The trust gate logic was custom code on our side — the API doesn't know about it.

### Documentation Quality
The API reference at `api-docs.uniswap.org` is decent. The endpoint schemas are clear, with full request/response examples. Where it falls short: the quickstart guide doesn't mention that you need an API key in the `x-api-key` header for every request. I found that by reading the curl examples, not the prose. The swap endpoint documentation is also split across two pages ("create_protocol_swap" and the integration guide), with slightly different request body shapes between them — I had to reconcile the differences myself.

---

## What Worked

1. **POST /v1/quote** returns routing, gas estimates, and permit data in a single call. No need to hit a separate gas endpoint.
2. **Permit2 integration** — the quote response includes `permitData` with the EIP-712 typed data already structured. No manual permit message construction needed.
3. **The curl examples** in the docs are copy-pasteable and include realistic request bodies. I used them directly to verify my API key worked before writing SDK code.
4. **Token addresses on Base** — USDC and WETH addresses are consistent and well-documented in the Uniswap token lists.

---

## What Didn't Work

1. **API key acquisition flow** is unclear. I found the developer portal but the approval process wasn't documented. Had to use a trial key.
2. **Error response format inconsistency** — a 400 error returns `{"errorCode": "...", "message": "..."}`, but a 429 returns plain text. My error handler had to account for both.
3. **No testnet-specific documentation** — the docs show Ethereum mainnet examples. For Base Sepolia (chainId 84532), I had to guess that the same API endpoint works with the chainId in the request body. It does, but I wasn't sure until I tried.
4. **Rate limiting behavior** — I hit a 429 after about 15 rapid-fire quote requests during testing. The retry-after header was missing, so I implemented exponential backoff on my end.

---

## Bugs Found

### Bug 1: Quote returns empty route for small amounts
- **Endpoint:** POST https://trade-api.gateway.uniswap.org/v1/quote
- **Expected:** Route array with at least one hop for USDC→WETH on Base
- **Actual:** `route` field was an empty array when requesting swap of 0.001 USDC (1000 units with 6 decimals). Worked fine for 1 USDC and above.
- **Reproduction:** Quote USDC→WETH on Base Sepolia with amount="1000", tokenIn=USDC address, tokenOut=WETH address

### Bug 2: swap endpoint 400 with valid quote
- **Endpoint:** POST https://trade-api.gateway.uniswap.org/v1/swap
- **Expected:** 200 with swap calldata
- **Actual:** 400 with `{"errorCode":"INVALID_QUOTE","message":"Quote expired or invalid"}` when passing the raw quote response back within 10 seconds
- **Reproduction:** Get quote, immediately POST /swap with the quote object. Happens intermittently on Base Sepolia.

---

## Documentation Gaps

1. **API key setup** — where to get one, how long approval takes, what rate limits apply per tier
2. **Base chain specifics** — no mention of Base Sepolia support, no example chainId values for L2s
3. **Permit2 signature flow** — the docs show permitData in the response but don't explain the signing step clearly. Had to read the Permit2 docs separately.
4. **Error code reference** — no exhaustive list of possible errorCode values in responses

---

## Developer Experience (DX) Friction

1. **API key is required but not mentioned prominently** — first three requests failed with 401 before I found the `x-api-key` header in a curl example
2. **Rate limiting with no headers** — 429 responses don't include Retry-After or X-RateLimit-Remaining, making graceful backoff harder
3. **Error messages are helpful when JSON, confusing when plain text** — inconsistent error response format
4. **No sandbox/testnet mode** — the API works on real chains, so testing small amounts costs real gas on Base Sepolia

---

## Missing Endpoints

1. **GET /v1/token/{address}** — token metadata (decimals, symbol, name) endpoint. Currently have to hardcode or use a separate API.
2. **Historical price data** — would be useful for showing agents what the price was when they agreed to a swap
3. **WebSocket for quote streaming** — agent-to-agent negotiations could benefit from real-time price updates instead of polling

---

## Feature Wishes

1. **Simulated swap endpoint** — POST /v1/simulate that does a dry-run without requiring an API key or on-chain state. Would make testing faster.
2. **Token pair validation** — a lightweight endpoint that returns whether a pair has sufficient liquidity before attempting a full quote
3. **Batch quotes** — request quotes for multiple pairs in one call. Agents often compare routes across 2-3 pairs.
4. **Trust/risk metadata** — an optional field in the quote response indicating pool age, TVL, and number of liquidity providers for the route

---

## Trust-Gated Swap Specifics

### Our Use Case
We use Uniswap for trust-gated token swaps between AI agents. An agent's trust score (0-100, stored on-chain in an ERC-7857 iNFT) determines:
- Maximum swap amount (0 USDC for scores ≤25, up to 10,000 USDC for scores 76-100)
- Allowed token pairs (restricted to USDC→WETH at low trust, all pairs at high trust)
- Slippage tolerance (300 BPS at low trust, 50 BPS at high trust)

### API Features Used
- [x] Quote API for price estimation
- [x] Swap API for on-chain execution
- [ ] Token API for metadata
- [ ] Pool analytics

### Challenges Specific to Agent-to-Agent Trading
1. **Agents need to validate quotes independently** — can't trust the counterparty's quote. Each agent calls the Trading API directly, which adds latency.
2. **Trust-based routing isn't native** — the API doesn't support custom routing constraints. We filter allowed pairs client-side before calling the API.
3. **Gas estimation for automated decisions** — agents need to factor gas into their cost-benefit analysis. The API returns gas estimates, but they're in wei, requiring conversion to USD using a separate price oracle.
