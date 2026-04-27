// SPDX-License-Identifier: MIT
// Agent type definitions for requester-agent

export interface AgentConfig {
  ensName: string;
  privateKey: string;
  rpcUrl: string;
  chainId: number;
  trustThreshold?: number;
  axlNodeUrl?: string;
}

export interface ServiceProposal {
  serviceType: string;
  providerAddress: string;
  amount: string;
  token: string;
  deadline: number;
  description: string;
}

export interface AgreementResponse {
  accepted: boolean;
  reason: string;
  agreementId: string | null;
}
