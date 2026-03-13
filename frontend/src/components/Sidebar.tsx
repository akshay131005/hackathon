import React, { useEffect, useRef, useState } from "react";
import { NavLink } from "react-router-dom";
import { animateSidebarWidth } from "../animations/gsapAnimations";

type IssuerSection = "issue" | "credentials" | "logs" | "security";

type SidebarProps = {
  active: "dashboard" | "issuer";
  onIssuerSectionChange?: (section: IssuerSection) => void;
};

export const Sidebar: React.FC<SidebarProps> = ({ active, onIssuerSectionChange }) => {
  const [expanded, setExpanded] = useState(true);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.style.width = expanded ? "220px" : "72px";
    }
  }, []);

  useEffect(() => {
    animateSidebarWidth(ref.current, expanded);
  }, [expanded]);

  return (
    <aside
      ref={ref}
      className="relative flex h-full flex-col gap-4 overflow-hidden rounded-3xl border border-slate-800/80 bg-slate-950/80 px-3 py-4 shadow-[0_0_40px_rgba(15,23,42,0.9)] backdrop-blur-xl"
    >
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="mb-2 flex h-8 w-8 items-center justify-center self-end rounded-2xl border border-slate-700/80 bg-slate-900/80 text-xs text-slate-300 transition hover:border-cyan-400 hover:text-cyan-300"
        aria-label={expanded ? "Collapse sidebar" : "Expand sidebar"}
      >
        {expanded ? "«" : "»"}
      </button>
      <nav className="flex flex-1 flex-col gap-2 text-xs text-slate-300">
        {active === "dashboard" ? (
          <>
            <NavLink
              to="/dashboard"
              className={({ isActive }) =>
                `flex items-center gap-2 rounded-2xl px-2 py-2 transition ${
                  isActive
                    ? "bg-slate-900 text-cyan-300 border border-cyan-500/40"
                    : "hover:bg-slate-900/70"
                }`
              }
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-slate-900/80 text-[13px]">
                🛡
              </span>
              {expanded && <span>Overview</span>}
            </NavLink>
            <NavLink
              to="/issuer"
              className={() =>
                "flex items-center gap-2 rounded-2xl px-2 py-2 transition hover:bg-slate-900/70"
              }
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-slate-900/80 text-[13px]">
                🧾
              </span>
              {expanded && <span>Issuer</span>}
            </NavLink>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => {
                if (onIssuerSectionChange) {
                  onIssuerSectionChange("issue");
                } else {
                  document
                    .getElementById("issuer-issue")
                    ?.scrollIntoView({ behavior: "smooth", block: "start" });
                }
              }}
              className="flex items-center gap-2 rounded-2xl bg-slate-900 text-cyan-300 border border-cyan-500/40 px-2 py-2 text-left"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-slate-900/80 text-[13px]">
                ⚡
              </span>
              {expanded && <span>Issue Credential</span>}
            </button>
            <button
              type="button"
              onClick={() => {
                if (onIssuerSectionChange) {
                  onIssuerSectionChange("credentials");
                } else {
                  document
                    .getElementById("issuer-credentials")
                    ?.scrollIntoView({ behavior: "smooth", block: "start" });
                }
              }}
              className="flex items-center gap-2 rounded-2xl px-2 py-2 text-left transition hover:bg-slate-900/70"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-slate-900/80 text-[13px]">
                📂
              </span>
              {expanded && <span>Credential Management</span>}
            </button>
            <button
              type="button"
              onClick={() => {
                if (onIssuerSectionChange) {
                  onIssuerSectionChange("logs");
                } else {
                  document
                    .getElementById("issuer-logs")
                    ?.scrollIntoView({ behavior: "smooth", block: "start" });
                }
              }}
              className="flex items-center gap-2 rounded-2xl px-2 py-2 text-left transition hover:bg-slate-900/70"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-slate-900/80 text-[13px]">
                📊
              </span>
              {expanded && <span>Verification Logs</span>}
            </button>
            <button
              type="button"
              onClick={() => {
                if (onIssuerSectionChange) {
                  onIssuerSectionChange("security");
                } else {
                  document
                    .getElementById("issuer-security")
                    ?.scrollIntoView({ behavior: "smooth", block: "start" });
                }
              }}
              className="flex items-center gap-2 rounded-2xl px-2 py-2 text-left transition hover:bg-slate-900/70"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-slate-900/80 text-[13px]">
                🔐
              </span>
              {expanded && <span>Security Settings</span>}
            </button>
          </>
        )}
      </nav>
      {expanded && (
        <div className="mt-auto rounded-2xl bg-slate-900/80 px-3 py-2 text-[11px] text-slate-400">
          <div className="mb-1 flex items-center gap-1 text-[10px] uppercase tracking-[0.18em] text-slate-500">
            <span className="h-1 w-1 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.9)]" />
            Status
          </div>
          <p>Prototype environment · Sepolia</p>
        </div>
      )}
    </aside>
  );
};

