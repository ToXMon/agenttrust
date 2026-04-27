"use client";
export function AddressInfoDropdown({ address }: { address: string }) {
  return <span className="font-mono text-sm text-navy">{address?.slice(0, 6)}...{address?.slice(-4)}</span>;
}
