"use client";

export function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-lg border border-[#e5edf5] bg-white p-6">
      <div className="flex items-start justify-between">
        <div className="h-10 w-10 rounded-md bg-[#e5edf5]" />
        <div className="h-5 w-16 rounded-sm bg-[#e5edf5]" />
      </div>
      <div className="mt-4 h-6 w-32 rounded bg-[#e5edf5]" />
      <div className="mt-2 h-4 w-48 rounded bg-[#e5edf5]" />
      <div className="mt-2 h-4 w-full rounded bg-[#e5edf5]" />
      <div className="mt-4">
        <div className="h-3 w-20 rounded bg-[#e5edf5]" />
        <div className="mt-2 h-1 w-full rounded-full bg-[#e5edf5]" />
      </div>
    </div>
  );
}

export function SkeletonRow() {
  return (
    <div className="animate-pulse flex items-center gap-4 border-b border-[#e5edf5] py-4">
      <div className="h-4 w-24 rounded bg-[#e5edf5]" />
      <div className="h-4 w-32 rounded bg-[#e5edf5]" />
      <div className="h-4 w-20 rounded bg-[#e5edf5]" />
      <div className="h-4 w-16 rounded bg-[#e5edf5]" />
      <div className="h-4 w-28 rounded bg-[#e5edf5]" />
    </div>
  );
}

export function SkeletonMessage() {
  return (
    <div className="animate-pulse flex gap-3 rounded-lg border border-[#e5edf5] bg-white p-4">
      <div className="h-8 w-8 rounded-full bg-[#e5edf5]" />
      <div className="flex-1 space-y-2">
        <div className="h-4 w-32 rounded bg-[#e5edf5]" />
        <div className="h-3 w-full rounded bg-[#e5edf5]" />
      </div>
    </div>
  );
}
