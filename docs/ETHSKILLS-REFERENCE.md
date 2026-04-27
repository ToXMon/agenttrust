# EthSkills Reference Guide for AgentTrust

> **Purpose**: Reference guide for fetching and using ethskills markdown knowledge in the AgentTrust project.
> **Audience**: Autonomous agents and developers integrating ERC-8004 agent commerce patterns.
> **Last Updated**: 2026-04-26

---

## 1. Overview

### What EthSkills Is

EthSkills (`https://ethskills.com`) is a **markdown knowledge base for AI agents**. It provides:

- **19 skill categories** of verified Ethereum knowledge
- **Fetchable via HTTP**: `curl https://ethskills.com/<topic>/SKILL.md`
- **Curated addresses**: 122+ verified contract addresses on Base mainnet
- **Production patterns**: Battle-tested Solidity, TypeScript, and testing code
- **Security checklists**: Pre-deploy security audit items

### What EthSkills Is NOT

| Misconception | Reality |
|--------------|----------|
| npm package | ❌ No `npm install ethskills` — it's markdown, not code |
| Solidity library | ❌ No contracts to import — it's reference knowledge |
| API service | ❌ No runtime dependency — fetch once, use in code or prompts |
| Deployment tool | ❌ No deployment scripts — patterns and addresses only |
| Replacement for docs | ❌ Supplement to official docs — not a substitute |

### How to Use in AgentTrust

1. **Copy code snippets** directly into AgentTrust source files
2. **Load as AI context** in subordinate agent prompts during builds
3. **Extract addresses** for `externalContracts.ts` configuration
4. **Follow security patterns** before deploying to Base mainnet

---

## 2. How to Fetch

Each skill topic is a standalone markdown file accessible via HTTP:

```bash
# General format
curl -s https://ethskills.com/<topic>/SKILL.md

# Save to local reference directory
mkdir -p /a0/usr/projects/agentrust/research/ethskills
curl -s https://ethskills.com/standards/SKILL.md -o research/ethskills/standards.md
curl -s https://ethskills.com/addresses/SKILL.md -o research/ethskills/addresses.md
curl -s https://ethskills.com/security/SKILL.md -o research/ethskills/security.md
```

### Response Format

Each SKILL.md returns:
- Topic description and scope
- Code snippets (Solidity, TypeScript, Shell)
- Verified contract addresses (where applicable)
- Integration patterns
- Common pitfalls and solutions

---

## 3. Priority Skills for AgentTrust

### Priority Table

| Priority | Topic | What to Extract | AgentTrust Workpack |
|----------|-------|----------------|-------------------|
| 🔴 CRITICAL | `standards/` | ERC-8004 addresses on Base, 6-step commerce flow, x402 middleware patterns | WP2 (Identity), WP4 (Commerce), WP5 (Uniswap) |
| 🔴 CRITICAL | `addresses/` | 122+ verified addresses: USDC, WETH, Uniswap V2/V3/V4, ENS, Aerodrome on Base | WP5 (Uniswap), `externalContracts.ts` |
| 🔴 CRITICAL | `security/` | 22-item pre-deploy checklist, SafeERC20 pattern, USDC 6-decimal trap, EIP-712 signatures | WP3 (TrustNFT), all contract deploys |
| 🟡 HIGH | `testing/` | Foundry fuzz/fork/invariant test templates | WP3 (contracts), all test workpacks |
| 🟡 HIGH | `building-blocks/` | Uniswap V4 DynamicFeeHook Solidity, Aerodrome on Base integration | WP5 (Uniswap API) |
| 🟡 HIGH | `indexing/` | Event-first design, Multicall3, viem getLogs patterns | WP7 (Frontend), SUBGRAPH_MCP.md |
| 🟢 MEDIUM | `deployment/` | Forge script patterns, verification, gas optimization | WP9 (Deploy) |
| 🟢 MEDIUM | `patterns/` | Proxy patterns, upgradeable contracts, access control | WP2 (Registry) |
| 🟢 MEDIUM | `hooks/` | Custom Solidity hooks, modifiers, reentrancy guards | WP3 (TrustNFT) |

