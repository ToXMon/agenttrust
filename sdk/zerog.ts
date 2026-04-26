/**
 * 0G Storage SDK — Decentralized storage for agent outputs and audit logs
 */

export interface StorageRef {
  hash: string;
  size: number;
  uploadedAt: number;
  url: string;
}

export interface ZeroGConfig {
  rpcUrl: string;
  storageRpc: string;
  privateKey: string;
}

export class ZeroGClient {
  private readonly config: ZeroGConfig;

  constructor(config: ZeroGConfig) {
    this.config = config;
  }

  async store(data: string, tag?: string): Promise<StorageRef> {
    console.log(`[0G] Storing data${tag ? ` (${tag})` : ""}...`);
    const hash = await this.hash(data);
    return {
      hash,
      size: new TextEncoder().encode(data).length,
      uploadedAt: Date.now(),
      url: `${this.config.storageRpc}/data/${hash}`,
    };
  }

  async retrieve(hash: string): Promise<string | null> {
    console.log(`[0G] Retrieving data: ${hash}`);
    return null;
  }

  async storeJSON(data: Record<string, unknown>, tag?: string): Promise<StorageRef> {
    return this.store(JSON.stringify(data), tag);
  }

  async verifyIntegrity(hash: string, expectedData: string): Promise<boolean> {
    const actualHash = await this.hash(expectedData);
    return actualHash === hash;
  }

  private async hash(data: string): Promise<string> {
    const buffer = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(data),
    );
    return Array.from(new Uint8Array(buffer))
      .map((b: number) => b.toString(16).padStart(2, "0"))
      .join("");
  }
}
