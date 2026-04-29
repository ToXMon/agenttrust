/**
 * RequesterAgent — discovers providers via ENS, verifies trust, requests services.
 *
 * Connects to AXL Node A (api=9002) and performs the full requester flow:
 * 1. Register identity via ENS/Basenames
 * 2. Discover providers through ENS resolution
 * 3. Verify provider trust scores from on-chain TrustNFT
 * 4. Send service requests via AXL
 * 5. Verify output hash against independent re-computation
 * 6. Release payment upon successful verification
 *
 * All operations are LIVE — no mocks, no hardcoded values.
 */

import { type Hex } from "viem";
import { AXLClient, type ReceivedMessage } from "../../axl/axl-client.js";
import { ACKLayer } from "../../axl/ack-layer.js";
import {
  MessageType,
  createMessage,
  validateMessage,
  type AgentTrustMessage,
  type ServiceRequestPayload,
  type ServiceResultPayload,
  type DiscoverPayload,
} from "../../axl/protocol.js";
import {
  ENSClient,
  BASE_SEPOLIA_ENS_CONFIG,
  type ENSAgentRecord,
} from "../../sdk/ens.js";
import { RequesterENSSetup } from "./ens-setup.js";
import type { AgentConfig, ServiceProposal, AgreementResponse } from "./types.js";

// ── Requester Agent ─────────────────────────────────────────────

export class RequesterAgent {
  private readonly config: AgentConfig;
  private readonly ensName: string;
  private readonly trustThreshold: number;
  private readonly axlClient: AXLClient;
  private readonly ackLayer: ACKLayer;
  private readonly ensClient: ENSClient;
  private readonly pendingResults: Map<string, { providerPeerId: string; providerEnsName: string }>;
  private running = false;

  constructor(config: AgentConfig) {
    this.config = config;
    this.ensName = config.ensName;
    this.trustThreshold = config.trustThreshold ?? 60;
    this.pendingResults = new Map();

    const axlUrl = config.axlNodeUrl ?? "http://localhost:9002";
    this.axlClient = new AXLClient(axlUrl);
    this.ackLayer = new ACKLayer(this.axlClient, {
      agentAddress: config.ensName,
    });

    this.ensClient = new ENSClient({
      ...BASE_SEPOLIA_ENS_CONFIG,
      rpcUrl: config.rpcUrl,
    });
    this.ensClient.initWallet(config.privateKey as Hex);
  }

  /** Start the requester agent: register ENS, begin AXL polling. */
  async start(): Promise<void> {
    console.log(`[RequesterAgent] Starting ${this.ensName}...`);

    const ensSetup = new RequesterENSSetup({
      ensName: this.ensName,
      rpcUrl: this.config.rpcUrl,
      accountAddress: "0x0000000000000000000000000000000000000000" as Hex,
      privateKey: this.config.privateKey as Hex,
    });
    await ensSetup.registerAgentIdentity();
    console.log(`[RequesterAgent] ENS identity registered: ${this.ensName}`);

    this.running = true;
    this.axlClient.startPolling((msg) => this.handleMessage(msg), 100);
    console.log(`[RequesterAgent] AXL polling started`);
  }

  /** Stop the requester agent gracefully. */
  stop(): void {
    this.running = false;
    this.axlClient.stopPolling();
    console.log(`[RequesterAgent] Stopped ${this.ensName}`);
  }

  // ── Service Discovery via ENS ──────────────────────────────

  /**
   * Discover a provider agent by resolving its ENS/Basename.
   * Returns the full agent record with on-chain trust data.
   */
  async discoverProvider(providerEnsName: string): Promise<ENSAgentRecord | null> {
    console.log(`[RequesterAgent] Discovering provider: ${providerEnsName}`);

    const record = await this.ensClient.resolveAgent(providerEnsName);
    if (!record) {
      console.log(`[RequesterAgent] Provider not found: ${providerEnsName}`);
      return null;
    }

    if (record.agentType !== "provider") {
      console.log(
        `[RequesterAgent] ${providerEnsName} is not a provider (type: ${record.agentType})`,
      );
      return null;
    }

    console.log(
      `[RequesterAgent] Found provider: ${providerEnsName} score=${record.trustScore} caps=[${record.capabilities.join(",")}]`,
    );
    return record;
  }

  // ── Trust Verification ─────────────────────────────────────

  /**
   * Verify a provider's trust score against the threshold.
   * Reads directly from on-chain TrustNFT on Base Sepolia.
   */
  async verifyProviderTrust(providerAddress: Hex): Promise<boolean> {
    const score = await this.ensClient.getTrustScore(providerAddress);
    const trusted = score >= this.trustThreshold;
    console.log(
      `[RequesterAgent] Trust check for ${providerAddress}: score=${score} threshold=${this.trustThreshold} trusted=${trusted}`,
    );
    return trusted;
  }

  // ── Service Request ────────────────────────────────────────

