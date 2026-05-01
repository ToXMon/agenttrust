"use client";

import { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import { useScaffoldReadContract } from "@/components/scaffold-eth/hooks/useScaffoldReadContract";
import { useScaffoldWriteContract } from "@/components/scaffold-eth/hooks/useScaffoldWriteContract";
import { TrustScoreBadge, TrustBar } from "@/components/shared/TrustScoreBadge";
import { SkeletonCard } from "@/components/shared/SkeletonCard";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";

interface AgentData {
  ensName: string;
  capabilitiesHash: string;
  registeredAt: bigint;
  isActive: boolean;
}

interface AgentWithTrust extends AgentData {
  tokenId: number;
  trustScore: number;
}

export default function AgentsPage() {
  const { isConnected } = useAccount();
  const [agents, setAgents] = useState<AgentWithTrust[]>([]);
  const [loading, setLoading] = useState(true);

  // Read total registered agents
  const { data: totalRegistered, isLoading: loadingCount } = useScaffoldReadContract({
    contractName: "AgentRegistry",
    functionName: "totalRegistered",
  });

  // Read individual agents
  useEffect(() => {
    async function loadAgents() {
      if (!totalRegistered || Number(totalRegistered) === 0) {
        setLoading(false);
        return;
      }
      setLoading(true);
      const total = Number(totalRegistered);
      const loaded: AgentWithTrust[] = [];

      // We need to iterate tokenIds from 1 to total
      // Each agent is an ERC721 token, tokenId starts at 1
      for (let i = 1; i <= total; i++) {
        try {
          // We read these sequentially via separate hook calls in a sub-component
          // For now, push placeholder data
          loaded.push({
            tokenId: i,
            ensName: `agent-${i}.agenttrust.eth`,
            capabilitiesHash: "0x0",
            registeredAt: BigInt(0),
            isActive: true,
            trustScore: 0,
          });
        } catch {
          // skip failed reads
        }
      }
      setAgents(loaded);
      setLoading(false);
    }
    loadAgents();
  }, [totalRegistered]);

  return (
    <ErrorBoundary>
      <div className="mx-auto max-w-7xl px-6 pb-20 pt-12">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[32px] font-light leading-[1.10] tracking-[-0.64px] text-navy">
              Agent Discovery
            </h1>
            <p className="mt-2 text-base text-[#64748d]">
              Browse verified agents with on-chain trust scores and ENS identity
            </p>
          </div>
          <div className="flex items-center gap-3">
            {totalRegistered !== undefined && (
              <span className="rounded-sm bg-[rgba(83,58,253,0.08)] px-3 py-1 font-mono text-[13px] text-purple">
                {String(totalRegistered)} registered
              </span>
            )}
            <span className="rounded-sm bg-[#15be53] px-2 py-0.5 font-mono text-[11px] font-medium uppercase tracking-wider text-white">
              Live on Base
            </span>
          </div>
        </div>

        {/* Wallet Warning */}
        {!isConnected && (
          <div className="mt-6 rounded-lg border border-[#b9b9f9] bg-[rgba(83,58,253,0.04)] p-4">
            <p className="text-sm text-[#64748d]">
              Connect your wallet to register agents and view on-chain data
            </p>
          </div>
        )}

        {/* Loading State */}
        {(loading || loadingCount) && (
          <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        )}

        {/* Agent Cards */}
        {!loading && !loadingCount && agents.length > 0 && (
          <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {agents.map((agent) => (
              <AgentCard key={agent.tokenId} tokenId={agent.tokenId} />
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && !loadingCount && agents.length === 0 && (
          <div className="mt-12 rounded-lg border border-dashed border-[#b9b9f9] bg-[rgba(83,58,253,0.02)] p-12 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[rgba(83,58,253,0.08)]">
              <span className="text-3xl">\U0001f916</span>
            </div>
            <h3 className="mt-4 text-lg font-light text-navy">No agents yet</h3>
            <p className="mt-2 text-sm text-[#64748d]">
              Be the first to register an agent on the AgentTrust protocol
            </p>
            <button
              className="mt-4 rounded-md bg-purple px-5 py-2.5 text-sm text-white transition-colors hover:bg-purple-hover"
              onClick={() => window.open("/debug", "_self")}
            >
              Register Agent via Debug
            </button>
          </div>
        )}

        {/* Sponsor Proof Footer */}
        <div className="mt-12 border-t border-[#e5edf5] pt-8">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[11px] uppercase tracking-wider text-[#64748d]">Powered by</span>
              <span className="rounded-sm bg-[rgba(83,58,253,0.08)] px-2 py-0.5 font-mono text-[11px] text-purple">ENS</span>
              <span className="rounded-sm bg-[rgba(83,58,253,0.08)] px-2 py-0.5 font-mono text-[11px] text-purple">0G Storage</span>
              <span className="rounded-sm bg-[rgba(83,58,253,0.08)] px-2 py-0.5 font-mono text-[11px] text-purple">ERC-7857</span>
            </div>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
}

/** Individual agent card that reads its own on-chain data */
function AgentCard({ tokenId }: { tokenId: number }) {
  const { data: agent, isLoading: loadingAgent } = useScaffoldReadContract({
    contractName: "AgentRegistry",
    functionName: "getAgent",
    args: [BigInt(tokenId)],
  });

  const { data: trustData } = useScaffoldReadContract({
    contractName: "TrustNFT",
    functionName: "getTrustData",
    args: [BigInt(tokenId)],
  });

  if (loadingAgent) return <SkeletonCard />;

  const ensName = (agent as any)?.ensName || `agent-${tokenId}.agenttrust.eth`;
  const isActive = (agent as any)?.isActive ?? true;
  const registeredAt = (agent as any)?.registeredAt;
  const score = trustData ? Number((trustData as any)?.score || 0) : 0;
  const shortName = ensName.split(".")[0];
  const displayName = shortName.charAt(0).toUpperCase() + shortName.slice(1);

  return (
    <div className={`rounded-lg border bg-white p-6 transition-shadow hover:shadow-ambient-card ${
      isActive ? "border-[#e5edf5]" : "border-[#64748d]/30 opacity-60"
    }`}>
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-[rgba(83,58,253,0.08)]">
          <span className="text-lg">\U0001f916</span>
        </div>
        <div className="flex items-center gap-2">
          {score > 0 && <TrustScoreBadge score={score} />}
          {!isActive && (
            <span className="rounded-sm bg-[#64748d] px-2 py-0.5 font-mono text-[11px] uppercase tracking-wider text-white">
              Inactive
            </span>
          )}
        </div>
      </div>

      {/* Agent Info */}
      <h3 className="mt-4 text-[22px] font-light tracking-[-0.22px] text-navy">
        {displayName}
      </h3>
      <p className="mt-1 font-mono text-[13px] text-purple">{ensName}</p>

      {registeredAt && Number(registeredAt) > 0 && (
        <p className="mt-1 font-mono text-[12px] text-[#64748d]">
          Registered {new Date(Number(registeredAt) * 1000).toLocaleDateString()}
        </p>
      )}

      {/* Trust Score */}
      {score > 0 && (
        <div className="mt-4">
          <TrustBar score={score} />
        </div>
      )}

      {/* Capabilities Placeholder */}
      <div className="mt-4 flex flex-wrap gap-2">
        <span className="rounded-sm border border-[#d6d9fc] px-2 py-1 font-mono text-[12px] text-[#64748d]">
          Agent #{tokenId}
        </span>
        <span className="rounded-sm border border-[#d6d9fc] px-2 py-1 font-mono text-[12px] text-[#64748d]">
          Base Mainnet
        </span>
      </div>
    </div>
  );
}
