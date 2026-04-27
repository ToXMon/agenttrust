import type { Chain } from "viem";

export interface ScaffoldConfig {
  targetNetworks: readonly [Chain, ...Chain[]];
  pollingInterval: number;
  onlyLocalBurnerWallet: boolean;
}

export const scaffoldConfig: ScaffoldConfig = {
  targetNetworks: [
    {
      id: 8453,
      name: "Base",
      nativeCurrency: { name: "Ethereum", symbol: "ETH", decimals: 18 },
      rpcUrls: {
        default: { http: ["https://mainnet.base.org"] },
        public: { http: ["https://mainnet.base.org"] },
      },
      blockExplorers: {
        default: { name: "Basescan", url: "https://basescan.org" },
      },
    },
  ] as unknown as readonly [Chain, ...Chain[]],

  pollingInterval: 30000,
  onlyLocalBurnerWallet: false,
};

export default scaffoldConfig;

export const DEFAULT_ALCHEMY_API_KEY = "";
