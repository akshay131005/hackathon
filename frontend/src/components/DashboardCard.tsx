import React, { useEffect, useRef, useState } from "react";
import clsx from "clsx";

type DashboardCardProps = {
  label: string;
  value: number;
  suffix?: string;
  icon?: React.ReactNode;
  accent?: "cyan" | "violet" | "pink";
};

export const DashboardCard: React.FC<DashboardCardProps> = React.memo(
  ({ label, value, suffix, icon, accent = "cyan" }) => {
    const [displayValue, setDisplayValue] = useState(0);
    const ref = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
      let frame: number;
      const duration = 600;
      const start = performance.now();
      const startVal = displayValue;
      const diff = value - startVal;

      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - t, 3);
        setDisplayValue(Math.round(startVal + diff * eased));
        if (t < 1) frame = requestAnimationFrame(tick);
      };

      frame = requestAnimationFrame(tick);
      return () => cancelAnimationFrame(frame);
    }, [value]);

    return (
      <div
        ref={ref}
        className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/80 p-4 text-xs text-slate-300 shadow-[0_0_40px_rgba(15,23,42,0.9)]"
      >
        <div
          className={clsx(
            "pointer-events-none absolute inset-px rounded-2xl bg-gradient-to-br opacity-50 blur-xl",
            accent === "cyan" &&
              "from-cyan-500/20 via-transparent to-indigo-500/20",
            accent === "violet" &&
              "from-indigo-500/20 via-transparent to-fuchsia-500/20",
            accent === "pink" &&
              "from-pink-500/20 via-transparent to-fuchsia-500/20"
          )}
        />
        <div className="relative z-10 flex items-start justify-between gap-3">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
              {label}
            </div>
            <div className="mt-1 text-xl font-semibold text-slate-50">
              {displayValue.toLocaleString()}
              {suffix && <span className="ml-1 text-sm">{suffix}</span>}
            </div>
          </div>
          {icon && (
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-900/80 text-lg">
              {icon}
            </div>
          )}
        </div>
      </div>
    );
  }
);

