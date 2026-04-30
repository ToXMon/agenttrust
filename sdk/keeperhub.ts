/**
 * KeeperHub SDK — MCP-based task execution with x402 payments.
 *
 * Connects to KeeperHub MCP server for reliable task execution,
 * retry logic, audit trail logging, and x402 payment integration.
 *
 * Task types: swap_execution, trust_verification, agreement_settlement
 */
import type { Hex } from "viem";

// ── Types ──────────────────────────────────────────────────────

export type TaskType =
  | "swap_execution"
  | "trust_verification"
  | "agreement_settlement";

export type TaskStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "cancelled";

export interface KeeperTask {
  taskId: string;
  agentAddress: string;
  taskType: TaskType;
  params: Record<string, unknown>;
  paymentAmount: string;
  paymentToken: string;
  status: TaskStatus;
  result?: Record<string, unknown>;
  createdAt: number;
  completedAt?: number;
  retryCount: number;
  auditLog: AuditEntry[];
}

export interface AuditEntry {
  timestamp: number;
  action: string;
  details: Record<string, unknown>;
}

export interface KeeperConfig {
  mcpUrl: string;
  apiKey?: string;
  /** Max retries with exponential backoff (default: 3) */
  maxRetries?: number;
  /** Base delay in ms for exponential backoff (default: 1000) */
  baseDelay?: number;
}

export interface TaskSubmitOptions {
  taskType: TaskType;
  params: Record<string, unknown>;
  payment: {
    amount: string;
    token: string;
  };
  agentAddress: string;
  /** Max retries for this specific task (overrides config) */
  maxRetries?: number;
}

export interface PaymentReceipt {
  paymentHash: string;
  amount: string;
  token: string;
  status: "initialized" | "confirmed" | "failed";
  timestamp: number;
}

// ── Custom Errors ──────────────────────────────────────────────

export class KeeperHubError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly endpoint: string,
    public readonly body: unknown,
  ) {
    super(`KeeperHub error ${statusCode} on ${endpoint}: ${JSON.stringify(body)}`);
    this.name = "KeeperHubError";
  }
}

export class PaymentError extends Error {
  constructor(
    public readonly reason: string,
    public readonly paymentHash?: string,
  ) {
    super(`Payment error: ${reason}`);
    this.name = "PaymentError";
  }
}

export class TaskRetryExhaustedError extends Error {
  constructor(
    public readonly taskId: string,
    public readonly attempts: number,
    public readonly lastError: unknown,
  ) {
    super(`Task ${taskId} failed after ${attempts} attempts`);
    this.name = "TaskRetryExhaustedError";
  }
}

// ── Audit Trail ────────────────────────────────────────────────

/** In-memory audit log. In production, persist to 0G Storage. */
const globalAuditLog: AuditEntry[] = [];

function auditLog(action: string, details: Record<string, unknown>): AuditEntry {
  const entry: AuditEntry = {
    timestamp: Date.now(),
    action,
    details,
  };
  globalAuditLog.push(entry);
  console.log(`[KeeperHub:Audit] ${action}`, JSON.stringify(details));
  return entry;
}

/** Get all audit entries. */
export function getAuditLog(): AuditEntry[] {
  return [...globalAuditLog];
}

// ── MCP Client ─────────────────────────────────────────────────

export class KeeperHubClient {
  private readonly config: Required<Pick<KeeperConfig, "mcpUrl" | "maxRetries" | "baseDelay">> & {
    apiKey?: string;
  };
  private readonly tasks: Map<string, KeeperTask> = new Map();

  constructor(config: KeeperConfig) {
    this.config = {
      mcpUrl: config.mcpUrl || "https://mcp.keeperhub.com/v1",
      maxRetries: config.maxRetries ?? 3,
      baseDelay: config.baseDelay ?? 1000,
      apiKey: config.apiKey,
    };
    console.log(`[KeeperHub] Initialized with MCP URL: ${this.config.mcpUrl}`);
  }

  // ── Task Lifecycle ───────────────────────────────────────────

