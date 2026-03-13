import React, { useEffect, useRef } from "react";
import gsap from "gsap";
import { IdentityShieldScene } from "../components/IdentityShieldScene";

const STEPS = [
  {
    num: "01",
    title: "Issuer mints a credential",
    desc: 'An issuer uses the portal to bind a wallet to a claim (e.g. "over 18", "student"). Only a hashed commitment and on-chain event are stored; raw documents stay off-chain.',
    icon: "🧾",
    accent: "border-cyan-500/40 from-cyan-500/10"
  },
  {
    num: "02",
    title: "User presents a QR or proof",
    desc: "The holder shows a QR token. The verifier backend looks up the commitment, reconstructs a proof, and never sees the raw document.",
    icon: "📱",
    accent: "border-violet-500/40 from-violet-500/10"
  },
  {
    num: "03",
    title: "Verifier checks against chain",
    desc: 'A zero-knowledge style check validates the claim and ensures the credential is unrevoked and unexpired. The verifier only learns "yes" or "no".',
    icon: "⛓",
    accent: "border-fuchsia-500/40 from-fuchsia-500/10"
  }
];

export const HowItWorksSection: React.FC = () => {
  const sectionRef = useRef<HTMLDivElement | null>(null);
  const lineRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!sectionRef.current) return;

    const steps = sectionRef.current.querySelectorAll("[data-step]");
    gsap.fromTo(
      steps,
      { x: -40, opacity: 0 },
      { x: 0, opacity: 1, duration: 0.6, stagger: 0.2, ease: "power3.out", delay: 0.2 }
    );

    if (lineRef.current) {
      gsap.fromTo(
        lineRef.current,
        { scaleY: 0 },
        { scaleY: 1, duration: 1.2, ease: "power2.out", delay: 0.3 }
      );
    }

    const nums = sectionRef.current.querySelectorAll("[data-step-num]");
    gsap.fromTo(
      nums,
      { scale: 0, rotation: -90 },
      { scale: 1, rotation: 0, duration: 0.5, stagger: 0.2, ease: "back.out(2)", delay: 0.4 }
    );
  }, []);

  return (
    <section
      id="how-it-works"
      ref={sectionRef}
      className="relative border-y border-slate-800/60 bg-slate-950/60 py-16 sm:py-20 lg:py-24"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.12),_transparent_60%)] opacity-70" />

      <div className="relative mx-auto flex max-w-6xl flex-col gap-10">
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-fuchsia-400">
            How it works
          </p>
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            A three-part flow: issue, prove, verify.
          </h2>
          <p className="max-w-xl text-sm text-slate-300 sm:text-base">
            Privacy-preserving credential verification in three simple steps.
          </p>
        </div>

        <div className="grid gap-10 md:grid-cols-[1.3fr_minmax(0,1fr)]">
          {/* steps with timeline */}
          <div className="relative space-y-6 pl-8">
            {/* vertical connector line */}
            <div
              ref={lineRef}
              className="absolute left-[15px] top-4 h-[calc(100%-32px)] w-px origin-top bg-gradient-to-b from-cyan-500/60 via-violet-500/60 to-fuchsia-500/60"
            />

            {STEPS.map((step) => (
              <div key={step.num} data-step className="relative">
                {/* step number dot */}
                <div
                  data-step-num
                  className={`absolute -left-8 top-4 flex h-8 w-8 items-center justify-center rounded-full border bg-slate-950 text-xs font-bold ${step.accent}`}
                >
                  {step.num}
                </div>

                <div
                  className={`rounded-2xl border bg-gradient-to-br to-transparent p-5 backdrop-blur transition hover:shadow-lg ${step.accent} bg-slate-900/80`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-800/80 text-lg">
                      {step.icon}
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-slate-50 sm:text-base">
                        {step.title}
                      </h3>
                      <p className="mt-2 text-xs leading-relaxed text-slate-300 sm:text-sm">
                        {step.desc}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* 3D scene + description */}
          <div className="space-y-4">
            <IdentityShieldScene />
            <div className="card space-y-3 p-4">
              <h3 className="text-sm font-semibold text-slate-100">
                Layered cryptographic protection
              </h3>
              <p className="text-xs leading-relaxed text-slate-300 sm:text-sm">
                The 3D shield visualizes our threat model: user identity is
                wrapped in multiple cryptographic layers. Only the outer proof
                ever leaves the user&apos;s device and wallet.
              </p>
              <div className="flex flex-wrap gap-2 pt-1 text-[10px]">
                <span className="badge !border-cyan-600/40 !text-cyan-300">Encryption</span>
                <span className="badge !border-violet-600/40 !text-violet-300">ZK Proofs</span>
                <span className="badge !border-fuchsia-600/40 !text-fuchsia-300">On-chain</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
