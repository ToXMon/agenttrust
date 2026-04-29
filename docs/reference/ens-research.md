# ENS/Basenames Research — AgentTrust (Base Sepolia)

> Viem v2.48+ | Base Sepolia (chainId 84532) | Basenames (*.base.eth)

## 1. Architecture: Basenames, Not Standard ENS

Base does NOT run the standard ENS stack. It deploys its own **Basenames** system —
an L2-native ENS implementation where all names are subdomains of `base.eth`.

- Names look like: `data-agent.base.eth`, `agenttrust.base.eth`
- Standard viem ENS helpers (`getEnsAddress`, `getEnsText`) use the **UniversalResolver**
  which only exists on Ethereum Mainnet and Sepolia — **NOT on Base Sepolia**
- All operations require **direct contract calls** via `readContract`/`writeContract`

### Base Sepolia Contract Addresses

| Contract | Address |
|----------|----------|
| Registry | `0x1493b2567056c2181630115660963E13A8E32735` |
| L2Resolver (Legacy) | `0x6533C94869D28fAA8dF77cc63f9e2b2D6Cf77eBA` |
| L2Resolver (Proxy) | `0x85C87e548091f204C2d0350b39ce1874f02197c6` |
| ReverseRegistrar | `0x876eF94ce0773052a2f81921E70FF25a5e76841f` |
| ENS L2 Reverse Registrar | `0x00000BeEF055f7934784D6d81b6BC86665630dbA` |
| RegistrarController (Proxy) | `0x82c858CDF64b3D893Fe54962680edFDDC37e94C8` |
| BaseRegistrar | `0xa0c70ec36c010b55e3c434d6c6ebeec50c705794` |
| CoinType | `2147568180` (`0x80014a34`) |

## 2. Client Setup

~~~typescript
import { createPublicClient, createWalletClient, http } from 'viem';
import { baseSepolia } from 'viem/chains';
import { namehash, normalize, labelhash } from 'viem/ens';
import { privateKeyToAccount } from 'viem/accounts';

const RPC_URL = 'https://sepolia.base.org';

// Read client
const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http(RPC_URL),
});

// Write client (agent wallet)
const account = privateKeyToAccount(process.env.AGENT_PK as `0x${string}`);
const walletClient = createWalletClient({
  account,
  chain: baseSepolia,
  transport: http(RPC_URL),
});
~~~

## 3. Reading ENS Records (Direct Contract Calls)

### Resolve Name -> Address

~~~typescript
const L2_RESOLVER = '0x6533C94869D28fAA8dF77cc63f9e2b2D6Cf77eBA' as const;

const address = await publicClient.readContract({
  address: L2_RESOLVER,
  abi: [{
    name: 'addr', type: 'function', stateMutability: 'view',
    inputs: [{ name: 'node', type: 'bytes32' }],
    outputs: [{ name: '', type: 'address' }],
  }],
  functionName: 'addr',
  args: [namehash(normalize('data-agent.base.eth'))],
});
~~~

### Read Text Record

~~~typescript
const TEXT_ABI = [{
  name: 'text', type: 'function', stateMutability: 'view',
  inputs: [
    { name: 'node', type: 'bytes32' },
    { name: 'key', type: 'string' },
  ],
  outputs: [{ name: '', type: 'string' }],
}] as const;

async function getTextRecord(name: string, key: string): Promise<string | null> {
  return publicClient.readContract({
    address: L2_RESOLVER,
    abi: TEXT_ABI,
    functionName: 'text',
    args: [namehash(normalize(name)), key],
  });
}

// Usage
const agentType = await getTextRecord('data-agent.base.eth', 'agent.type');
const capabilities = await getTextRecord('data-agent.base.eth', 'agent.capabilities');
const avatar = await getTextRecord('data-agent.base.eth', 'avatar');
~~~

### Resolve Address -> Name (Reverse Resolution)

~~~typescript
function convertReverseNodeToBytes(address: `0x${string}`, chainId: number) {
  return namehash(
    `${address.toLowerCase().slice(2)}.addr.reverse`
  );
}

