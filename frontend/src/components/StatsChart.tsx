import React from "react";

type StatsChartProps = {
  values: number[];
};

export const StatsChart: React.FC<StatsChartProps> = ({ values }) => {
  if (!values.length) {
    return (
      <div className="card p-4 text-xs text-slate-400">
        Not enough data yet to draw a chart.
      </div>
    );
  }

  const max = Math.max(...values, 1);
  const points = values.map((v, i) => {
    const x = (i / Math.max(values.length - 1, 1)) * 100;
    const y = 100 - (v / max) * 80 - 10;
    return `${x},${y}`;
  });

  return (
    <div className="card p-4">
      <div className="mb-2 flex items-center justify-between text-xs text-slate-300">
        <span>7-day activity</span>
      </div>
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="h-28 w-full"
      >
        <defs>
          <linearGradient id="line-gradient" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor="#22d3ee" />
            <stop offset="50%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#a855f7" />
          </linearGradient>
          <linearGradient id="fill-gradient" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="rgba(34,211,238,0.3)" />
            <stop offset="100%" stopColor="rgba(15,23,42,0)" />
          </linearGradient>
        </defs>
        <path
          d={`M0,100 L${points.join(" L ")} L100,100 Z`}
          fill="url(#fill-gradient)"
          stroke="none"
        />
        <polyline
          fill="none"
          stroke="url(#line-gradient)"
          strokeWidth="1.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={points.join(" ")}
        />
      </svg>
    </div>
  );
};

