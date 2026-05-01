"use client";

import { useState, useEffect } from "react";
import { useScaffoldReadContract } from "@/components/scaffold-eth/hooks/useScaffoldReadContract";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { SkeletonRow } from "@/components/shared/SkeletonCard";
import { BasescanLink } from "@/components/shared/BasescanLink";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";

interface AgreementData {
  requester: string;
  provider: string;
  token: string;
  amount: bigint;
  trustThreshold: bigint;
  deadline: bigint;
  serviceHash: string;
  outputHash: string;
  status: number;
  createdAt: bigint;
  settledAt: bigint;
}

interface KeeperTask {
  id: string;
  agent: string;
  action: string;
  status: string;
  gasUsed: string;
  timestamp: number;
  txHash: string;
}

export default function AuditPage() {
  const [keeperTasks, setKeeperTasks] = useState<KeeperTask[]>([]);
  const [keeperLoading, setKeeperLoading] = useState(true);

  const { data: totalAgreements, isLoading: loadingCount } = useScaffoldReadContract({
    contractName: "ServiceAgreement",
    functionName: "totalAgreements",
  });

  useEffect(() => {
    async function loadKeeperTasks() {
      try {
        const res = await fetch("/api/audit?limit=50");
        const data = await res.json();
        setKeeperTasks(data.tasks || []);
      } catch {
        setKeeperTasks([]);
      }
      setKeeperLoading(false);
    }
    loadKeeperTasks();
  }, []);

  const total = totalAgreements ? Number(totalAgreements) : 0;

  return (
    <ErrorBoundary>
      <div className="mx-auto max-w-7xl px-6 pb-20 pt-12">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[32px] font-light leading-[1.10] tracking-[-0.64px] text-navy">
              Audit Trail
            </h1>
            <p className="mt-2 text-base text-[#64748d]">
              On-chain agreement lifecycle and KeeperHub execution logs
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="rounded-sm bg-[rgba(83,58,253,0.08)] px-3 py-1 font-mono text-[13px] text-purple">
              {total} agreements
            </span>
            <span className="rounded-sm bg-[#15be53] px-2 py-0.5 font-mono text-[11px] font-medium uppercase tracking-wider text-white">
              On Chain
            </span>
          </div>
        </div>

        {/* Agreement Lifecycle */}
        <div className="mt-8">
          <h2 className="text-[22px] font-light text-navy">Agreement Lifecycle</h2>
          <div className="mt-3 flex items-center gap-2">
            {["Proposed", "Accepted", "Fulfilled", "Settled", "Disputed", "Cancelled"].map((s, i) => (
              <div key={s} className="flex items-center gap-2">
                <div className="flex h-8 items-center justify-center rounded-md bg-[rgba(83,58,253,0.08)] px-3">
                  <span className="font-mono text-[11px] text-purple">{s}</span>
                </div>
                {i < 5 && <span className="text-[#b9b9f9]">→</span>}
              </div>
            ))}
          </div>
        </div>

        {/* Service Agreements Table */}
        <div className="mt-8">
          <h2 className="text-[22px] font-light text-navy">Service Agreements</h2>
          <div className="mt-4 overflow-hidden rounded-lg border border-[#e5edf5]">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#e5edf5] bg-[rgba(83,58,253,0.02)]">
                  <th className="px-4 py-3 text-left font-mono text-[11px] uppercase tracking-wider text-[#64748d]">ID</th>
                  <th className="px-4 py-3 text-left font-mono text-[11px] uppercase tracking-wider text-[#64748d]">Requester</th>
                  <th className="px-4 py-3 text-left font-mono text-[11px] uppercase tracking-wider text-[#64748d]">Provider</th>
                  <th className="px-4 py-3 text-left font-mono text-[11px] uppercase tracking-wider text-[#64748d]">Amount</th>
                  <th className="px-4 py-3 text-left font-mono text-[11px] uppercase tracking-wider text-[#64748d]">Status</th>
                  <th className="px-4 py-3 text-left font-mono text-[11px] uppercase tracking-wider text-[#64748d]">Created</th>
                </tr>
              </thead>
              <tbody>
                {loadingCount && (
                  <><SkeletonRow /><SkeletonRow /><SkeletonRow /></>
                )}
                {!loadingCount && total === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-sm text-[#64748d]">
                      No agreements created yet
                    </td>
                  </tr>
                )}
                {!loadingCount && total > 0 && Array.from({ length: total }, (_, i) => i).map((idx) => (
                  <AgreementRow key={idx} agreementId={idx} />
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* KeeperHub Execution Log */}
        <div className="mt-12">
          <div className="flex items-center justify-between">
            <h2 className="text-[22px] font-light text-navy">KeeperHub Execution Log</h2>
            <span className="rounded-sm bg-[rgba(83,58,253,0.08)] px-2 py-0.5 font-mono text-[11px] text-purple">MCP Integration</span>
          </div>
          <div className="mt-4 overflow-hidden rounded-lg border border-[#e5edf5]">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#e5edf5] bg-[rgba(83,58,253,0.02)]">
                  <th className="px-4 py-3 text-left font-mono text-[11px] uppercase tracking-wider text-[#64748d]">Task ID</th>
                  <th className="px-4 py-3 text-left font-mono text-[11px] uppercase tracking-wider text-[#64748d]">Agent</th>
                  <th className="px-4 py-3 text-left font-mono text-[11px] uppercase tracking-wider text-[#64748d]">Action</th>
                  <th className="px-4 py-3 text-left font-mono text-[11px] uppercase tracking-wider text-[#64748d]">Status</th>
                  <th className="px-4 py-3 text-left font-mono text-[11px] uppercase tracking-wider text-[#64748d]">Gas Used</th>
                  <th className="px-4 py-3 text-left font-mono text-[11px] uppercase tracking-wider text-[#64748d]">Tx Hash</th>
                </tr>
              </thead>
              <tbody>
                {keeperLoading && <><SkeletonRow /><SkeletonRow /></>}
                {!keeperLoading && keeperTasks.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-sm text-[#64748d]">
                      No execution logs available
                    </td>
                  </tr>
                )}
                {keeperTasks.map((task) => (
                  <tr key={task.id} className="border-b border-[#e5edf5] hover:bg-[rgba(83,58,253,0.02)]">
                    <td className="px-4 py-3 font-mono text-[13px] text-navy">{task.id}</td>
                    <td className="px-4 py-3 font-mono text-[13px] text-purple">{task.agent}</td>
                    <td className="px-4 py-3 font-mono text-[13px] text-navy">{task.action}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-sm px-2 py-0.5 font-mono text-[11px] uppercase ${
                        task.status === "completed"
                          ? "bg-[rgba(21,190,83,0.1)] text-[#108c3d]"
                          : task.status === "failed"
                            ? "bg-[rgba(234,34,97,0.1)] text-[#ea2261]"
                            : "bg-[rgba(100,116,125,0.1)] text-[#64748d]"
                      }`}>
                        {task.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-[13px] text-navy">{task.gasUsed}</td>
                    <td className="px-4 py-3">
                      <BasescanLink txHash={task.txHash} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Sponsor Proof */}
        <div className="mt-8 border-t border-[#e5edf5] pt-6">
          <div className="flex items-center gap-4">
            <span className="font-mono text-[11px] uppercase tracking-wider text-[#64748d]">Sponsor tracks:</span>
            <span className="rounded-sm bg-[rgba(83,58,253,0.08)] px-2 py-0.5 font-mono text-[11px] text-purple">KeeperHub MCP</span>
            <span className="rounded-sm bg-[rgba(83,58,253,0.08)] px-2 py-0.5 font-mono text-[11px] text-purple">0G Storage</span>
            <span className="rounded-sm bg-[rgba(83,58,253,0.08)] px-2 py-0.5 font-mono text-[11px] text-purple">Base Mainnet</span>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
}

function AgreementRow({ agreementId }: { agreementId: number }) {
  const { data: agreement, isLoading } = useScaffoldReadContract({
    contractName: "ServiceAgreement",
    functionName: "getAgreement",
    args: [BigInt(agreementId)],
  });

  if (isLoading) return <SkeletonRow />;

  const data = agreement as any;
  if (!data) return null;

  const shortAddr = (addr: string) => addr.slice(0, 6) + "..." + addr.slice(-4);
  const formatAmount = (amt: bigint) => {
    try {
      return (Number(amt) / 1e6).toFixed(2) + " USDC";
    } catch {
      return String(amt);
    }
  };

  return (
    <tr className="border-b border-[#e5edf5] hover:bg-[rgba(83,58,253,0.02)]">
      <td className="px-4 py-3 font-mono text-[13px] text-navy">#{agreementId}</td>
      <td className="px-4 py-3">
        <a
          href={`https://basescan.org/address/${data.requester}`}
          target="_blank"
          rel="noopener noreferrer"
          className="font-mono text-[13px] text-purple hover:text-purple-hover"
        >
          {shortAddr(data.requester)}
        </a>
      </td>
      <td className="px-4 py-3">
        <a
          href={`https://basescan.org/address/${data.provider}`}
          target="_blank"
          rel="noopener noreferrer"
          className="font-mono text-[13px] text-purple hover:text-purple-hover"
        >
          {shortAddr(data.provider)}
        </a>
      </td>
      <td className="px-4 py-3 font-mono text-[13px] text-navy">{formatAmount(data.amount)}</td>
      <td className="px-4 py-3"><StatusBadge status={data.status} /></td>
      <td className="px-4 py-3 font-mono text-[12px] text-[#64748d]">
        {Number(data.createdAt) > 0
          ? new Date(Number(data.createdAt) * 1000).toLocaleDateString()
          : "-"
        }
      </td>
    </tr>
  );
}
