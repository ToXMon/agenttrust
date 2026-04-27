import { wagmiConnectors } from "./wagmiConnectors";
import { Chain, createClient, fallback, http } from "viem";
import { mainnet } from "viem/chains";
import { createConfig } from "wagmi";
import scaffoldConfig from "@/config/scaffold.config";
import { getAlchemyHttpUrl } from "@/utils/scaffold/networks";

const { targetNetworks } = scaffoldConfig;

// Always enable mainnet for ENS resolution
export const enabledChains = targetNetworks.find((network: Chain) => network.id === 1)
  ? targetNetworks
  : ([...targetNetworks, mainnet] as const);

export const wagmiConfig = createConfig({
  chains: enabledChains,
  connectors: wagmiConnectors(),
  ssr: true,
  client({ chain }) {
    const mainnetFallbackWithDefaultRPC = [http("https://mainnet.rpc.buidlguidl.com")];
    let rpcFallbacks = [...(chain.id === mainnet.id ? mainnetFallbackWithDefaultRPC : []), http()];

    const alchemyHttpUrl = getAlchemyHttpUrl(chain.id);
    if (alchemyHttpUrl) {
      rpcFallbacks = [http(alchemyHttpUrl), ...rpcFallbacks];
    }

    return createClient({
      chain,
      transport: fallback(rpcFallbacks),
      pollingInterval: scaffoldConfig.pollingInterval,
    });
  },
});
