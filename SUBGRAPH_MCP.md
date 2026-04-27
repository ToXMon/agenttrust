# Subgraph MCP Integration — AgentTrust

## MCP Server Configuration

The Subgraph MCP server is wired into Agent Zero at `/a0/usr/settings.json`.

### Binary

- **Location**: `/a0/usr/tools/subgraph-mcp`
- **Source**: Built from [graphops/subgraph-mcp](https://github.com/graphops/subgraph-mcp) (Rust, v0.1.1)
- **Mode**: STDIO (default)
- **API Key**: Requires `GATEWAY_API_KEY` from [The Graph Network](https://thegraph.com)

### Configuration in settings.json

```json
{
  "subgraph": {
    "command": "/a0/usr/tools/subgraph-mcp",
    "env": {
      "GATEWAY_API_KEY": ""
    },
    "init_timeout": 120
  }
}
```

### Getting a Free API Key

1. Go to https://thegraph.com
2. Sign up / connect wallet
3. Navigate to Dashboard → API Keys
4. Create a free Gateway API key
5. Set `GATEWAY_API_KEY` in the env block above

### Available MCP Tools

| Tool | Description |
|------|-------------|
| `search_subgraphs_by_keyword` | Search subgraphs by keyword, ordered by signal |
| `get_deployment_30day_query_counts` | 30-day query counts for deployments |
| `get_schema_by_deployment_id` | GraphQL schema via deployment ID (0x...) |
| `get_schema_by_subgraph_id` | GraphQL schema via subgraph ID |
| `get_schema_by_ipfs_hash` | GraphQL schema via IPFS hash (Qm...) |
| `execute_query_by_deployment_id` | Execute GraphQL query via deployment ID |
| `execute_query_by_subgraph_id` | Execute GraphQL query via subgraph ID |
| `execute_query_by_ipfs_hash` | Execute GraphQL query via IPFS hash |
| `get_top_subgraph_deployments` | Top 3 deployments for a contract address |

---

## Uniswap Subgraph Endpoints

### Endpoint Pattern

```
https://gateway.thegraph.com/api/<API_KEY>/subgraphs/id/<SUBGRAPH_ID>
```

### Uniswap v3 — Base Chain

| Name | Subgraph ID | Source |
|------|------------|--------|
| **Uniswap V3 Base (Official)** | `43Hwfi3dJSoGpyas9VwNoDAv55yjgGrPpNSmbQZArzMG` | Uniswap team |
| **Uniswap V3 Base (Messari)** | `FUbEPQw1oMghy39fwWBFY5fE6MXPXZQtjncQy2cXdrNS` | Messari standardized schema |

**Recommended for AgentTrust**: Use the **Official** subgraph (`43Hwfi3dJ...`) for trust-gated token swaps.

**Endpoint**: `https://gateway.thegraph.com/api/<API_KEY>/subgraphs/id/43Hwfi3dJSoGpyas9VwNoDAv55yjgGrPpNSmbQZArzMG`

### Uniswap v4 — Base Chain

| Name | Subgraph ID | Source |
|------|------------|--------|
| **Uniswap V4 Base** | `2L6yxqUZ7dT6GWoTy9qxNBkf9kEk65me3XPMvbGsmJUZ` | Uniswap team |

**Endpoint**: `https://gateway.thegraph.com/api/<API_KEY>/subgraphs/id/2L6yxqUZ7dT6GWoTy9qxNBkf9kEk65me3XPMvbGsmJUZ`

### Uniswap — Ethereum Mainnet (Reference)

| Version | Subgraph ID |
|---------|------------|
| **v3 Mainnet** | `5zvR82QoaXYFyDEKLZ9t6v9adgnptxYpKpSbxtgVENFV` |
| **v4 Mainnet** | `DiYPVdygkfjDWhbxGSqAQxwBKmfKnkWQojqeM2rkLb3G` |
| **v2 Mainnet** | `A3Np3RQbaBA6oKJgiwDGeo5T3zrYfGHPWFYayMwtNDum` |
| **v1 Mainnet** | `ESnjgAG9NjfmHypk4Huu4PVvz55fUwpyrRqHF21thoLJ` |

### ENS — Ethereum Mainnet

| Name | Subgraph ID |
|------|------------|
| **ENS** | `5XqPmWe6gjyrJtFn9cLy237i4cWw2j9HcUJEXsP5qGtH` |

**Endpoint**: `https://gateway.thegraph.com/api/<API_KEY>/subgraphs/id/5XqPmWe6gjyrJtFn9cLy237i4cWw2j9HcUJEXsP5qGtH`

---

## AgentTrust Integration — Trust-Gated Token Swaps

### Primary Subgraphs Required

| Use Case | Subgraph | ID |
|----------|----------|----|
| Token swap pricing (v3) | Uniswap V3 Base | `43Hwfi3dJSoGpyas9VwNoDAv55yjgGrPpNSmbQZArzMG` |
| Token swap pricing (v4) | Uniswap V4 Base | `2L6yxqUZ7dT6GWoTy9qxNBkf9kEk65me3XPMvbGsmJUZ` |
| Agent ENS resolution | ENS Mainnet | `5XqPmWe6gjyrJtFn9cLy237i4cWw2j9HcUJEXsP5qGtH` |
| Pool TVL verification | Uniswap V3 Base (Messari) | `FUbEPQw1oMghy39fwWBFY5fE6MXPXZQtjncQy2cXdrNS` |

### Verification Query — Top 10 Pools by TVL (v3 Base)

```graphql
{
  pools(orderBy: totalValueLockedUSD, orderDirection: desc, first: 10) {
    id
    token0 { symbol name }
    token1 { symbol name }
    totalValueLockedUSD
    volumeUSD
    feeTier
    txCount
  }
}
```

### Agent-to-Agent Swap Flow (via Subgraph)

1. **Discover pools**: Query v3/v4 Base subgraph for pools matching token pair
2. **Check TVL**: Verify pool has sufficient liquidity for trust-gated swap
3. **Get pricing**: Calculate expected output from pool reserves
4. **Verify trust**: Check agent's trust NFT (ERC-7857) and reputation score
5. **Execute swap**: Route through Uniswap API with trust verification proof
6. **Record audit**: Log swap in 0G Storage for on-chain audit trail

---

## Notes

- The container environment has **no direct internet access** to `api.thegraph.com` or `gateway.thegraph.com` — live queries require network egress or a proxy
- For the hackathon demo, use The Graph's **remote hosted MCP service** via `npx mcp-remote` if available, or call subgraphs from the frontend (Next.js server-side)
- Subgraph IDs were verified via Graph Explorer search results as of 2026-04-26
- All IDs use the Graph Network decentralized endpoint pattern (not the deprecated hosted service)

## Build Instructions (for reference)

```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
source "$HOME/.cargo/env"

# Build subgraph-mcp
git clone --depth 1 https://github.com/graphops/subgraph-mcp.git /tmp/subgraph-mcp
cd /tmp/subgraph-mcp && cargo build --release

# Install to Agent Zero tools
mkdir -p /a0/usr/tools
cp /tmp/subgraph-mcp/target/release/subgraph-mcp /a0/usr/tools/
chmod +x /a0/usr/tools/subgraph-mcp
```
