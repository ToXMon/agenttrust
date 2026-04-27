"use client";

import { DebugContracts } from "./DebugContracts";

const Debug = () => {
  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <h1 className="text-[32px] font-light tracking-[-0.64px] text-navy">
        Debug Contracts
      </h1>
      <p className="mt-2 text-sm text-[#64748d]">
        Interact with your deployed AgentTrust contracts on Base.
      </p>
      <div className="mt-8">
        <DebugContracts />
      </div>
    </div>
  );
};

export default Debug;
