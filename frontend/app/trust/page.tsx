"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import { useScaffoldReadContract } from "@/components/scaffold-eth/hooks/useScaffoldReadContract";
import { TrustScoreBadge, TrustBar } from "@/components/shared/TrustScoreBadge";
import { SkeletonCard } from "@/components/shared/SkeletonCard";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";

interface TrustDataDisplay {
  score: number;
  agreementsCompleted: number;
  agreementsDisputed: number;
  lastUpdated: number;
  mintedAt: number;
  tokenId: number;
}

export default function TrustPage() {
  const { isConnected, address } = useAccount();

  return (
    <ErrorBoundary>
      <div className="mx-auto max-w-7xl px-6 pb-20 pt-12">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[32px] font-light leading-[1.10] tracking-[-0.64px] text-navy">
              Trust Scores
            </h1>
            <p className="mt-2 text-base text-[#64748d]">
              On-chain trust verification powered by ERC-7857 soulbound tokens
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="rounded-sm bg-[rgba(83,58,253,0.08)] px-3 py-1 font-mono text-[13px] text-purple">
              0G Storage
            </span>
            <span className="rounded-sm bg-[#15be53] px-2 py-0.5 font-mono text-[11px] font-medium uppercase tracking-wider text-white">
              ERC-7857
            </span>
          </div>
        </div>

        {/* Wallet Warning */}
        {!isConnected && (
          <div className="mt-6 rounded-lg border border-[#b9b9f9] bg-[rgba(83,58,253,0.04)] p-4">
            <p className="text-sm text-[#64748d]">
              Connect your wallet to view your trust score and iNFT status
            </p>
          </div>
        )}

        {/* Your Trust Score */}
        {isConnected && address && (
          <YourTrustScore address={address as `0x${string}`} />
        )}

        {/* All Trust NFTs */}
        <AllTrustNFTs />

        {/* Trust Score Explanation */}
        <div className="mt-12 border-t border-[#e5edf5] pt-8">
          <h2 className="text-[22px] font-light text-navy">How Trust Scores Work</h2>
          <div className="mt-4 grid grid-cols-1 gap-6 md:grid-cols-3">
            <div className="rounded-lg border border-[#e5edf5] p-6">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-gradient-to-r from-[#533afd] to-[#f96bee]">
                <span className="text-sm font-bold text-white">1</span>
              </div>
              <h3 className="mt-3 text-lg font-light text-navy">Agreement Completion</h3>
              <p className="mt-1 text-sm text-[#64748d]">
                Each completed service agreement increments the agent trust score on-chain.
              </p>
            </div>
            <div className="rounded-lg border border-[#e5edf5] p-6">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-[#533afd]">
                <span className="text-sm font-bold text-white">2</span>
              </div>
              <h3 className="mt-3 text-lg font-light text-navy">AI Verification</h3>
              <p className="mt-1 text-sm text-[#64748d]">
                0G Compute verifies service outputs via TEE, confirming results before trust update.
              </p>
            </div>
            <div className="rounded-lg border border-[#e5edf5] p-6">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-[#15be53]">
                <span className="text-sm font-bold text-white">3</span>
              </div>
              <h3 className="mt-3 text-lg font-light text-navy">Soulbound iNFT</h3>
              <p className="mt-1 text-sm text-[#64748d]">
                Trust scores are bound to soulbound ERC-7857 tokens — non-transferable, verifiable on-chain.
              </p>
            </div>
          </div>
        </div>

        {/* Sponsor Proof */}
        <div className="mt-8 border-t border-[#e5edf5] pt-6">
          <div className="flex items-center gap-4">
            <span className="font-mono text-[11px] uppercase tracking-wider text-[#64748d]">Sponsor tracks:</span>
            <span className="rounded-sm bg-[rgba(83,58,253,0.08)] px-2 py-0.5 font-mono text-[11px] text-purple">0G Agent Framework</span>
            <span className="rounded-sm bg-[rgba(83,58,253,0.08)] px-2 py-0.5 font-mono text-[11px] text-purple">0G On-Chain AI</span>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
}

function YourTrustScore({ address }: { address: `0x${string}` }) {
  const { data: trustData, isLoading } = useScaffoldReadContract({
    contractName: "TrustNFT",
    functionName: "getTrustDataByAgent",
    args: [address],
  });

  if (isLoading) return <div className="mt-8"><SkeletonCard /></div>;

  const data = trustData as any;
  const score = data ? Number(data.score || 0) : 0;
  const completed = data ? Number(data.agreementsCompleted || 0) : 0;
  const disputed = data ? Number(data.agreementsDisputed || 0) : 0;
  const mintedAt = data ? Number(data.mintedAt || 0) : 0;

  return (
    <div className="mt-8 rounded-lg border border-[#e5edf5] bg-white p-8">
      <h2 className="text-lg font-light text-navy">Your Trust Score</h2>
      <div className="mt-4 grid grid-cols-1 gap-6 md:grid-cols-4">
        {/* Score Gauge */}
        <div className="flex flex-col items-center justify-center">
          <div className="relative flex h-28 w-28 items-center justify-center">
            <svg className="h-28 w-28 -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="40" fill="none" stroke="#e5edf5" strokeWidth="8" />
              <circle
                cx="50" cy="50" r="40" fill="none"
                stroke={score >= 86 ? "url(#trustGrad)" : score >= 56 ? "#533afd" : "#b9b9f9"}
                strokeWidth="8"
                strokeDasharray={`${(score / 100) * 251.2} 251.2`}
                strokeLinecap="round"
              />
              <defs>
                <linearGradient id="trustGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#533afd" />
                  <stop offset="100%" stopColor="#f96bee" />
                </linearGradient>
              </defs>
            </svg>
            <span className="absolute font-mono text-2xl font-medium text-navy">{score}</span>
          </div>
          <TrustScoreBadge score={score} size="md" />
        </div>
        {/* Stats */}
        <div className="space-y-4">
          <div>
            <p className="font-mono text-[12px] uppercase tracking-wider text-[#64748d]">Agreements Completed</p>
            <p className="mt-1 font-mono text-2xl text-navy">{completed}</p>
          </div>
          <div>
            <p className="font-mono text-[12px] uppercase tracking-wider text-[#64748d]">Disputed</p>
            <p className="mt-1 font-mono text-2xl text-[#ea2261]">{disputed}</p>
          </div>
        </div>
        <div className="space-y-4">
          <div>
            <p className="font-mono text-[12px] uppercase tracking-wider text-[#64748d]">iNFT Status</p>
            <p className="mt-1 text-sm text-navy">
              {mintedAt > 0 ? (
                <span className="rounded-sm bg-[#15be53] px-2 py-0.5 font-mono text-[11px] uppercase text-white">Minted</span>
              ) : (
                <span className="rounded-sm bg-[#64748d] px-2 py-0.5 font-mono text-[11px] uppercase text-white">Not Minted</span>
              )}
            </p>
          </div>
          {mintedAt > 0 && (
            <div>
              <p className="font-mono text-[12px] uppercase tracking-wider text-[#64748d]">Minted On</p>
              <p className="mt-1 font-mono text-sm text-navy">
                {new Date(mintedAt * 1000).toLocaleDateString()}
              </p>
            </div>
          )}
        </div>
        <div className="space-y-4">
          <div>
            <p className="font-mono text-[12px] uppercase tracking-wider text-[#64748d]">Token Standard</p>
            <p className="mt-1 text-sm text-navy">ERC-7857 (Soulbound)</p>
          </div>
          <div>
            <p className="font-mono text-[12px] uppercase tracking-wider text-[#64748d]">Network</p>
            <p className="mt-1 text-sm text-navy">Base Mainnet</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function AllTrustNFTs() {
  const { data: totalMinted, isLoading: loadingCount } = useScaffoldReadContract({
    contractName: "TrustNFT",
    functionName: "totalMinted",
  });

  const total = totalMinted ? Number(totalMinted) : 0;

  return (
    <div className="mt-12">
      <h2 className="text-[22px] font-light text-navy">All Trust NFTs</h2>
      <p className="mt-1 text-sm text-[#64748d]">
        {loadingCount ? "Loading..." : `${total} trust NFTs minted on Base Mainnet`}
      </p>

      {total > 0 ? (
        <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: total }, (_, i) => i + 1).map((tokenId) => (
            <TrustNFTCard key={tokenId} tokenId={tokenId} />
          ))}
        </div>
      ) : !loadingCount ? (
        <div className="mt-6 rounded-lg border border-dashed border-[#b9b9f9] p-8 text-center">
          <p className="text-sm text-[#64748d]">No trust NFTs minted yet</p>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-3">
          {[1, 2, 3].map((i) => <SkeletonCard key={i} />)}
        </div>
      )}
    </div>
  );
}

function TrustNFTCard({ tokenId }: { tokenId: number }) {
  const { data: trustData, isLoading } = useScaffoldReadContract({
    contractName: "TrustNFT",
    functionName: "getTrustData",
    args: [BigInt(tokenId)],
  });

  if (isLoading) return <SkeletonCard />;

  const data = trustData as any;
  const score = data ? Number(data.score || 0) : 0;
  const completed = data ? Number(data.agreementsCompleted || 0) : 0;
  const disputed = data ? Number(data.agreementsDisputed || 0) : 0;

  return (
    <div className="rounded-lg border border-[#e5edf5] bg-white p-6 transition-shadow hover:shadow-ambient-card">
      <div className="flex items-start justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-gradient-to-r from-[#533afd] to-[#f96bee]">
          <span className="text-sm font-bold text-white">iNFT</span>
        </div>
        <TrustScoreBadge score={score} />
      </div>
      <h3 className="mt-4 text-lg font-light text-navy">Trust NFT #{tokenId}</h3>
      <div className="mt-3">
        <TrustBar score={score} />
      </div>
      <div className="mt-3 flex items-center gap-4">
        <span className="font-mono text-[12px] text-[#64748d]">{completed} completed</span>
        <span className="font-mono text-[12px] text-[#ea2261]">{disputed} disputed</span>
      </div>
    </div>
  );
}