---

## 4. ERC-8004 Deployed Addresses on Base (Chain 8453)

These are **verified, deployed contracts** on Base mainnet from the `standards/` skill:

### IdentityRegistry

```
Address: 0x8004A169FB4a3325136EB29fA0ceB6D2e539a432
Chain:   Base (8453)
Standard: ERC-8004
Purpose: ERC-721 based agent identity registration
```

**Key Functions:**
- `registerAgent(address owner, string metadataURI)` — Register a new agent identity as NFT
- `getAgentCapabilities(uint256 agentId)` — Query agent's declared capabilities
- `updateAgentMetadata(uint256 agentId, string metadataURI)` — Update agent metadata
- `isRegisteredAgent(address agent)` — Check if address has a registered agent identity

### ReputationRegistry

```
Address: 0x8004BAa17C55a88189AE136b182e5fdA19dE9b63
Chain:   Base (8453)
Standard: ERC-8004
Purpose: Multi-dimensional feedback and reputation scores
```

**Key Functions:**
- `submitFeedback(uint256 agentId, Feedback calldata feedback)` — Submit post-interaction rating
- `getReputationScore(uint256 agentId)` — Get aggregate reputation score
- `getFeedbackHistory(uint256 agentId)` — Get all feedback entries
- `getReputationByDimension(uint256 agentId, Dimension dim)` — Get score for specific dimension (reliability, quality, speed, etc.)

### Integration in AgentTrust

Add to `frontend/config/externalContracts.ts`:

```typescript
const externalContracts = {
  8453: {
    IdentityRegistry: {
      address: "0x8004A169FB4a3325136EB29fA0ceB6D2e539a432",
      abi: ERC8004_IDENTITY_ABI, // import from ethskills or ABI file
    },
    ReputationRegistry: {
      address: "0x8004BAa17C55a88189AE136b182e5fdA19dE9b63",
      abi: ERC8004_REPUTATION_ABI,
    },
  },
} as const satisfies GenericContractsDeclaration;

export default externalContracts;
```

---

## 5. 6-Step Agent Commerce Flow

The ERC-8004 standard defines a 6-step flow for agent-to-agent commerce. Here is the complete flow with TypeScript implementation snippets.

### Flow Overview

```
┌──────────┐    ┌──────────┐    ┌──────────┐
│ Discover  │───→│  Trust   │───→│   Call   │
│ Registry  │    │ Verify   │    │ Execute  │
└──────────┘    └──────────┘    └──────────┘
      ↑                               │
      │                               ↓
┌──────────┐    ┌──────────┐    ┌──────────┐
│   Rate   │←───│ Receive  │←───│   Pay    │
│ Feedback │    │  Result  │    │  x402    │
└──────────┘    └──────────┘    └──────────┘
```

### Step 1: Discover

Query the IdentityRegistry for agents matching required capabilities.

```typescript
import { createPublicClient, http } from "viem";
import { base } from "wagmi/chains";
import { IDENTITY_REGISTRY_ABI } from "./abis";

const client = createPublicClient({
  chain: base,
  transport: http(),
});

const IDENTITY_REGISTRY = "0x8004A169FB4a3325136EB29fA0ceB6D2e539a432" as `0x${string}`;

// Discover agents with specific capabilities
async function discoverAgents(capability: string) {
  // Query total registered agents
  const totalAgents = await client.readContract({
    address: IDENTITY_REGISTRY,
    abi: IDENTITY_REGISTRY_ABI,
    functionName: "totalSupply",
  });

  // Iterate and find matching agents
  const matchingAgents = [];
  for (let i = 1; i <= Number(totalAgents); i++) {
    const capabilities = await client.readContract({
      address: IDENTITY_REGISTRY,
      abi: IDENTITY_REGISTRY_ABI,
      functionName: "getAgentCapabilities",
      args: [BigInt(i)],
    });
    if ((capabilities as string[]).includes(capability)) {
      matchingAgents.push({
        agentId: i,
        capabilities: capabilities,
      });
    }
  }

  return matchingAgents;
}
```

