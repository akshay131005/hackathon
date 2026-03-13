import React, { useEffect, useState } from "react";
import gsap from "gsap";

export const LoadingScreen: React.FC = () => {
  const [done, setDone] = useState(false);

  useEffect(() => {
    const tl = gsap.timeline({
      onComplete: () => {
        gsap.to("#app-loader", {
          opacity: 0,
          duration: 0.5,
          ease: "power2.inOut",
          onComplete: () => setDone(true)
        });
      }
    });

    tl.fromTo(
      "#app-loader-bar-fill",
      { scaleX: 0, transformOrigin: "0% 50%" },
      { scaleX: 1, duration: 1.4, ease: "power3.inOut" }
    ).to("#app-loader-glow", {
      opacity: 1,
      yoyo: true,
      repeat: 3,
      duration: 0.6,
      ease: "sine.inOut"
    });
  }, []);

  if (done) return null;

  return (
    <div
      id="app-loader"
      className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950"
    >
      <div className="flex w-full max-w-xs flex-col items-center gap-4 px-6">
        <div className="text-lg font-semibold tracking-tight">
          <span className="text-neon-cyan">Privacy</span>
          <span className="text-neon-magenta">Pass</span>
        </div>
        <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
          <div
            id="app-loader-bar-fill"
            className="h-full w-full bg-gradient-to-r from-cyan-400 via-indigo-400 to-fuchsia-400"
          />
          <div
            id="app-loader-glow"
            className="pointer-events-none absolute inset-0 rounded-full bg-cyan-400/40 blur-md opacity-0"
          />
        </div>
        <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">
          Preparing zero-knowledge surface
        </p>
      </div>
    </div>
  );
};

