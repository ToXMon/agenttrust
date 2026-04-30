/**
 * Verification SDK — AI-powered service result verification using 0G Compute.
 *
 * When a provider agent completes a service, submit the result to 0G Compute
 * for TEE-verified AI review. Compare verification result with on-chain
 * trust score from TrustNFT (ERC-7857).
 *
 * Uses ZeroGClient from ./zerog.ts for inference and storage operations.
 */
import { ZeroGClient, type StorageRef, ZeroGComputeError } from "./zerog.js";

// ── Exported Interfaces ───────────────────────────────────────────────

/** A completed service result awaiting verification. */
export interface ServiceResult {
  agreementId: string;
  providerAddress: string;
  requesterAddress: string;
  serviceType: string;
  input: string;
  output: string;
  claimedQuality: number; // 0–100
}

/** The outcome of an AI verification check. */
export interface VerificationResult {
  agreementId: string;
  passed: boolean;
  qualityScore: number; // 0–100
  reasoning: string;
  teeVerified: boolean;
  timestamp: number;
  storageHash?: string;
}

/** Configuration for the VerificationClient. */
export interface VerificationConfig {
  privateKey: string;
  provider: string; // 0G Compute provider address
  storageRpc?: string;
  chainRpc?: string;
  trustThreshold?: number; // minimum score to pass (default 70)
}

// ── Error Classes ─────────────────────────────────────────────────────

export class VerificationError extends Error {
  constructor(
    message: string,
    public readonly cause: unknown,
  ) {
    super(message);
    this.name = "VerificationError";
  }
}

// ── Defaults ──────────────────────────────────────────────────────────

const DEFAULT_TRUST_THRESHOLD = 70;
const VERIFICATION_SYSTEM_PROMPT = `You are an expert quality evaluator for AI agent services.
Evaluate the service output against the input requirements.
Be objective and thorough. Respond in EXACTLY this format:

PASS: true|false
SCORE: <0-100>
REASONING: <1-2 sentence explanation>

Criteria:
1. Does the output address the input requirements?
2. Is the output complete and well-formed?
3. Does the quality match the claimed quality score?
4. Are there obvious errors or issues?`;

// ── Helpers ───────────────────────────────────────────────────────────

/** Parse the structured AI verification response. */
function parseVerificationResponse(
  response: string,
): { passed: boolean; score: number; reasoning: string } {
  const lines = response
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  let passed = false;
  let score = 0;
  let reasoning = "No reasoning provided";

  for (const line of lines) {
    const upper = line.toUpperCase();
    if (upper.startsWith("PASS:")) {
      const val = line.slice(5).trim().toLowerCase();
      passed = val === "true" || val === "yes";
    } else if (upper.startsWith("SCORE:")) {
      const parsed = parseInt(line.slice(5).trim(), 10);
      score = Number.isNaN(parsed) ? 0 : Math.max(0, Math.min(100, parsed));
    } else if (upper.startsWith("REASONING:")) {
      reasoning = line.slice(10).trim();
    }
  }

  return { passed, score, reasoning };
}

// ── VerificationClient ────────────────────────────────────────────────

/**
 * AI-powered service verification using 0G Compute with TEE attestation.
 *
 * Submits completed service results to an AI model running on 0G Compute
 * for quality evaluation, then persists the verification on 0G Storage
 * for an immutable audit trail.
 */
export class VerificationClient {
  private readonly zerog: ZeroGClient;
  private readonly provider: string;
  private readonly trustThreshold: number;

  constructor(config: VerificationConfig) {
    this.zerog = new ZeroGClient({
      privateKey: config.privateKey as `0x${string}`,
      storageRpc:
        config.storageRpc ?? "https://indexer-storage-turbo.0g.ai",
      chainRpc: config.chainRpc ?? "https://evmrpc.0g.ai",
      computeProvider: config.provider,
    });
    this.provider = config.provider;
    this.trustThreshold = config.trustThreshold ?? DEFAULT_TRUST_THRESHOLD;
  }

  /** Build a structured prompt for the AI to evaluate service quality. */
  buildVerificationPrompt(result: ServiceResult): string {
    return [
      VERIFICATION_SYSTEM_PROMPT,
      "",
      "--- SERVICE RESULT TO EVALUATE ---",
      `Agreement ID: ${result.agreementId}`,
      `Provider: ${result.providerAddress}`,
      `Requester: ${result.requesterAddress}`,
      `Service Type: ${result.serviceType}`,
      `Claimed Quality: ${result.claimedQuality}/100`,
      "",
      "INPUT:",
      result.input,
      "",
      "OUTPUT:",
      result.output,
      "",
      "Evaluate this service result. Is the output satisfactory?",
    ].join("\n");
  }

