"use client";

import { useState } from "react";
import { GenericContract } from "@/utils/scaffold/contract";

interface ContractUIProps {
  contractName: string;
  contract: GenericContract;
}

export function ContractUI({ contractName, contract }: ContractUIProps) {
  const [activeTab, setActiveTab] = useState<"read" | "write">("read");

  const readFunctions = (contract.abi || []).filter(
    (item: any) => item.type === "function" && item.stateMutability === "view"
  );
  const writeFunctions = (contract.abi || []).filter(
    (item: any) => item.type === "function" && item.stateMutability !== "view"
  );

  return (
    <div className="rounded-lg border border-[#e5edf5] bg-white p-6">
      <div className="flex items-center justify-between">
        <h3 className="font-mono text-lg font-light text-navy">{contractName}</h3>
        <span className="font-mono text-xs text-[#64748d]">
          {contract.address}
        </span>
      </div>

      {/* Tabs */}
      <div className="mt-4 flex gap-4 border-b border-[#e5edf5] pb-2">
        <button
          onClick={() => setActiveTab("read")}
          className={`text-sm ${activeTab === "read" ? "text-purple border-b-2 border-purple" : "text-[#64748d]"}`}
        >
          Read ({readFunctions.length})
        </button>
        <button
          onClick={() => setActiveTab("write")}
          className={`text-sm ${activeTab === "write" ? "text-purple border-b-2 border-purple" : "text-[#64748d]"}`}
        >
          Write ({writeFunctions.length})
        </button>
      </div>

      {/* Function List */}
      <div className="mt-4 space-y-3">
        {activeTab === "read" && readFunctions.length === 0 && (
          <p className="text-sm text-[#64748d]">No read functions found</p>
        )}
        {activeTab === "write" && writeFunctions.length === 0 && (
          <p className="text-sm text-[#64748d]">No write functions found</p>
        )}
        {(activeTab === "read" ? readFunctions : writeFunctions).map((func: any) => (
          <div
            key={func.name}
            className="rounded-md border border-[#e5edf5] p-3"
          >
            <span className="font-mono text-sm text-navy">{func.name}</span>
            {func.inputs && func.inputs.length > 0 && (
              <div className="mt-2 space-y-1">
                {func.inputs.map((input: any) => (
                  <div key={input.name} className="flex items-center gap-2">
                    <label className="font-mono text-xs text-[#64748d]">
                      {input.name} ({input.type})
                    </label>
                    <input
                      type="text"
                      placeholder={input.type}
                      className="rounded-sm border border-[#e5edf5] px-2 py-1 font-mono text-xs"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
