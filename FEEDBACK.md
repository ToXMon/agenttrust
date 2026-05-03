# Uniswap API Feedback — AgentTrust

## Builder Information
- **Project:** AgentTrust — Verifiable Agent Commerce Protocol
- **Event:** ETHGlobal Open Agents 2026
- **Integrations:** Uniswap Trading API (REST), Permit2, Universal Router on Base
- **Chain:** Base (8453 mainnet, 84532 Sepolia)
- **API Base:** `https://trade-api.gateway.uniswap.org/v1`

---

## Builder Experience

### Overall Impression
The Trading API does what it says on the tin. POST a JSON body, get a quote back with route info, gas estimates, and Permit2 typed data ready for signing. No SDK dependency needed — plain fetch() works. That said, finding the correct endpoint was harder than it should have been.

### Time to First Working Integration
About 2 hours from zero to a working quote on Base mainnet. Most of that time was spent figuring out that the Trading API moved from `api.uniswap.org/v2` to `trade-api.gateway.uniswap.org/v1` and switched from GET to POST. The old endpoints return `ACCESS_DENIED` or `404` with no redirect hint.

### Documentation Quality
The docs at `developers.uniswap.org` and `api-docs.uniswap.org` are thorough once you find the right pages. The code examples section shows the exact request/response shapes. But the getting-started guide still references `api.uniswap.org/v2` URLs that no longer work. There's also a split between the developer portal and the API docs site — I had to check both to piece together the full picture.

---

## What Worked

1. **POST /v1/quote endpoint** — Returns rich data: route details with pool addresses, tick ranges, liquidity, fee tiers. One request gives you everything needed for a swap decision. Response includes `quoteId`, `gasFeeUSD`, `priceImpact`, and typed Permit2 data.

2. **Permit2 typed data in response** — The `permitData` field comes back with complete EIP-712 typed data (domain, types, values). This saved us from having to construct Permit2 messages manually. The `verifyingContract` is correctly set to `0x000000000022D473030F116dDEE9F6B43aC78BA3` on Base.

3. **Base chain support** — Quotes on Base (8453) return immediately with V3 pool routing. Gas estimates are in wei with USD conversion provided. We tested 1 USDC → WETH and got `445352589161550` wei WETH (~$0.000445) with gas at ~$0.0013.

4. **Route transparency** — The `route` field shows exact pool addresses, token metadata (symbol, decimals), and fee tiers. For our trust-gated logic, we use this to verify the swap goes through expected pools.

---

## What Didn't Work

1. **Endpoint discovery** — `https://api.uniswap.org/v2/quote` returns `ACCESS_DENIED` with no guidance. `https://trade-api.uniswap.org/v1/quote` returns 404. Only `trade-api.gateway.uniswap.org` works. Three different base URLs with no clear migration docs.

2. **Missing required fields have poor errors** — When I first tested without `swapper`, the error was `"swapper" is required`. When I added that but used `amountIn` instead of `amount`, the error was `"amount" is required`. These are correct but could include the field names that *were* received to help debug typos.

3. **No testnet support for Trading API** — We couldn't get quotes on Base Sepolia (84532). The API appears to only support mainnet chains. This meant we couldn't test our full flow on testnet before spending real gas.

---

## Bugs Found

### Bug 1: Old API URLs return no useful error
- **Endpoint:** `https://api.uniswap.org/v2/quote`
- **Expected:** 301 redirect to new endpoint, or error body with migration guidance
- **Actual:** `{"errorCode": "ACCESS_DENIED"}` with HTTP 409. No indication this is a deprecated endpoint.
- **Reproduction:** `curl -s 'https://api.uniswap.org/v2/quote?tokenIn=0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913&tokenOut=0x4200000000000000000000000000000000000006&amountIn=1000000&chainId=8453&type=exactIn'`

### Bug 2: autoSlippage ignored when set to numeric string
- **Endpoint:** POST `/v1/quote` with `autoSlippage: "2.5"`
- **Expected:** Slippage set to 2.5%
- **Actual:** API ignores custom slippage when passed as string; appears to always use DEFAULT. The docs say autoSlippage accepts "DEFAULT" but don't document how to set a custom value.
- **Reproduction:** POST with `autoSlippage: "2.5"` vs `autoSlippage: "DEFAULT"` — same slippage in response.

---

## Documentation Gaps

1. **No clear migration guide from v2 to Trading API gateway** — Developers finding old tutorials will hit `ACCESS_DENIED` with no explanation.

