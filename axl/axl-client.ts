/**
 * AXLClient — HTTP client for Gensyn AXL P2P mesh node REST API.
 *
 * AXL nodes are Go binaries exposing REST endpoints on localhost.
 * There is no JS/TS SDK; this client wraps the raw HTTP API.
 * Uses native `fetch` (Node 18+).
 */

import type { AgentTrustMessage } from "./protocol.js";

// ── Custom errors ──────────────────────────────────────────────

export class AXLClientError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = "AXLClientError";
  }
}

// ── Interfaces ─────────────────────────────────────────────────

/** Peer entry returned by GET /topology */
export interface TopologyPeer {
  uri: string;
  up: boolean;
  address?: string;
  port?: number;
}

/** Response shape from GET /topology */
export interface TopologyInfo {
  ourIpv6: string;
  ourPublicKey: string;
  peers: TopologyPeer[];
  tree: string[];
}

/** Result of a /send call */
export interface SendResult {
  ok: boolean;
  sentBytes: number;
}

/** A message received via /recv */
export interface ReceivedMessage {
  fromPeerId: string;
  body: AgentTrustMessage;
}

// ── Configuration ──────────────────────────────────────────────

export interface AXLClientOptions {
  /** Per-request timeout in ms (default 10 000) */
  timeoutMs?: number;
  /** Max retries on transient failures (default 2) */
  maxRetries?: number;
}

// ── Client ─────────────────────────────────────────────────────

export class AXLClient {
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly maxRetries: number;
  private pollTimer: ReturnType<typeof setInterval> | null = null;

  constructor(nodeUrl: string, opts: AXLClientOptions = {}) {
    this.baseUrl = nodeUrl.replace(/\/+$/, "");
    this.timeoutMs = opts.timeoutMs ?? 10_000;
    this.maxRetries = opts.maxRetries ?? 2;
  }

  // ── Topology ───────────────────────────────────────────────

  /** Fetch the node's topology (our IPv6, pubkey, peer list). */
  async getTopology(): Promise<TopologyInfo> {
    const res = await this.request("GET", "/topology");
    const json = (await res.json()) as Record<string, unknown>;
    return {
      ourIpv6: (json.our_ipv6 as string) ?? "",
      ourPublicKey: (json.our_public_key as string) ?? "",
      peers: (json.peers as TopologyPeer[]) ?? [],
      tree: (json.tree as string[]) ?? [],
    };
  }

  /** Convenience: return our own public key (ed25519 hex). */
  async getPeerId(): Promise<string> {
    const topo = await this.getTopology();
    return topo.ourPublicKey;
  }

  // ── Send ───────────────────────────────────────────────────

  /**
   * Fire-and-forget send to a remote peer.
   * Sets `X-Destination-Peer-Id` header with the target's public key.
   */
  async send(peerId: string, message: AgentTrustMessage): Promise<SendResult> {
    const body = JSON.stringify(message);
    const res = await this.request("POST", "/send", body, {
      "X-Destination-Peer-Id": peerId,
      "Content-Type": "application/json",
    });

    const sentBytes = Number(res.headers.get("X-Sent-Bytes")) || 0;
    return { ok: res.ok, sentBytes };
  }

  // ── Receive ────────────────────────────────────────────────

  /**
   * Poll for a single message.
   * Returns `null` when the queue is empty (HTTP 204).
   */
  async recv(): Promise<ReceivedMessage | null> {
    try {
      const res = await this.request("GET", "/recv");

      if (res.status === 204) return null;

      const fromPeerId = res.headers.get("X-From-Peer-Id") ?? "unknown";
      const body = (await res.json()) as AgentTrustMessage;
      return { fromPeerId, body };
    } catch (err) {
      if (err instanceof AXLClientError && err.statusCode === 204) {
        return null;
      }
      throw err;
    }
  }

  // ── Polling helper ─────────────────────────────────────────

  /**
   * Start polling `/recv` at the given interval.
   * Received messages are passed to `callback`.
   */
  startPolling(
    callback: (msg: ReceivedMessage) => void,
    intervalMs: number = 100,
  ): void {
    this.stopPolling();
    this.pollTimer = setInterval(async () => {
      try {
        const msg = await this.recv();
        if (msg) callback(msg);
      } catch (err) {
        console.error("[AXLClient] polling error:", err);
      }
    }, intervalMs);
  }

  /** Stop the active polling loop. */
  stopPolling(): void {
    if (this.pollTimer !== null) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  // ── Internal fetch with retry + timeout ────────────────────

  private async request(
    method: string,
    path: string,
    body?: string,
    extraHeaders?: Record<string, string>,
  ): Promise<Response> {
    const url = `${this.baseUrl}${path}`;
    let lastErr: unknown;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.timeoutMs);

      try {
        const headers: Record<string, string> = {
          Accept: "application/json",
          ...extraHeaders,
        };
        if (body) headers["Content-Type"] = "application/json";

        const res = await fetch(url, {
          method,
          headers,
          body,
          signal: controller.signal,
        });

        if (!res.ok && res.status >= 500 && attempt < this.maxRetries) {
          await this.backoff(attempt);
          continue;
        }

        if (!res.ok && res.status !== 204) {
          throw new AXLClientError(
            `AXL ${method} ${path} returned ${res.status}`,
            res.status,
          );
        }

        return res;
      } catch (err) {
        lastErr = err;
        if (err instanceof DOMException && err.name === "AbortError") {
          throw new AXLClientError(
            `AXL ${method} ${path} timed out after ${this.timeoutMs}ms`,
            undefined,
            err,
          );
        }
        if (attempt < this.maxRetries) {
          await this.backoff(attempt);
          continue;
        }
      } finally {
        clearTimeout(timer);
      }
    }

    throw new AXLClientError(
      `AXL ${method} ${path} failed after ${this.maxRetries + 1} attempts`,
      undefined,
      lastErr,
    );
  }

  private backoff(attempt: number): Promise<void> {
    const ms = Math.min(500 * 2 ** attempt, 5_000);
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
