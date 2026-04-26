# Sponsor Prize Alignment

## How AgentTrust Qualifies for Each Sponsor Prize

---

## Base — Best on Base

### Integration
- All three smart contracts deployed on Base (Ethereum L2)
- AgentRegistry, TrustNFT, ServiceAgreement all on Base mainnet
- Trust scores stored on-chain on Base
- Low fees enable micro-transactions between agents

### Why Base
- 2-second block times enable fast agreement lifecycle
- Ethereum security with L2 scalability
- Growing agent ecosystem on Base

### Demo Proof
- Deploy contracts to Base
- Show agreements on Base block explorer
- Gas costs < $0.01 per agreement

---

## ENS — Best ENS Integration

### Integration
- Every agent registers with an ENS name (e.g., `requester.agenttrust.eth`)
- ENS names serve as human-readable agent identifiers
- Agent metadata stored in ENS text records
- Primary name resolution for agent addresses

### Why ENS
- Agents need human-readable identity, not just addresses
- ENS provides decentralized, verifiable naming
- Integrates with existing Ethereum tooling

### Demo Proof
- Show agent ENS names resolving to addresses
- Display agent metadata from ENS records
- Demonstrate ENS-based agent discovery

---

## Uniswap — Uniswap API Prize

### Integration
- Trust-gated token swaps via Uniswap V3
- Max swap amount scales with agent trust level
- Quote API for price estimation before service agreements
- Swap execution for cross-token payments

### Why Uniswap
- Agents need to swap tokens for service payments
- Trust scoring provides novel swap gating mechanism
- New use case: reputation-based trading limits

### Demo Proof
- Show quote API in action
- Demonstrate trust-gated swap limits
- Display swap execution in settlement step

---

## KeeperHub — KeeperHub Integration Prize

### Integration
- Provider agent executes tasks via KeeperHub MCP server
- x402 payment protocol for task execution
- MCP tools for task submission and monitoring
- CLI integration for task management

### Why KeeperHub
- MCP is becoming the standard for agent tool use
- x402 enables pay-per-task agent execution
- KeeperHub provides reliable execution infrastructure

### Demo Proof
- Show MCP task submission in Step 5 (EXECUTE)
- Display x402 payment initialization
- Show task status monitoring

---

## 0G — 0G Storage Prize

### Integration
- Agent outputs stored on 0G decentralized storage
- Content hashes verified on-chain in ServiceAgreement
- Audit trail persisted on 0G
- Trust score metadata backed up on 0G

### Why 0G
- Agent outputs need decentralized, verifiable storage
- On-chain hash + off-chain data pattern
- 0G provides cost-effective decentralized storage

### Demo Proof
- Show output stored on 0G in Step 6 (VERIFY)
- Display content hash verification
- Show audit trail retrieval from 0G

---

## Prize Priority

1. **Base** — Core infrastructure prize (highest confidence)
2. **ENS** — Strong integration, clear use case
3. **Uniswap** — Novel trust-gated swap mechanism
4. **0G** — Natural storage layer for agent outputs
5. **KeeperHub** — MCP-based execution integration