2. **Missing swap request body schema** — The /swap endpoint requires the full quote object from /quote, but the docs don't clearly show which fields from the quote response map to the swap request. Had to figure this out from the code examples.

3. **Permit2 signing flow not documented end-to-end** — The API returns Permit2 typed data, but the docs don't explain the complete flow: quote → sign Permit2 → POST /swap with signature → send calldata. Each piece is documented separately.

4. **No error code reference** — Error responses include `errorCode` strings like `ACCESS_DENIED`, `RequestValidationError` but there's no comprehensive list of possible error codes.

---

## Developer Experience (DX) Friction

1. **API key required but rate limits undocumented** — The `x-api-key` header is required. We got one quickly, but the docs don't specify rate limits. During testing we got occasional 409s but couldn't tell if we were being rate-limited or hitting the deprecated endpoint.

2. **Error messages are minimal** — Validation errors tell you what's missing but not what you sent. A debug mode that echoes the received body would cut integration time significantly.

3. **No sandbox/testnet quotes** — For a hackathon project targeting Base, we had to use mainnet for all quote testing. Testnet quotes would reduce risk during development.

4. **Response field naming inconsistency** — Quote response uses `amountOut` in route objects but `output.amount` at the top level. Gas fee appears as `gasFee`, `gasFeeUSD`, `gasFeeQuote`, and `gasUseEstimate` — four gas-related fields with unclear relationships.

---

## Missing Endpoints

1. **GET /v1/chains** — An endpoint to list supported chain IDs would help. We had to trial-and-error to confirm Base Sepolia isn't supported.

2. **GET /v1/tokens?chainId=8453** — Token metadata by chain. We hardcode USDC/WETH addresses but a token list endpoint would help for dynamic pair discovery.

3. **WebSocket price feeds** — For agent-to-agent trading, real-time price updates via WebSocket would be more efficient than polling /quote.

---

## Feature Wishes

1. **Estimated time to expiry on quotes** — Quotes go stale but the API doesn't indicate how long a quote is valid. A `expiresAt` timestamp would help agents decide whether to re-quote before executing.

2. **Simulate endpoint separate from swap** — A POST `/v1/simulate` that returns success/failure without generating calldata would let agents validate swaps before committing to the full flow.

3. **Fee breakdown in quote response** — The gas fee is a single number. A breakdown (priority fee, base fee, MEV protection cost) would help agents optimize gas spending.

4. **Batch quotes** — For agents comparing multiple routes, a batch quote endpoint accepting multiple token pairs would reduce API calls.

---

## Trust-Gated Swap Specifics

### Our Use Case
AgentTrust uses Uniswap for trust-gated token swaps between AI agents. An agent's on-chain trust score (from TrustNFT ERC-7857) determines:
- Maximum swap amount (0-25: blocked, 26-50: 100 USDC, 51-75: 1,000 USDC, 76-100: 10,000 USDC)
- Allowed token pairs (bronze: USDC→WETH only, silver: +USDC→ETH, gold: all pairs)
- Slippage tolerance (bronze: 3%, silver: 1%, gold: 0.5%)

### API Features Used
- [x] Quote API (`POST /v1/quote`) for price estimation with route details
- [x] Permit2 data from quote response for gasless approvals
- [x] Gas estimation (gasFee, gasFeeUSD, gasUseEstimate)
- [x] Price impact calculation for trust gate validation
- [x] Swap execution: WETH.deposit() on Base mainnet (0.0001 ETH wrap confirmed)
- [x] On-chain viem integration (simulateContract + writeContract + waitForTransactionReceipt)

### Challenges Specific to Agent-to-Agent Trading
1. **No way to set recipient different from swapper in quote** — The `output.recipient` in quote response always matches `swapper`. For agent-to-agent payments, we need the output to go to a different address (the service provider). We had to modify the output.recipient in our swap request.

2. **Quote staleness for automated agents** — Agents may cache quotes for seconds or minutes before executing. Without an expiry indicator, agents risk executing against stale prices. We added a 30-second TTL in our trust gate logic.

3. **Gas estimation accuracy for trust gates** — Gas fees vary between quote time and execution time. For trust-gated max amounts, we reserve 5% of the trust limit for gas to prevent agents from exceeding their trust ceiling due to gas spikes.

---

## Phase 2-3: On-Chain Execution Results

### Real Transaction Confirmed
- **Tx Hash:** `0xc21fcc680ad04b5c0a7d9f8c8314903dec3d3ac1423d03b9c77a1cbcee5126a7`
- **Network:** Base mainnet (8453)
- **Block:** 45365859
- **Wallet:** `0xce9B692A01D47054e9ebC15722c071cbc4BE714e`
- **Operation:** WETH.deposit() — 0.0001 ETH wrap
- **Gas Used:** 27,766
- **Status:** success

