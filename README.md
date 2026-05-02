# AgentTrust

**Verifiable Agent Commerce Protocol**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Solidity 0.8.28](https://img.shields.io/badge/Solidity-0.8.28-363636.svg)](https://docs.soliditylang.org/)
[![Base](https://img.shields.io/badge/Chain-Base-0052FF.svg)](https://base.org)
[![ETHGlobal Open Agents](https://img.shields.io/badge/ETHGlobal-Open_Agents_2026-purple.svg)](https://ethglobal.com/events/openagents)
[![Akash Network](https://img.shields.io/badge/Deployed-Akash_Network-FF414C.svg)](https://akash.network)

> **Trust-scored agent interactions with verifiable identity, escrowed payments, and decentralized communication.**

---

## The Problem

AI agents are trading services and executing transactions — but there's no standard way to:
- **Verify who an agent is** (identity)
- **Know if an agent is trustworthy** (reputation)
- **Ensure safe payments** between agents (escrow)
- **Communicate securely** agent-to-agent (messaging)

Result: agents operate in a trust vacuum. Bad actors can impersonate, default on payments, or provide fraudulent services.

## The Solution

AgentTrust is a full-stack protocol where:

1. **Agents register on-chain** with ENS names and identity NFTs (ERC-7857)
2. **Trust scores** are computed from on-chain history and stored as soul-bound NFTs
3. **Service agreements** use trust-gated escrow — payments only release when trust thresholds are met
4. **Agents communicate** via AXL (Agent Exchange Layer) with built-in trust verification
5. **Execution happens** through KeeperHub MCP with x402/MPP payment streams

---

## 🟢 Live Deployment

All 4 services are deployed on **Akash Network** and verified healthy:

| Service | Live URL | DSEQ |
|---------|----------|------|
| **Frontend** | http://kdjf7q0t0leph7vm8mmo455g2o.ingress.akt.engineer | 26646064 |
| **AXL Alpha** (Requester) | http://9nm3dahv8db5b9m3q8spvc7o7o.ingress.akash-palmito.org | 26646067 |
| **AXL Beta** (Provider) | http://n8jr4en77l8l972bk9i1d40sj4.ingress.akash-palmito.org | 26646070 |
| **Orchestrator** | http://g0rqlqr8qd8qhdv51lpaqb907c.ingress.akt.engineer | 26646073 |

**Docker images** (GHCR, public): `ghcr.io/toxmon/agentrust-{frontend,axl-alpha,axl-beta,orchestrator}:v0.1.0`

**Smart Contracts** on Base Mainnet (chainId 8453):
- `AgentRegistry` [`0xc44c...5eeA`](https://basescan.org/address/0xc44cC67485A6A5AB46978752789954a8Ae845eeA)
- `ServiceAgreement` [`0x109b...BE81`](https://basescan.org/address/0x109bA5eDd23c247771F2FcD7572E8334278dBE81)
- `TrustNFT` [`0x0374...FF5C`](https://basescan.org/address/0x0374f7516E57e778573B2e90E6D7113b8253FF5C)

**ENS/Basenames** on Base Mainnet: `agentrust.base.eth` (parent)


## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                  Akash Network (Decentralized Cloud)          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐│
│  │  Frontend     │  │ Orchestrator │  │  AXL Alpha │ AXL Beta││
│  │  (Next.js)    │  │ (Demo Cron)  │  │ Requester  │ Provider││
│  └──────┬────────┘  └──────┬───────┘  └─────┬────────┬──────┘│
└─────────┼───────────────────┼─────────────────┼────────┘       │
           │                   │          ┌──────▼──────┐        │
           │                   │          │ AXL P2P     │        │
           │                   │          │ (Gensyn)    │        │
           │                   │          └─────────────┘        │
     ┌─────▼───────────────────▼──────────────────────────────────┤
     │                     SDK Layer                              │
     │  ENS │ Uniswap │ KeeperHub MCP │ 0G Storage │ Trust        │
     └───────────────────────┬───────────────────────────────────┘
                             │
     ┌───────────────────────▼────────────────────────────────────┐
     │              Base Mainnet (Ethereum L2, chainId 8453)       │
     │  AgentRegistry │ ServiceAgreement │ TrustNFT (ERC-7857)    │
     │  agentrust.base.eth (ENS/Basename parent)                  │
     └────────────────────────────────────────────────────────────┘
```

---

## Protocol Flow

```
1. REGISTER    → Agent registers on-chain with ENS name, receives identity NFT
2. DISCOVER    → Agents find each other via AXL, verify trust scores
3. NEGOTIATE   → Requester proposes service, Provider agrees to terms
4. ESCROW      → Funds locked in ServiceAgreement with trust threshold
5. EXECUTE     → Provider delivers service via KeeperHub MCP
6. VERIFY      → Output verified on-chain, trust scores updated
7. SETTLE      → Payment released from escrow to provider
```

---

## Smart Contracts

| Contract | Purpose | Standard |
|----------|---------|----------|
| `AgentRegistry` | Register agents with ENS + identity metadata | ERC-721 |
| `TrustNFT` | Soul-bound trust score NFTs | ERC-7857 (iNFT) |
| `ServiceAgreement` | Trust-gated escrow for agent services | Custom |

**Chain:** Base (Ethereum L2) — low fees, fast finality, Ethereum security.

**Solidity 0.8.28** with custom errors, named returns, calldata optimization.

---

## Agent System

### Requester Agent
- Registers with ENS identity (`requester.agentrust.base.eth`)
- Discovers provider agents via AXL
- Creates service agreements with trust thresholds
- Releases payment on verified delivery

### Provider Agent
- Registers with ENS identity (`provider.agentrust.base.eth`)
- Advertises capabilities via AXL
- Executes services through KeeperHub MCP
- Earns trust score increments on delivery

---

## SDK Integrations

| SDK | Purpose |
|-----|---------|
| **ENS** | Agent identity resolution and registration |
| **Uniswap** | Trust-gated token swaps for payments |
| **KeeperHub** | MCP-based task execution with x402 payments |
| **0G Storage** | Decentralized storage for agent outputs and audit logs |
| **Trust Engine** | On-chain trust score computation and verification |

---

## Quick Start

### Prerequisites

- Node.js 20+
- Foundry (for smart contracts)
- MetaMask or compatible wallet with Base ETH

> **🟢 Live Demo:** The project is deployed on Akash Network. Visit the [live frontend](http://kdjf7q0t0leph7vm8mmo455g2o.ingress.akt.engineer) to see AgentTrust in action. The Quick Start below is for local development only.

### Setup

```bash
# Clone
git clone https://github.com/ToXMon/agenttrust.git
cd agenttrust

# Install dependencies
npm install

# Copy environment config
cp .env.example .env
# Fill in your private keys and API keys

# Build
npm run build
```

### Smart Contracts

```bash
cd contracts

# Install dependencies
forge install

# Compile
forge build

# Test
forge test -vvv

# Deploy to Base
forge script script/Deploy.s.sol --rpc-url $RPC_URL --broadcast
```

### Run Demo

```bash
# Full automated demo
npm run demo
```

---

## Demo Flow (4 minutes)

1. **Agent Registration** — Watch both agents register on-chain with ENS names
2. **Trust Discovery** — See agents discover each other and verify trust scores
3. **Service Negotiation** — Requester proposes a data analysis task
4. **Escrow Deposit** — Funds locked in ServiceAgreement contract
5. **Execution** — Provider runs analysis via KeeperHub MCP
6. **Verification** — Output stored on 0G, hash verified on-chain
7. **Settlement** — Payment released, trust scores updated

---

## Sponsor Prize Alignment

| Sponsor | Integration | Prize Category |
|---------|-------------|----------------|
| **Base** | All contracts deployed on Base, on-chain trust scores | Best on Base |
| **ENS** | Agent identity through ENS names + resolution | Best ENS Integration |
| **Uniswap** | Trust-gated token swaps for cross-agent payments | Uniswap API |
| **KeeperHub** | MCP-based agent execution with x402 payments | KeeperHub |
| **0G** | Decentralized storage for agent outputs and audit trails | 0G Storage |

---

## Project Structure

```
agenttrust/
├── contracts/          # Solidity smart contracts (Foundry)
│   ├── src/            # Contract source
│   ├── test/           # Forge tests
│   └── script/         # Deploy scripts
├── agents/             # AI agent implementations
│   ├── requester-agent/
│   └── provider-agent/
├── axl/                # Agent Exchange Layer
├── sdk/                # Integration SDKs
├── frontend/           # Next.js dashboard
├── demo/               # Automated demo scenario
├── video/              # Demo video assets
└── docs/               # Architecture documentation
```

---

## Tech Stack

- **Smart Contracts:** Solidity 0.8.28, Foundry, OpenZeppelin
- **Chain:** Base Mainnet (Ethereum L2, chainId 8453)
- **Agents:** TypeScript, AXL protocol (Gensyn)
- **Identity:** ENS/Basenames, ERC-7857 (identity NFTs)
- **Execution:** KeeperHub MCP, x402 payments
- **Storage:** 0G (decentralized)
- **Frontend:** Next.js 14, TypeScript, TailwindCSS
- **Deployment:** Akash Network (decentralized cloud), Docker, GHCR
- **Standards:** ERC-721, ERC-7857, MCP

---

## Deployment

All services run on **Akash Network** — decentralized cloud infrastructure.

### Docker Images (GHCR, public)

```
ghcr.io/toxmon/agentrust-frontend:v0.1.0
ghcr.io/toxmon/agentrust-axl-alpha:v0.1.0
ghcr.io/toxmon/agentrust-axl-beta:v0.1.0
ghcr.io/toxmon/agentrust-orchestrator:v0.1.0
```

### Key Learnings

1. **HOSTNAME override**: K8s/Docker overrides `HOSTNAME` with the pod name. Next.js binds to that hostname instead of `0.0.0.0`. Fix: set `HOSTNAME=0.0.0.0` in the SDL `command` field.
2. **GHCR visibility**: Default image visibility is PRIVATE. Akash providers cannot pull private images. Must set visibility to `public` via GitHub API.
3. **Akash Console API**: The `manifest` field from deployment creation must be passed to lease creation — do NOT pass raw SDL YAML as manifest.
4. **Update without rebuild**: Use `PUT /v1/deployments/{dseq}` to update env vars or command fields without changing the service URI.

See [deploy/akash/DEPLOYED.md](deploy/akash/DEPLOYED.md) for full deployment details.


## AI Usage Disclosure

This project used AI agents (Agent Zero) for:
- Project scaffolding and boilerplate generation
- Smart contract structure and test generation
- Documentation writing

All AI-generated code was reviewed, tested, and modified by the team.
See [AI_USAGE.md](./AI_USAGE.md) for full disclosure.

---

## License

MIT

---

Built at [ETHGlobal Open Agents Hackathon 2026](https://ethglobal.com/events/openagents) 🏗️
