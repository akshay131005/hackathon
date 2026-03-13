import React from "react";
import { AnimatedCard } from "../components/AnimatedCard";

const STACK = [
  { label: "Frontend", value: "React 18 • TypeScript • Vite" },
  { label: "3D & Motion", value: "Three.js • React Three Fiber • GSAP" },
  { label: "Design System", value: "TailwindCSS • custom neon theme" },
  { label: "Wallet & Chain", value: "ethers.js • MetaMask • Sepolia" },
  { label: "Backend", value: "Node/Express API • PrivacyPass contract" }
];

export const TechSection: React.FC = () => {
  return (
    <section id="tech" className="relative py-16 sm:py-20 lg:py-24">
      <div className="mx-auto flex max-w-6xl flex-col gap-8">
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-400">
            Technology
          </p>
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            A modern Web3 + ZK stack under the hood.
          </h2>
        </div>
        <AnimatedCard className="grid gap-6 md:grid-cols-[1.2fr_minmax(0,1fr)]">
          <div className="space-y-4 text-xs text-slate-200 sm:text-sm">
            <p>
              The demo is wired like a real product: wallet connection through
              MetaMask, typed APIs to a credential backend, and a Solidity
              contract to anchor credentials on-chain.
            </p>
            <p>
              The UI is tuned for performance with React Three Fiber for 3D,
              GSAP for scroll-linked animation, and Tailwind for rapid,
              type-safe styling.
            </p>
          </div>
          <div className="space-y-3 rounded-2xl bg-slate-950/60 p-4 text-xs text-slate-200 sm:text-sm">
            {STACK.map((item) => (
              <div
                key={item.label}
                className="flex items-start justify-between gap-3 border-b border-slate-800/80 pb-2 last:border-b-0 last:pb-0"
              >
                <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  {item.label}
                </span>
                <span className="text-right text-slate-100">{item.value}</span>
              </div>
            ))}
          </div>
        </AnimatedCard>
      </div>
    </section>
  );
};