const basename = await publicClient.readContract({
  address: L2_RESOLVER,
  abi: [{
    name: 'name', type: 'function', stateMutability: 'view',
    inputs: [{ name: 'node', type: 'bytes32' }],
    outputs: [{ name: '', type: 'string' }],
  }],
  functionName: 'name',
  args: [convertReverseNodeToBytes(account.address, baseSepolia.id)],
});
~~~

## 4. Writing ENS Records

### Set Text Record

~~~typescript
const SET_TEXT_ABI = [{
  name: 'setText', type: 'function', stateMutability: 'nonpayable',
  inputs: [
    { name: 'node', type: 'bytes32' },
    { name: 'key', type: 'string' },
    { name: 'value', type: 'string' },
  ],
  outputs: [],
}] as const;

async function setTextRecord(name: string, key: string, value: string) {
  const node = namehash(normalize(name));
  const { request } = await publicClient.simulateContract({
    address: L2_RESOLVER,
    abi: SET_TEXT_ABI,
    functionName: 'setText',
    args: [node, key, value],
    account: account.address,
  });
  return walletClient.writeContract(request);
}

// Usage: set agent metadata
await setTextRecord('data-agent.base.eth', 'agent.type', 'provider');
await setTextRecord('data-agent.base.eth', 'agent.capabilities', JSON.stringify(['data-analysis', 'research']));
await setTextRecord('data-agent.base.eth', 'agent.endpoint', 'https://axl.example.com:8080');
await setTextRecord('data-agent.base.eth', 'agent.status', 'active');
~~~

### Set Address Record

~~~typescript
const SET_ADDR_ABI = [{
  name: 'setAddr', type: 'function', stateMutability: 'nonpayable',
  inputs: [
    { name: 'node', type: 'bytes32' },
    { name: 'addr', type: 'address' },
  ],
  outputs: [],
}] as const;

async function setAddress(name: string, addr: `0x${string}`) {
  const node = namehash(normalize(name));
  const { request } = await publicClient.simulateContract({
    address: L2_RESOLVER,
    abi: SET_ADDR_ABI,
    functionName: 'setAddr',
    args: [node, addr],
    account: account.address,
  });
  return walletClient.writeContract(request);
}
~~~

## 5. Subname Creation

### Create Subname Under Parent Domain

~~~typescript
const REGISTRY = '0x1493b2567056c2181630115660963E13A8E32735' as const;

const REGISTRY_ABI = [
  {
    name: 'setSubnodeOwner', type: 'function', stateMutability: 'nonpayable',
    inputs: [
      { name: 'node', type: 'bytes32' },
      { name: 'label', type: 'bytes32' },
      { name: 'owner', type: 'address' },
    ],
    outputs: [{ name: '', type: 'bytes32' }],
  },
  {
    name: 'setSubnodeRecord', type: 'function', stateMutability: 'nonpayable',
    inputs: [
      { name: 'node', type: 'bytes32' },
      { name: 'label', type: 'bytes32' },
      { name: 'owner', type: 'address' },
      { name: 'resolver', type: 'address' },
      { name: 'ttl', type: 'uint64' },
    ],
    outputs: [],
  },
] as const;

/** Create subname — you MUST own the parent node */
async function createSubname(
  parentName: string,
  label: string,
  ownerAddress: `0x${string}`,
) {
  const parentNode = namehash(normalize(parentName));
  const labelHash = labelhash(label);
  const { request } = await publicClient.simulateContract({
    address: REGISTRY,
    abi: REGISTRY_ABI,
    functionName: 'setSubnodeRecord',
    args: [parentNode, labelHash, ownerAddress, L2_RESOLVER, 0n],
    account: account.address,
  });
  return walletClient.writeContract(request);
}

// Full subname setup flow
async function registerAgentSubname(
  parentName: string,
  label: string,
  agentAddress: `0x${string}`,
  metadata: { type: string; capabilities: string[]; endpoint: string },
) {
  const fullName = `${label}.${parentName}`;
  await createSubname(parentName, label, agentAddress);
  await setAddress(fullName, agentAddress);
  await setTextRecord(fullName, 'agent.type', metadata.type);
  await setTextRecord(fullName, 'agent.capabilities', JSON.stringify(metadata.capabilities));
  await setTextRecord(fullName, 'agent.endpoint', metadata.endpoint);
  await setTextRecord(fullName, 'agent.status', 'active');
  await setTextRecord(fullName, 'agent.pricing', JSON.stringify({ model: 'per-task', min: '0.001 ETH' }));
}
~~~

