# AgentTrust Demo Script — 4 Minutes

**ETHGlobal Open Agents Hackathon 2026**

---

## 0:00-0:30 — Introduction

> "AI agents are starting to trade services and execute transactions autonomously. But there's no standard way to verify who an agent is, whether they're trustworthy, or ensure safe payments. AgentTrust solves this."

- Show title slide with architecture diagram
- Highlight the problem: trust vacuum in agent commerce

---

## 0:30-1:00 — Architecture Overview

> "AgentTrust is a full-stack protocol with three layers: smart contracts on Base for identity and escrow, an agent communication layer via AXL, and SDK integrations for ENS, Uniswap, and KeeperHub."

- Show architecture diagram
- Walk through: Frontend → Agents → SDK → Contracts
- Highlight sponsor integrations

---

## 1:00-2:30 — Live Demo: 7-Step Protocol

### Step 1: REGISTER (0:15)
> "First, both agents register on-chain. The requester and provider each get an identity NFT linked to their ENS name."
- Run: `npm run demo`
- Show terminal output: agent registration tx hashes

### Step 2: DISCOVER (0:15)
> "Agents discover each other via AXL. The requester queries the network and finds our provider."
- Show AXL discovery output
- Display provider trust score: 50 (Bronze)

### Step 3: NEGOTIATE (0:15)
> "The requester proposes a data analysis task for 10 USDC. The provider accepts because the trust threshold is met."
- Show service proposal and acceptance

### Step 4: ESCROW (0:15)
> "10 USDC is locked in our ServiceAgreement contract on Base. Funds won't move until the service is delivered and verified."
- Show escrow creation on Base
- Link to block explorer

### Step 5: EXECUTE (0:15)
> "The provider executes the analysis via KeeperHub MCP. This is where the actual work happens."
- Show KeeperHub task execution
- MCP server logs

### Step 6: VERIFY (0:15)
> "The output is stored on 0G Storage, and the content hash is verified on-chain. The provider's trust score increases from 50 to 55."
- Show 0G storage confirmation
- Trust score update event

### Step 7: SETTLE (0:15)
> "Payment is released from escrow. The agreement is settled. Both agents have an auditable on-chain record."
- Show settlement tx
- Final agreement status

---

## 2:30-3:30 — Technical Deep Dive

### Smart Contracts
- Walk through TrustNFT (ERC-7857 soul-bound)
- Show ServiceAgreement escrow with trust threshold
- Explain trust score algorithm: success rate weighted scoring

### SDK Integrations
- ENS: agent identity resolution
- Uniswap: trust-gated swaps (max amount scales with trust)
- KeeperHub: MCP-based execution with x402 payments
- 0G: decentralized audit trail storage

---

## 3:30-4:00 — Closing

> "AgentTrust enables trust-scored agent commerce on Base. Every agent has a verifiable identity, every agreement is escrowed, and every interaction builds an on-chain reputation. This is how AI agents should trade."

- Show final dashboard view
- Recap sponsor integrations
- Call to action: github.com/ToXMon/agenttrust

---

## Demo Checklist

- [ ] Terminal ready with `npm run demo`
- [ ] Frontend dashboard running
- [ ] Block explorer tabs open
- [ ] Architecture diagram visible
- [ ] Backup plan: pre-recorded terminal output
