import React, { useEffect, useMemo, useRef, useState } from "react";
import { AnimatedCard } from "../components/AnimatedCard";
import gsap from "gsap";
import api from "../api/client";

function AnimatedCounter({ target }: { target: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    const obj = { val: 0 };
    gsap.to(obj, {
      val: target,
      duration: 1.4,
      ease: "power2.out",
      onUpdate: () => {
        if (ref.current) ref.current.textContent = Math.round(obj.val).toLocaleString();
      }
    });
  }, [target]);
  return <span ref={ref} className="text-2xl font-bold text-slate-50">0</span>;
}

export const FeatureSection: React.FC = () => {
  const sectionRef = useRef<HTMLDivElement | null>(null);
  const [credentialCount, setCredentialCount] = useState<number | null>(null);
  const [issuerCount, setIssuerCount] = useState<number | null>(null);
  const [verificationCount, setVerificationCount] = useState<number | null>(null);

  useEffect(() => {
    if (!sectionRef.current) return;
    const cards = sectionRef.current.querySelectorAll("[data-feature-card]");
    gsap.fromTo(
      cards,
      { y: 40, opacity: 0, scale: 0.95 },
      {
        y: 0,
        opacity: 1,
        scale: 1,
        duration: 0.7,
        stagger: 0.12,
        ease: "power3.out",
        scrollTrigger: undefined
      }
    );

    const stats = sectionRef.current.querySelectorAll("[data-stat-card]");
    gsap.fromTo(
      stats,
      { y: 30, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.6, stagger: 0.1, delay: 0.3, ease: "back.out(1.2)" }
    );
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadStats() {
      try {
        const [credsRes, logsRes] = await Promise.all([
          api.get("/credentials"),
          api.get("/verificationLogs")
        ]);
        if (cancelled) return;
        const creds = Array.isArray(credsRes.data) ? credsRes.data : [];
        const logs = Array.isArray(logsRes.data) ? logsRes.data : [];
        setCredentialCount(creds.length);
        const issuers = new Set<string>();
        creds.forEach((c: any) => {
          if (c.issuerId) issuers.add(c.issuerId);
        });
        setIssuerCount(issuers.size || null);
        setVerificationCount(logs.length || null);
      } catch {
        // landing page should not crash if backend is offline
      }
    }
    loadStats();
    return () => { cancelled = true; };
  }, []);

  const features = useMemo(
    () => [
      {
        title: "Zero-knowledge verification",
        description:
          "Prove age, student status, or membership without exposing underlying documents or identity.",
        tag: "ZK-native",
        accent: "from-cyan-400 to-sky-500",
        icon: "🔐"
      },
      {
        title: "Credential lifecycle",
        description:
          credentialCount != null
            ? `Live demo has issued ${credentialCount} credential${credentialCount === 1 ? "" : "s"} with on-chain revocation and expiry.`
            : "Issuance, rotation, and revocation on-chain, with off-chain encrypted storage for raw documents.",
        tag: "On-chain events",
        accent: "from-fuchsia-400 to-purple-500",
        icon: "⛓"
      },
      {
        title: "Developer-first APIs",
        description:
          issuerCount != null && verificationCount != null
            ? `${issuerCount} issuer${issuerCount === 1 ? "" : "s"} and ${verificationCount || 0} verification event${verificationCount === 1 ? "" : "s"} flowing through REST endpoints.`
            : "Drop-in REST + Web3 interfaces that plug into existing KYC, student, and membership flows.",
        tag: "API-first",
        accent: "from-indigo-400 to-cyan-400",
        icon: "🚀"
      }
    ],
    [credentialCount, issuerCount, verificationCount]
  );

  return (
    <section
      id="features"
      ref={sectionRef}
      className="relative py-16 sm:py-20 lg:py-24"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(99,102,241,0.08),_transparent_70%)]" />

      <div className="relative mx-auto flex max-w-6xl flex-col gap-10">
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-400">
            Features
          </p>
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Built like a production-grade privacy product.
          </h2>
          <p className="max-w-xl text-sm text-slate-300 sm:text-base">
            Everything from wallet-based login to issuer tooling and
            cryptographic verification flows is wired and demo-ready.
          </p>
        </div>

        {/* animated stats bar */}
        <div className="grid gap-4 sm:grid-cols-3">
          <div
            data-stat-card
            className="flex items-center gap-4 rounded-2xl border border-slate-800 bg-slate-950/70 p-4"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500/20 to-indigo-500/20 text-xl">
              📂
            </div>
            <div>
              <AnimatedCounter target={credentialCount ?? 0} />
              <div className="text-[10px] uppercase tracking-widest text-slate-500">
                Credentials issued
              </div>
            </div>
          </div>
          <div
            data-stat-card
            className="flex items-center gap-4 rounded-2xl border border-slate-800 bg-slate-950/70 p-4"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 text-xl">
              🧾
            </div>
            <div>
              <AnimatedCounter target={issuerCount ?? 0} />
              <div className="text-[10px] uppercase tracking-widest text-slate-500">
                Active issuers
              </div>
            </div>
          </div>
          <div
            data-stat-card
            className="flex items-center gap-4 rounded-2xl border border-slate-800 bg-slate-950/70 p-4"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 text-xl">
              ✅
            </div>
            <div>
              <AnimatedCounter target={verificationCount ?? 0} />
              <div className="text-[10px] uppercase tracking-widest text-slate-500">
                Verifications
              </div>
            </div>
          </div>
        </div>

        {/* feature cards */}
        <div className="grid gap-5 md:grid-cols-3">
          {features.map((f) => (
            <AnimatedCard key={f.title} className="cursor-default">
              <div data-feature-card className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${f.accent} text-lg shadow-lg`}>
                    {f.icon}
                  </div>
                  <span className="inline-flex rounded-full bg-slate-800/80 px-2 py-0.5 text-[10px] font-medium text-slate-200">
                    {f.tag}
                  </span>
                </div>
                <h3 className="text-sm font-semibold text-slate-50 sm:text-base">
                  {f.title}
                </h3>
                <p className="text-xs text-slate-300 sm:text-sm">
                  {f.description}
                </p>
                <div
                  className={`h-px w-16 bg-gradient-to-r ${f.accent} mt-2`}
                />
              </div>
            </AnimatedCard>
          ))}
        </div>
      </div>
    </section>
  );
};
