/**
 * AgentTrust Message Protocol
 * Extends AXL with trust verification and service agreement messages
 */

export enum MessageType {
  DISCOVER = "discover",
  INTRODUCE = "introduce",
  SERVICE_REQUEST = "service_request",
  SERVICE_ACCEPT = "service_accept",
  SERVICE_REJECT = "service_reject",
  SERVICE_RESULT = "service_result",
  TRUST_QUERY = "trust_query",
  TRUST_RESPONSE = "trust_response",
  AGREEMENT_CREATE = "agreement_create",
  AGREEMENT_SETTLE = "agreement_settle",
  PAYMENT_RELEASE = "payment_release",
}

export interface AgentTrustMessage {
  version: "1.0.0";
  type: MessageType;
  sender: string;
  recipient: string;
  timestamp: number;
  nonce: string;
  payload: Record<string, unknown>;
  signature?: string;
}

export interface DiscoverPayload {
  capabilities: string[];
  trustScore: number;
  ensName: string;
}

export interface ServiceRequestPayload {
  serviceType: string;
  description: string;
  amount: string;
  token: string;
  deadline: number;
  trustThreshold: number;
}

export interface ServiceResultPayload {
  requestId: string;
  outputHash: string;
  success: boolean;
  storageRef?: string;
}

export interface TrustQueryPayload {
  agentAddress: string;
  minimumScore?: number;
}

export interface TrustResponsePayload {
  agentAddress: string;
  score: number;
  agreementsCompleted: number;
  agreementsDisputed: number;
  meetsThreshold: boolean;
}

export function createMessage(
  type: MessageType,
  sender: string,
  recipient: string,
  payload: Record<string, unknown>,
): AgentTrustMessage {
  return {
    version: "1.0.0",
    type,
    sender,
    recipient,
    timestamp: Date.now(),
    nonce: crypto.randomUUID(),
    payload,
  };
}

export function validateMessage(msg: AgentTrustMessage): boolean {
  if (msg.version !== "1.0.0") return false;
  if (!msg.sender || !msg.recipient) return false;
  if (!Object.values(MessageType).includes(msg.type)) return false;
  if (msg.timestamp > Date.now() + 60_000) return false;
  return true;
}
