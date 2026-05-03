import type { GenericContractsDeclaration } from "@/utils/scaffold/contract";
export const ERC8004_IDENTITY_REGISTRY = "0x8004A169FB4a3325136EB29fA0ceB6D2e539a432";
export const ERC8004_REPUTATION_REGISTRY = "0x8004BAa17C55a88189AE136b182e5fdA19dE9b63";

/**
 * External contracts on Base (chainId 8453)
 * 
 * These are pre-deployed protocols that AgentTrust integrates with:
 * - ERC-8004: Agent identity and reputation registries
 * - ENS: Ethereum Name Service registry
 * - Uniswap: Token swap routers for agent payments
 * - Tokens: USDC and WETH on Base
 */
const externalContracts = {
  8453: {
    // ERC-8004 Identity Registry (agent identity NFTs)
    IdentityRegistry: {
      address: "0x8004A169FB4a3325136EB29fA0ceB6D2e539a432",
      abi: [
        {
          inputs: [{ name: "agentId", type: "uint256" }],
          name: "getAgentCapabilities",
          outputs: [{ name: "", type: "bytes32[]" }],
          stateMutability: "view",
          type: "function",
        },
        {
          inputs: [
            { name: "owner", type: "address" },
            { name: "agentURI", type: "string" },
            { name: "metadata", type: "bytes" },
          ],
          name: "register",
          outputs: [{ name: "agentId", type: "uint256" }],
          stateMutability: "nonpayable",
          type: "function",
        },
        {
          inputs: [{ name: "agentId", type: "uint256" }],
          name: "ownerOf",
          outputs: [{ name: "", type: "address" }],
          stateMutability: "view",
          type: "function",
        },
        {
          anonymous: false,
          inputs: [
            { indexed: true, name: "agentId", type: "uint256" },
            { indexed: true, name: "owner", type: "address" },
          ],
          name: "AgentRegistered",
          type: "event",
        },
      ],
    },

    // ERC-8004 Reputation Registry (multi-dimensional feedback)
    ReputationRegistry: {
      address: "0x8004BAa17C55a88189AE136b182e5fdA19dE9b63",
      abi: [
        {
          inputs: [{ name: "agentId", type: "uint256" }],
          name: "getReputationScore",
          outputs: [{ name: "score", type: "uint256" }],
          stateMutability: "view",
          type: "function",
        },
        {
          inputs: [
            { name: "agentId", type: "uint256" },
            { name: "dimension", type: "string" },
          ],
          name: "getDimensionScore",
          outputs: [{ name: "score", type: "uint256" }],
          stateMutability: "view",
          type: "function",
        },
        {
          inputs: [
            { name: "agentId", type: "uint256" },
            { name: "value", type: "int128" },
            { name: "valueDecimals", type: "uint8" },
            { name: "tag1", type: "string" },
            { name: "tag2", type: "string" },
            { name: "endpoint", type: "string" },
            { name: "ipfsHash", type: "string" },
            { name: "dataHash", type: "bytes32" },
          ],
          name: "giveFeedback",
          outputs: [],
          stateMutability: "nonpayable",
          type: "function",
        },
        {
          inputs: [
            { name: "agentId", type: "uint256" },
            { name: "trustedClients", type: "address[]" },
            { name: "tag1", type: "string" },
            { name: "tag2", type: "string" },
          ],
          name: "getSummary",
          outputs: [
            { name: "count", type: "uint64" },
            { name: "value", type: "int128" },
            { name: "decimals", type: "uint8" },
          ],
          stateMutability: "view",
          type: "function",
        },
      ],
    },

    // ENS Registry
    ENSRegistry: {
      address: "0x00000000000C2e074eC69A0dFb2997BA6C7d2e1e",
      abi: [
        {
          inputs: [{ name: "node", type: "bytes32" }],
          name: "resolver",
          outputs: [{ name: "", type: "address" }],
          stateMutability: "view",
          type: "function",
        },
        {
          inputs: [{ name: "node", type: "bytes32" }],
          name: "owner",
          outputs: [{ name: "", type: "address" }],
          stateMutability: "view",
          type: "function",
        },
      ],
    },

    // USDC on Base
    USDC: {
      address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
      abi: [
        {
          inputs: [],
          name: "decimals",
          outputs: [{ name: "", type: "uint8" }],
          stateMutability: "view",
          type: "function",
        },
        {
          inputs: [{ name: "account", type: "address" }],
          name: "balanceOf",
          outputs: [{ name: "", type: "uint256" }],
          stateMutability: "view",
          type: "function",
        },
      ],
    },

    // WETH on Base
    WETH: {
      address: "0x4200000000000000000000000000000000000006",
      abi: [
        {
          inputs: [],
          name: "decimals",
          outputs: [{ name: "", type: "uint8" }],
          stateMutability: "view",
          type: "function",
        },
        {
          inputs: [{ name: "account", type: "address" }],
          name: "balanceOf",
          outputs: [{ name: "", type: "uint256" }],
          stateMutability: "view",
          type: "function",
        },
      ],
    },

    // Uniswap V2 Router on Base
    UniswapV2Router: {
      address: "0x4752ba5dbc23f44d87826276bf6fd6b1c372ad24",
      abi: [
        {
          inputs: [
            { name: "amountIn", type: "uint256" },
            { name: "amountOutMin", type: "uint256" },
            { name: "path", type: "address[]" },
            { name: "to", type: "address" },
            { name: "deadline", type: "uint256" },
          ],
          name: "swapExactTokensForTokens",
          outputs: [{ name: "amounts", type: "uint256[]" }],
          stateMutability: "nonpayable",
          type: "function",
        },
      ],
    },

    // Uniswap V3 SwapRouter on Base
    UniswapV3SwapRouter: {
      address: "0x2626664c2603336E57B271c5C0b26F421741e481",
      abi: [
        {
          inputs: [
            {
              components: [
                { name: "tokenIn", type: "address" },
                { name: "tokenOut", type: "address" },
                { name: "fee", type: "uint24" },
                { name: "recipient", type: "address" },
                { name: "deadline", type: "uint256" },
                { name: "amountIn", type: "uint256" },
                { name: "amountOutMinimum", type: "uint256" },
                { name: "sqrtPriceLimitX96", type: "uint160" },
              ],
              name: "params",
              type: "tuple",
            },
          ],
          name: "exactInputSingle",
          outputs: [{ name: "amountOut", type: "uint256" }],
          stateMutability: "payable",
          type: "function",
        },
      ],
    },
  },
} as const satisfies GenericContractsDeclaration;

export default externalContracts;
