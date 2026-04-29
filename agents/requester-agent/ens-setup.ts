/**
 * RequesterENSSetup — live ENS/Basenames registration for the requester agent.
 *
 * Uses the ENSClient from sdk/ens.ts for all on-chain operations.
 * Registers agent metadata as Basenames text records on Base Mainnet.
 */

import type { Hex } from "viem";
import {
  ENSClient,
  BASE_MAINNET_ENS_CONFIG,
  type ENSAgentRecord,
} from "../../sdk/ens.js";

export interface RequesterENSConfig {
  ensName: string;
  rpcUrl: string;
  accountAddress: Hex;
  privateKey: Hex;
}

/**
 * ENS setup for the requester agent.
 * Registers agent identity on Basenames with metadata pointing to on-chain registry.
 */
export class RequesterENSSetup {
  private readonly config: RequesterENSConfig;
  private readonly client: ENSClient;

  constructor(config: RequesterENSConfig) {
    this.config = config;
    this.client = new ENSClient({
      ...BASE_MAINNET_ENS_CONFIG,
      rpcUrl: config.rpcUrl,
    });
    this.client.initWallet(config.privateKey);
  }

  /**
   * Register the requester agent identity on Basenames.
   * Sets all text records: agent.type, agent.capabilities, agent.endpoint, agent.status, agent.pricing.
   */
  async registerAgentIdentity(): Promise<Hex[]> {
    console.log(
      `[RequesterENS] Registering identity for ${this.config.ensName}`,
    );

    const txHashes = await this.client.registerAgentMetadata(
      this.config.ensName,
      {
        agentType: "requester",
        capabilities: ["data-research", "trust-verification", "escrow-management"],
        endpoint: "axl://localhost:9002",
        pricing: "0.001 ETH per request",
      },
    );

    console.log(
      `[RequesterENS] Registration complete: ${txHashes.length} transactions`,
    );
    return txHashes;
  }

  /**
   * Resolve another agent by ENS/Basename.
   * Reads all text records and on-chain trust data.
   */
  async resolveAgent(ensName: string): Promise<ENSAgentRecord | null> {
    console.log(`[RequesterENS] Resolving ${ensName}...`);
    const record = await this.client.resolveAgent(ensName);
    if (!record) {
      console.log(`[RequesterENS] Agent not found: ${ensName}`);
      return null;
    }
    console.log(
      `[RequesterENS] Resolved ${ensName}: address=${record.address} type=${record.agentType} score=${record.trustScore}`,
    );
    return record;
  }

  /**
   * Update trust metadata after a service interaction.
   */
  async updateTrustMetadata(score: number): Promise<void> {
    console.log(
      `[RequesterENS] Updating trust metadata, new score: ${score}`,
    );
    await this.client.setTextRecord(
      this.config.ensName,
      "agent.trust-score",
      String(score),
    );
  }

  /**
   * Discover providers by resolving a known Basename.
   */
  async discoverProvider(providerName: string): Promise<ENSAgentRecord | null> {
    const record = await this.resolveAgent(providerName);
    if (record && record.agentType !== "provider") {
      console.log(
        `[RequesterENS] ${providerName} is not a provider (type: ${record.agentType})`,
      );
      return null;
    }
    return record;
  }

  /** Get the underlying ENSClient for advanced operations. */
  getClient(): ENSClient {
    return this.client;
  }
}
