import { NextRequest, NextResponse } from "next/server";

const AXL_NODES = [
  { name: "Node A", url: process.env.AXL_NODE_A_URL || "http://host.docker.internal:9002" },
  { name: "Node B", url: process.env.AXL_NODE_B_URL || "http://host.docker.internal:9012" },
];

const TIMEOUT_MS = 5000;

async function fetchWithTimeout(url: string, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const endpoint = searchParams.get("endpoint") || "topology";
  const nodeIdx = parseInt(searchParams.get("node") || "-1", 10);

  const nodesToQuery = nodeIdx >= 0 && nodeIdx < AXL_NODES.length
    ? [AXL_NODES[nodeIdx]]
    : AXL_NODES;

  const results = [];

  for (const node of nodesToQuery) {
    try {
      const res = await fetchWithTimeout(`${node.url}/${endpoint}`);
      if (res.status === 204) {
        results.push({ node: node.name, status: "no_messages", data: null });
      } else {
        const data = await res.json();
        const fromPeerId = res.headers.get("X-From-Peer-Id") || undefined;
        results.push({ node: node.name, status: "ok", data, fromPeerId });
      }
    } catch (err) {
      results.push({
        node: node.name,
        status: "offline",
        error: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  return NextResponse.json({ results, timestamp: Date.now() });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { peerId, message, node = 0 } = body;
    const targetNode = AXL_NODES[node] || AXL_NODES[0];

    const res = await fetchWithTimeout(`${targetNode.url}/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Destination-Peer-Id": peerId || "",
      },
      body: JSON.stringify(message),
    });

    const sentBytes = Number(res.headers.get("X-Sent-Bytes")) || 0;
    return NextResponse.json({ ok: res.ok, sentBytes, node: targetNode.name });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Unknown error" },
      { status: 502 },
    );
  }
}