### Step 2: Trust

Verify agent reputation and capabilities before engaging.

```typescript
const REPUTATION_REGISTRY = "0x8004BAa17C55a88189AE136b182e5fdA19dE9b63" as `0x${string}`;

interface TrustAssessment {
  agentId: number;
  overallScore: number;
  dimensions: {
    reliability: number;
    quality: number;
    speed: number;
    communication: number;
  };
  totalInteractions: number;
  trusted: boolean;
}

async function assessTrust(agentId: number): Promise<TrustAssessment> {
  const [score, history] = await Promise.all([
    client.readContract({
      address: REPUTATION_REGISTRY,
      abi: REPUTATION_REGISTRY_ABI,
      functionName: "getReputationScore",
      args: [BigInt(agentId)],
    }),
    client.readContract({
      address: REPUTATION_REGISTRY,
      abi: REPUTATION_REGISTRY_ABI,
      functionName: "getFeedbackHistory",
      args: [BigInt(agentId)],
    }),
  ]);

  const overallScore = Number(score);
  const totalInteractions = (history as any[]).length;

  // Get dimension-specific scores
  const [reliability, quality, speed, communication] = await Promise.all([
    client.readContract({
      address: REPUTATION_REGISTRY,
      abi: REPUTATION_REGISTRY_ABI,
      functionName: "getReputationByDimension",
      args: [BigInt(agentId), 0], // 0 = reliability
    }),
    client.readContract({
      address: REPUTATION_REGISTRY,
      abi: REPUTATION_REGISTRY_ABI,
      functionName: "getReputationByDimension",
      args: [BigInt(agentId), 1], // 1 = quality
    }),
    client.readContract({
      address: REPUTATION_REGISTRY,
      abi: REPUTATION_REGISTRY_ABI,
      functionName: "getReputationByDimension",
      args: [BigInt(agentId), 2], // 2 = speed
    }),
    client.readContract({
      address: REPUTATION_REGISTRY,
      abi: REPUTATION_REGISTRY_ABI,
      functionName: "getReputationByDimension",
      args: [BigInt(agentId), 3], // 3 = communication
    }),
  ]);

  return {
    agentId,
    overallScore,
    dimensions: {
      reliability: Number(reliability),
      quality: Number(quality),
      speed: Number(speed),
      communication: Number(communication),
    },
    totalInteractions,
    trusted: overallScore >= 70 && totalInteractions >= 3, // Configurable threshold
  };
}
```

### Step 3: Call

Invoke the agent's service via its declared endpoint.

```typescript
async function callAgent(
  agentId: number,
  serviceEndpoint: string,
  payload: Record<string, unknown>
) {
  const trust = await assessTrust(agentId);
  if (!trust.trusted) {
    throw new Error(`Agent ${agentId} does not meet trust threshold`);
  }

  const response = await fetch(serviceEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      agentId,
      payload,
      requester: "agenttrust-client",
    }),
  });

  if (!response.ok) {
    // May return 402 Payment Required (x402 protocol)
    if (response.status === 402) {
      return handlePaymentRequired(response, agentId);
    }
    throw new Error(`Agent call failed: ${response.status}`);
  }

  return response.json();
}
```

### Step 4: Pay

Settle payment using the x402 HTTP 402 payment protocol.

```typescript
// x402 client-side payment handler
import { x402Fetch } from "x402"; // or implement manually

async function handlePaymentRequired(response: Response, agentId: number) {
  // x402 protocol: server returns 402 with payment details
  const paymentDetails = await response.json();
  // {
  //   paymentRequired: { amount: "1000000", token: "USDC", recipient: "0x..." },
  //   acceptTokens: ["USDC", "ETH"],
  //   paymentEndpoint: "https://..."
  // }

  // Execute payment via x402 fetch
  const paidResponse = await x402Fetch(paymentDetails.paymentEndpoint, {
    amount: paymentDetails.paymentRequired.amount,
    token: paymentDetails.paymentRequired.token,
    recipient: paymentDetails.paymentRequired.recipient,
  });

  return paidResponse.json();
}
```

