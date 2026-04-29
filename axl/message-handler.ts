import {
  type AgentTrustMessage,
  MessageType,
  validateMessage,
} from "./protocol.js";
import type { AXLClient, ReceivedMessage } from "./axl-client.js";
import type { TrustVerify } from "./trust-verify.js";

interface MessageHandlerConfig {
  agentAddress: string;
  trustVerifier: TrustVerify;
  client: AXLClient;
}

type MessageCallback = (message: AgentTrustMessage) => Promise<AgentTrustMessage | null>;

/**
 * AXL Message Handler
 * Processes incoming AXL messages with trust verification.
 * Wires to real AXL polling via AXLClient.
 */
export class MessageHandler {
  private readonly config: MessageHandlerConfig;
  private readonly handlers: Map<MessageType, MessageCallback>;
  private readonly processedNonces: Set<string>;

  constructor(config: MessageHandlerConfig) {
    this.config = config;
    this.handlers = new Map();
    this.processedNonces = new Set();
    this.registerDefaultHandlers();
  }

  /** Start polling for messages via AXLClient. */
  start(): void {
    this.config.client.startPolling(
      (msg: ReceivedMessage) => { void this.handleRawMessage(msg); },
      100,
    );
    console.log("[MessageHandler] Started polling for messages");
  }

  /** Stop polling for messages. */
  stop(): void {
    this.config.client.stopPolling();
    console.log("[MessageHandler] Stopped polling");
  }

  /**
   * Process a raw received message from AXL /recv polling.
   * Validates, deduplicates, and dispatches to the appropriate handler.
   */
  async handleRawMessage(raw: ReceivedMessage): Promise<AgentTrustMessage | null> {
    const message = raw.body;

    if (!validateMessage(message)) {
      console.error("[MessageHandler] Invalid message received");
      return null;
    }

    if (this.processedNonces.has(message.nonce)) {
      console.warn(`[MessageHandler] Duplicate nonce: ${message.nonce}`);
      return null;
    }

    this.processedNonces.add(message.nonce);

    if (message.recipient !== this.config.agentAddress) {
      console.warn("[MessageHandler] Message not for this agent");
      return null;
    }

    const handler = this.handlers.get(message.type);
    if (!handler) {
      console.warn(`[MessageHandler] No handler for type: ${message.type}`);
      return null;
    }

    return handler(message);
  }

  registerHandler(type: MessageType, callback: MessageCallback): void {
    this.handlers.set(type, callback);
  }

  private registerDefaultHandlers(): void {
    this.registerHandler(MessageType.DISCOVER, async (msg: AgentTrustMessage) => {
      console.log(`[MessageHandler] Discover from ${msg.sender}`);
      return null;
    });

    this.registerHandler(MessageType.TRUST_QUERY, async (msg: AgentTrustMessage) => {
      const agentAddress = msg.payload.agentAddress as string;
      const result = await this.config.trustVerifier.verify(agentAddress);
      return {
        version: "1.0.0",
        type: MessageType.TRUST_RESPONSE,
        sender: this.config.agentAddress,
        recipient: msg.sender,
        timestamp: Date.now(),
        nonce: crypto.randomUUID(),
        payload: {
          agentAddress,
          score: result.score,
          meetsThreshold: result.trusted,
        },
      };
    });
  }
}
