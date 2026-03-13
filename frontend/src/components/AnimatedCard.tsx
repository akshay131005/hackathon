import React from "react";
import clsx from "clsx";

type AnimatedCardProps = {
  children: React.ReactNode;
  className?: string;
};

export const AnimatedCard: React.FC<AnimatedCardProps> = ({
  children,
  className
}) => {
  return (
    <div
      className={clsx(
        "group relative overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-900/70 px-5 py-6 shadow-[0_0_40px_rgba(15,23,42,0.9)] transition-transform duration-300 hover:-translate-y-1 hover:shadow-[0_0_80px_rgba(56,189,248,0.45)]",
        className
      )}
    >
      <div className="pointer-events-none absolute inset-px rounded-2xl bg-gradient-to-br from-cyan-500/10 via-transparent to-fuchsia-500/10 opacity-0 blur-xl transition-opacity duration-300 group-hover:opacity-100" />
      <div className="relative z-10">{children}</div>
    </div>
  );
};

