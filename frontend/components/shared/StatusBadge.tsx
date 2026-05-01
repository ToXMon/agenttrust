"use client";

export type AgreementStatus = 0 | 1 | 2 | 3 | 4 | 5;

const statusConfig: Record<number, { label: string; color: string }> = {
  0: { label: "Proposed", color: "bg-[#64748d] text-white" },
  1: { label: "Accepted", color: "bg-[#533afd] text-white" },
  2: { label: "Fulfilled", color: "bg-[#2e2b8c] text-white" },
  3: { label: "Settled", color: "bg-[#15be53] text-white" },
  4: { label: "Disputed", color: "bg-[#ea2261] text-white" },
  5: { label: "Cancelled", color: "bg-[#64748d] text-white" },
};

export function StatusBadge({ status }: { status: number }) {
  const config = statusConfig[status] || statusConfig[0];
  return (
    <span
      className={`rounded-sm px-2 py-0.5 font-mono text-[11px] font-medium uppercase tracking-wider ${config.color}`}
    >
      {config.label}
    </span>
  );
}

export function MessageTypeBadge({ type }: { type: string }) {
  const config: Record<string, { label: string; color: string }> = {
    discover: { label: "DISCOVER", color: "bg-blue-100 text-blue-700" },
    introduce: { label: "INTRODUCE", color: "bg-blue-100 text-blue-700" },
    trust_query: { label: "TRUST_QUERY", color: "bg-purple-100 text-purple-700" },
    trust_response: { label: "TRUST_RESP", color: "bg-purple-100 text-purple-700" },
    service_request: { label: "SVC_REQ", color: "bg-green-100 text-green-700" },
    service_accept: { label: "SVC_ACCEPT", color: "bg-green-100 text-green-700" },
    service_reject: { label: "SVC_REJECT", color: "bg-red-100 text-red-700" },
    service_result: { label: "SVC_RESULT", color: "bg-green-100 text-green-700" },
    agreement_create: { label: "AGR_CREATE", color: "bg-yellow-100 text-yellow-700" },
    agreement_settle: { label: "AGR_SETTLE", color: "bg-yellow-100 text-yellow-700" },
    payment_release: { label: "PAYMENT", color: "bg-emerald-100 text-emerald-700" },
    message_ack: { label: "ACK", color: "bg-gray-100 text-gray-600" },
  };
  const c = config[type] || { label: type.toUpperCase(), color: "bg-gray-100 text-gray-600" };
  return (
    <span
      className={`rounded-sm px-2 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wider ${c.color}`}
    >
      {c.label}
    </span>
  );
}
