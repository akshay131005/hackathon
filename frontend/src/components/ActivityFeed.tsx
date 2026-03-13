import React from "react";

export type ActivityItem = {
  id: string;
  label: string;
  timestamp: string;
  type: "issued" | "verified" | "revoked";
};

type ActivityFeedProps = {
  items: ActivityItem[];
};

export const ActivityFeed: React.FC<ActivityFeedProps> = React.memo(
  ({ items }) => {
    if (!items.length) {
      return (
        <div className="card p-4 text-xs text-slate-400">
          No recent activity yet. Issue a credential or run a verification to
          populate this feed.
        </div>
      );
    }

    return (
      <div className="card max-h-64 space-y-3 overflow-hidden p-4">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>Recent activity</span>
        </div>
        <div className="mt-1 space-y-2 overflow-y-auto pr-1 text-xs text-slate-200">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-start justify-between gap-3 rounded-xl bg-slate-900/80 px-3 py-2"
            >
              <div className="flex items-center gap-2">
                <span className="mt-0.5 text-[11px]">
                  {item.type === "issued"
                    ? "🧾"
                    : item.type === "verified"
                    ? "✅"
                    : "⚠️"}
                </span>
                <span className="text-[11px] leading-snug">{item.label}</span>
              </div>
              <span className="shrink-0 text-[10px] text-slate-500">
                {item.timestamp}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }
);

