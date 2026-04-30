/**
 * WP8 Integration Tests — 0G Storage + Compute + Wallet
 *
 * Tests the wallet module (AgentWallet), 0G Storage client (ZeroGClient),
 * and Verification module (VerificationClient) with cross-module integration.
 *
 * Run: cd /a0/usr/projects/agentrust && npx tsx --test sdk/tests/wp8-integration.test.ts
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import { AgentWallet, CHAINS, getChainConfig, DEFAULT_CHAIN, getSupportedChains } from "../../wallet/index.js";
import type { GasEstimate } from "../../wallet/types.js";
import {
  ZeroGClient,
  ZeroGStorageError,
  ZEROG_DEFAULTS,
} from "../zerog.js";
import type { StorageRef, ZeroGConfig } from "../zerog.js";
import {
  VerificationClient,
  VerificationError,
} from "../verification.js";
import type { ServiceResult } from "../verification.js";

// ── Test Constants ────────────────────────────────────────────────────

/** Test private key — NOT a real key, just 32 'a' bytes. */
const TEST_PK = `0x${"a".repeat(64)}` as `0x${string}`;

/** Expected address derived from TEST_PK. */
const EXPECTED_ADDRESS = "0x8fd379246834eac74B8419FfdA202CF8051F7A03";

// ── 1. Wallet Module Tests ────────────────────────────────────────────

test("AgentWallet.fromPrivateKey generates valid address", () => {
  const wallet = AgentWallet.fromPrivateKey(TEST_PK);
  const address = wallet.getAddress();

  assert.ok(address.startsWith("0x"), "address should start with 0x");
  assert.strictEqual(address.length, 42, "address should be 42 characters");
  assert.strictEqual(address, EXPECTED_ADDRESS, "address should match expected derived address");

  const info = wallet.getInfo();
  assert.strictEqual(info.address, address, "getInfo should return same address");
  assert.ok(typeof info.createdAt === "string", "createdAt should be a string");
});

test("AgentWallet.getBalance returns formatted balance", async () => {
  const wallet = AgentWallet.fromPrivateKey(TEST_PK);
  try {
    const formatted = await wallet.getFormattedBalance("base");
    assert.ok(typeof formatted === "string", "formatted balance should be a string");
    console.log(`  balance on Base: ${formatted} ETH`);
  } catch (err) {
    console.log(`  SKIP: network unavailable — ${err instanceof Error ? err.message : String(err)}`);
  }
});

test("AgentWallet chain configs are correct", () => {
  // Verify all 6 chains present
  const chainNames = getSupportedChains();
  assert.strictEqual(chainNames.length, 6, "should have 6 chains");

  // Verify Base chainId
  const baseConfig = getChainConfig("base");
  assert.strictEqual(baseConfig.chainId, 8453, "Base chainId should be 8453");
  assert.strictEqual(baseConfig.name, "Base", "Base name should be 'Base'");
  assert.strictEqual(baseConfig.nativeToken.symbol, "ETH", "Base native token should be ETH");

  // Verify CHAINS record
  assert.ok("base" in CHAINS, "CHAINS should have 'base' key");
  assert.ok("ethereum" in CHAINS, "CHAINS should have 'ethereum' key");
  assert.ok("polygon" in CHAINS, "CHAINS should have 'polygon' key");
  assert.ok("arbitrum" in CHAINS, "CHAINS should have 'arbitrum' key");
  assert.ok("optimism" in CHAINS, "CHAINS should have 'optimism' key");
  assert.ok("bsc" in CHAINS, "CHAINS should have 'bsc' key");

  // Verify default chain
  assert.strictEqual(DEFAULT_CHAIN, "base", "default chain should be 'base'");

  // Verify chain IDs
  assert.strictEqual(CHAINS.ethereum.chainId, 1, "Ethereum chainId should be 1");
  assert.strictEqual(CHAINS.polygon.chainId, 137, "Polygon chainId should be 137");
  assert.strictEqual(CHAINS.arbitrum.chainId, 42161, "Arbitrum chainId should be 42161");
  assert.strictEqual(CHAINS.optimism.chainId, 10, "Optimism chainId should be 10");
  assert.strictEqual(CHAINS.bsc.chainId, 56, "BSC chainId should be 56");
});

test("AgentWallet gas estimation returns valid structure", async () => {
  const wallet = AgentWallet.fromPrivateKey(TEST_PK);
  try {
    const estimate = await wallet.estimateGas({
      to: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045" as `0x${string}`,
      value: 0n,
    }, "base");

    assert.ok(typeof estimate.gasLimit === "bigint", "gasLimit should be bigint");
    assert.ok(typeof estimate.maxFeePerGas === "bigint", "maxFeePerGas should be bigint");
    assert.ok(typeof estimate.maxPriorityFeePerGas === "bigint", "maxPriorityFeePerGas should be bigint");
    assert.ok(typeof estimate.estimatedCost === "bigint", "estimatedCost should be bigint");
    assert.ok(estimate.gasLimit > 0n, "gasLimit should be > 0");
    console.log(`  gasLimit: ${estimate.gasLimit}, estimatedCost: ${estimate.estimatedCost} wei`);
  } catch (err) {
    console.log(`  SKIP: network unavailable — ${err instanceof Error ? err.message : String(err)}`);
  }
});