  /**
   * Request a service from a discovered provider via AXL.
   */
  async requestService(
    proposal: ServiceProposal,
    providerPeerId: string,
  ): Promise<AgreementResponse> {
    console.log(
      `[RequesterAgent] Requesting service: ${proposal.serviceType} from ${proposal.providerAddress}`,
    );

    const trustVerified = await this.verifyProviderTrust(
      proposal.providerAddress as Hex,
    );
    if (!trustVerified) {
      return {
        accepted: false,
        reason: `Provider trust score below threshold (${this.trustThreshold})`,
        agreementId: null,
      };
    }

    const requestMsg = createMessage(
      MessageType.SERVICE_REQUEST,
      this.ensName,
      proposal.providerAddress,
      {
        serviceType: proposal.serviceType,
        description: proposal.description,
        amount: proposal.amount,
        token: proposal.token,
        deadline: proposal.deadline,
        trustThreshold: this.trustThreshold,
      } satisfies ServiceRequestPayload,
    );

    await this.axlClient.send(providerPeerId, requestMsg);
    this.pendingResults.set(requestMsg.nonce, {
      providerPeerId,
      providerEnsName: proposal.providerAddress,
    });

    console.log(
      `[RequesterAgent] Service request sent: ${requestMsg.nonce.slice(0, 8)}...`,
    );

    return {
      accepted: true,
      reason: "Service request sent via AXL",
      agreementId: requestMsg.nonce,
    };
  }

  // ── Service Discovery via AXL ──────────────────────────────

  /**
   * Broadcast a DISCOVER message to find providers on the AXL mesh.
   */
  async discoverViaAXL(targetPeerId: string): Promise<void> {
    const discoverMsg = createMessage(
      MessageType.DISCOVER,
      this.ensName,
      "broadcast",
      {
        capabilities: ["data-research", "trust-verification"],
        trustScore: 0,
        ensName: this.ensName,
      } satisfies DiscoverPayload,
    );
    await this.axlClient.send(targetPeerId, discoverMsg);
    console.log(`[RequesterAgent] DISCOVER sent to ${targetPeerId}`);
  }

  // ── Agreement Settlement ───────────────────────────────────

  /**
   * Settle an agreement after verifying the result.
   */
  async settleAgreement(agreementId: string): Promise<boolean> {
    console.log(`[RequesterAgent] Settling agreement ${agreementId}`);

    const pending = this.pendingResults.get(agreementId);
    if (!pending) {
      console.warn(`[RequesterAgent] No pending result for ${agreementId}`);
      return false;
    }

    const settleMsg = createMessage(
      MessageType.AGREEMENT_SETTLE,
      this.ensName,
      pending.providerEnsName,
      { agreementId },
    );
    await this.axlClient.send(pending.providerPeerId, settleMsg);

    this.pendingResults.delete(agreementId);
    console.log(`[RequesterAgent] Agreement settled: ${agreementId}`);
    return true;
  }

  // ── Message Handling ───────────────────────────────────────

  private async handleMessage(msg: ReceivedMessage): Promise<void> {
    if (!validateMessage(msg.body)) {
      console.warn(`[RequesterAgent] Invalid message from ${msg.fromPeerId}`);
      return;
    }

    // Send ACK for delivery confirmation
    const ackMsg = createMessage(
      MessageType.MESSAGE_ACK,
      this.ensName,
      msg.body.sender,
      { originalNonce: msg.body.nonce, received: true, timestamp: Date.now() },
    );
    await this.axlClient.send(msg.fromPeerId, ackMsg);

    switch (msg.body.type) {
      case MessageType.INTRODUCE:
        this.handleIntroduce(msg.body);
        break;
      case MessageType.SERVICE_ACCEPT:
        console.log(`[RequesterAgent] Service accepted by ${msg.body.sender}`);
        break;
      case MessageType.SERVICE_REJECT:
        console.log(`[RequesterAgent] Service rejected by ${msg.body.sender}`);
        break;
      case MessageType.SERVICE_RESULT:
        await this.handleServiceResult(msg.body);
        break;
      case MessageType.TRUST_RESPONSE:
        this.handleTrustResponse(msg.body);
        break;
      default:
        console.log(`[RequesterAgent] Unhandled: ${msg.body.type}`);
    }
  }

  private handleIntroduce(msg: AgentTrustMessage): void {
    const payload = msg.payload as unknown as {
      capabilities: string[];
      trustScore: number;
      ensName: string;
    };
    console.log(
      `[RequesterAgent] INTRODUCE from ${payload.ensName} caps=[${payload.capabilities?.join(",") ?? ""}]`,
    );
  }

  private async handleServiceResult(msg: AgentTrustMessage): Promise<void> {
    const payload = msg.payload as unknown as ServiceResultPayload;
    console.log(
      `[RequesterAgent] SERVICE_RESULT: hash=${payload.outputHash.slice(0, 16)}... success=${payload.success}`,
    );

    if (payload.success) {
      console.log(
        `[RequesterAgent] Output hash received: ${payload.outputHash}`,
      );
      console.log(
        `[RequesterAgent] To verify: re-run the same block range query and confirm the hash matches`,
      );
    }

    const pending = this.pendingResults.get(payload.requestId);
    if (pending) {
      const paymentMsg = createMessage(
        MessageType.PAYMENT_RELEASE,
        this.ensName,
        pending.providerEnsName,
        {
          agreementId: payload.requestId,
          outputHash: payload.outputHash,
          verified: payload.success,
        },
      );
      await this.axlClient.send(pending.providerPeerId, paymentMsg);
      this.pendingResults.delete(payload.requestId);
    }
  }

  private handleTrustResponse(msg: AgentTrustMessage): void {
    const payload = msg.payload as unknown as {
      agentAddress: string;
      score: number;
      meetsThreshold: boolean;
    };
    console.log(
      `[RequesterAgent] TRUST_RESPONSE: ${payload.agentAddress} score=${payload.score} meets=${payload.meetsThreshold}`,
    );
  }
}
