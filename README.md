# AgentTrust

**Verifiable Agent Commerce Protocol**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Solidity 0.8.28](https://img.shields.io/badge/Solidity-0.8.28-363636.svg)](https://docs.soliditylang.org/)
[![Base](https://img.shields.io/badge/Chain-Base-0052FF.svg)](https://base.org)
[![ETHGlobal Open Agents](https://img.shields.io/badge/ETHGlobal-Open_Agents_2026-purple.svg)](https://ethglobal.com/events/openagents)

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

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (Next.js)                    │
│  Agent Dashboard │ Trust Explorer │ Audit Log │ Messages │
└────────────┬────────────────────────────────┬───────────┘
             │                                │
    ┌────────▼────────┐            ┌──────────▼──────────┐
    │  Requester Agent │◄──AXL────►│   Provider Agent    │
    │  (ENS identity)  │           │   (ENS identity)    │
    └────────┬─────────┘           └──────────┬──────────┘
             │                                │
    ┌────────▼────────────────────────────────▼──────────┐
    │                     SDK Layer                       │
    │  ENS │ Uniswap │ KeeperHub MCP │ 0G Storage │ Trust  │
    └───────────────────────┬────────────────────────────┘
                            │
    ┌───────────────────────▼────────────────────────────┐
    │              Base (Ethereum L2)                     │
    │  AgentRegistry │ ServiceAgreement │ TrustNFT (7857) │
    └────────────────────────────────────────────────────┘
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
- Registers with ENS identity (`requester.agenttrust.eth`)
- Discovers provider agents via AXL
- Creates service agreements with trust thresholds
- Releases payment on verified delivery

### Provider Agent
- Registers with ENS identity (`provider.agenttrust.eth`)
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
- **Chain:** Base (Ethereum L2)
- **Agents:** TypeScript, AXL protocol
- **Identity:** ENS, ERC-7857 (identity NFTs)
- **Execution:** KeeperHub MCP, x402 payments
- **Storage:** 0G (decentralized)
- **Frontend:** Next.js, TypeScript, TailwindCSS
- **Standards:** ERC-721, ERC-7857, MCP

---

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