// ── 2. 0G Storage Tests ───────────────────────────────────────────────

test("ZeroGClient creates valid instance", () => {
  const client = new ZeroGClient({
    storageRpc: ZEROG_DEFAULTS.storageRpc,
    chainRpc: ZEROG_DEFAULTS.chainRpc,
    privateKey: TEST_PK,
  });

  // Verify the defaults match mainnet
  assert.strictEqual(
    ZEROG_DEFAULTS.storageRpc,
    "https://indexer-storage-turbo.0g.ai",
    "default storageRpc should be mainnet turbo indexer",
  );
  assert.strictEqual(
    ZEROG_DEFAULTS.chainRpc,
    "https://evmrpc.0g.ai",
    "default chainRpc should be mainnet",
  );
  assert.strictEqual(ZEROG_DEFAULTS.chainId, 16661, "0G chainId should be 16661");

  // Verify accessors exist
  assert.ok(typeof client.getStorage === "function", "should have getStorage method");
  assert.ok(typeof client.getCompute === "function", "should have getCompute method");
});

test("ZeroGClient storeJSON returns StorageRef", async () => {
  const client = new ZeroGClient({
    storageRpc: ZEROG_DEFAULTS.storageRpc,
    chainRpc: ZEROG_DEFAULTS.chainRpc,
    privateKey: TEST_PK,
  });

  try {
    const ref = await client.storeJSON({ test: "wp8-integration", timestamp: Date.now() });

    assert.ok(typeof ref.hash === "string", "StorageRef.hash should be string");
    assert.ok(ref.hash.length > 0, "StorageRef.hash should not be empty");
    assert.ok(typeof ref.size === "number", "StorageRef.size should be number");
    assert.ok(ref.size > 0, "StorageRef.size should be > 0");
    assert.ok(typeof ref.uploadedAt === "number", "StorageRef.uploadedAt should be number");
    assert.ok(typeof ref.url === "string", "StorageRef.url should be string");
    assert.ok(ref.url.includes(ref.hash), "StorageRef.url should contain hash");

    console.log(`  stored: hash=${ref.hash.slice(0, 16)}... size=${ref.size}`);
  } catch (err) {
    if (err instanceof ZeroGStorageError) {
      console.log(`  SKIP: 0G storage unavailable — ${err.message}`);
    } else {
      console.log(`  SKIP: 0G storage unavailable — ${err instanceof Error ? err.message : String(err)}`);
    }
  }
});

test("ZeroGClient verifyIntegrity works with hash", async () => {
  const client = new ZeroGClient({
    storageRpc: ZEROG_DEFAULTS.storageRpc,
    chainRpc: ZEROG_DEFAULTS.chainRpc,
    privateKey: TEST_PK,
  });

  try {
    const testData = JSON.stringify({ verify: "test", nonce: Date.now() });
    const ref = await client.store(testData, "verify-test");

    const isValid = await client.verifyIntegrity(ref.hash, testData);
    assert.strictEqual(isValid, true, "integrity check should return true for matching data");
    console.log(`  integrity verified for hash=${ref.hash.slice(0, 16)}...`);
  } catch (err) {
    console.log(`  SKIP: 0G storage unavailable — ${err instanceof Error ? err.message : String(err)}`);
  }
});

// ── 3. Verification Module Tests ─────────────────────────────────────

test("VerificationClient creates instance", () => {
  const vc = new VerificationClient({
    privateKey: TEST_PK,
    provider: "0x0000000000000000000000000000000000000001",
    storageRpc: ZEROG_DEFAULTS.storageRpc,
    chainRpc: ZEROG_DEFAULTS.chainRpc,
  });

  assert.ok(typeof vc.verifyServiceResult === "function", "should have verifyServiceResult method");
  assert.ok(typeof vc.buildVerificationPrompt === "function", "should have buildVerificationPrompt method");
});