  /**
   * Submit a task to KeeperHub MCP server.
   * Returns a KeeperTask with status "pending" initially.
   * The server will pick it up and execute with retries.
   */
  async submitTask(options: TaskSubmitOptions): Promise<KeeperTask> {
    const taskId = crypto.randomUUID();
    const task: KeeperTask = {
      taskId,
      agentAddress: options.agentAddress,
      taskType: options.taskType,
      params: options.params,
      paymentAmount: options.payment.amount,
      paymentToken: options.payment.token,
      status: "pending",
      createdAt: Date.now(),
      retryCount: 0,
      auditLog: [],
    };

    // Log submission
    const entry = auditLog("task_submitted", {
      taskId,
      taskType: options.taskType,
      agentAddress: options.agentAddress,
      paymentAmount: options.payment.amount,
      paymentToken: options.payment.token,
    });
    task.auditLog.push(entry);

    // POST to MCP server
    try {
      await this.mcpRequest("POST", "/tasks", {
        taskId,
        taskType: options.taskType,
        params: options.params,
        agentAddress: options.agentAddress,
        payment: options.payment,
      });

      task.status = "running";
      this.tasks.set(taskId, task);

      auditLog("task_accepted", { taskId, status: "running" });
    } catch (err) {
      task.status = "failed";
      auditLog("task_submit_failed", {
        taskId,
        error: err instanceof Error ? err.message : String(err),
      });
    }

    this.tasks.set(taskId, task);
    return task;
  }

  /** Get the current status of a task. */
  async getTaskStatus(taskId: string): Promise<KeeperTask> {
    const local = this.tasks.get(taskId);
    if (!local) {
      throw new KeeperHubError(404, `/tasks/${taskId}`, {
        message: `Task ${taskId} not found`,
      });
    }

    // Poll MCP server for latest status
    try {
      const resp = await this.mcpRequest("GET", `/tasks/${taskId}`);
      const data = resp as Record<string, unknown>;

      local.status = (data.status as TaskStatus) ?? local.status;
      local.result = (data.result as Record<string, unknown>) ?? local.result;
      local.completedAt =
        (data.completedAt as number) ?? local.completedAt;

      if (local.status === "completed" || local.status === "failed") {
        auditLog(`task_${local.status}`, {
          taskId,
          status: local.status,
          result: local.result,
        });
      }
    } catch (err) {
      // If MCP server is unreachable, return local state
      console.warn(
        `[KeeperHub] Could not poll status for ${taskId}: ${err}`,
      );
    }

    return { ...local };
  }

  /** List all known tasks, optionally filtered by status. */
  async listTasks(status?: TaskStatus): Promise<KeeperTask[]> {
    const all = Array.from(this.tasks.values());
    if (status) {
      return all.filter((t) => t.status === status);
    }
    return all;
  }

  /** Cancel a pending or running task. */
  async cancelTask(taskId: string): Promise<KeeperTask> {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new KeeperHubError(404, `/tasks/${taskId}`, {
        message: `Task ${taskId} not found`,
      });
    }

    if (task.status === "completed" || task.status === "failed") {
      throw new KeeperHubError(409, `/tasks/${taskId}/cancel`, {
        message: `Cannot cancel task in ${task.status} state`,
      });
    }

    try {
      await this.mcpRequest("DELETE", `/tasks/${taskId}`);
    } catch (err) {
      console.warn(`[KeeperHub] Cancel request failed for ${taskId}: ${err}`);
    }

    task.status = "cancelled";
    const entry = auditLog("task_cancelled", { taskId });
    task.auditLog.push(entry);

