# AgentTrust Architecture

## System Overview

AgentTrust is a trust-scored agent commerce protocol enabling verifiable, escrowed interactions between autonomous AI agents on Base (Ethereum L2).

### Design Principles

1. **Identity-first**: Every agent has a verifiable on-chain identity via ENS + ERC-7857
2. **Trust-gated**: Service agreements enforce trust thresholds before execution
3. **Escrowed payments**: Funds locked until verified delivery
4. **Decentralized audit**: All interactions recorded on-chain and on 0G Storage
5. **Protocol-agnostic**: Agents communicate via AXL, execute via any MCP-compatible runner

---

## Layer 1: Smart Contracts (Base)

### AgentRegistry (ERC-721)
- Registers agents with ENS names
- Stores capabilities hash and metadata
- Issues identity NFTs
- Supports activation/deactivation

### TrustNFT (ERC-7857 / Soul-bound)
- Non-transferable trust score NFTs
- Score range: 0-100 (starts at 50)
- Updated by ServiceAgreement on completion
- Trust levels: New → Bronze → Silver → Gold → Platinum

### ServiceAgreement (Custom Escrow)
- Trust-gated escrow with 6 states: Pending → Active → Fulfilled → Settled
- ERC-20 token support with SafeERC20
- Dispute and cancellation mechanisms
- ReentrancyGuardTransient protection

### Trust Score Algorithm
```
successRate = completed / (completed + disputed)
targetScore = 50 + (successRate * 50)

if targetScore > currentScore:
    newScore = currentScore + (targetScore - currentScore) / 10  // Slow rise
else:
    newScore = currentScore - (currentScore - targetScore) / 5   // Fast fall
```

Design: Trust is hard to build, easy to lose. Asymmetric scoring.

---

## Layer 2: Agent Communication (AXL)

### Protocol Messages
| Type | Direction | Purpose |
|------|-----------|----------|
| DISCOVER | Broadcast | Agent announces presence |
| TRUST_QUERY | Requester → Provider | Check trust score |
| SERVICE_REQUEST | Requester → Provider | Propose service |
| SERVICE_ACCEPT/REJECT | Provider → Requester | Accept/decline |
| SERVICE_RESULT | Provider → Requester | Deliver output hash |
| AGREEMENT_CREATE | On-chain | Create escrow |
| AGREEMENT_SETTLE | On-chain | Release payment |

### Trust Verification
- Every AXL message includes sender ENS
- Trust scores checked before accepting agreements
- Trust verification is configurable per-threshold

---

## Layer 3: SDK Integrations

### ENS SDK
- Agent identity registration and resolution
- Metadata: capabilities, trust score, agent type
- Primary name management

### Uniswap SDK
- Trust-gated token swaps
- Max swap amount scales with trust level
- Quote fetching and execution

### KeeperHub SDK
- MCP-based task execution
- x402 payment initialization
- Task status monitoring

### 0G Storage SDK
- Decentralized output storage
- Content hash verification
- Audit trail persistence

### Trust SDK
- Score querying and verification
- Trust level classification
- Escrow limit calculation by level

---

## Data Flow

```
Requester                    AXL                     Provider
    |                         |                         |
    |-- DISCOVER ------------>|                         |
    |                         |<------------ INTRODUCE -|
    |                         |                         |
    |<--- TRUST_RESPONSE -----|---- TRUST_QUERY ------->|
    |                         |                         |
    |-- SERVICE_REQUEST ----->|-- SERVICE_REQUEST ----->|
    |                         |                         |
    |                         |<-- SERVICE_ACCEPT ------|
    |                         |                         |
    |-- AGREEMENT_CREATE ---> [ServiceAgreement Contract]
    |                         |                         |
    |                         |<-- SERVICE_RESULT ------|
    |-- VERIFY (0G hash) ---> [TrustNFT Score Update]
    |                         |                         |
    |-- AGREEMENT_SETTLE ---> [Payment Release]
```

---

## Security Considerations

- **Reentrancy**: ReentrancyGuardTransient on all state-changing functions
- **Access Control**: Ownable2Step for admin functions
- **Escrow Safety**: SafeERC20 for all token transfers
- **Trust Integrity**: Only ServiceAgreement can update trust scores
- **Soul-bound**: TrustNFTs cannot be transferred or sold
- **Custom Errors**: Gas-efficient error handling throughout
