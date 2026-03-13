import React, { useEffect, useRef, useState } from "react";
import gsap from "gsap";

const stages = [
  { key: "request", label: "Request", icon: "📡", desc: "Holder initiates" },
  { key: "encrypt", label: "ZK Proof", icon: "🔐", desc: "Generate proof" },
  { key: "chain", label: "On-Chain", icon: "⛓", desc: "Verify on-chain" },
  { key: "result", label: "Result", icon: "✅", desc: "Privacy preserved" }
];

interface Props {
  active: boolean;
}

export const VerificationPipeline: React.FC<Props> = ({ active }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const nodeRefs = useRef<HTMLDivElement[]>([]);
  const lineRefs = useRef<HTMLDivElement[]>([]);
  const pulseRef = useRef<HTMLDivElement | null>(null);
  const [activeStep, setActiveStep] = useState(-1);
  const tlRef = useRef<gsap.core.Timeline | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const idle = gsap.timeline({ repeat: -1, defaults: { ease: "power2.inOut" } });

    nodeRefs.current.forEach((el, i) => {
      idle.fromTo(
        el,
        { boxShadow: "0 0 0px rgba(34,211,238,0)" },
        {
          boxShadow:
            i % 2 === 0
              ? "0 0 18px rgba(34,211,238,0.3)"
              : "0 0 18px rgba(168,85,247,0.3)",
          duration: 1.6,
          yoyo: true,
          repeat: -1
        },
        i * 0.4
      );
    });

    return () => { idle.kill(); };
  }, []);

  useEffect(() => {
    if (!active) {
      setActiveStep(-1);
      return;
    }
    if (tlRef.current) tlRef.current.kill();

    const tl = gsap.timeline({
      onComplete: () => setActiveStep(stages.length - 1)
    });
    tlRef.current = tl;

    stages.forEach((_, i) => {
      tl.call(() => setActiveStep(i), [], i === 0 ? 0 : undefined);

      tl.fromTo(
        nodeRefs.current[i],
        { scale: 0.92, opacity: 0.5 },
        { scale: 1.08, opacity: 1, duration: 0.35, ease: "back.out(1.7)" }
      ).to(nodeRefs.current[i], {
        scale: 1,
        duration: 0.2
      });

      if (i < stages.length - 1 && lineRefs.current[i]) {
        tl.fromTo(
          lineRefs.current[i],
          { scaleX: 0, opacity: 0 },
          { scaleX: 1, opacity: 1, duration: 0.4, ease: "power3.out" },
          "-=0.15"
        );
      }

      if (pulseRef.current && i < stages.length - 1) {
        const startX = nodeRefs.current[i]?.offsetLeft ?? 0;
        const endX = nodeRefs.current[i + 1]?.offsetLeft ?? 0;
        tl.fromTo(
          pulseRef.current,
          { x: startX, opacity: 1 },
          { x: endX, opacity: 0.5, duration: 0.5, ease: "power2.inOut" },
          "-=0.3"
        ).set(pulseRef.current, { opacity: 0 });
      }
    });

    return () => { tl.kill(); };
  }, [active]);

  return (
    <div ref={containerRef} className="relative py-4">
      <div className="flex items-center justify-between gap-1">
        {stages.map((s, i) => (
          <React.Fragment key={s.key}>
            <div
              ref={(el) => { if (el) nodeRefs.current[i] = el; }}
              className={`relative z-10 flex flex-col items-center gap-1.5 rounded-2xl border px-3 py-3 transition-all duration-300 ${
                activeStep >= i
                  ? "border-cyan-500/60 bg-cyan-950/40 shadow-[0_0_20px_rgba(34,211,238,0.2)]"
                  : "border-slate-700/60 bg-slate-900/80"
              }`}
              style={{ minWidth: 72 }}
            >
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-xl text-lg transition-all duration-300 ${
                  activeStep >= i
                    ? "bg-gradient-to-br from-cyan-500/30 to-violet-500/30 shadow-inner"
                    : "bg-slate-800/80"
                }`}
              >
                {s.icon}
              </div>
              <span
                className={`text-[11px] font-semibold transition-colors ${
                  activeStep >= i ? "text-cyan-300" : "text-slate-400"
                }`}
              >
                {s.label}
              </span>
              <span className="text-[9px] text-slate-500">{s.desc}</span>

              {activeStep === i && active && (
                <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.8)]">
                  <span className="absolute inset-0 animate-ping rounded-full bg-cyan-400 opacity-75" />
                </span>
              )}
            </div>

            {i < stages.length - 1 && (
              <div className="relative flex-1">
                <div className="h-px w-full bg-slate-800" />
                <div
                  ref={(el) => { if (el) lineRefs.current[i] = el; }}
                  className="absolute inset-0 h-px origin-left bg-gradient-to-r from-cyan-400 to-violet-400"
                  style={{
                    transform: activeStep > i ? "scaleX(1)" : "scaleX(0)",
                    opacity: activeStep > i ? 1 : 0,
                    transition: "transform 0.4s ease, opacity 0.3s ease"
                  }}
                />
              </div>
            )}
          </React.Fragment>
        ))}
      </div>

      <div
        ref={pulseRef}
        className="pointer-events-none absolute top-1/2 left-0 z-20 h-2 w-2 -translate-y-1/2 rounded-full bg-cyan-300 opacity-0 shadow-[0_0_16px_rgba(34,211,238,0.9)]"
      />
    </div>
  );
};
