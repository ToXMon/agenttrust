# AgentTrust — Deployment Status

> Production deployment via Akash Console API (managed wallet)

## Service Endpoints

| Service | Akash URI | Status | First Deployed |
|---------|-----------|--------|---------------|
| Frontend | https://kdjf7q0t0leph7vm8mmo455g2o.ingress.akt.engineer | ✅ LIVE (HTTP 200) | 2026-05-02 |
| AXL Alpha (Requester) | https://9nm3dahv8db5b9m3q8spvc7o7o.ingress.akash-palmito.org | ✅ LIVE (HTTP 200, 2 peers) | 2026-05-02 |
| AXL Beta (Provider) | https://n8jr4en77l8l972bk9i1d40sj4.ingress.akash-palmito.org | ✅ LIVE (HTTP 200, 2 peers) | 2026-05-02 |
| Orchestrator | https://g0rqlqr8qd8qhdv51lpaqb907c.ingress.akt.engineer | ✅ LIVE (HTTP 200, healthy) | 2026-05-02 |

## Deployment IDs

| Service | DSEQ | Provider |
|---------|------|----------|
| Frontend | 26646064 | akash10tgqesyq4ehchhzh224vy9h3... |
| AXL Alpha | 26646067 | akash15ksejj7g4su7ljufsg0a8egl... |
| AXL Beta | 26646070 | akash15ksejj7g4su7ljufsg0a8egl... |
| Orchestrator | 26646073 | akash10tgqesyq4ehchhzh224vy9h3... |

## Inter-Service Wiring

```
Frontend → AXL Alpha: https://9nm3dahv8db5b9m3q8spvc7o7o.ingress.akash-palmito.org
Frontend → AXL Beta:  https://n8jr4en77l8l972bk9i1d40sj4.ingress.akash-palmito.org
Orchestrator → AXL Alpha: https://9nm3dahv8db5b9m3q8spvc7o7o.ingress.akash-palmito.org
Orchestrator → AXL Beta:  https://n8jr4en77l8l972bk9i1d40sj4.ingress.akash-palmito.org
```

## ENS / Basename Records

### agentrust.base.eth (parent)
| Key | Value | TX Hash |
|-----|-------|--------|
| url | https://kdjf7q0t0leph7vm8mmo455g2o.ingress.akt.engineer | 0x592850fd... (set) |
| description | AgentTrust — Verifiable Agent Commerce Protocol | _(pending)_ |
| com.github | https://github.com/ToXMon/agentrust | _(pending)_ |

### requester.agentrust.base.eth
| Key | Value | TX Hash |
|-----|-------|--------|
| agent.type | requester | _(pending)_ |
| agent.capabilities | ["research","analysis","data-fetching"] | _(pending)_ |
| agent.endpoint | https://9nm3dahv8db5b9m3q8spvc7o7o.ingress.akash-palmito.org | _(pending)_ |
| agent.status | active | _(pending)_ |

### provider.agentrust.base.eth
| Key | Value | TX Hash |
|-----|-------|--------|
| agent.type | provider | _(pending)_ |
| agent.capabilities | ["computation","verification","block-analysis"] | _(pending)_ |
| agent.endpoint | https://n8jr4en77l8l972bk9i1d40sj4.ingress.akash-palmito.org | _(pending)_ |
| agent.status | active | _(pending)_ |

### explorer.agentrust.base.eth
| Key | Value | TX Hash |
|-----|-------|--------|
| agent.type | dashboard | _(pending)_ |
| agent.endpoint | https://kdjf7q0t0leph7vm8mmo455g2o.ingress.akt.engineer | _(pending)_ |

## Smoke Tests

### 1. Frontend Returns 200
```bash
curl -sf https://kdjf7q0t0leph7vm8mmo455g2o.ingress.akt.engineer -o /dev/null && echo 'OK' || echo 'FAIL'
```
Result: ✅ OK (HTTP 200, full HTML with title 'AgentTrust — Verifiable Agent Commerce on Base')

### 2. ENS Resolves
```bash
npx tsx scripts/check-ens.ts
```
Result: _(pending)_

### 3. AXL Nodes Reachable
```bash
curl -sf https://9nm3dahv8db5b9m3q8spvc7o7o.ingress.akash-palmito.org/topology | jq .
curl -sf https://n8jr4en77l8l972bk9i1d40sj4.ingress.akash-palmito.org/topology | jq .
```
Result: ✅ ALL LIVE (HTTP 200, valid JSON, 2 bootstrap peers connected)
Both AXL nodes connected to Gensyn bootstrap peers. Frontend proxies topology from both nodes.

### 4. Frontend→AXL Proxy
```bash
curl -sf https://kdjf7q0t0leph7vm8mmo455g2o.ingress.akt.engineer/api/axl?endpoint=topology | jq .
```
Result: _(pending AXL nodes)_

### 5. P2P Messaging
```bash
npx tsx axl/integration-test.ts
```
Result: _(pending)_

### 6. Full Demo Flow
REGISTER → DISCOVER → NEGOTIATE → ESCROW → EXECUTE → VERIFY → SETTLE
```bash
npx tsx demo/live-demo.ts
```
Result: _(pending)_

## Docker Images

| Image | Tag | Registry | Status |
|-------|-----|----------|--------|
| ghcr.io/toxmon/agentrust-frontend | v0.1.0 | GHCR PUBLIC | ✅ Working |
| ghcr.io/toxmon/agentrust-axl-alpha | v0.1.0 | GHCR PUBLIC | ✅ Pushed |
| ghcr.io/toxmon/agentrust-axl-beta | v0.1.0 | GHCR PUBLIC | ✅ Pushed |
| ghcr.io/toxmon/agentrust-orchestrator | v0.1.0 | GHCR PUBLIC | ✅ Pushed |

## Key Learnings

1. **HOSTNAME override**: K8s overrides HOSTNAME env var with pod name. Next.js server.js binds to
   that hostname instead of 0.0.0.0. Fix: Use SDL `command` field with `HOSTNAME=0.0.0.0 exec node server.js`
2. **GHCR visibility**: Default is PRIVATE. Akash providers CANNOT pull private images. Must make public via
   GitHub API: `PATCH /user/packages/container/{name}` with `{"visibility":"public"}`
3. **Console API manifest**: The `manifest` field from `POST /v1/deployments` response must be passed to
   `POST /v1/leases` — do NOT pass raw SDL YAML as manifest
4. **URI polling**: Use individual `GET /v1/deployments/{dseq}` endpoint (not the list endpoint) to get service
   URIs and status
5. **Update Deployment**: Use `PUT /v1/deployments/{dseq}` to update env vars without changing URI
