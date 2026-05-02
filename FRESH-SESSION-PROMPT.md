# WP6.5: Security Hardening + Base Mainnet Deployment + Basename Integration

## Entry Prompt (copy-paste into new session)

```
Read and execute WP6.5 from BUILD-PLAN.md. Load progress from progress.json first. Read handoff.md for full context.

## CRITICAL CONTEXT

User registered agentrust.base.eth on BASE MAINNET (chainId 8453). Has mainnet funds ready.
Must deploy hardened contracts to Base Mainnet, then set up basename subnames and text records.

## SECURITY FEEDBACK TO ADDRESS (from Etherscan Contract Analyzer)

Before deploying to mainnet, ALL security feedback below must be addressed in the 3 contracts.
Load skills: solidity, code-review-skill

### TrustNFT.sol Feedback:
1. ACCESS CONTROL: Ensure agreementContract address is properly set and verified. Add two-step ownership transfer if not present.
2. ERROR HANDLING: Ensure all error conditions are handled with custom errors (ContractName__ prefix pattern).
3. SAFE MATH: Solidity 0.8.x has built-in overflow/underflow checks — verify pragma is 0.8.x+ and document this. If using unchecked blocks, justify each one.
4. EXTERNAL CALLS: s_agreementContract and agent interactions — add reentrancy protection (ReentrancyGuardTransient). Use checks-effects-interactions pattern.
5. Add @custom:security-contact natspec

### ServiceAgreement.sol Feedback:
1. INPUT VALIDATION: Validate provider and requester addresses are non-zero in createAgreement. Validate amount > 0. Validate deadline is in the future.
2. TOKEN TRANSFER RETURN VALUES: safeTransferFrom/safeTransfer already handle return values via SafeERC20 — verify this and add comments.
3. ACCESS CONTROL: Add role-based access for settleAgreement and disputeAgreement — only involved parties should call these.
4. DEADLINE CHECKS: Enforce strict deadline checks with block.timestamp comparisons.
5. MISSING EVENTS: Add events for settleAgreement and disputeAgreement.
6. Add @custom:security-contact natspec

### AgentRegistry.sol Feedback:
1. REENTRANCY: Add ReentrancyGuardTransient to registerAgent and deactivateAgent.
2. INPUT VALIDATION: Validate ensName is non-empty and properly formatted in registerAgent.
3. GAS LIMITS: Ensure getAgentByENS and getAgent don't have unbounded loops.
4. EXTERNAL CALLS: Audit all external interactions for safety.
5. Add @custom:security-contact natspec

## CONTRACT ADDRESSES (Base Mainnet — chainId 8453)

Basename System:
- Registry: 0xb94704422c2a1e396835a571837aa5ae53285a95
- L2Resolver: 0xC6d566A56A1aFf6508b41f6c90ff131615583BCD
- RPC: https://mainnet.base.org
- Explorer: https://basescan.org
- User's Basename: agentrust.base.eth

## EXECUTION PLAN

### Phase 1: Security Hardening (delegate to hacker + developer profiles)
1. Read all 3 contracts: contracts/src/TrustNFT.sol, ServiceAgreement.sol, AgentRegistry.sol
2. Apply ALL security feedback above
3. Follow Cyfrin standards (loaded via solidity skill): custom errors with ContractName__ prefix, ReentrancyGuardTransient, Ownable2Step, input validation, events for all state changes
4. Run forge test — ALL 24 tests must still pass
5. Run forge build — zero warnings

### Phase 2: Base Mainnet Deployment
1. Update foundry.toml for Base Mainnet (chainId 8453, RPC=https://mainnet.base.org)
2. Update Deploy.s.sol with correct constructor args
3. Deploy using: forge script script/Deploy.s.sol --rpc-url base_mainnet --broadcast --verify
4. Record all deployed contract addresses
5. Update frontend/config/deployedContracts.ts with chainId 8453 + new addresses
6. Run scripts/foundry-bridge.js to regenerate

### Phase 3: Basename Integration (delegate to backend_engineer profile)
1. Update sdk/ens.ts — add BASE_MAINNET_ENS_CONFIG alongside BASE_SEPOLIA_ENS_CONFIG:
   - L2Resolver: 0xC6d566A56A1aFf6508b41f6c90ff131615583BCD
   - Registry: 0xb94704422c2a1e396835a571837aa5ae53285a95
   - RPC: https://mainnet.base.org
   - agentRegistryAddress: (from Phase 2 deployment)
   - trustNftAddress: (from Phase 2 deployment)
2. Update agents/*/ens-setup.ts to use agentrust.base.eth subnames
3. Set text records on subnames:
   - requester.agentrust.base.eth: agent.type=requester, capabilities=[...], endpoint=https://9nm3dahv8db5b9m3q8spvc7o7o.ingress.akash-palmito.org, status=active
   - provider.agentrust.base.eth: agent.type=provider, capabilities=[...], endpoint=https://n8jr4en77l8l972bk9i1d40sj4.ingress.akash-palmito.org, status=active
4. Run npx tsc --noEmit — must be 0 errors

### Phase 4: Verification
1. forge test — all pass
2. npx tsc --noEmit — 0 errors
3. Verify contracts on Basescan
4. Test basename resolution: read text records from agentrust.base.eth subnames
5. Update progress.json — mark WP6.5 as done
6. Generate new handoff.md
7. Commit incrementally (small commits per phase)
8. Push to GitHub

## AGENT PROFILES TO USE
- hacker: Security audit + vulnerability fixes on contracts
- developer: Contract implementation + testing
- backend_engineer: sdk/ens.ts updates + basename integration

## SKILLS TO LOAD
- solidity (Cyfrin standards: custom errors, ReentrancyGuardTransient, Ownable2Step, fuzz tests)
- code-review-skill (structured review with severity ratings)
- swebok-developer-knowledge (requirements traceability, test strategy)

## KEY FILES
- Contracts: contracts/src/{AgentRegistry,TrustNFT,ServiceAgreement}.sol
- Tests: contracts/test/{AgentRegistry,TrustNFT,ServiceAgreement}.t.sol
- Deploy: contracts/script/Deploy.s.sol
- Config: contracts/foundry.toml, contracts/.env
- SDK: sdk/ens.ts
- Agents: agents/requester-agent/ens-setup.ts, agents/provider-agent/ens-setup.ts
- Frontend: frontend/config/deployedContracts.ts
- Bridge script: scripts/foundry-bridge.js
- Handoff: handoff.md
- Progress: progress.json
```
