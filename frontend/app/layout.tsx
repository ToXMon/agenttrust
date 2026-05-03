import type { Metadata } from "next";
import { Source_Code_Pro } from "next/font/google";
import "@rainbow-me/rainbowkit/styles.css";
import "./globals.css";
import { Providers, WalletConnectButton } from "@/components/Providers";

const sourceCodePro = Source_Code_Pro({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "AgentTrust — Verifiable Agent Commerce on Base",
  description:
    "Trust-scored agent commerce protocol. Discover agents via ENS, verify through ERC-7857 iNFTs, negotiate over Gensyn AXL, settle with Uniswap.",
};

const navLinks = [
  { href: "/", label: "Dashboard" },
  { href: "/agents", label: "Agents" },
  { href: "/trust", label: "Trust" },
  { href: "/messages", label: "Messages" },
  { href: "/audit", label: "Audit" },
   { href: "/swap", label: "Swap" },
];

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={sourceCodePro.variable}>
      <body className="min-h-screen bg-white font-primary text-navy antialiased">
        <Providers>
          {/* Sticky Nav with frosted glass effect */}
          <nav className="sticky top-0 z-50 border-b border-[var(--border)] bg-[rgba(255,255,255,0.90)] backdrop-blur-md">
            <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
              {/* Logo */}
              <a href="/" className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-purple">
                  <span className="text-sm font-bold text-white">AT</span>
                </div>
                <span className="text-lg font-light tracking-tight text-navy">
                  AgentTrust
                </span>
                <span className="ml-2 rounded-sm bg-[#15be53] px-2 py-0.5 font-mono text-[11px] font-medium uppercase tracking-wider text-white">
                  On Base
                </span>
              </a>

              {/* Nav Links */}
              <div className="hidden items-center gap-6 md:flex">
                {navLinks.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    className="text-sm font-normal text-[#64748d] hover:text-purple transition-colors"
                  >
                    {link.label}
                  </a>
                ))}
              </div>

              {/* Connect Wallet */}
              <div className="flex items-center gap-3">
                <a
                  href="/debug"
                  className="hidden text-sm text-[#64748d] hover:text-purple transition-colors lg:block"
                >
                  Debug
                </a>
                <WalletConnectButton />
              </div>
            </div>
          </nav>

          {/* Main Content */}
          <main>{children}</main>

          {/* Footer */}
          <footer className="border-t border-[var(--border)] py-12">
            <div className="mx-auto max-w-7xl px-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded-sm bg-[#2e2b8c]">
                    <span className="text-[10px] font-bold text-white">AT</span>
                  </div>
                  <span className="text-sm text-[#64748d]">AgentTrust</span>
                </div>
                <p className="font-mono text-xs text-[#64748d]">
                  ETHGlobal Open Agents Hackathon 2026
                </p>
              </div>
            </div>
          </footer>
        </Providers>
      </body>
    </html>
  );
}