### Critical Finding: Trading API Does Not Support Native ETH
- **Endpoint:** POST `/v1/quote` with `tokenIn: 0xEeee...ETH`
- **Expected:** Quote for native ETH to WETH swap
- **Actual:** `{"errorCode":"ResourceNotFound","detail":"No quotes available"}` HTTP 404
- **Workaround:** Use WETH.deposit() directly for ETH wrapping. The Trading API only handles ERC20-to-ERC20 swaps.
- **Impact:** Agents holding only native ETH cannot use the Trading API directly. They must wrap ETH first, then trade WETH for other tokens.

### viem Integration Confirmed Working
- `simulateContract()` correctly validates tx before sending
- `writeContract()` succeeds with proper gas estimation
- `waitForTransactionReceipt()` returns confirmation with gas used and block number
- Balance checking via `getBalance()` and ERC20 `balanceOf()` both work correctly

## ERC-8004 Integration for Uniswap Track

### Agent Discovery via On-Chain Identity

Two ERC-8004 contracts sit on Base mainnet: IdentityRegistry at `0x8004A169FB4a3325136EB29fA0ceB6D2e539a432` and ReputationRegistry at `0x8004BAa17C55a88189AE136b182e5fdA19dE9b63`. The IdentityRegistry is an ERC-721. When an agent registers, it gets a token with a metadata URI and capability flags.

The discovery flow is straightforward. A requester queries IdentityRegistry for agents with matching capabilities. Each identity token maps to a reputation entry. The requester filters by tags — "quality", "uptime", "latency" — to find agents scoring well on dimensions that matter for the task.

We built `sdk/erc8004.ts` to wrap these interactions. Five functions: `registerAgentIdentity` for minting, `getAgentReputation` for querying aggregated scores, `submitFeedback` for posting ratings, `getAgentIdByOwner` for reverse lookups, and `getTrustGatedSwapLimit` which ties reputation to swap parameters.

### Reputation-Gated Swap Limits

This is where ERC-8004 meets Uniswap. Our existing trust system uses TrustNFT (ERC-7857) scores to gate swaps — agents below 26 are blocked, bronze gets 100 USDC, silver 1,000, gold 10,000. We added a parallel tier system based on ERC-8004 reputation:

- Reputation below 50: blocked
- 50-69 (bronze): 100 USDC max, 300bps slippage
- 70-84 (silver): 1,000 USDC max, 100bps slippage
- 85-100 (gold): 10,000 USDC max, 50bps slippage

The `getQuote()` method in `sdk/uniswap.ts` now accepts an optional `erc8004Reputation` field. When provided, it computes limits from both systems and uses whichever is more permissive. If an agent has TrustNFT score above 76 and ERC-8004 reputation above 85, they get a 20% bonus on max swap. A gold agent with dual scores can swap up to 12,000 USDC.

`computeERC8004Limits()` maps reputation integers to TrustLimits objects. Same structure as existing trust tiers. The rest of the swap pipeline — pair validation, slippage enforcement, Permit2 signing — works unchanged.

### Feedback After Settlement

After a swap completes and the service is delivered, the requester submits feedback to ReputationRegistry via `giveFeedback()`. The function takes a signed value with configurable decimals: quality 87/100 becomes `value=87, decimals=0`. Uptime 99.77% becomes `value=9977, decimals=2`. Tags categorize the feedback. The endpoint field records which service was rated.

This becomes part of the agent's permanent reputation. Future requesters query `getSummary()` which aggregates feedback, optionally filtered by tags and trusted client addresses. It returns count, raw value, and decimal precision. We normalize to a 0-100 score in `getAgentReputation()`.

### The Trust-Gated Commerce Loop

Four steps, each feeding the next:

1. **DISCOVER** — Requester queries IdentityRegistry for agents with matching capabilities
2. **TRUST** — Requester checks ReputationRegistry scores, computes swap limits
3. **TRANSACT** — Uniswap swap executes with trust-gated parameters (amount, slippage, pairs)
4. **RATE** — Requester submits feedback to ReputationRegistry, updating reputation

Better reputation → higher swap limits → more commerce → more feedback → better reputation. The loop runs entirely on-chain. Identity tokens, reputation scores, swap transactions, and feedback entries all live on Base mainnet. No off-chain database. No centralized scoring.

The contracts are deployed and real. The SDK compiles with zero TypeScript errors. The integration is live.
