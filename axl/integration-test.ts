/**
 * AXL Integration Test — Phase 4
 * Verifies bidirectional P2P communication between 2 AXL nodes
 * with trust verification protocol.
 *
 * Run: npx tsx axl/integration-test.ts
 * Prereq: Both AXL nodes running (./axl/start.sh start)
 */

import { AXLClient, type TopologyInfo } from "./axl-client.js";
import { ACKLayer, type ACKResult } from "./ack-layer.js";
import {
  MessageType,
  createMessage,
  validateMessage,
  type AgentTrustMessage,
} from "./protocol.js";

// ── Config ────────────────────────────────────────────────────

const NODE_A_URL = "http://localhost:9002";
const NODE_B_URL = "http://localhost:9012";
const TEST_TIMEOUT_MS = 30_000;

// ── Helpers ───────────────────────────────────────────────────

function log(tag: string, msg: string): void {
  console.log(`[${new Date().toISOString().slice(11, 19)}] [${tag}] ${msg}`);
}

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`ASSERTION FAILED: ${message}`);
  }
}

async function waitFor(
  predicate: () => Promise<boolean>,
  timeoutMs = TEST_TIMEOUT_MS,
  label = "condition",
): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await predicate()) return;
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error(`Timeout waiting for ${label} (${timeoutMs}ms)`);
}

// ── Test Runner ───────────────────────────────────────────────

interface TestResult {
  name: string;
  passed: boolean;
  durationMs: number;
  error?: string;
}

async function runTest(
  name: string,
  fn: () => Promise<void>,
): Promise<TestResult> {
  const start = Date.now();
  try {
    await fn();
    return { name, passed: true, durationMs: Date.now() - start };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return { name, passed: false, durationMs: Date.now() - start, error: errorMsg };
  }
}

// ── Tests ─────────────────────────────────────────────────────

async function testBothNodesOnline(): Promise<void> {
  const clientA = new AXLClient(NODE_A_URL);
  const clientB = new AXLClient(NODE_B_URL);

  const topoA: TopologyInfo = await clientA.getTopology();
  const topoB: TopologyInfo = await clientB.getTopology();

  log("TEST", `Node A pubkey: ${topoA.ourPublicKey.slice(0, 16)}...`);
  log("TEST", `Node B pubkey: ${topoB.ourPublicKey.slice(0, 16)}...`);

  assert(topoA.ourPublicKey.length === 64, "Node A has valid public key");
  assert(topoB.ourPublicKey.length === 64, "Node B has valid public key");
  assert(topoA.ourPublicKey !== topoB.ourPublicKey, "Nodes have different keys");
}

async function testSendFromAToB(): Promise<void> {
  const clientA = new AXLClient(NODE_A_URL);
  const clientB = new AXLClient(NODE_B_URL);

  const topoB = await clientB.getTopology();

  const msg = createMessage(
    MessageType.DISCOVER,
    "agent-requester",
    "agent-provider",
    { capabilities: ["data-analysis"], trustScore: 85, ensName: "requester.agenttrust.eth" },
  );

  await clientA.send(topoB.ourPublicKey, msg);
  log("TEST", `Sent DISCOVER to Node B`);

  const received = await waitFor(() => clientB.recv().then((m) => m !== null), 10_000, "recv at B");
  log("TEST", `Received message at Node B`);

  // The message comes back as raw JSON from the mesh
  // Drain the recv buffer to confirm
  const recvResult = await clientB.recv();
  // May be null if already drained by polling, that's OK - we confirmed receipt via waitFor
}

async function testTrustQueryResponse(): Promise<void> {
  const clientA = new AXLClient(NODE_A_URL);
  const clientB = new AXLClient(NODE_B_URL);

  const topoB = await clientB.getTopology();
  const topoA = await clientA.getTopology();

  // Send TRUST_QUERY from A to B
  const query = createMessage(
    MessageType.TRUST_QUERY,
    "agent-requester",
    "agent-provider",
    { agentAddress: "0xce9B692A01D47054e9ebC15722c071cbc4BE714e", minimumScore: 50 },
  );

  await clientA.send(topoB.ourPublicKey, query);
  log("TEST", `Sent TRUST_QUERY to Node B`);

  // Wait for B to receive it
  await waitFor(() => clientB.recv().then((m) => m !== null), 10_000, "trust query recv");
  log("TEST", `TRUST_QUERY received at Node B`);

  // B sends TRUST_RESPONSE back to A
  const response = createMessage(
    MessageType.TRUST_RESPONSE,
    "agent-provider",
    "agent-requester",
    {
      agentAddress: "0xce9B692A01D47054e9ebC15722c071cbc4BE714e",
      score: 92,
      agreementsCompleted: 15,
      agreementsDisputed: 0,
      meetsThreshold: true,
    },
  );

  await clientB.send(topoA.ourPublicKey, response);
  log("TEST", `Sent TRUST_RESPONSE to Node A`);

  await waitFor(() => clientA.recv().then((m) => m !== null), 10_000, "trust response recv");
  log("TEST", `TRUST_RESPONSE received at Node A`);
}

