"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { MessageTypeBadge } from "@/components/shared/StatusBadge";
import { SkeletonMessage } from "@/components/shared/SkeletonCard";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";

interface AXLMessage {
  version: string;
  type: string;
  sender: string;
  recipient: string;
  timestamp: number;
  nonce: string;
  payload: Record<string, unknown>;
}

interface DisplayMessage {
  id: string;
  fromPeerId: string;
  body: AXLMessage;
  source: string;
  receivedAt: number;
}

// Known VPS peer IDs (Node A and Node B on 142.93.241.144)
const KNOWN_PEER_IDS: Record<string, string> = {};

export default function MessagesPage() {
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [nodesOnline, setNodesOnline] = useState<{ name: string; online: boolean }[]>([]);
  const [peerIds, setPeerIds] = useState<Record<string, string>>(KNOWN_PEER_IDS);
  const [isPolling, setIsPolling] = useState(true);
  const [sending, setSending] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const checkNodes = useCallback(async () => {
    try {
      const res = await fetch("/api/axl?endpoint=topology");
      const data = await res.json();
      const newPeerIds: Record<string, string> = {};
      setNodesOnline(
        data.results.map((r: any) => {
          if (r.status === "ok" && r.data?.our_public_key) {
            newPeerIds[r.node] = r.data.our_public_key;
          }
          return {
            name: r.node,
            online: r.status === "ok",
          };
        })
      );
      if (Object.keys(newPeerIds).length > 0) {
        setPeerIds(newPeerIds);
      }
    } catch {
      setNodesOnline([
        { name: "Node A", online: false },
        { name: "Node B", online: false },
      ]);
    }
  }, []);

  const pollMessages = useCallback(async () => {
    try {
      const res = await fetch("/api/axl?endpoint=recv");
      const data = await res.json();
      for (const result of data.results) {
        if (result.status === "ok" && result.data) {
          const msg: DisplayMessage = {
            id: `${result.node}-${Date.now()}-${Math.random()}`,
            fromPeerId: result.fromPeerId || "unknown",
            body: result.data,
            source: result.node,
            receivedAt: Date.now(),
          };
          setMessages((prev) => [msg, ...prev].slice(0, 100));
        }
      }
    } catch {
      // silently retry
    }
  }, []);

  useEffect(() => {
    checkNodes();
    if (isPolling) {
      pollMessages();
      intervalRef.current = setInterval(pollMessages, 2000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPolling, pollMessages, checkNodes]);

  const sendTestMessage = async () => {
    setSending(true);
    try {
      // Resolve peer IDs from topology if not cached
      if (Object.keys(peerIds).length === 0) {
        await checkNodes();
      }

      // Get Node B's peer ID to send from Node A
      const nodeBPeerId = peerIds["Node B"];
      if (!nodeBPeerId) {
        console.error("No peer ID for Node B");
        setSending(false);
        return;
      }

      const testMsg = {
        version: "1.0.0",
        type: "discover",
        sender: "dashboard.agentrust.base.eth",
        recipient: "provider.agentrust.base.eth",
        timestamp: Date.now(),
        nonce: crypto.randomUUID(),
        payload: {
          capabilities: ["Testing", "Dashboard"],
          trustScore: 100,
          ensName: "dashboard.agentrust.base.eth",
        },
      };

      const sendRes = await fetch("/api/axl", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ peerId: nodeBPeerId, message: testMsg, node: 0 }),
      });

      const sendResult = await sendRes.json();
      console.log("Send result:", sendResult);
    } catch (err) {
      console.error("Send failed:", err);
    }
    setSending(false);
  };

  const anyOnline = nodesOnline.some((n) => n.online);

  return (
    <ErrorBoundary>
      <div className="mx-auto max-w-7xl px-6 pb-20 pt-12">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[32px] font-light leading-[1.10] tracking-[-0.64px] text-navy">
              P2P Messages
            </h1>
            <p className="mt-2 text-base text-[#64748d]">
              Real-time Gensyn AXL message feed between agent nodes
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Node Status */}
            {nodesOnline.map((node) => (
              <span
                key={node.name}
                className={`flex items-center gap-1.5 rounded-sm px-3 py-1 font-mono text-[12px] ${
                  node.online
                    ? "bg-[rgba(21,190,83,0.1)] text-[#108c3d]"
                    : "bg-[rgba(100,116,125,0.1)] text-[#64748d]"
                }`}
              >
                <span
                  className={`inline-block h-2 w-2 rounded-full ${
                    node.online ? "bg-[#15be53] animate-pulse" : "bg-[#64748d]"
                  }`
                />
                {node.name}
              </span>
            ))}
            <span
              className={`rounded-sm px-2 py-0.5 font-mono text-[11px] font-medium uppercase tracking-wider text-white ${
                anyOnline ? "bg-[#15be53]" : "bg-[#64748d]"
              }`}
            >
              {anyOnline ? "LIVE" : "OFFLINE"}
            </span>
          </div>
        </div>

        {/* Controls */}
        <div className="mt-6 flex items-center gap-4">
          <button
            onClick={sendTestMessage}
            disabled={sending || !anyOnline}
            className="rounded-md bg-purple px-4 py-2 text-sm text-white transition-colors hover:bg-purple-hover disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {sending ? "Sending..." : "Send Test Message"}
          </button>
          <button
            onClick={() => setIsPolling(!isPolling)}
            className={`rounded-md border px-4 py-2 text-sm transition-colors ${
              isPolling
                ? "border-[#ea2261]/30 text-[#ea2261] hover:bg-[rgba(234,34,97,0.05)]"
                : "border-[#15be53]/30 text-[#15be53] hover:bg-[rgba(21,190,83,0.05)]"
            }`}
          >
            {isPolling ? "Pause Polling" : "Resume Polling"}
          </button>
          <span className="font-mono text-[12px] text-[#64748d]">
            {messages.length} messages
          </span>
        </div>

        {/* Offline Notice */}
        {!anyOnline && (
          <div className="mt-4 rounded-lg border border-[#b9b9f9] bg-[rgba(83,58,253,0.04)] p-4">
            <p className="text-sm text-[#64748d]">
              AXL nodes offline &mdash; start nodes with <code className="rounded bg-[#e5edf5] px-1.5 py-0.5 font-mono text-[12px]">./axl/start.sh</code> to see live messages
            </p>
          </div>
        )}

        {/* Message Feed */}
        <div className="mt-6 space-y-3">
          {messages.length === 0 && (
            <div className="rounded-lg border border-dashed border-[#b9b9f9] p-12 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[rgba(83,58,253,0.08)]">
                <span className="text-3xl">&#x1F4E8;</span>
              </div>
              <h3 className="mt-4 text-lg font-light text-navy">No messages yet</h3>
              <p className="mt-2 text-sm text-[#64748d]">
                Messages will appear here as agents communicate via AXL P2P
              </p>
            </div>
          )}

          {messages.map((msg) => (
            <div
              key={msg.id}
              className="rounded-lg border border-[#e5edf5] bg-white p-4 shadow-sm transition-colors hover:border-[#b9b9f9]"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageTypeBadge type={msg.body.type} />
                  <span className="font-mono text-[12px] text-[#64748d]">
                    {msg.source}
                  </span>
                  <span className="text-[#64748d]">&rarr;</span>
                  <span className="font-mono text-[12px] text-[#64748d]">
                    {msg.source === "Node A" ? "Node B" : "Node A"}
                  </span>
                </div>
                <span className="font-mono text-[11px] text-[#64748d]">
                  {new Date(msg.receivedAt).toLocaleTimeString()}
                </span>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <span className="text-xs text-[#64748d]">From:</span>
                <span className="rounded bg-[#e5edf5] px-1.5 py-0.5 font-mono text-[11px] text-navy">
                  {msg.body.sender}
                </span>
                <span className="text-xs text-[#64748d]">To:</span>
                <span className="rounded bg-[#e5edf5] px-1.5 py-0.5 font-mono text-[11px] text-navy">
                  {msg.body.recipient}
                </span>
              </div>
              <details className="mt-2">
                <summary className="cursor-pointer text-xs text-[#5338fd] hover:text-[#6d5bfc]">
                  Payload
                </summary>
                <pre className="mt-1 overflow-auto rounded bg-[#f8fafc] p-2 text-[11px] text-[#64748d]">
                  {JSON.stringify(msg.body.payload, null, 2)}
                </pre>
              </details>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-8 flex items-center justify-center gap-2 text-[12px] text-[#64748d]">
          <span>Powered by</span>
          <span className="font-medium text-navy">Gensyn AXL P2P Mesh</span>
        </div>
      </div>

      {/* Footer Nav */}
      <footer className="mx-auto max-w-7xl px-6 pb-8 pt-8">
        <div className="flex items-center justify-between border-t border-[#e5edf5] pt-6">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-purple text-[12px] font-bold text-white">
              AT
            </div>
            <span className="text-sm font-medium text-navy">AgentTrust</span>
          </div>
          <span className="text-xs text-[#64748d]">
            ETHGlobal Open Agents Hackathon 2026
          </span>
        </div>
      </footer>
    </ErrorBoundary>
  );
}
