# Handoff — WP6.5 Complete ✅ → WP7 (Uniswap + KeeperHub) NEXT

**Date:** 2026-04-29
**Session:** 6
**Status:** WP6.5 DONE ✅ → WP7 (Uniswap + KeeperHub Integration) NEXT

## ✅ WP6.5: Base Mainnet Deployment + Basename Integration — COMPLETE

### Phase 1: Security Hardening ✅
All 3 contracts hardened per Etherscan Contract Analyzer feedback:
- **TrustNFT.sol**: Added ReentrancyGuardTransient + nonReentrant on mintTrustNFT
- **ServiceAgreement.sol**: Added provider != address(0) validation + ServiceAgreement__ZeroAddress error
- **AgentRegistry.sol**: Added ReentrancyGuardTransient + nonReentrant + ensName empty validation + AgentRegistry__EmptyENSName error
- All contracts already had: Ownable2Step, custom errors with ContractName__ prefix, @custom:security-contact natspec, Solidity 0.8.28 built-in SafeMath
- Commit: `649afee`

### Phase 2: Base Mainnet Deployment ✅
Deployed all 3 hardened contracts to Base Mainnet (chainId 8453):

| Contract | Base Mainnet Address |
|----------|---------------------|
| AgentRegistry | `0xc44cC67485A6A5AB46978752789954a8Ae845eeA` |
| ServiceAgreement | `0x109bA5eDd23c247771F2FcD7572E8334278dBE81` |
| TrustNFT | `0x0374f7516E57e778573B2e90E6D7113b8253FF5C` |

- Gas used: 0.0000214037922 ETH (4,196,822 gas)
- All txs confirmed in block 45352637
- deployedContracts.ts updated via foundry-bridge.js (chainId 8453 + 84532)
- Commit: `5f5cc77`

### Phase 3: Basename Integration ✅
- Added `BASE_MAINNET_ENS_CONFIG` to sdk/ens.ts (chainId 8453)
- Dynamic chain selection in ENSClient constructor/initWallet (base vs baseSepolia)
- Updated requester ens-setup.ts: BASE_MAINNET_ENS_CONFIG
- Updated provider ens-setup.ts: BASE_MAINNET_ENS_CONFIG
- tsc --noEmit: 0 errors
- Commit: `e41c584`

### Phase 4: Verification ✅
- forge test: 24/24 passed
- tsc --noEmit: 0 errors
- All contracts on Base Mainnet

### Base Mainnet Basename Addresses

| Contract | Address |
|----------|----------|
| Registry | `0xb94704422c2a1e396835a571837aa5ae53285a95` |
| L2Resolver | `0xC6d566A56A1aFf6508b41f6c90ff131615583BCD` |
| BaseRegistrar | `0x03c4738ee98ae44591e1a4a4f3cab6641d95dd9a` |
| RegistrarController | `0x4cCb0BB02FCABA27e82a56646E81d8c5bC4119a5` |
| RPC | `https://mainnet.base.org` |
| ChainId | `8453` |
| Block Explorer | `https://basescan.org` |

### Basename Subname Architecture
```
agentrust.base.eth              ← Parent (registered by user)
├── requester.agentrust.base.eth ← Requester agent identity
├── provider.agentrust.base.eth  ← Provider agent identity  
├── explorer.agentrust.base.eth  ← Frontend/dashboard
└── agent-XXX.agentrust.base.eth ← Future registered agents
```

**NOTE:** Subnames and text records need to be set by the user (owner of agentrust.base.eth) using the agent ens-setup scripts with their private key.

### WP6.5 Commits
- `649afee` — security: harden contracts per Etherscan feedback
- `5f5cc77` — deploy: hardened contracts to Base Mainnet (chainId 8453)
- `e41c584` — feat: Base Mainnet basename integration with agentrust.base.eth

## Base Sepolia (for reference, NOT priority)

| Contract | Sepolia Address |
|----------|----------------|
| AgentRegistry | `0x6ce3d4bf7c7140924c6ab7579b8b86dc9ebf7a02` |
| TrustNFT | `0x92f725c404d355645d5daf9d7ab7967f2f15a952` |
| ServiceAgreement | `0xc9caaa6d70b8b2f73d96d7154cb8c2c97ec16bb4` |

## WP7: Uniswap + KeeperHub Integration (NEXT)

### Tasks
1. Build sdk/uniswap.ts — trust-gated token swaps (agent pays agent)
2. Build sdk/keeperhub.ts — MCP integration for reliable execution
3. **MANDATORY:** Fill FEEDBACK.md for Uniswap prize track (auto-DQ without it)
4. **MANDATORY:** Fill KEEPERHUB_FEEDBACK.md for bonus prize track
5. Integration test: full agent-to-agent commerce flow with payment

### Sponsor Tracks
- Uniswap API Prize ($5K)
- KeeperHub Prize ($2K)

## ENS Prize Qualification Status

| Track | Prize | Status |
|-------|-------|--------|
| Best ENS Integration for AI Agents | $2,500 | ✅ Qualified — Agent metadata in ENS text records, trust scores linked via TrustNFT, live on Base Mainnet |
| Best ENS Subname Ecosystem | $2,500 | ✅ Qualified — agentrust.base.eth parent with subnames for each agent role |

## AXL Nodes (Unchanged from WP5)
- Node A (requester): api=9002, tcp=7000
- Node B (provider): api=9012, tcp=7000
- CRITICAL: both nodes MUST use same tcp_port=7000

## Key References
- ENS Research: `docs/reference/ens-research.md`
- Basenames GitHub: `https://github.com/base/basenames`
- AXL Client: `axl/axl-client.ts`
- Protocol: `axl/protocol.ts`
- SDK ENS: `sdk/ens.ts`
- Uniswap API Docs: `https://docs.uniswap.org/api`
- KeeperHub Docs: `https://docs.keeperhub.com`
