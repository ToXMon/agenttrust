"use client";

export function BasescanLink({ txHash, label }: { txHash: string; label?: string }) {
  const short = txHash.slice(0, 10) + "..." + txHash.slice(-6);
  return (
    <a
      href={`https://basescan.org/tx/${txHash}`}
      target="_blank"
      rel="noopener noreferrer"
      className="font-mono text-[13px] text-purple hover:text-purple-hover transition-colors"
    >
      {label || short}
    </a>
  );
}

export function AddressLink({ address }: { address: string }) {
  const short = address.slice(0, 6) + "..." + address.slice(-4);
  return (
    <a
      href={`https://basescan.org/address/${address}`}
      target="_blank"
      rel="noopener noreferrer"
      className="font-mono text-[13px] text-purple hover:text-purple-hover transition-colors"
    >
      {short}
    </a>
  );
}
