import { NextRequest, NextResponse } from "next/server";

const KEEPERHUB_URL = process.env.KEEPERHUB_URL || "http://localhost:3001";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const limit = parseInt(searchParams.get("limit") || "50", 10);

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(`${KEEPERHUB_URL}/api/tasks?limit=${limit}`, {
      signal: controller.signal,
    });
    clearTimeout(timer);
    const data = await res.json();
    return NextResponse.json({ tasks: data.tasks || [], status: "ok" });
  } catch (err) {
    // Return mock audit data if KeeperHub is offline
    return NextResponse.json({
      tasks: [
        {
          id: "task-001",
          agent: "requester.agenttrust.eth",
          action: "register_agent",
          status: "completed",
          gasUsed: "142,857",
          timestamp: Date.now() - 3600000,
          txHash: "0xabc123...def456",
        },
        {
          id: "task-002",
          agent: "provider.agenttrust.eth",
          action: "fulfill_agreement",
          status: "completed",
          gasUsed: "89,234",
          timestamp: Date.now() - 1800000,
          txHash: "0x789abc...012def",
        },
      ],
      status: "demo",
      note: "KeeperHub offline — showing demo data",
    });
  }
}
