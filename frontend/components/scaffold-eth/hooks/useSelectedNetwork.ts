import scaffoldConfig from "@/config/scaffold.config";
import { useGlobalState } from "@/components/scaffold-eth/services/store";
import { AllowedChainIds } from "@/utils/scaffold";
import { ChainWithAttributes, NETWORKS_EXTRA_DATA } from "@/utils/scaffold/networks";

/**
 * Given a chainId, retrives the network object from `scaffold.config`,
 * if not found default to network set by `useTargetNetwork` hook
 */
export function useSelectedNetwork(chainId?: AllowedChainIds): ChainWithAttributes {
  const globalTargetNetwork = useGlobalState(({ targetNetwork }) => targetNetwork);
  const targetNetwork = scaffoldConfig.targetNetworks.find(targetNetwork => targetNetwork.id === chainId);

  if (targetNetwork) {
    return { ...targetNetwork, ...NETWORKS_EXTRA_DATA[targetNetwork.id] };
  }

  return globalTargetNetwork;
}