async function testServiceRequestFlow(): Promise<void> {
  const clientA = new AXLClient(NODE_A_URL);
  const clientB = new AXLClient(NODE_B_URL);

  const topoB = await clientB.getTopology();
  const topoA = await clientA.getTopology();

  // A sends SERVICE_REQUEST
  const request = createMessage(
    MessageType.SERVICE_REQUEST,
    "agent-requester",
    "agent-provider",
    {
      serviceType: "data-analysis",
      description: "Analyze dataset X",
      amount: "100",
      token: "USDC",
      deadline: Date.now() + 3600_000,
      trustThreshold: 50,
    },
  );

  await clientA.send(topoB.ourPublicKey, request);
  log("TEST", `Sent SERVICE_REQUEST to Node B`);

  await waitFor(() => clientB.recv().then((m) => m !== null), 10_000, "service request recv");
  log("TEST", `SERVICE_REQUEST received at Node B`);

  // B sends SERVICE_ACCEPT
  const accept = createMessage(
    MessageType.SERVICE_ACCEPT,
    "agent-provider",
    "agent-requester",
    { requestId: request.nonce, terms: "accepted" },
  );

  await clientB.send(topoA.ourPublicKey, accept);
  log("TEST", `Sent SERVICE_ACCEPT to Node A`);

  await waitFor(() => clientA.recv().then((m) => m !== null), 10_000, "service accept recv");
  log("TEST", `SERVICE_ACCEPT received at Node A`);
}

async function testPollingMechanism(): Promise<void> {
  const clientA = new AXLClient(NODE_A_URL);
  const clientB = new AXLClient(NODE_B_URL);

  const topoB = await clientB.getTopology();

  const receivedMessages: unknown[] = [];

  // Start polling on Node B
  clientB.startPolling((msg) => {
    receivedMessages.push(msg);
    log("POLL", `Received message via polling: ${JSON.stringify(msg).slice(0, 80)}...`);
  }, 100);

  // Give polling time to start
  await new Promise((r) => setTimeout(r, 200));

  // Send a message from A
  const msg = createMessage(
    MessageType.DISCOVER,
    "agent-requester",
    "agent-provider",
    { test: "polling" },
  );

  await clientA.send(topoB.ourPublicKey, msg);
  log("TEST", `Sent message for polling test`);

  // Wait for polling to pick it up
  await waitFor(async () => receivedMessages.length > 0, 5_000, "polling to receive message");

  clientB.stopPolling();
  assert(receivedMessages.length > 0, "Polling received at least 1 message");
  log("TEST", `Polling test passed: ${receivedMessages.length} messages received`);
}

// ── Main ──────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log("=".repeat(60));
  console.log("  AgentTrust AXL Integration Test — Phase 4");
  console.log("=".repeat(60));
  console.log();

  const tests: TestResult[] = [];

  tests.push(await runTest("Both nodes online with valid keys", testBothNodesOnline));
  tests.push(await runTest("Send from A to B (DISCOVER)", testSendFromAToB));
  tests.push(await runTest("Trust query/response round-trip", testTrustQueryResponse));
  tests.push(await runTest("Service request flow (REQUEST/ACCEPT)", testServiceRequestFlow));
  tests.push(await runTest("Polling mechanism", testPollingMechanism));

  console.log();
  console.log("=".repeat(60));
  console.log("  RESULTS");
  console.log("=".repeat(60));

  let passed = 0;
  let failed = 0;

  for (const result of tests) {
    const icon = result.passed ? "✅" : "❌";
    const duration = `${result.durationMs}ms`;
    console.log(`  ${icon} ${result.name} (${duration})`);
    if (result.error) {
      console.log(`     Error: ${result.error}`);
    }
    if (result.passed) passed++;
    else failed++;
  }

  console.log();
  console.log(`  Total: ${tests.length} | Passed: ${passed} | Failed: ${failed}`);
  console.log();

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch((err: unknown) => {
  console.error("Integration test crashed:", err);
  process.exit(1);
});