## 6. AgentTrust Text Record Keys

| Key | Example Value | Description |
|-----|--------------|-------------|
| `agent.type` | `requester` \| `provider` | Agent role |
| `agent.capabilities` | `["data-analysis","research"]` | JSON array |
| `agent.endpoint` | `https://axl.agenttrust.io:8080` | AXL P2P endpoint |
| `agent.status` | `active` \| `inactive` | Availability |
| `agent.pricing` | `{"model":"per-task","min":"0.001"}` | Pricing JSON |
| `avatar` | `https://img.agentrust.io/agent1.png` | Avatar URL |
| `description` | `Data research agent` | Human description |
| `com.twitter` | `@agenttrust` | Social identity |
| `com.linkedin` | `company/agenttrust` | Professional identity |

## 7. Limitations & Edge Cases

### Ownership Requirements
- You **must own** the parent node to create subnames via `setSubnodeOwner`
- You **must own** (or be approved for) the name node to set text records
- On Base Sepolia, you need a registered `.base.eth` name first (via RegistrarController)
- Alternative: Deploy a custom subdomain registrar contract that auto-creates subnames

### No NameWrapper on Base Sepolia
- Basenames has no NameWrapper deployed — no ERC1155 wrapped names
- Subnames use plain Registry ownership, not wrapped NFTs
- This means no automatic fuse-based permission controls for subnames

### No UniversalResolver
- viem's `getEnsAddress`, `getEnsText`, `getEnsName` will NOT work on Base Sepolia
- These methods internally call UniversalResolver which doesn't exist on Base
- Must use `readContract`/`writeContract` directly against L2Resolver

### Gas Costs (Approximate, Base Sepolia)

| Operation | Gas | Cost (~1 gwei) |
|-----------|-----|----------------|
| `setText` | ~45,000 | < $0.001 |
| `setAddr` | ~35,000 | < $0.001 |
| `setSubnodeRecord` | ~55,000 | < $0.001 |
| Full subname setup (5 txs) | ~250,000 | < $0.005 |

### Fallback Strategy

If basenames prove unreliable on Base Sepolia for the hackathon:
1. Custom Resolver: Deploy a simple resolver contract that stores agent metadata
2. Off-chain ENS: Use ENS text records on Ethereum Sepolia with cross-chain attestation
3. Contract-based Registry: Use AgentRegistry.sol as primary identity store, ENS as optional display layer

## 8. Minimal L2Resolver ABI Reference

~~~typescript
export const L2_RESOLVER_ABI = [
  // Read
  { name: 'addr', type: 'function', stateMutability: 'view',
    inputs: [{ name: 'node', type: 'bytes32' }],
    outputs: [{ name: '', type: 'address' }] },
  { name: 'text', type: 'function', stateMutability: 'view',
    inputs: [{ name: 'node', type: 'bytes32' }, { name: 'key', type: 'string' }],
    outputs: [{ name: '', type: 'string' }] },
  { name: 'name', type: 'function', stateMutability: 'view',
    inputs: [{ name: 'node', type: 'bytes32' }],
    outputs: [{ name: '', type: 'string' }] },
  // Write
  { name: 'setAddr', type: 'function', stateMutability: 'nonpayable',
    inputs: [{ name: 'node', type: 'bytes32' }, { name: 'addr', type: 'address' }],
    outputs: [] },
  { name: 'setText', type: 'function', stateMutability: 'nonpayable',
    inputs: [{ name: 'node', type: 'bytes32' }, { name: 'key', type: 'string' }, { name: 'value', type: 'string' }],
    outputs: [] },
  { name: 'setName', type: 'function', stateMutability: 'nonpayable',
    inputs: [{ name: 'node', type: 'bytes32' }, { name: 'name', type: 'string' }],
    outputs: [] },
] as const;
~~~

---

Sources: [base/basenames GitHub](https://github.com/base/basenames), [Base Docs](https://docs.base.org), [viem ENS API](https://viem.sh), [DeepWiki basenames](https://deepwiki.com/base/basenames)
