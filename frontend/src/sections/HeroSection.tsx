import React, { useEffect, useMemo, useRef, useState } from "react";
import gsap from "gsap";
import { Hero3D } from "../three/Hero3D";
import { useWallet } from "../wallet/WalletContext";
import { useNavigate } from "react-router-dom";
import api from "../api/client";

export const HeroSection: React.FC = () => {
  const { address, connect } = useWallet();
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const headingRef = useRef<HTMLHeadingElement | null>(null);
  const statsRef = useRef<HTMLDivElement | null>(null);
  const [health, setHealth] = useState<null | { status?: string }>(null);
  const [loadingHealth, setLoadingHealth] = useState(false);
  const [credCount, setCredCount] = useState(0);
  const [verifyCount, setVerifyCount] = useState(0);

  useEffect(() => {
    if (!containerRef.current) return;
    const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

    tl.fromTo(
      containerRef.current.querySelectorAll("[data-hero-stagger]"),
      { y: 50, opacity: 0, filter: "blur(8px)" },
      { y: 0, opacity: 1, filter: "blur(0px)", duration: 0.9, stagger: 0.14 }
    );

    if (headingRef.current) {
      const words = headingRef.current.querySelectorAll("[data-word]");
      tl.fromTo(
        words,
        { y: 30, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.6, stagger: 0.06, ease: "back.out(1.4)" },
        "-=0.7"
      );
    }

    if (statsRef.current) {
      tl.fromTo(
        statsRef.current.querySelectorAll("[data-stat]"),
        { y: 20, opacity: 0, scale: 0.9 },
        { y: 0, opacity: 1, scale: 1, duration: 0.5, stagger: 0.08, ease: "back.out(1.2)" },
        "-=0.3"
      );
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setLoadingHealth(true);
        const [healthRes, credsRes, logsRes] = await Promise.allSettled([
          api.get("/health"),
          api.get("/credentials"),
          api.get("/verificationLogs")
        ]);
        if (cancelled) return;
        if (healthRes.status === "fulfilled") setHealth(healthRes.value.data || {});
        if (credsRes.status === "fulfilled" && Array.isArray(credsRes.value.data))
          setCredCount(credsRes.value.data.length);
        if (logsRes.status === "fulfilled" && Array.isArray(logsRes.value.data))
          setVerifyCount(logsRes.value.data.length);
      } catch {
        if (!cancelled) setHealth(null);
      } finally {
        if (!cancelled) setLoadingHealth(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const pillLabel = useMemo(() => {
    if (loadingHealth) return "Checking backend status…";
    if (health?.status === "ok") return "Backend online • Zero-knowledge credentials";
    return "Zero-knowledge credentials • Live prototype";
  }, [health, loadingHealth]);

  return (
    <section
      id="hero"
      ref={containerRef}
      className="relative flex min-h-[85vh] items-center py-10"
    >
      {/* animated background gradients */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-40 top-1/4 h-96 w-96 animate-pulse rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="absolute -right-32 bottom-1/4 h-80 w-80 rounded-full bg-violet-500/10 blur-3xl" style={{ animation: "pulse 4s ease-in-out infinite alternate" }} />
        <div className="absolute left-1/3 top-0 h-64 w-64 rounded-full bg-indigo-500/8 blur-3xl" style={{ animation: "pulse 5s ease-in-out 1s infinite alternate" }} />
      </div>

      <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-10 md:flex-row md:items-center">
        <div className="space-y-7 md:w-1/2">
          <div
            data-hero-stagger
            className="inline-flex items-center gap-2 rounded-full border border-slate-700/80 bg-slate-900/80 px-3 py-1.5 text-[11px] text-slate-300 shadow-[0_0_20px_rgba(34,211,238,0.1)] backdrop-blur"
          >
            <span className={`h-2 w-2 rounded-full shadow-[0_0_12px_rgba(52,211,153,0.8)] ${health?.status === "ok" ? "bg-emerald-400" : loadingHealth ? "animate-pulse bg-amber-400" : "bg-slate-500"}`} />
            {pillLabel}
          </div>

          <h1
            ref={headingRef}
            data-hero-stagger
            className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl"
          >
            <span data-word className="inline-block">Proof</span>{" "}
            <span data-word className="inline-block">of</span>{" "}
            <span data-word className="inline-block bg-gradient-to-r from-cyan-400 via-indigo-400 to-fuchsia-400 bg-clip-text text-transparent">
              eligibility
            </span>{" "}
            <span data-word className="inline-block">without</span>{" "}
            <span data-word className="inline-block">proof</span>{" "}
            <span data-word className="inline-block">of</span>{" "}
            <span data-word className="inline-block">identity.</span>
          </h1>

          <p
            data-hero-stagger
            className="max-w-xl text-sm leading-relaxed text-slate-300 sm:text-base"
          >
            Issue and verify privacy-preserving credentials for age, student
            status, and membership. Powered by Web3, zero-knowledge proofs, and
            a privacy-first architecture.
          </p>

          <div
            data-hero-stagger
            className="flex flex-wrap items-center gap-3 text-xs"
          >
            <button onClick={connect} className="btn-primary shadow-[0_0_24px_rgba(34,211,238,0.3)]">
              {address ? "Wallet Connected" : "Connect Wallet"}
            </button>
            <button onClick={() => navigate("/dashboard")} className="btn-outline">
              View Demo Dashboard
            </button>
            <button onClick={() => navigate("/issuer")} className="btn-outline">
              Issuer Portal
            </button>
            <button onClick={() => navigate("/identity")} className="btn-outline">
              Identity
            </button>
          </div>

          {/* live stats strip */}
          <div
            ref={statsRef}
            data-hero-stagger
            className="flex flex-wrap items-center gap-4"
          >
            <div
              data-stat
              className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-2 backdrop-blur"
            >
              <span className="text-lg">📂</span>
              <div>
                <div className="text-sm font-semibold text-slate-50">{credCount}</div>
                <div className="text-[9px] uppercase tracking-widest text-slate-500">Credentials</div>
              </div>
            </div>
            <div
              data-stat
              className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-2 backdrop-blur"
            >
              <span className="text-lg">✅</span>
              <div>
                <div className="text-sm font-semibold text-slate-50">{verifyCount}</div>
                <div className="text-[9px] uppercase tracking-widest text-slate-500">Verifications</div>
              </div>
            </div>
            <div
              data-stat
              className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-2 backdrop-blur"
            >
              <span className="text-lg">⛓</span>
              <div>
                <div className="text-sm font-semibold text-slate-50">Sepolia</div>
                <div className="text-[9px] uppercase tracking-widest text-slate-500">Network</div>
              </div>
            </div>
          </div>

          <div
            data-hero-stagger
            className="flex flex-wrap items-center gap-4 text-[11px] text-slate-400"
          >
            <span>Built for hackathons • Web3 • ZK</span>
            <span className="h-px w-10 bg-gradient-to-r from-cyan-500/60 to-transparent" />
            <span>Typesafe React, R3F, GSAP, Tailwind</span>
          </div>
        </div>
        <div data-hero-stagger className="md:w-1/2">
          <Hero3D />
        </div>
      </div>
    </section>
  );
};
