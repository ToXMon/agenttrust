"use client";

import { useEffect, useState } from "react";
import { useAllContracts } from "@/utils/scaffold/contractsData";
import { ContractUI } from "./ContractUI";

const selectedContractStorageKey = "agenttrust.selectedContract";

export function DebugContracts() {
  const contractsData = useAllContracts();
  const contractNames = Object.keys(contractsData as Record<string, unknown>).sort();
  const [selectedContract, setSelectedContract] = useState<string>(
    (typeof window !== "undefined" &&
      (sessionStorage.getItem(selectedContractStorageKey) as string)) ||
      contractNames[0] ||
      ""
  );

  useEffect(() => {
    if (selectedContract) {
      sessionStorage.setItem(selectedContractStorageKey, selectedContract);
    }
  }, [selectedContract]);

  if (contractNames.length === 0) {
    return (
      <div className="p-6 text-center">
        <p className="text-sm text-[#64748d]">
          No contracts deployed yet. Run the foundry bridge script after deployment.
        </p>
      </div>
    );
  }

  return (
    <div>
      {contractNames.length > 1 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {contractNames.map((name: string) => (
            <button
              key={name}
              onClick={() => setSelectedContract(name)}
              className={`rounded-md px-3 py-1.5 text-sm font-mono ${
                name === selectedContract
                  ? "bg-purple text-white"
                  : "border border-[#e5edf5] text-[#64748d] hover:text-purple"
              }`}
            >
              {name}
            </button>
          ))}
        </div>
      )}
      {selectedContract && contractsData[selectedContract as keyof typeof contractsData] && (
        <ContractUI
          contractName={selectedContract}
          contract={contractsData[selectedContract as keyof typeof contractsData] as any}
        />
      )}
    </div>
  );
}
