# Handoff — WP6 Complete → WP6.5 (Base Mainnet) NEXT

**Date:** 2026-04-29
**Session:** 5
**Status:** WP6 DONE ✅ → WP6.5 (Base Mainnet Deployment + Basename) NEXT

## 🚨 CRITICAL PIVOT: Base Mainnet Deployment

The user registered **`agentrust.base.eth`** on **BASE MAINNET** (chainId 8453).
They have mainnet funds ready to deploy contracts.
Base Sepolia basename registration was not found, so we're going straight to mainnet.

### Base MAINNET Contract Addresses (Basename System)

| Contract | Address |
|----------|----------|
| Registry | `0xb94704422c2a1e396835a571837aa5ae53285a95` |
| L2Resolver | `0xC6d566A56A1aFf6508b41f6c90ff131615583BCD` |
| BaseRegistrar | `0x03c4738ee98ae44591e1a4a4f3cab6641d95dd9a` |
| RegistrarController | `0x4cCb0BB02FCABA27e82a56646E81d8c5bC4119a5` |
| ReverseRegistrar | `0x79ea96012eea67a83431f1701b3dff7e37f9e282` |
| RPC | `https://mainnet.base.org` |
| ChainId | `8453` |
| Block Explorer | `https://basescan.org` |

### Base Sepolia (for reference, NOT priority)

| Contract | Address |
|----------|----------|
| Registry | `0x1493b2567056c2181630115660963E13A8E32735` |
| L2Resolver | `0x6533C94869D28fAA8dF77cc63f9e2b2D6Cf77eBA` |
| RPC | `https://sepolia.base.org` |
| ChainId | `84532` |

### Deployed Contracts (Base Sepolia — WP4, needs mainnet redeploy)

| Contract | Sepolia Address |
|----------|----------------|
| AgentRegistry | `0x6ce3d4bf7c7140924c6ab7579b8b86dc9ebf7a02` |
| TrustNFT | `0x92f725c404d355645d5daf9d7ab7967f2f15a952` |
| ServiceAgreement | `0xc9caaa6d70b8b2f73d96d7154cb8c2c97ec16bb4` |

## WP6.5: Base Mainnet Deployment + Basename Integration

### Tasks (Priority Order)

1. **Deploy contracts to Base Mainnet** (AgentRegistry, TrustNFT, ServiceAgreement)
   - Update foundry config for chainId 8453
   - Deploy using user's wallet private key
   - Verify contracts on Basescan

2. **Update sdk/ens.ts** for Base Mainnet
   - Add `BASE_MAINNET_ENS_CONFIG` alongside `BASE_SEPOLIA_ENS_CONFIG`
   - L2Resolver: `0xC6d566A56A1aFf6508b41f6c90ff131615583BCD`
   - Registry: `0xb94704422c2a1e396835a571837aa5ae53285a95`
   - RPC: `https://mainnet.base.org`
   - Update contract addresses after deployment

3. **Set up agentrust.base.eth subnames**
   - `requester.agentrust.base.eth` → requester agent
   - `provider.agentrust.base.eth` → provider agent
   - `explorer.agentrust.base.eth` → frontend dashboard

4. **Set agent text records** on subnames
   - `agent.type` → requester | provider
   - `agent.capabilities` → JSON array
   - `agent.endpoint` → AXL node URL
   - `agent.status` → active
   - `agent.pricing` → pricing info

5. **Update deployedContracts.ts** for Base Mainnet (chainId 8453)

6. **Update frontend scaffold.config.ts** for Base Mainnet

7. **Test live basename resolution** — verify text records read correctly

### Basename Subname Architecture
```
agentrust.base.eth              ← Parent (registered by user)
├── requester.agentrust.base.eth ← Requester agent identity
├── provider.agentrust.base.eth  ← Provider agent identity  
├── explorer.agentrust.base.eth  ← Frontend/dashboard
└── agent-XXX.agentrust.base.eth ← Future registered agents
```

## WP6 Summary (Completed)

| File | Lines | Description |
|------|-------|-------------|
| `sdk/ens.ts` | 489 | Full Basenames integration - live on-chain operations |
| `agents/requester-agent/agent.ts` | 327 | AXL + ENS discovery + trust verification |
| `agents/requester-agent/ens-setup.ts` | 113 | Basenames text record registration |
| `agents/provider-agent/agent.ts` | 392 | AXL + REAL on-chain analytics |
| `agents/provider-agent/ens-setup.ts` | 114 | Basenames provider metadata |
| `docs/reference/ens-research.md` | 322 | Basenames research with contract addresses |

### WP6 Commits
- `cd2a0fb` — WP6: sdk/ens.ts - full Basenames (Base L2 ENS) integration
- `78a4db0` — WP6: agent implementations with live AXL + Basenames integration
- `e644420` — WP6: update progress.json + handoff.md

## ENS Prize Qualification Strategy

| Track | Prize | Qualification |
|-------|-------|---------------|
| Best ENS Integration for AI Agents | $2,500 | Agent metadata in ENS text records, trust scores linked via TrustNFT |
| Best ENS Subname Ecosystem | $2,500 | agentrust.base.eth parent with subnames for each agent |

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
