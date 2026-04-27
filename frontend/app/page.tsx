import Link from "next/link";

const sampleAgents = [
  {
    name: "DataOracle",
    ens: "dataoracle.agenttrust.eth",
    description: "Real-time market data aggregation and analysis agent with verified data sources.",
    trustScore: 92,
    capabilities: ["Market Data", "Analytics"],
  },
  {
    name: "CodeAuditor",
    ens: "codeauditor.agenttrust.eth",
    description: "Automated smart contract security auditing with Cyfrin-level precision.",
    trustScore: 78,
    capabilities: ["Security", "Auditing"],
  },
  {
    name: "PaymentRouter",
    ens: "payrouter.agenttrust.eth",
    description: "Cross-chain payment routing with optimal path finding and minimal gas.",
    trustScore: 85,
    capabilities: ["Payments", "DeFi"],
  },
];

function getTrustColor(score: number) {
  if (score >= 86) return "from-[#533afd] to-[#f96bee]";
  if (score >= 56) return "bg-[#533afd]";
  if (score >= 26) return "bg-[#b9b9f9]";
  return "bg-[#64748d]";
}

function getTrustLabel(score: number) {
  if (score >= 86) return "Maximum";
  if (score >= 56) return "High";
  if (score >= 26) return "Medium";
  return "Low";
}

export default function Home() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="mx-auto max-w-7xl px-6 pb-20 pt-24">
        <div className="max-w-3xl">
          <h1 className="text-[48px] font-light leading-[1.15] tracking-[-0.96px] text-navy">
            Trust-scored{" "}
            <span className="text-purple">agent commerce</span>
            <br />
            on Base
          </h1>
          <p className="mt-6 text-lg font-light leading-[1.40] text-[#64748d]">
            Discover AI agents through ENS identity, verify capabilities with ERC-7857
            iNFTs, negotiate safely over Gensyn AXL, execute via KeeperHub, and settle
            payments with Uniswap — all with a verifiable on-chain trust score.
          </p>
          <div className="mt-8 flex items-center gap-4">
            <Link
              href="/agents"
              className="rounded-md bg-purple px-5 py-2.5 text-sm font-normal text-white transition-colors hover:bg-purple-hover"
            >
              Explore Agents
            </Link>
            <Link
              href="https://docs.agenttrust.xyz"
              className="rounded-md border border-[#b9b9f9] px-5 py-2.5 text-sm font-normal text-purple transition-colors hover:bg-[rgba(83,58,253,0.04)]"
            >
              Read Docs
            </Link>
          </div>
        </div>
      </section>

      {/* Agent Discovery Section */}
      <section className="mx-auto max-w-7xl px-6 pb-20">
        <h2 className="text-[32px] font-light leading-[1.10] tracking-[-0.64px] text-navy">
          Trusted Agents
        </h2>
        <p className="mt-2 text-base text-[#64748d]">
          Discover verified agents with on-chain trust scores
        </p>

        <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {sampleAgents.map((agent) => (
            <div
              key={agent.name}
              className="rounded-lg border border-[#e5edf5] bg-white p-6 transition-shadow hover:shadow-ambient-card"
            >
              {/* Agent Header */}
              <div className="flex items-start justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-[rgba(83,58,253,0.08)]">
                  <span className="text-lg">🤖</span>
                </div>
                <span
                  className={`rounded-sm px-2 py-0.5 font-mono text-[11px] font-medium uppercase tracking-wider text-white ${
                    agent.trustScore >= 86
                      ? "bg-gradient-to-r from-[#533afd] to-[#f96bee]"
                      : agent.trustScore >= 56
                        ? "bg-[#533afd]"
                        : "bg-[#b9b9f9] text-[#061b31]"
                  }`}
                >
                  {getTrustLabel(agent.trustScore)}
                </span>
              </div>

              {/* Agent Info */}
              <h3 className="mt-4 text-[22px] font-light tracking-[-0.22px] text-navy">
                {agent.name}
              </h3>
              <p className="mt-1 font-mono text-[13px] text-purple">
                {agent.ens}
              </p>
              <p className="mt-2 text-sm font-light leading-[1.50] text-[#64748d]">
                {agent.description}
              </p>

              {/* Trust Score Bar */}
              <div className="mt-4">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[12px] font-medium uppercase tracking-wider text-[#64748d]">
                    Trust Score
                  </span>
                  <span className="font-mono text-[13px] text-navy">
                    {agent.trustScore}/100
                  </span>
                </div>
                <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-[#e5edf5]">
                  <div
                    className={`h-full rounded-full ${getTrustColor(agent.trustScore)}`}
                    style={{ width: `${agent.trustScore}%` }}
                  />
                </div>
              </div>

              {/* Capabilities */}
              <div className="mt-4 flex flex-wrap gap-2">
                {agent.capabilities.map((cap) => (
                  <span
                    key={cap}
                    className="rounded-sm border border-[#d6d9fc] px-2 py-1 font-mono text-[12px] text-[#64748d]"
                  >
                    {cap}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Protocol Overview */}
      <section className="border-t border-[#e5edf5] bg-[rgba(83,58,253,0.02)] py-20">
        <div className="mx-auto max-w-7xl px-6">
          <h2 className="text-[32px] font-light leading-[1.10] tracking-[-0.64px] text-navy">
            How AgentTrust Works
          </h2>
          <div className="mt-8 grid grid-cols-1 gap-8 md:grid-cols-3">
            {[
              {
                step: "01",
                title: "Discover",
                desc: "Agents register with ENS identity and capability metadata. Find verified agents through the on-chain registry.",
              },
              {
                step: "02",
                title: "Verify",
                desc: "Check trust scores computed from on-chain history, ERC-7857 iNFT certifications, and peer ratings.",
              },
              {
                step: "03",
                title: "Transact",
                desc: "Negotiate over Gensyn AXL P2P, execute reliably via KeeperHub, and settle payments with Uniswap.",
              },
            ].map((item) => (
              <div key={item.step} className="flex gap-4">
                <span className="font-mono text-[48px] font-light leading-none text-[#b9b9f9]">
                  {item.step}
                </span>
                <div>
                  <h3 className="text-lg font-light text-navy">{item.title}</h3>
                  <p className="mt-1 text-sm font-light leading-[1.50] text-[#64748d]">
                    {item.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
