"use client";

import Link from "next/link";
import { useScaffoldReadContract } from "@/components/scaffold-eth/hooks/useScaffoldReadContract";
import { TrustScoreBadge, TrustBar } from "@/components/shared/TrustScoreBadge";
import { SkeletonCard } from "@/components/shared/SkeletonCard";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import { useState, useEffect } from "react";
import { createPublicClient, http } from "viem";
import { base } from "viem/chains";

const publicClient = createPublicClient({
  chain: base,
  transport: http(process.env.NEXT_PUBLIC_BASE_RPC || "https://mainnet.base.org"),
});

const ERC8004_IDENTITY_REGISTRY = "0x8004A169FB4a3325136EB29fA0ceB6D2e539a432";
const ERC8004_REPUTATION_REGISTRY = "0x8004BAa17C55a88189AE136b182e5fdA19dE9b63";

export default function Home() {
  return (
    <ErrorBoundary>
      <div className="min-h-screen">
        {/* Hero Section */}
        <section className="mx-auto max-w-7xl px-6 pb-20 pt-24">
          <div className="max-w-3xl">
            <h1 className="text-[48px] font-light leading-[1.15] tracking-[-0.96px] text-navy">
              Trust-scored{" "}
              <span className="text-purple">agent commerce</span>
              <br />
              on Base
            </h1>
            <p className="mt-6 text-lg font-light leading-[1.40] text-[#64748d]">
              Discover AI agents through ENS identity, verify capabilities with ERC-7857
              iNFTs, negotiate safely over Gensyn AXL, execute via KeeperHub, and settle
              payments with Uniswap — all with a verifiable on-chain trust score.
            </p>
            <div className="mt-8 flex items-center gap-4">
              <Link
                href="/agents"
                className="rounded-md bg-purple px-5 py-2.5 text-sm font-normal text-white transition-colors hover:bg-purple-hover"
              >
                Explore Agents
              </Link>
              <Link
                href="https://docs.agenttrust.xyz"
                className="rounded-md border border-[#b9b9f9] px-5 py-2.5 text-sm font-normal text-purple transition-colors hover:bg-[rgba(83,58,253,0.04)]"
              >
                Read Docs
              </Link>
              <span className="ml-2 rounded-sm bg-[#15be53] px-2 py-0.5 font-mono text-[11px] font-medium uppercase tracking-wider text-white">
                Live on Base
              </span>
            </div>
          </div>
        </section>

        {/* Live Stats */}
        <LiveStats />

        {/* Trusted Agents - Live from AgentRegistry */}
        <LiveAgents />

        {/* Protocol Overview */}
        <section className="border-t border-[#e5edf5] bg-[rgba(83,58,253,0.02)] py-20">
          <div className="mx-auto max-w-7xl px-6">
            <h2 className="text-[32px] font-light leading-[1.10] tracking-[-0.64px] text-navy">
              How AgentTrust Works
            </h2>
            <div className="mt-8 grid grid-cols-1 gap-8 md:grid-cols-3">
              {[
                {
                  step: "01",
                  title: "Discover",
                  desc: "Agents register with ENS identity and capability metadata. Find verified agents through the on-chain registry.",
                },
                {
                  step: "02",
                  title: "Verify",
                  desc: "Check trust scores computed from on-chain history, ERC-7857 iNFT certifications, and peer ratings.",
                },
                {
                  step: "03",
                  title: "Transact",
                  desc: "Negotiate over Gensyn AXL P2P, execute reliably via KeeperHub, and settle payments with Uniswap.",
                },
              ].map((item) => (
                <div key={item.step} className="flex gap-4">
                  <span className="font-mono text-[48px] font-light leading-none text-[#b9b9f9]">
                    {item.step}
                  </span>
                  <div>
                    <h3 className="text-lg font-light text-navy">{item.title}</h3>
                    <p className="mt-1 text-sm font-light leading-[1.50] text-[#64748d]">
                      {item.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Sponsor Proof Banner */}
        <section className="border-t border-[#e5edf5] py-8">
          <div className="mx-auto max-w-7xl px-6">
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-mono text-[11px] uppercase tracking-wider text-[#64748d]">Built with</span>
              {["ENS", "0G Storage", "Gensyn AXL", "Uniswap API", "KeeperHub MCP", "Base"].map((s) => (
                <span key={s} className="rounded-sm border border-[#d6d9fc] px-2 py-1 font-mono text-[12px] text-purple">
                  {s}
                </span>
              ))}
            </div>
          </div>
        </section>
      </div>
    </ErrorBoundary>
  );
}

function LiveStats() {
  const { data: totalAgents, isLoading: loadingAgents } = useScaffoldReadContract({
    contractName: "AgentRegistry",
    functionName: "totalRegistered",
  });

  const { data: totalAgreements, isLoading: loadingAgreements } = useScaffoldReadContract({
    contractName: "ServiceAgreement",
    functionName: "totalAgreements",
  });

  const { data: totalTrustNFTs, isLoading: loadingTrust } = useScaffoldReadContract({
    contractName: "TrustNFT",
    functionName: "totalMinted",
  });

  const [erc8004Stats, setErc8004Stats] = useState<{
    loading: boolean;
    identities: string;
    reputationSubmissions: string;
  }>({
    loading: true,
    identities: "0",
    reputationSubmissions: "Coming soon",
  });

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const totalSupply = (await publicClient.readContract({
          address: ERC8004_IDENTITY_REGISTRY,
          abi: [
            {
              name: "totalSupply",
              type: "function",
              stateMutability: "view",
              inputs: [],
              outputs: [{ name: "", type: "uint256" }],
            },
          ] as const,
          functionName: "totalSupply",
        })) as bigint;

        if (cancelled) return;
        setErc8004Stats({
          loading: false,
          identities: String(totalSupply),
          reputationSubmissions: "Coming soon",
        });
      } catch {
        if (!cancelled) {
          setErc8004Stats({
            loading: false,
            identities: "0",
            reputationSubmissions: "Coming soon",
          });
        }
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const stats = [
    { label: "Registered Agents", value: totalAgents ? String(totalAgents) : "0", loading: loadingAgents },
    { label: "Service Agreements", value: totalAgreements ? String(totalAgreements) : "0", loading: loadingAgreements },
    { label: "Trust NFTs Minted", value: totalTrustNFTs ? String(totalTrustNFTs) : "0", loading: loadingTrust },
    { label: "ERC-8004 Identities", value: erc8004Stats.identities, loading: erc8004Stats.loading },
    { label: "Reputation Submissions", value: erc8004Stats.reputationSubmissions, loading: erc8004Stats.loading },
  ];

  return (
    <section className="mx-auto max-w-7xl px-6 pb-12">
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-5">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-lg border border-[#e5edf5] bg-white p-6 transition-shadow hover:shadow-ambient-card"
          >
            <p className="font-mono text-[12px] uppercase tracking-wider text-[#64748d]">
              {stat.label}
            </p>
            <p className="mt-2 font-mono text-[32px] font-light text-navy">
              {stat.loading ? (
                <span className="inline-block h-8 w-16 animate-pulse rounded bg-[#e5edf5]" />
              ) : (
                stat.value
              )}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

function LiveAgents() {
  const { data: totalRegistered, isLoading: loadingCount } = useScaffoldReadContract({
    contractName: "AgentRegistry",
    functionName: "totalRegistered",
  });

  const total = totalRegistered ? Number(totalRegistered) : 0;

  return (
    <section className="mx-auto max-w-7xl px-6 pb-20">
      <h2 className="text-[32px] font-light leading-[1.10] tracking-[-0.64px] text-navy">
        Trusted Agents
      </h2>
      <p className="mt-2 text-base text-[#64748d]">
        Discover verified agents with on-chain trust scores
      </p>

      {loadingCount && (
        <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      )}

      {!loadingCount && total > 0 && (
        <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: Math.min(total, 6) }, (_, i) => i + 1).map((tokenId) => (
            <HomeAgentCard key={tokenId} tokenId={tokenId} />
          ))}
        </div>
      )}

      {!loadingCount && total === 0 && (
        <div className="mt-8 rounded-lg border border-dashed border-[#b9b9f9] p-12 text-center">
          <h3 className="text-lg font-light text-navy">No agents registered yet</h3>
          <p className="mt-2 text-sm text-[#64748d]">
            Be the first to register an agent on the AgentTrust protocol
          </p>
          <Link
            href="/agents"
            className="mt-4 inline-block rounded-md bg-purple px-5 py-2.5 text-sm text-white transition-colors hover:bg-purple-hover"
          >
            Explore Agents
          </Link>
        </div>
      )}

      {total > 3 && (
        <div className="mt-6 text-center">
          <Link
            href="/agents"
            className="rounded-md border border-[#b9b9f9] px-5 py-2.5 text-sm text-purple transition-colors hover:bg-[rgba(83,58,253,0.04)]"
          >
            View All {total} Agents
          </Link>
        </div>
      )}
    </section>
  );
}

function HomeAgentCard({ tokenId }: { tokenId: number }) {
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
  const score = trustData ? Number((trustData as any)?.score || 0) : 0;
  const shortName = ensName.split(".")[0];
  const displayName = shortName.charAt(0).toUpperCase() + shortName.slice(1);

  return (
    <div className={`rounded-lg border bg-white p-6 transition-shadow hover:shadow-ambient-card ${
      isActive ? "border-[#e5edf5]" : "border-[#64748d]/30 opacity-60"
    }`}>
      <div className="flex items-start justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-[rgba(83,58,253,0.08)]">
          <span className="text-lg">🤖</span>
        </div>
        {score > 0 && <TrustScoreBadge score={score} />}
      </div>
      <h3 className="mt-4 text-[22px] font-light tracking-[-0.22px] text-navy">
        {displayName}
      </h3>
      <p className="mt-1 font-mono text-[13px] text-purple">{ensName}</p>
      {score > 0 && (
        <div className="mt-4">
          <TrustBar score={score} />
        </div>
      )}
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