**x402 Express Middleware (Server/Agent Side):**

```typescript
import { x402Middleware } from "x402";

// Provider agent's payment endpoint
app.use("/api/service", x402Middleware({
  price: "0.001", // ETH or USDC amount
  token: "USDC",
  recipient: providerWalletAddress,
}));

app.post("/api/service", async (req, res) => {
  // Payment verified by middleware, process request
  const result = await processServiceRequest(req.body);
  res.json({ result, proof: generateProof(result) });
});
```

### Step 5: Receive

Get the result and proof of work.

```typescript
interface AgentResponse {
  result: unknown;
  proof: {
    hash: string;       // Result content hash
    timestamp: number;  // Completion timestamp
    agentSignature: string; // Agent's signature
  };
  metadata: {
    processingTime: number;
    computeProvider?: string; // 0G or Gensyn verification
  };
}

function verifyResponse(response: AgentResponse): boolean {
  // 1. Verify hash matches result
  // 2. Verify agent signature
  // 3. Check timestamp is recent
  // 4. Optional: verify compute proof
  return true; // Simplified
}
```

### Step 6: Rate

Submit feedback to the ReputationRegistry.

```typescript
import { createWalletClient, custom } from "viem";

async function submitRating(
  agentId: number,
  rating: number, // 1-100
  dimensions: { reliability: number; quality: number; speed: number; communication: number },
  comment: string
) {
  const walletClient = createWalletClient({
    transport: custom(window.ethereum),
  });

  const [account] = await walletClient.getAddresses();

  const { request } = await client.simulateContract({
    address: REPUTATION_REGISTRY,
    abi: REPUTATION_REGISTRY_ABI,
    functionName: "submitFeedback",
    args: [
      BigInt(agentId),
      {
        rating: BigInt(rating),
        dimensions: [
          BigInt(dimensions.reliability),
          BigInt(dimensions.quality),
          BigInt(dimensions.speed),
          BigInt(dimensions.communication),
        ],
        comment: comment,
        serviceId: BigInt(Date.now()), // or agreement ID
        timestamp: BigInt(Math.floor(Date.now() / 1000)),
      },
    ],
    account,
  });

  const hash = await walletClient.writeContract(request);
  return hash;
}
```

---

## 6. Integration Points by Workpack

Map of which ethskills skills to load for each BUILD-PLAN.md workpack:

| Workpack | Title | EthSkills Topics to Load | Purpose |
|----------|-------|-------------------------|----------|
| WP1 | Project Scaffold | None | Boilerplate setup |
| WP2 | Agent Identity | `standards/`, `addresses/` | ERC-8004 addresses, agent registration patterns |
| WP3 | Trust & Agreements | `security/`, `standards/` | TrustNFT (ERC-7857 iNFT), pre-deploy checklist |
| WP4 | AXL Communication | None | Gensyn-specific, not in ethskills |
| WP5 | Uniswap Integration | `addresses/`, `building-blocks/` | Verified Uniswap addresses on Base, V4 hooks |
| WP6 | KeeperHub Execution | None | KeeperHub-specific, not in ethskills |
| WP7 | 0G Storage | None | 0G-specific, not in ethskills |
| WP8 | Frontend Build | `addresses/`, `indexing/` | External contracts config, event patterns |
| WP9 | Deploy & Demo | `security/`, `deployment/` | Pre-deploy checklist, verification |

---

## 7. How to Use in ASE Subordinates

When delegating work to ASE subordinates, include ethskills content directly in the prompt:

### Pattern 1: Fetch and Include

```bash
# Fetch the skill content
SKILL_CONTENT=$(curl -s https://ethskills.com/standards/SKILL.md)

# Include in subordinate prompt
call_subordinate with message:
"""
You are building the AgentRegistry contract for AgentTrust.

Here is the ERC-8004 standard reference:
$SKILL_CONTENT

Use the patterns above to implement:
1. Agent registration as ERC-721 tokens
2. Capability declaration and querying
3. Metadata URI resolution

Contract must deploy on Base (chain 8453).
"""
```

