"use client";

import { useState, useEffect } from "react";
import { useAccount, useWalletClient } from "wagmi";
import { createPublicClient, http } from "viem";
import { base } from "viem/chains";
import type { Hex } from "viem";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import { TrustScoreBadge, TrustBar } from "@/components/shared/TrustScoreBadge";
import { SkeletonCard } from "@/components/shared/SkeletonCard";
import { useScaffoldReadContract } from "@/components/scaffold-eth/hooks/useScaffoldReadContract";
import { getAgentIdByOwner, getAgentReputation, submitFeedback } from "../../sdk/erc8004.js";
import { UniswapClient, computeERC8004Limits, TOKENS, type SwapQuote } from "../../sdk/uniswap.js";

const publicClient = createPublicClient({
  chain: base,
  transport: http(process.env.NEXT_PUBLIC_BASE_RPC || "https://mainnet.base.org"),
});

export default function SwapPage() {
  const { isConnected, address: connectedAddress } = useAccount();
  const { data: walletClient } = useWalletClient();

  const [agentAddress, setAgentAddress] = useState<string>("");
  const [reputation, setReputation] = useState<{
    loading: boolean;
    agentId: bigint | null;
    score: number;
    tier: "blocked" | "bronze" | "silver" | "gold";
    limits: { maxUSDC: string; slippageBps: number };
  }>({
    loading: false,
    agentId: null,
    score: 0,
    tier: "blocked",
    limits: { maxUSDC: "0", slippageBps: 0 },
  });

  const [trustNFTScore, setTrustNFTScore] = useState<number | null>(null);

  const [tokenIn, setTokenIn] = useState<Hex>(TOKENS.USDC);
  const [tokenOut, setTokenOut] = useState<Hex>(TOKENS.WETH);
  const [amountIn, setAmountIn] = useState<string>("");
  const [recipient, setRecipient] = useState<string>("");

  const [quote, setQuote] = useState<SwapQuote | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState<string>("");
  const [swapHash, setSwapHash] = useState<string>("");

  const [feedbackSending, setFeedbackSending] = useState(false);
  const [feedbackHash, setFeedbackHash] = useState<string>("");

  // Default agent address to connected wallet when available
  useEffect(() => {
    if (connectedAddress && !agentAddress) {
      setAgentAddress(connectedAddress);
    }
  }, [connectedAddress, agentAddress]);

  // Fetch ERC-8004 reputation when agent address changes
  useEffect(() => {
    if (!agentAddress || !agentAddress.startsWith("0x") || agentAddress.length !== 42) {
      setReputation({
        loading: false,
        agentId: null,
        score: 0,
        tier: "blocked",
        limits: { maxUSDC: "0", slippageBps: 0 },
      });
      return;
    }

    let cancelled = false;
    setReputation((prev) => ({ ...prev, loading: true }));

    async function fetchReputation() {
      try {
        const agentId = await getAgentIdByOwner(publicClient, agentAddress as Hex);
        if (cancelled) return;
        if (!agentId) {
          setReputation({
            loading: false,
            agentId: null,
            score: 0,
            tier: "blocked",
            limits: { maxUSDC: "0", slippageBps: 0 },
          });
          return;
        }

        const rep = await getAgentReputation(publicClient, { agentId, tag1: "quality" });
        if (cancelled) return;

        const score = rep.normalizedScore;
        const limits = computeERC8004Limits(score);
        const tier = limits.level;
        const maxUSDC = (Number(limits.maxAmount) / 1e6).toLocaleString();

        setReputation({
          loading: false,
          agentId,
          score,
          tier,
          limits: { maxUSDC, slippageBps: limits.slippageBps },
        });
      } catch {
        if (!cancelled) {
          setReputation({
            loading: false,
            agentId: null,
            score: 0,
            tier: "blocked",
            limits: { maxUSDC: "0", slippageBps: 0 },
          });
        }
      }
    }

    fetchReputation();
    return () => { cancelled = true; };
  }, [agentAddress]);

  // Fetch TrustNFT score for comparison
  const { data: trustData } = useScaffoldReadContract({
    contractName: "TrustNFT",
    functionName: "getTrustDataByAgent",
    args: [agentAddress as Hex],
  });

  useEffect(() => {
    if (trustData) {
      setTrustNFTScore(Number((trustData as any)?.score || 0));
    }
  }, [trustData]);

  async function handleGetQuote(e: React.FormEvent) {
    e.preventDefault();
    setQuote(null);
    setQuoteError("");
    setSwapHash("");

    if (!agentAddress || !amountIn || Number(amountIn) <= 0) {
      setQuoteError("Enter a valid agent address and amount.");
      return;
    }

    const apiKey = process.env.NEXT_PUBLIC_UNISWAP_API_KEY || "";
    if (!apiKey) {
      setQuoteError("Uniswap API key not configured (NEXT_PUBLIC_UNISWAP_API_KEY).");
      return;
    }

    setQuoteLoading(true);

    try {
      const client = new UniswapClient({
        apiKey,
        rpcUrl: process.env.NEXT_PUBLIC_BASE_RPC || "https://mainnet.base.org",
        chainId: 8453,
      });

      const quoteResult = await client.getQuote({
        agentAddress: agentAddress as Hex,
        tokenIn,
        tokenOut,
        amountIn: String(Number(amountIn) * 1e6), // rough USDC 6 decimals
        trustScore: trustNFTScore ?? 0,
        trustThreshold: 26,
        recipient: (recipient || agentAddress) as Hex,
        erc8004Reputation: reputation.score,
      });

      setQuote(quoteResult);
    } catch (err: any) {
      setQuoteError(err?.message || "Quote failed");
    } finally {
      setQuoteLoading(false);
    }
  }

  async function handleSubmitFeedback() {
    if (!walletClient || !reputation.agentId) return;
    setFeedbackSending(true);
    setFeedbackHash("");
    try {
      const result = await submitFeedback({
        walletClient: walletClient as any,
        publicClient,
        agentId: reputation.agentId,
        value: Math.round(reputation.score),
        decimals: 0,
        tag1: "quality",
        tag2: "swap",
        endpoint: window.location.href,
        ipfsHash: "",
      });
      setFeedbackHash(result.txHash);
    } catch (err: any) {
      setQuoteError(err?.message || "Feedback submission failed");
    } finally {
      setFeedbackSending(false);
    }
  }

  const isRegistered = reputation.agentId !== null;

  return (
    <ErrorBoundary>
      <div className="mx-auto max-w-7xl px-6 pb-20 pt-12">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[32px] font-light leading-[1.10] tracking-[-0.64px] text-navy">
              Trust-Gated Swap
            </h1>
            <p className="mt-2 text-base text-[#64748d]">
              Execute swaps gated by ERC-8004 reputation and TrustNFT scores
            </p>
          </div>
          <span className="rounded-sm bg-[#15be53] px-2 py-0.5 font-mono text-[11px] font-medium uppercase tracking-wider text-white">
            Live on Base
          </span>
        </div>

        {!isConnected && (
          <div className="mt-6 rounded-lg border border-[#b9b9f9] bg-[rgba(83,58,253,0.04)] p-4">
            <p className="text-sm text-[#64748d]">Connect your wallet to use the swap features.</p>
          </div>
        )}

        {/* Reputation Summary */}
        <div className="mt-8 rounded-lg border border-[#e5edf5] bg-white p-6">
          <h2 className="text-lg font-light text-navy">Agent Reputation</h2>
          <div className="mt-4 grid grid-cols-1 gap-6 md:grid-cols-2">
            {reputation.loading ? (
              <SkeletonCard />
            ) : !isRegistered ? (
              <p className="text-sm text-[#64748d]">ERC-8004: Not registered</p>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-navy">ERC-8004 Score</span>
                  <TrustScoreBadge score={reputation.score} />
                </div>
                <TrustBar score={reputation.score} />
                <div className="flex items-center justify-between">
                  <span className="text-sm text-navy">Tier</span>
                  <span className={`rounded-sm px-2 py-0.5 font-mono text-[11px] uppercase tracking-wider text-white ${
                    reputation.tier === "gold" ? "bg-gradient-to-r from-[#533afd] to-[#f96bee]" :
                    reputation.tier === "silver" ? "bg-[#533afd]" :
                    reputation.tier === "bronze" ? "bg-[#b9b9f9] text-[#061b31]" : "bg-[#64748d]"
                  }`}>
                    {reputation.tier}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#64748d]">Max Swap (USDC)</span>
                  <span className="font-mono text-sm text-navy">{reputation.limits.maxUSDC}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#64748d]">Slippage</span>
                  <span className="font-mono text-sm text-navy">{reputation.limits.slippageBps / 100}%</span>
                </div>
              </div>
            )}

            {/* TrustNFT side-by-side */}
            <div className="space-y-3">
              <p className="font-mono text-[12px] uppercase tracking-wider text-[#64748d]">TrustNFT Score</p>
              {trustNFTScore === null ? (
                <p className="text-sm text-[#64748d]">No TrustNFT data</p>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-navy">Score</span>
                    <TrustScoreBadge score={trustNFTScore} />
                  </div>
                  <TrustBar score={trustNFTScore} />
                </>
              )}
            </div>
          </div>
        </div>

        {/* Swap Form */}
        <div className="mt-8 rounded-lg border border-[#e5edf5] bg-white p-6">
          <h2 className="text-lg font-light text-navy">Swap</h2>
          <form onSubmit={handleGetQuote} className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="block font-mono text-[11px] uppercase tracking-wider text-[#64748d]">
                Agent Address
              </label>
              <input
                type="text"
                value={agentAddress}
                onChange={(e) => setAgentAddress(e.target.value)}
                placeholder="0x..."
                className="mt-1 w-full rounded-md border border-[#e5edf5] px-3 py-2 text-sm text-navy outline-none focus:border-purple"
              />
            </div>

            <div>
              <label className="block font-mono text-[11px] uppercase tracking-wider text-[#64748d]">Token In</label>
              <select
                value={tokenIn}
                onChange={(e) => setTokenIn(e.target.value as Hex)}
                className="mt-1 w-full rounded-md border border-[#e5edf5] px-3 py-2 text-sm text-navy outline-none focus:border-purple"
              >
                <option value={TOKENS.USDC}>USDC</option>
                <option value={TOKENS.WETH}>WETH</option>
                <option value={TOKENS.ETH}>ETH</option>
              </select>
            </div>

            <div>
              <label className="block font-mono text-[11px] uppercase tracking-wider text-[#64748d]">Token Out</label>
              <select
                value={tokenOut}
                onChange={(e) => setTokenOut(e.target.value as Hex)}
                className="mt-1 w-full rounded-md border border-[#e5edf5] px-3 py-2 text-sm text-navy outline-none focus:border-purple"
              >
                <option value={TOKENS.USDC}>USDC</option>
                <option value={TOKENS.WETH}>WETH</option>
                <option value={TOKENS.ETH}>ETH</option>
              </select>
            </div>

            <div>
              <label className="block font-mono text-[11px] uppercase tracking-wider text-[#64748d]">Amount In</label>
              <input
                type="number"
                min="0"
                step="0.000001"
                value={amountIn}
                onChange={(e) => setAmountIn(e.target.value)}
                placeholder="0.0"
                className="mt-1 w-full rounded-md border border-[#e5edf5] px-3 py-2 text-sm text-navy outline-none focus:border-purple"
              />
            </div>

            <div>
              <label className="block font-mono text-[11px] uppercase tracking-wider text-[#64748d]">Recipient (optional)</label>
              <input
                type="text"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                placeholder="0x..."
                className="mt-1 w-full rounded-md border border-[#e5edf5] px-3 py-2 text-sm text-navy outline-none focus:border-purple"
              />
            </div>

            <div className="md:col-span-2">
              <button
                type="submit"
                disabled={quoteLoading || !isRegistered}
                className="rounded-md bg-purple px-5 py-2.5 text-sm text-white transition-colors hover:bg-purple-hover disabled:opacity-50"
              >
                {quoteLoading ? "Fetching quote..." : "Get Quote"}
              </button>
            </div>
          </form>

          {quoteError && (
            <div className="mt-4 rounded-md border border-[#ea2261]/20 bg-[#ea2261]/5 p-3 text-sm text-[#ea2261]">
              {quoteError}
            </div>
          )}

          {quote && (
            <div className="mt-6 space-y-3 rounded-md border border-[#e5edf5] bg-[rgba(83,58,253,0.02)] p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-[#64748d]">Amount Out</span>
                <span className="font-mono text-sm text-navy">{quote.amountOut}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-[#64748d]">Price Impact</span>
                <span className="font-mono text-sm text-navy">{quote.priceImpact}%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-[#64748d]">Gas Fee (USD)</span>
                <span className="font-mono text-sm text-navy">${quote.gasFeeUSD}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-[#64748d]">Slippage</span>
                <span className="font-mono text-sm text-navy">{quote.slippage}%</span>
              </div>

              {swapHash && (
                <div className="mt-2 text-sm text-[#15be53]">
                  Swap tx: <span className="font-mono break-all">{swapHash}</span>
                </div>
              )}
            </div>
          )}

          {quote && walletClient && (
            <div className="mt-4 flex items-center gap-3">
              <button
                type="button"
                disabled={feedbackSending}
                onClick={handleSubmitFeedback}
                className="rounded-md border border-[#b9b9f9] px-4 py-2 text-sm text-purple transition-colors hover:bg-[rgba(83,58,253,0.04)] disabled:opacity-50"
              >
                {feedbackSending ? "Submitting feedback..." : "Submit Feedback (Quality)"}
              </button>
              {feedbackHash && (
                <span className="text-sm text-[#15be53]">
                  Feedback tx: <span className="font-mono break-all">{feedbackHash}</span>
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </ErrorBoundary>
  );
}
