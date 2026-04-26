/**
 * AXL Node Configuration
 * Sets up the Agent Exchange Layer node for peer-to-peer agent communication
 */

export interface AXLNodeConfig {
  nodeId: string;
  listenPort: number;
  bootstrapPeers: string[];
  maxConnections: number;
  messageTimeout: number;
  trustVerificationEnabled: boolean;
}

export interface PeerInfo {
  peerId: string;
  ensName: string;
  address: string;
  trustScore: number;
  lastSeen: number;
  connected: boolean;
}

const DEFAULT_CONFIG: AXLNodeConfig = {
  nodeId: "",
  listenPort: 3000,
  bootstrapPeers: [],
  maxConnections: 50,
  messageTimeout: 30_000,
  trustVerificationEnabled: true,
};

export class AXLNode {
  private readonly config: AXLNodeConfig;
  private readonly peers: Map<string, PeerInfo>;
  private started: boolean;

  constructor(overrides?: Partial<AXLNodeConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...overrides };
    this.peers = new Map();
    this.started = false;
  }

  async start(): Promise<void> {
    console.log(`[AXL] Starting node on port ${this.config.listenPort}`);
    this.started = true;
    console.log(`[AXL] Node started with ID: ${this.config.nodeId || "auto"}`);
  }

  async connect(peerUrl: string): Promise<PeerInfo> {
    console.log(`[AXL] Connecting to peer: ${peerUrl}`);
    const peer: PeerInfo = {
      peerId: `peer-${Date.now()}`,
      ensName: "",
      address: "",
      trustScore: 0,
      lastSeen: Date.now(),
      connected: true,
    };
    this.peers.set(peer.peerId, peer);
    return peer;
  }

  async disconnect(peerId: string): Promise<void> {
    const peer = this.peers.get(peerId);
    if (peer) {
      peer.connected = false;
      console.log(`[AXL] Disconnected from peer: ${peerId}`);
    }
  }

  getConnectedPeers(): PeerInfo[] {
    return Array.from(this.peers.values()).filter((p: PeerInfo) => p.connected);
  }

  getConfig(): Readonly<AXLNodeConfig> {
    return this.config;
  }

  isStarted(): boolean {
    return this.started;
  }
}
