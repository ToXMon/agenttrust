interface ProviderConfig {
  ensName: string;
  privateKey: string;
  rpcUrl: string;
  chainId: number;
  keeperHubUrl?: string;
}

interface ServiceRequest {
  requestId: string;
  requesterAddress: string;
  serviceType: string;
  description: string;
  amount: string;
  token: string;
  deadline: number;
}

interface ServiceResult {
  requestId: string;
  outputHash: string;
  success: boolean;
  data: Record<string, unknown>;
}

/**
 * ProviderAgent — delivers services with trust attestation
 *
 * Flow:
 * 1. Register identity via ENS
 * 2. Advertise capabilities through AXL
 * 3. Accept service agreements
 * 4. Execute via KeeperHub MCP
 * 5. Submit output hash for verification
 */
export class ProviderAgent {
  private readonly _config: ProviderConfig;
  private readonly ensName: string;
  private readonly completedServices: ServiceResult[];

  constructor(config: ProviderConfig) {
    this._config = config;
    this.ensName = config.ensName;
    this.completedServices = [];
  }

  async start(): Promise<void> {
    console.log(`[ProviderAgent] Starting ${this.ensName}...`);
    await this.registerIdentity();
    console.log(`[ProviderAgent] Identity registered: ${this.ensName}`);
  }

  async acceptRequest(request: ServiceRequest): Promise<boolean> {
    console.log(
      `[ProviderAgent] Evaluating request: ${request.requestId} (${request.serviceType})`,
    );

    const canFulfill = this.canFulfillService(request.serviceType);
    if (!canFulfill) {
      console.log(`[ProviderAgent] Cannot fulfill: ${request.serviceType}`);
      return false;
    }

    console.log(`[ProviderAgent] Accepting request: ${request.requestId}`);
    return true;
  }

  async executeService(request: ServiceRequest): Promise<ServiceResult> {
    console.log(
      `[ProviderAgent] Executing service: ${request.serviceType}`,
    );

    const outputHash = await this.computeOutput(request);

    const result: ServiceResult = {
      requestId: request.requestId,
      outputHash,
      success: true,
      data: { completedAt: Date.now(), serviceType: request.serviceType },
    };

    this.completedServices.push(result);
    console.log(`[ProviderAgent] Service completed: ${request.requestId}`);
    return result;
  }

  getCompletedCount(): number {
    return this.completedServices.length;
  }

  private async registerIdentity(): Promise<void> {
    // ENS registration handled by ens-setup.ts
  }

  private canFulfillService(serviceType: string): boolean {
    const supported = ["data-analysis", "research", "computation"];
    return supported.includes(serviceType);
  }

  private async computeOutput(request: ServiceRequest): Promise<string> {
    const hash = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(JSON.stringify(request)),
    );
    return Array.from(new Uint8Array(hash))
      .map((b: number) => b.toString(16).padStart(2, "0"))
      .join("");
  }
}