### Pattern 2: Pre-save and Reference

```bash
# Save all relevant skills once
mkdir -p research/ethskills
for topic in standards addresses security testing building-blocks indexing; do
  curl -s https://ethskills.com/$topic/SKILL.md -o research/ethskills/$topic.md
done

# Reference in subordinate prompts
"Read /a0/usr/projects/agentrust/research/ethskills/standards.md and implement the 6-step commerce flow."
```

### Pattern 3: Inline Key Sections

For focused tasks, paste only the relevant section:

```
"Implement the TrustNFT contract using these security patterns from ethskills:

- Use SafeERC20 for all token transfers
- USDC has 6 decimals (not 18!) — always use .decimals()
- Use EIP-712 for typed signature verification
- Apply the 22-item pre-deploy checklist before finalizing
"
```

---

## 8. What EthSkills Does NOT Cover

The following AgentTrust components require **separate sources** — ethskills has no content for them:

| Component | Source Instead |
|-----------|---------------|
| ERC-7857 (iNFT) | EIP draft spec, custom implementation |
| Gensyn AXL P2P | https://docs.gensyn.ai/tech/agent-exchange-layer |
| KeeperHub MCP | https://docs.keeperhub.com/mcp |
| 0G Storage/Compute | https://docs.0g.ai |
| ENS Subname System | https://docs.ens.domains |
| Uniswap V4 API | https://docs.uniswap.org/api |
| Next.js Frontend | SE2 integration guide (docs/SE2-INTEGRATION-GUIDE.md) |
| Akash Deployment | docs/DEPLOYMENT-STRATEGY.md |

---

## 9. Usage Commands

Exact commands to fetch each relevant skill:

```bash
# Create output directory
mkdir -p /a0/usr/projects/agentrust/research/ethskills

# CRITICAL skills
curl -s https://ethskills.com/standards/SKILL.md \
  -o /a0/usr/projects/agentrust/research/ethskills/standards.md

curl -s https://ethskills.com/addresses/SKILL.md \
  -o /a0/usr/projects/agentrust/research/ethskills/addresses.md

curl -s https://ethskills.com/security/SKILL.md \
  -o /a0/usr/projects/agentrust/research/ethskills/security.md

# HIGH priority skills
curl -s https://ethskills.com/testing/SKILL.md \
  -o /a0/usr/projects/agentrust/research/ethskills/testing.md

curl -s https://ethskills.com/building-blocks/SKILL.md \
  -o /a0/usr/projects/agentrust/research/ethskills/building-blocks.md

curl -s https://ethskills.com/indexing/SKILL.md \
  -o /a0/usr/projects/agentrust/research/ethskills/indexing.md

# MEDIUM priority skills
curl -s https://ethskills.com/deployment/SKILL.md \
  -o /a0/usr/projects/agenttrust/research/ethskills/deployment.md

curl -s https://ethskills.com/patterns/SKILL.md \
  -o /a0/usr/projects/agentrust/research/ethskills/patterns.md

curl -s https://ethskills.com/hooks/SKILL.md \
  -o /a0/usr/projects/agentrust/research/ethskills/hooks.md

# Verify downloads
ls -la /a0/usr/projects/agentrust/research/ethskills/
```

### Quick Fetch All (One-Liner)

```bash
mkdir -p /a0/usr/projects/agentrust/research/ethskills && \
for t in standards addresses security testing building-blocks indexing deployment patterns hooks; do \
  curl -s https://ethskills.com/$t/SKILL.md -o /a0/usr/projects/agentrust/research/ethskills/$t.md && \
  echo "✅ $t"; \
done
```

### Verify Content

After fetching, verify the key data points are present:

```bash
# Check for ERC-8004 addresses
grep -c "0x8004A169" research/ethskills/standards.md  # Should be > 0

# Check for Base chain references
grep -c "8453" research/ethskills/addresses.md  # Should be > 0

# Check for security checklist items
grep -c "SafeERC20" research/ethskills/security.md  # Should be > 0
```
