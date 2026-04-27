// Barrel exports for utils/scaffold
export { replacer, ZERO_ADDRESS, isZeroAddress, isENS } from "./common";
export {
  type ChainWithAttributes,
  type AllowedChainIds,
  getAlchemyHttpUrl,
  NETWORKS_EXTRA_DATA,
  getBlockExplorerTxLink,
  getBlockExplorerAddressLink,
  getTargetNetworks,
  RPC_CHAIN_NAMES,
} from "./networks";
export { notification } from "./notification";
export { getParsedError } from "./getParsedError";
