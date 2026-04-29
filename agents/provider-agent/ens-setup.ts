/**
 * ProviderENSSetup — live ENS/Basenames registration for the provider agent.
 *
 * Uses the ENSClient from sdk/ens.ts for all on-chain operations.
 * Registers provider metadata including capabilities, endpoint, and pricing.
 */

import type { Hex } from "viem";
import {
  ENSClient,
  BASE_SEPOLIA_ENS_CONFIG,
  type ENSAgentRecord,
} from "../../sdk/ens.js";

export interface ProviderENSConfig {
  ensName: string;
  rpcUrl: string;
  accountAddress: Hex;
  privateKey: Hex;
}

/**
 * ENS setup for the provider agent.
 * Registers provider identity on Basenames with service metadata.
 */
export class ProviderENSSetup {
  private readonly config: ProviderENSConfig;
  private readonly client: ENSClient;

  constructor(config: ProviderENSConfig) {
    this.config = config;
    this.client = new ENSClient({
      ...BASE_SEPOLIA_ENS_CONFIG,
      rpcUrl: config.rpcUrl,
    });
    this.client.initWallet(config.privateKey);
  }

  /**
   * Register the provider agent identity on Basenames.
   * Sets all text records: agent.type, capabilities, endpoint, status, pricing.
   */
  async registerAgentIdentity(): Promise<Hex[]> {
    console.log(
      `[ProviderENS] Registering identity for ${this.config.ensName}`,
    );

    const txHashes = await this.client.registerAgentMetadata(
      this.config.ensName,
      {
        agentType: "provider",
        capabilities: ["data-analysis", "on-chain-analytics", "computation"],
        endpoint: "axl://localhost:9012",
        pricing: "0.0005 ETH per analysis",
      },
    );

    console.log(
      `[ProviderENS] Registration complete: ${txHashes.length} transactions`,
    );
    return txHashes;
  }

  /**
   * Resolve another agent by ENS/Basename (e.g., a requester).
   * Reads all text records and on-chain trust data.
   */
  async resolveAgent(ensName: string): Promise<ENSAgentRecord | null> {
    console.log(`[ProviderENS] Resolving ${ensName}...`);
    const record = await this.client.resolveAgent(ensName);
    if (!record) {
      console.log(`[ProviderENS] Agent not found: ${ensName}`);
      return null;
    }
    console.log(
      `[ProviderENS] Resolved ${ensName}: address=${record.address} type=${record.agentType} score=${record.trustScore}`,
    );
    return record;
  }

  /**
   * Update trust metadata after completing a service.
   */
  async updateTrustMetadata(score: number): Promise<void> {
    console.log(
      `[ProviderENS] Updating trust metadata, new score: ${score}`,
    );
    await this.client.setTextRecord(
      this.config.ensName,
      "agent.trust-score",
      String(score),
    );
  }

  /**
   * Verify a requester's trust score against a minimum threshold.
   */
  async verifyRequesterTrust(
    requesterAddress: Hex,
    threshold: number,
  ): Promise<boolean> {
    const score = await this.client.getTrustScore(requesterAddress);
    const trusted = score >= threshold;
    console.log(
      `[ProviderENS] Requester ${requesterAddress} score=${score} threshold=${threshold} trusted=${trusted}`,
    );
    return trusted;
  }

  /** Get the underlying ENSClient for advanced operations. */
  getClient(): ENSClient {
    return this.client;
  }
}
