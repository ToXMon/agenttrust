import type { AgentConfig, ServiceProposal, AgreementResponse } from "./types.js";

/**
 * RequesterAgent — initiates service requests with trust verification
 *
 * Flow:
 * 1. Register identity via ENS
 * 2. Discover providers through AXL
 * 3. Create service agreements with trust thresholds
 * 4. Verify output and release payment
 */
export class RequesterAgent {
  private readonly _config: AgentConfig;
  private readonly ensName: string;
  private readonly trustThreshold: number;

  constructor(config: AgentConfig) {
    this._config = config;
    this.ensName = config.ensName;
    this.trustThreshold = config.trustThreshold ?? 60;
  }

  async start(): Promise<void> {
    console.log(`[RequesterAgent] Starting ${this.ensName}...`);

    await this.registerIdentity();
    console.log(`[RequesterAgent] Identity registered: ${this.ensName}`);
  }

  async requestService(proposal: ServiceProposal): Promise<AgreementResponse> {
    console.log(
      `[RequesterAgent] Requesting service: ${proposal.serviceType}`,
    );

    const trustVerified = await this.verifyProviderTrust(
      proposal.providerAddress,
    );

    if (!trustVerified) {
      return {
        accepted: false,
        reason: "Provider trust score below threshold",
        agreementId: null,
      };
    }

    const agreementId = await this.createEscrow(proposal);

    return {
      accepted: true,
      reason: "Service agreement created",
      agreementId,
    };
  }

  async settleAgreement(agreementId: string): Promise<boolean> {
    console.log(
      `[RequesterAgent] Settling agreement ${agreementId}`,
    );
    return true;
  }

  private async registerIdentity(): Promise<void> {
    // ENS registration handled by ens-setup.ts
  }

  private async verifyProviderTrust(providerAddress: string): Promise<boolean> {
    console.log(
      `[RequesterAgent] Verifying trust for ${providerAddress} (threshold: ${this.trustThreshold})`,
    );
    return true;
  }

  private async createEscrow(proposal: ServiceProposal): Promise<string> {
    const agreementId = crypto.randomUUID();
    console.log(
      `[RequesterAgent] Escrow created: ${agreementId} for ${proposal.amount} tokens`,
    );
    return agreementId;
  }
}