  /** Submit a service result for AI verification via 0G Compute. */
  async verifyServiceResult(result: ServiceResult): Promise<VerificationResult> {
    console.log(
      `[Verification] Verifying agreement ${result.agreementId}...`,
    );

    const prompt = this.buildVerificationPrompt(result);

    let inferenceResult: { content: string; verified: boolean };
    try {
      inferenceResult = await this.zerog.inference(prompt, this.provider);
    } catch (err) {
      if (err instanceof ZeroGComputeError) {
        throw new VerificationError(
          `Compute inference failed for ${result.agreementId}`,
          err,
        );
      }
      throw new VerificationError("Inference call failed", err);
    }

    const { passed: aiPassed, score, reasoning } = parseVerificationResponse(
      inferenceResult.content,
    );

    const passed = aiPassed && score >= this.trustThreshold;

    const verification: VerificationResult = {
      agreementId: result.agreementId,
      passed,
      qualityScore: score,
      reasoning,
      teeVerified: inferenceResult.verified,
      timestamp: Date.now(),
    };

    // Persist verification to 0G Storage for audit trail
    try {
      const storageHash = await this.storeVerificationResult(verification);
      verification.storageHash = storageHash;
    } catch (err) {
      console.error(
        `[Verification] Storage failed for ${result.agreementId}:`,
        err,
      );
      // Non-fatal — verification still valid, just not persisted
    }

    console.log(
      `[Verification] ${result.agreementId}: ${passed ? "PASS" : "FAIL"} (score=${score}, tee=${verification.teeVerified})`,
    );

    return verification;
  }

  /** Store a verification result on 0G Storage, returning the root hash. */
  async storeVerificationResult(
    result: VerificationResult,
  ): Promise<string> {
    const payload: Record<string, unknown> = {
      ...result,
      version: 1,
      storedAt: Date.now(),
      type: "agenttrust.verification",
    };

    let ref: StorageRef;
    try {
      ref = await this.zerog.storeJSON(
        payload,
        `verification:${result.agreementId}`,
      );
    } catch (err) {
      throw new VerificationError(
        `Failed to store verification for ${result.agreementId}`,
        err,
      );
    }

    console.log(
      `[Verification] Stored ${result.agreementId} → ${ref.hash}`,
    );
    return ref.hash;
  }

  /** Retrieve a stored verification result from 0G Storage. */
  async retrieveVerification(
    storageHash: string,
  ): Promise<VerificationResult | null> {
    const raw = await this.zerog.retrieve(storageHash);
    if (!raw) return null;

    try {
      const parsed = JSON.parse(raw) as VerificationResult;
      if (
        typeof parsed.agreementId === "string" &&
        typeof parsed.passed === "boolean" &&
        typeof parsed.qualityScore === "number"
      ) {
        return parsed;
      }
      console.error("[Verification] Stored data has unexpected shape");
      return null;
    } catch {
      console.error("[Verification] Failed to parse stored verification");
      return null;
    }
  }

  /** Verify that a stored result matches an expected verification. */
  async verifyStoredIntegrity(
    storageHash: string,
    expected: VerificationResult,
  ): Promise<boolean> {
    const stored = await this.retrieveVerification(storageHash);
    if (!stored) return false;
    return (
      stored.agreementId === expected.agreementId &&
      stored.passed === expected.passed &&
      stored.qualityScore === expected.qualityScore &&
      stored.teeVerified === expected.teeVerified
    );
  }
}

// ── Factory ───────────────────────────────────────────────────────────

/** Create a VerificationClient from environment variables. */
export function createVerificationClient(
  overrides?: Partial<VerificationConfig>,
): VerificationClient {
  const config: VerificationConfig = {
    privateKey:
      overrides?.privateKey ??
      process.env["ZEROG_PRIVATE_KEY"] ??
      "",
    provider:
      overrides?.provider ??
      process.env["ZEROG_COMPUTE_PROVIDER"] ??
      "",
    storageRpc: overrides?.storageRpc ?? process.env["ZEROG_STORAGE_RPC"],
    chainRpc: overrides?.chainRpc ?? process.env["ZEROG_CHAIN_RPC"],
    trustThreshold: overrides?.trustThreshold,
  };
  return new VerificationClient(config);
}