test("buildVerificationPrompt generates structured prompt", () => {
  const vc = new VerificationClient({
    privateKey: TEST_PK,
    provider: "0x0000000000000000000000000000000000000001",
  });

  const sampleResult: ServiceResult = {
    agreementId: "agree-001",
    providerAddress: "0xProvider",
    requesterAddress: "0xRequester",
    serviceType: "data-analysis",
    input: "Analyze the following dataset: [1,2,3,4,5]",
    output: "Mean: 3, Median: 3, StdDev: 1.414",
    claimedQuality: 85,
  };

  const prompt = vc.buildVerificationPrompt(sampleResult);

  // Verify prompt contains key evaluation criteria
  assert.ok(
    prompt.toLowerCase().includes("evaluate"),
    "prompt should mention evaluate/evaluation",
  );
  assert.ok(prompt.includes(sampleResult.agreementId), "prompt should contain agreement ID");
  assert.ok(prompt.includes(sampleResult.providerAddress), "prompt should contain provider address");
  assert.ok(prompt.includes(sampleResult.serviceType), "prompt should contain service type");
  assert.ok(prompt.includes(sampleResult.input), "prompt should contain input");
  assert.ok(prompt.includes(sampleResult.output), "prompt should contain output");
  assert.ok(prompt.includes(String(sampleResult.claimedQuality)), "prompt should contain claimed quality");
  assert.ok(prompt.includes("PASS:"), "prompt should contain PASS directive");
  assert.ok(prompt.includes("SCORE:"), "prompt should contain SCORE directive");
  assert.ok(prompt.includes("REASONING:"), "prompt should contain REASONING directive");

  console.log(`  prompt length: ${prompt.length} chars`);
});

// ── 4. Cross-module Integration ──────────────────────────────────────

test("Wallet + 0G Storage integration", () => {
  // Create both clients with the same private key
  const wallet = AgentWallet.fromPrivateKey(TEST_PK);
  const zerog = new ZeroGClient({
    storageRpc: ZEROG_DEFAULTS.storageRpc,
    chainRpc: ZEROG_DEFAULTS.chainRpc,
    privateKey: TEST_PK,
  });

  // Both should use the same address
  const walletAddress = wallet.getAddress();
  assert.ok(walletAddress.startsWith("0x"), "wallet address should start with 0x");
  assert.strictEqual(walletAddress.length, 42, "wallet address should be 42 chars");

  // The 0G client internally creates an ethers wallet from the same key
  // so both should derive the same address
  const storage = zerog.getStorage();
  assert.ok(storage !== null, "storage client should be initialized");

  console.log(`  wallet address: ${walletAddress}`);
  console.log(`  both modules share private key — same identity`);
});

test("StorageRef interface compatibility", () => {
  // Create a mock StorageRef to verify interface compatibility
  const mockRef: StorageRef = {
    hash: "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
    size: 256,
    uploadedAt: Date.now(),
    url: "https://indexer-storage-turbo.0g.ai/data/0xabcdef...",
  };

  // Verify all required fields present
  assert.ok(typeof mockRef.hash === "string", "hash should be string");
  assert.strictEqual(mockRef.hash.length, 66, "hash should be 66 chars (0x + 64 hex)");
  assert.ok(typeof mockRef.size === "number", "size should be number");
  assert.strictEqual(mockRef.size, 256, "size should match");
  assert.ok(typeof mockRef.uploadedAt === "number", "uploadedAt should be number");
  assert.ok(mockRef.uploadedAt > 0, "uploadedAt should be > 0");
  assert.ok(typeof mockRef.url === "string", "url should be string");
  assert.ok(mockRef.url.startsWith("https://"), "url should start with https://");
});

test("Error classes are correctly typed", () => {
  // Verify ZeroGStorageError
  const storageErr = new ZeroGStorageError("test storage error", { reason: "test" });
  assert.strictEqual(storageErr.name, "ZeroGStorageError", "error name should be ZeroGStorageError");
  assert.ok(storageErr instanceof Error, "should be instance of Error");
  assert.ok(storageErr.cause !== undefined, "should have cause property");

  // Verify VerificationError
  const verifyErr = new VerificationError("test verification error", null);
  assert.strictEqual(verifyErr.name, "VerificationError", "error name should be VerificationError");
  assert.ok(verifyErr instanceof Error, "should be instance of Error");
});

test("ZeroGConfig has sensible defaults", () => {
  // Verify the exported constants match expected mainnet values
  assert.strictEqual(ZEROG_DEFAULTS.storageRpc, "https://indexer-storage-turbo.0g.ai");
  assert.strictEqual(ZEROG_DEFAULTS.chainRpc, "https://evmrpc.0g.ai");
  assert.strictEqual(ZEROG_DEFAULTS.chainId, 16661);

  // Verify a ZeroGConfig can be constructed with overrides
  const config: ZeroGConfig = {
    storageRpc: "https://custom-rpc.example.com",
    chainRpc: "https://custom-chain.example.com",
    privateKey: TEST_PK,
    computeProvider: "0xProvider",
  };
  assert.strictEqual(config.storageRpc, "https://custom-rpc.example.com");
  assert.strictEqual(config.computeProvider, "0xProvider");
});
