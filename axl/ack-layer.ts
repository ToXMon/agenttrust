/**
 * ACKLayer — Delivery confirmation over AXL's fire-and-forget /send.
 *
 * Wraps AXLClient to provide reliable message delivery with:
 * - ACK/NACK confirmation from receiver
 * - Exponential backoff retry (max 3 retries, starting at 1 s)
 * - 30-second overall timeout per message
 * - Event callbacks for ack, timeout, and incoming messages
 */

import { AXLClient, type ReceivedMessage } from "./axl-client.js";
import { MessageType, createMessage, type AgentTrustMessage, type ACKPayload } from "./protocol.js";

// ── Result types ───────────────────────────────────────────────

export interface ACKResult {
  delivered: boolean;
  messageId: string;
  retries: number;
  latencyMs: number;
}

type ACKCallback = (messageId: string) => void;
type MessageCallback = (message: AgentTrustMessage) => void;

// ── Pending message tracker ────────────────────────────────────

interface PendingMessage {
  readonly id: string;
  readonly peerId: string;
  readonly original: AgentTrustMessage;
  readonly createdAt: number;
  attempts: number;
  readonly maxAttempts: number;
  resolve: (result: ACKResult) => void;
  timer: ReturnType<typeof setTimeout>;
}

// ── Configuration ──────────────────────────────────────────────

export interface ACKLayerOptions {
  /** Max retry attempts (default 3) */
  maxRetries?: number;
  /** Initial backoff in ms (default 1 000) */
  initialBackoffMs?: number;
  /** Overall timeout per message in ms (default 30 000) */
  timeoutMs?: number;
  /** Our agent address (used as sender in ACK messages) */
  agentAddress: string;
}

/** Safely parse ACKPayload from a generic message payload. */
function parseACKPayload(raw: Record<string, unknown>): ACKPayload {
  return {
    originalNonce: String(raw.originalNonce ?? ""),
    received: Boolean(raw.received),
    timestamp: Number(raw.timestamp ?? 0),
  };
}

// ── ACK Layer ──────────────────────────────────────────────────

export class ACKLayer {
  private readonly client: AXLClient;
  private readonly opts: Required<Omit<ACKLayerOptions, "agentAddress">> & {
    agentAddress: string;
  };
  private readonly pending: Map<string, PendingMessage> = new Map();
  private readonly onAckCallbacks: ACKCallback[] = [];
  private readonly onTimeoutCallbacks: ACKCallback[] = [];
  private readonly onMessageCallbacks: MessageCallback[] = [];
  private running = false;

  constructor(client: AXLClient, opts: ACKLayerOptions) {
    this.client = client;
    this.opts = {
      maxRetries: opts.maxRetries ?? 3,
      initialBackoffMs: opts.initialBackoffMs ?? 1_000,
      timeoutMs: opts.timeoutMs ?? 30_000,
      agentAddress: opts.agentAddress,
    };
  }

  // ── Public API ──────────────────────────────────────────────

  /**
   * Send a message with delivery confirmation.
   * Resolves when an ACK is received or the timeout expires.
   */
  async sendWithAck(
    peerId: string,
    message: AgentTrustMessage,
  ): Promise<ACKResult> {
    const id = message.nonce;
    const createdAt = Date.now();

    return new Promise<ACKResult>((resolve) => {
      const timer = setTimeout(() => {
        this.handleTimeout(id);
      }, this.opts.timeoutMs);

      const pending: PendingMessage = {
        id,
        peerId,
        original: message,
        createdAt,
        attempts: 0,
        maxAttempts: this.opts.maxRetries + 1,
        resolve,
        timer,
      };

      this.pending.set(id, pending);
      void this.attemptSend(pending);
    });
  }

  /** Register a callback for successful ACKs. */
  onAck(cb: ACKCallback): void {
    this.onAckCallbacks.push(cb);
  }

  /** Register a callback for timed-out messages. */
  onTimeout(cb: ACKCallback): void {
    this.onTimeoutCallbacks.push(cb);
  }

  /** Register a callback for non-ACK messages received. */
  onMessageReceived(cb: MessageCallback): void {
    this.onMessageCallbacks.push(cb);
  }

  /** Start listening for incoming messages via AXLClient polling. */
  start(): void {
    if (this.running) return;
    this.running = true;
    this.client.startPolling(
      (msg: ReceivedMessage) => this.handleIncoming(msg),
      100,
    );
  }

  /** Stop polling and cancel all pending messages. */
  stop(): void {
    this.running = false;
    this.client.stopPolling();
    for (const [id, p] of this.pending) {
      clearTimeout(p.timer);
      p.resolve({ delivered: false, messageId: id, retries: p.attempts - 1, latencyMs: Date.now() - p.createdAt });
    }
    this.pending.clear();
  }

  // ── Internal ────────────────────────────────────────────────

  private async attemptSend(pending: PendingMessage): Promise<void> {
    if (pending.attempts >= pending.maxAttempts) {
      this.handleTimeout(pending.id);
      return;
    }
    pending.attempts++;
    try {
      await this.client.send(pending.peerId, pending.original);
    } catch (err) {
      console.error(
        `[ACKLayer] send failed for ${pending.id} (attempt ${pending.attempts}):`,
        err,
      );
    }

    // Schedule retry if no ACK received
    const backoff = this.opts.initialBackoffMs * 2 ** (pending.attempts - 1);
    setTimeout(() => {
      if (this.pending.has(pending.id)) {
        void this.attemptSend(pending);
      }
    }, backoff);
  }

  private handleIncoming(msg: ReceivedMessage): void {
    if (msg.body.type === MessageType.MESSAGE_ACK) {
      const payload = parseACKPayload(msg.body.payload);
      const pending = this.pending.get(payload.originalNonce);
      if (pending) {
        clearTimeout(pending.timer);
        this.pending.delete(payload.originalNonce);
        const result: ACKResult = {
          delivered: payload.received,
          messageId: payload.originalNonce,
          retries: pending.attempts - 1,
          latencyMs: Date.now() - pending.createdAt,
        };
        pending.resolve(result);
        this.onAckCallbacks.forEach((cb) => cb(payload.originalNonce));
      }
    } else {
      // Non-ACK message — auto-reply with ACK, then forward
      const ackPayload: Record<string, unknown> = {
        originalNonce: msg.body.nonce,
        received: true,
        timestamp: Date.now(),
      };
      const ackMsg = createMessage(
        MessageType.MESSAGE_ACK,
        this.opts.agentAddress,
        msg.body.sender,
        ackPayload,
      );
      void this.client.send(msg.fromPeerId, ackMsg);
      this.onMessageCallbacks.forEach((cb) => cb(msg.body));
    }
  }

  private handleTimeout(messageId: string): void {
    const pending = this.pending.get(messageId);
    if (!pending) return;
    clearTimeout(pending.timer);
    this.pending.delete(messageId);
    pending.resolve({
      delivered: false,
      messageId,
      retries: pending.attempts - 1,
      latencyMs: Date.now() - pending.createdAt,
    });
    this.onTimeoutCallbacks.forEach((cb) => cb(messageId));
  }
}
