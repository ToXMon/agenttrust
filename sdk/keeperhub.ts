/**
 * KeeperHub SDK — MCP-based task execution with x402 payments
 * Real MCP client for agent task management and payment settlement.
 */

import type { Hex } from "viem";

// ─── Types ────────────────────────────────────────────────────────────────────

export type TaskStatus = "pending" | "running" | "completed" | "failed" | "cancelled";
export type TaskType = "swap_execution" | "trust_verification" | "agreement_settlement" | "payment_settlement" | "data_persistence";

export interface KeeperConfig {
  mcpUrl: string;
  apiKey: string;
  agentAddress: Hex;
  retryMaxAttempts?: number;
  retryBaseMs?: number;
}

export interface KeeperTask {
  taskId: string;
  agentAddress: Hex;
  taskType: TaskType;
  params: Record<string, unknown>;
  paymentAmount: string;
  paymentToken: Hex;
  status: TaskStatus;
  result?: Record<string, unknown>;
  createdAt: number;
  completedAt?: number;
  retryCount: number;
  error?: string;
}

export interface PaymentResult {
  paymentHash: Hex;
  amount: string;
  token: Hex;
  status: "initiated" | "confirmed" | "failed";
  blockNumber?: number;
}

export interface AuditEntry {
  timestamp: number;
  action: string;
  taskId: string;
  details: Record<string, unknown>;
}

export class KeeperHubError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly endpoint: string,
    public readonly body: string,
  ) {
    super(`KeeperHub [${statusCode}] at ${endpoint}: ${body.slice(0, 200)}`);
    this.name = "KeeperHubError";
  }
}

// ─── Audit Trail ──────────────────────────────────────────────────────────────

const auditLog: AuditEntry[] = [];

function audit(action: string, taskId: string, details: Record<string, unknown> = {}) {
  const entry: AuditEntry = { timestamp: Date.now(), action, taskId, details };
  auditLog.push(entry);
  console.log(`[KeeperHub:Audit] ${action} task=${taskId} ${JSON.stringify(details).slice(0, 100)}`);
}

export function getAuditLog(): AuditEntry[] {
  return [...auditLog];
}

// ─── Client ───────────────────────────────────────────────────────────────────

export class KeeperHubClient {
  private readonly config: Required<KeeperConfig>;

  constructor(config: KeeperConfig) {
    this.config = {
      retryMaxAttempts: 3,
      retryBaseMs: 1000,
      ...config,
    };
  }

  private get headers(): Record<string, string> {
    return {
      "Content-Type": "application/json",
      "x-api-key": this.config.apiKey,
      "x-agent-address": this.config.agentAddress,
    };
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
    attempt = 1,
  ): Promise<T> {
    const url = `${this.config.mcpUrl}${path}`;
    const res = await fetch(url, {
      method,
      headers: this.headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (res.status === 429 || res.status >= 500) {
      if (attempt < this.config.retryMaxAttempts) {
        const delay = this.config.retryBaseMs * Math.pow(2, attempt - 1);
        console.log(`[KeeperHub] Retry ${attempt}/${this.config.retryMaxAttempts} after ${delay}ms`);
        await new Promise((r) => setTimeout(r, delay));
        return this.request<T>(method, path, body, attempt + 1);
      }
    }

    if (!res.ok) {
      const text = await res.text();
      throw new KeeperHubError(res.status, path, text);
    }

    return res.json() as Promise<T>;
  }

  // ── Task Management ──────────────────────────────────────────────────────

  async submitTask(
    taskType: TaskType,
    params: Record<string, unknown>,
    payment: { amount: string; token: Hex },
  ): Promise<KeeperTask> {
    const body = {
      taskType,
      params,
      paymentAmount: payment.amount,
      paymentToken: payment.token,
      agentAddress: this.config.agentAddress,
    };

    const task = await this.request<KeeperTask>("POST", "/tasks", body);
    audit("task_submitted", task.taskId, { taskType, amount: payment.amount });
    return task;
  }

  async getTaskStatus(taskId: string): Promise<KeeperTask> {
    const task = await this.request<KeeperTask>("GET", `/tasks/${taskId}`);
    audit("status_checked", taskId, { status: task.status });
    return task;
  }

  async listTasks(status?: TaskStatus): Promise<KeeperTask[]> {
    const path = status ? `/tasks?status=${status}` : "/tasks";
    return this.request<KeeperTask[]>("GET", path);
  }

  async cancelTask(taskId: string): Promise<KeeperTask> {
    const task = await this.request<KeeperTask>("POST", `/tasks/${taskId}/cancel`);
    audit("task_cancelled", taskId, {});
    return task;
  }

  // ── x402 Payment ─────────────────────────────────────────────────────────

  async initPayment(amount: string, token: Hex): Promise<PaymentResult> {
    const result = await this.request<PaymentResult>("POST", "/payments", {
      amount,
      token,
      agentAddress: this.config.agentAddress,
    });
    audit("payment_initiated", "", { amount, token, hash: result.paymentHash });
    return result;
  }

  async verifyPayment(paymentHash: Hex): Promise<PaymentResult> {
    const result = await this.request<PaymentResult>("GET", `/payments/${paymentHash}`);
    audit("payment_verified", "", { hash: paymentHash, status: result.status });
    return result;
  }

  // ── Health Check ─────────────────────────────────────────────────────────

  async healthCheck(): Promise<{ status: string; version: string }> {
    return this.request("GET", "/health");
  }
}