    return { ...task };
  }

  // ── x402 Payment Integration ─────────────────────────────────

  /**
   * Initialize an x402 payment for a task.
   * Returns a payment hash that can be used to verify settlement.
   */
  async initPayment(
    amount: string,
    token: string,
    recipientAddress: string,
  ): Promise<PaymentReceipt> {
    const paymentHash = `0x${crypto.randomUUID().replace(/-/g, "")}` as Hex;

    auditLog("payment_initialized", {
      paymentHash,
      amount,
      token,
      recipient: recipientAddress,
    });

    try {
      await this.mcpRequest("POST", "/payments", {
        amount,
        token,
        recipient: recipientAddress,
        paymentHash,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new PaymentError(`Payment init failed: ${msg}`, paymentHash);
    }

    return {
      paymentHash,
      amount,
      token,
      status: "initialized",
      timestamp: Date.now(),
    };
  }

  /**
   * Verify that an x402 payment has been settled.
   * Polls with exponential backoff until confirmed or timeout.
   */
  async verifyPayment(paymentHash: string): Promise<PaymentReceipt> {
    const maxAttempts = this.config.maxRetries;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const resp = (await this.mcpRequest(
          "GET",
          `/payments/${paymentHash}`,
        )) as Record<string, unknown>;

        const status = resp.status as string;
        if (status === "confirmed") {
          auditLog("payment_confirmed", { paymentHash });
          return {
            paymentHash,
            amount: (resp.amount as string) ?? "0",
            token: (resp.token as string) ?? "",
            status: "confirmed",
            timestamp: (resp.timestamp as number) ?? Date.now(),
          };
        }

        if (status === "failed") {
          throw new PaymentError(
            `Payment ${paymentHash} failed on-chain`,
            paymentHash,
          );
        }

        // Still pending — wait and retry
        const delay = this.config.baseDelay * Math.pow(2, attempt);
        await sleep(delay);
      } catch (err) {
        if (err instanceof PaymentError) throw err;
        // Network error — retry with backoff
        const delay = this.config.baseDelay * Math.pow(2, attempt);
        console.warn(
          `[KeeperHub] Payment verify attempt ${attempt + 1} failed: ${err}`,
        );
        await sleep(delay);
      }
    }

    throw new PaymentError(
      `Payment ${paymentHash} not confirmed after ${maxAttempts} attempts`,
      paymentHash,
    );
  }

  // ── Convenience: Execute with retry ──────────────────────────

  /**
   * Submit a task and wait for it to complete, retrying on failure.
   * This is the main entry point for agents that need reliable execution.
   */
  async executeWithRetry(
    options: TaskSubmitOptions,
  ): Promise<KeeperTask> {
    const maxRetries = options.maxRetries ?? this.config.maxRetries;
    const task = await this.submitTask(options);

    let lastError: unknown = null;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      // Wait for task to reach terminal state
      const result = await this.waitForTask(task.taskId, 30_000);

      if (result.status === "completed") {
        return result;
      }

      if (result.status === "cancelled") {
        throw new TaskRetryExhaustedError(
          task.taskId,
          attempt + 1,
          "Task was cancelled",
        );
      }

      // Task failed — retry
      lastError = result.result ?? "Unknown error";
      task.retryCount = attempt + 1;
      auditLog("task_retry", {
        taskId: task.taskId,
        attempt: attempt + 1,
        maxRetries,
        lastError,
      });

      // Exponential backoff before retry
      const delay = this.config.baseDelay * Math.pow(2, attempt);
      await sleep(delay);

      // Resubmit
      task.status = "running";
      try {
        await this.mcpRequest("POST", `/tasks/${task.taskId}/retry`, {
          taskType: options.taskType,
          params: options.params,
        });
      } catch (err) {
        console.warn(`[KeeperHub] Retry request failed: ${err}`);
      }
    }

    throw new TaskRetryExhaustedError(
      task.taskId,
      maxRetries,
      lastError,
    );
  }

  // ── Internal ─────────────────────────────────────────────────

  /**
   * Wait for a task to reach a terminal state (completed, failed, cancelled).
   * Polls at regular intervals up to a timeout.
   */
  private async waitForTask(
    taskId: string,
    timeoutMs: number,
  ): Promise<KeeperTask> {
    const pollInterval = 2000; // 2 seconds
    const deadline = Date.now() + timeoutMs;

    while (Date.now() < deadline) {
      const task = await this.getTaskStatus(taskId);
      if (
        task.status === "completed" ||
        task.status === "failed" ||
        task.status === "cancelled"
      ) {
        return task;
      }
      await sleep(pollInterval);
    }

    throw new KeeperHubError(408, `/tasks/${taskId}`, {
      message: `Task ${taskId} timed out after ${timeoutMs}ms`,
    });
  }

  /**
   * Make an authenticated request to the MCP server.
   */
  private async mcpRequest(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<unknown> {
    const url = `${this.config.mcpUrl}${path}`;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (this.config.apiKey) {
      headers["Authorization"] = `Bearer ${this.config.apiKey}`;
    }

    const resp = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!resp.ok) {
      const errorBody = await resp.text();
      throw new KeeperHubError(resp.status, path, errorBody);
    }

    // Some responses may be empty (e.g., DELETE)
    const text = await resp.text();
    if (!text) return null;
    return JSON.parse(text);
  }
}

// ── Helpers ────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
