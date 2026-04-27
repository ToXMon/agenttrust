import { connectorsForWallets } from "@rainbow-me/rainbowkit";
import {
  ledgerWallet,
  metaMaskWallet,
  rainbowWallet,
  safeWallet,
  walletConnectWallet,
} from "@rainbow-me/rainbowkit/wallets";
import scaffoldConfig from "@/config/scaffold.config";

const { targetNetworks } = scaffoldConfig;

const wallets = [
  metaMaskWallet,
  walletConnectWallet,
  ledgerWallet,
  rainbowWallet,
  safeWallet,
];

export function wagmiConnectors() {
  return connectorsForWallets(
    [
      {
        groupName: "Supported",
        wallets,
      },
    ],
    {
      appName: "AgentTrust",
      projectId: "agenttrust-hackathon",
    },
  );
}
