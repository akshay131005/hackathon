import React, { useEffect, useRef } from "react";
import { AnimatedCard } from "../components/AnimatedCard";
import gsap from "gsap";

const TEAM = [
  {
    name: "ZK Protocols",
    role: "Zero-knowledge & cryptography",
    blurb: "Designs the credential commitment scheme and proof flows.",
    icon: "🔐",
    accent: "from-cyan-500/20 to-indigo-500/20"
  },
  {
    name: "On-chain Logic",
    role: "Smart contracts & events",
    blurb: "Owns PrivacyPass.sol and the on-chain credential lifecycle.",
    icon: "⛓",
    accent: "from-violet-500/20 to-fuchsia-500/20"
  },
  {
    name: "Experience Layer",
    role: "Product & frontend",
    blurb: "Crafts the 3D hero, dashboard UX, issuer tools, and demo storytelling.",
    icon: "🎨",
    accent: "from-fuchsia-500/20 to-pink-500/20"
  }
];

export const TeamSection: React.FC = () => {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    const cards = ref.current.querySelectorAll("[data-team-card]");
    gsap.fromTo(
      cards,
      { y: 40, opacity: 0, rotateY: 15 },
      { y: 0, opacity: 1, rotateY: 0, duration: 0.7, stagger: 0.15, ease: "power3.out" }
    );
  }, []);

  return (
    <section id="team" ref={ref} className="relative py-16 sm:py-20 lg:py-24">
      <div className="mx-auto flex max-w-6xl flex-col gap-8">
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-fuchsia-400">
            Team
          </p>
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            A focused, protocol-meets-product builder stack.
          </h2>
          <p className="max-w-xl text-sm text-slate-300 sm:text-base">
            Even in a hackathon context, PrivacyPass is structured like a real
            product with clearly defined ownership across protocol, contracts,
            and UX.
          </p>
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          {TEAM.map((member) => (
            <AnimatedCard key={member.name}>
              <div data-team-card className="space-y-3">
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${member.accent} text-xl`}
                  >
                    {member.icon}
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-50">
                      {member.name}
                    </h3>
                    <p className="text-[11px] uppercase tracking-wide text-cyan-400">
                      {member.role}
                    </p>
                  </div>
                </div>
                <p className="text-xs text-slate-300 sm:text-sm">{member.blurb}</p>
                <div className={`h-px w-12 bg-gradient-to-r ${member.accent}`} />
              </div>
            </AnimatedCard>
          ))}
        </div>
      </div>
    </section>
  );
};
