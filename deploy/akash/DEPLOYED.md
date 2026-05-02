# AgentTrust — Deployment Status

> Fill in after deploying services on Akash Console.

## Service Endpoints

| Service | Akash URI | Status | First Deployed |
|---------|-----------|--------|---------------|
| Frontend | _(fill after deploy)_ | ⏳ Pending | — |
| AXL Alpha (Requester) | _(fill after deploy)_ | ⏳ Pending | — |
| AXL Beta (Provider) | _(fill after deploy)_ | ⏳ Pending | — |
| Orchestrator | _(fill after deploy)_ | ⏳ Pending | — |

## ENS / Basename Records

### agentrust.base.eth (parent)
| Key | Value | TX Hash |
|-----|-------|--------|
| url | https://_(frontend)_ | 0x592850fd... (set) |
| description | AgentTrust — Verifiable Agent Commerce Protocol | _(pending)_ |
| com.github | https://github.com/ToXMon/agentrust | _(pending)_ |

### requester.agentrust.base.eth
| Key | Value | TX Hash |
|-----|-------|--------|
| agent.type | requester | _(pending)_ |
| agent.capabilities | ["research","analysis","data-fetching"] | _(pending)_ |
| agent.endpoint | axl://_(alpha-uri)_:9002 | _(pending)_ |
| agent.status | active | _(pending)_ |
| agent.pricing | 0.0005 ETH per analysis | _(pending)_ |

### provider.agentrust.base.eth
| Key | Value | TX Hash |
|-----|-------|--------|
| agent.type | provider | _(pending)_ |
| agent.capabilities | ["computation","verification","block-analysis"] | _(pending)_ |
| agent.endpoint | axl://_(beta-uri)_:9012 | _(pending)_ |
| agent.status | active | _(pending)_ |
| agent.pricing | 0.0005 ETH per analysis | _(pending)_ |

### explorer.agentrust.base.eth
| Key | Value | TX Hash |
|-----|-------|--------|
| agent.type | dashboard | _(pending)_ |
| agent.endpoint | https://_(frontend)_ | _(pending)_ |

## Smoke Tests

### 1. Frontend Returns 200
```bash
curl -sf https://FRONTEND_URI -o /dev/null && echo 'OK' || echo 'FAIL'
```
Result: _(fill after deploy)_

### 2. ENS Resolves
```bash
npx tsx scripts/check-ens.ts
```
Result: _(fill after deploy)_

### 3. AXL Nodes Reachable
```bash
curl -sf http://ALPHA_URI:9002/topology | jq .
curl -sf http://BETA_URI:9012/topology | jq .
```
Result: _(fill after deploy)_

### 4. Frontend→AXL Proxy
```bash
curl -sf https://FRONTEND_URI/api/axl?endpoint=topology | jq .
```
Result: _(fill after deploy)_

### 5. P2P Messaging
```bash
npx tsx axl/integration-test.ts
```
Result: _(fill after deploy)_

### 6. Full Demo Flow
REGISTER → DISCOVER → NEGOTIATE → ESCROW → EXECUTE → VERIFY → SETTLE
```bash
npx tsx demo/live-demo.ts
```
Result: _(fill after deploy)_

## Docker Images

| Image | Tag | Status |
|-------|-----|--------|
| ghcr.io/toxmon/agentrust-frontend | v0.1.0 | ⏳ Needs local build |
| ghcr.io/toxmon/agentrust-axl-alpha | v0.1.0 | ⏳ Needs local build |
| ghcr.io/toxmon/agentrust-axl-beta | v0.1.0 | ⏳ Needs local build |
| ghcr.io/toxmon/agentrust-orchestrator | v0.1.0 | ⏳ Needs local build |

## Build & Push Instructions

Docker is not available in the dev container. Run locally:
```bash
chmod +x scripts/docker-build-push.sh
./scripts/docker-build-push.sh v0.1.0 push
```

Requires `GITHUB_TOKEN` env var with GHCR push permissions.

## Akash SDL Files

All SDLs are in `deploy/akash/`:
- `frontend.yaml` — Next.js 14 standalone
- `axl-node-alpha.yaml` — Gensyn AXL requester node
- `axl-node-beta.yaml` — Gensyn AXL provider node
- `orchestrator.yaml` — Agent coordination

Deploy each via Akash Console: https://console.akash.network
