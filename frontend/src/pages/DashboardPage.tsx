import React, { useEffect, useMemo, useRef, useState } from "react";
import api from "../api/client";
import { useWallet } from "../wallet/WalletContext";
import { IdentityShieldScene } from "../components/IdentityShieldScene";
import { VerificationPipeline } from "../components/VerificationPipeline";
import { Sidebar } from "../components/Sidebar";
import { TopNavbar } from "../components/TopNavbar";
import { DashboardCard } from "../components/DashboardCard";
import { ActivityFeed, ActivityItem } from "../components/ActivityFeed";
import { StatsChart } from "../components/StatsChart";
import { ProofVisualization } from "../components/ProofVisualization";
import { IdentityGraph } from "../three/IdentityGraph";
import { VerificationLog } from "../components/VerificationLog";
import QRCode from "qrcode.react";
import gsap from "gsap";

const CREDENTIAL_ICONS: Record<string, string> = {
  "age verification": "🛡",
  "membership pass": "⭐",
  "employee id": "🪪",
  "student credential": "🎓",
  "kyc verified": "✅",
  "over 18": "🛡",
  "PrivacyPass Identity": "🪪",
  student: "🎓",
  member: "⭐"
};

interface Credential {
  credentialId: string;
  credentialType: string;
  issuerId: string;
  issueDate: string;
  expirationDate: string;
  status: string;
  qrCodeToken: string;
  qrPath?: string;
  verifyUrl?: string;
  transactionHash?: string;
  walletAddress?: string;
  zkCommitment?: string;
  zkCircuitType?: string;
  linkedIdentityId?: string;
}

interface TimelineEvent {
  _id?: string;
  eventType: "ISSUED" | "VERIFIED" | "REVOKED";
  credentialId: string;
  walletAddress: string;
  issuerId: string;
  timestamp: string;
  details: string;
}

type StatusFilter = "all" | "active" | "revoked" | "expired";

async function copyToClipboardSafe(value: string): Promise<boolean> {
  if (!value) return false;
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(value);
      return true;
    }
  } catch {
    // fall through to legacy path
  }
  try {
    const textarea = document.createElement("textarea");
    textarea.value = value;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
}

export const DashboardPage: React.FC = () => {
  const { address, connect } = useWallet();
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [loading, setLoading] = useState(false);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [qrFor, setQrFor] = useState<Credential | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [verifyCount, setVerifyCount] = useState(0);
  const [revokeTarget, setRevokeTarget] = useState<Credential | null>(null);
  const [revoking, setRevoking] = useState(false);

  const mainRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!mainRef.current) return;
    gsap.fromTo(
      mainRef.current.querySelectorAll("[data-animate]"),
      { y: 18, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.5, stagger: 0.06, ease: "power3.out" }
    );
  }, [address]);

  useEffect(() => {
    if (!address) return;
    setLoading(true);
    api
      .get<Credential[]>("/credentials", {
        params: { walletAddress: address }
      })
      .then((res) => setCredentials(res.data))
      .finally(() => setLoading(false));

    api
      .get<TimelineEvent[]>("/activityTimeline", {
        params: { walletAddress: address }
      })
      .then((res) => {
        if (Array.isArray(res.data)) {
          setTimeline(res.data);
          setVerifyCount(
            res.data.filter((e) => e.eventType === "VERIFIED").length
          );
        }
      })
      .catch(() => {});
  }, [address]);

  const verify = async (credentialId: string) => {
    setVerifyingId(credentialId);
    setResult(null);
    try {
      const res = await api.post("/verifyCredential", {
        credentialID: credentialId
      });
      if (res.data.valid) {
        setResult("Verification successful. No personal data exposed.");
        // Close the QR modal so the user clearly sees the result
        setQrFor(null);
      } else {
        setResult(res.data.reason || "Verification failed.");
      }
      setVerifyCount((v) => v + 1);
    } catch {
      setResult("Verification error.");
    } finally {
      setVerifyingId(null);
    }
  };

  const revoke = async (cred: Credential) => {
    if (!address) {
      setResult("Wallet address required to revoke.");
      return;
    }
    try {
      setRevoking(true);
      await api.post("/revokeCredentialByHolder", {
        credentialID: cred.credentialId,
        walletAddress: address
      });
      setRevokeTarget(null);
      setResult(`Credential ${cred.credentialId} revoked.`);
      const res = await api.get<Credential[]>("/credentials", {
        params: { walletAddress: address }
      });
      setCredentials(res.data);
    } catch (err: any) {
      const msg = err?.response?.data?.error || "Revocation failed.";
      setResult(msg);
    } finally {
      setRevoking(false);
    }
  };

  const copyWallet = async (addr: string, id: string) => {
    const ok = await copyToClipboardSafe(addr);
    if (!ok) {
      return;
    }
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1200);
  };

  const explorerBase =
    (import.meta as any).env?.VITE_EXPLORER_URL ||
    "https://sepolia.etherscan.io/tx/";
  const backendBase =
    (import.meta as any).env?.VITE_API_BASE_URL || "http://localhost:4000";

  const activityItems: ActivityItem[] = useMemo(() => {
    if (timeline.length > 0) {
      return timeline.slice(0, 8).map((e) => ({
        id: e._id || e.credentialId + e.timestamp,
        label: e.details,
        timestamp: new Date(e.timestamp).toLocaleDateString(),
        type:
          e.eventType === "REVOKED"
            ? "revoked"
            : e.eventType === "VERIFIED"
            ? "verified"
            : "issued"
      }));
    }
    return credentials.slice(0, 6).map((c) => ({
      id: c.credentialId,
      label: `${c.credentialType} • ${c.status}`,
      timestamp: new Date(c.issueDate).toLocaleDateString(),
      type:
        c.status.toLowerCase() === "revoked"
          ? "revoked"
          : c.status.toLowerCase().includes("verified")
          ? "verified"
          : "issued"
    }));
  }, [timeline, credentials]);

  const statsValues = useMemo(() => {
    if (timeline.length === 0) return credentials.map((_, i) => i + 1).slice(-7);
    const dayCounts: Record<string, number> = {};
    timeline.forEach((e) => {
      const day = new Date(e.timestamp).toISOString().slice(0, 10);
      dayCounts[day] = (dayCounts[day] || 0) + 1;
    });
    const sorted = Object.keys(dayCounts).sort();
    return sorted.slice(-7).map((d) => dayCounts[d]);
  }, [timeline, credentials]);

  const isExpired = (c: Credential) =>
    c.expirationDate && new Date(c.expirationDate) < new Date();

  const effectiveStatus = (c: Credential): string => {
    if (c.status.toLowerCase().includes("revoked")) return "revoked";
    if (isExpired(c)) return "expired";
    return "active";
  };

  const filteredCredentials = useMemo(() => {
    return credentials.filter((c) => {
      const matchesSearch =
        !search ||
        c.walletAddress?.toLowerCase().includes(search.toLowerCase()) ||
        c.credentialId.toLowerCase().includes(search.toLowerCase()) ||
        c.credentialType.toLowerCase().includes(search.toLowerCase());
      const eff = effectiveStatus(c);
      const matchesStatus =
        statusFilter === "all" ? true : eff === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [credentials, search, statusFilter]);

  const credIcon = (type: string) =>
    CREDENTIAL_ICONS[type.toLowerCase()] ?? "🛡";

  const statusBadge = (c: Credential) => {
    const eff = effectiveStatus(c);
    if (eff === "revoked")
      return {
        dot: "bg-red-400 shadow-[0_0_10px_rgba(239,68,68,0.8)]",
        label: "Revoked"
      };
    if (eff === "expired")
      return {
        dot: "bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.8)]",
        label: "Expired"
      };
    return {
      dot: "bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.9)]",
      label: "Active"
    };
  };

  const overviewStats = useMemo(() => {
    const total = credentials.length;
    const active = credentials.filter((c) => effectiveStatus(c) === "active").length;
    const revoked = credentials.filter((c) => effectiveStatus(c) === "revoked").length;
    const expired = credentials.filter((c) => effectiveStatus(c) === "expired").length;
    const onchain = credentials.filter((c) => !!c.transactionHash).length;
    const zkEnabled = credentials.filter((c) => !!c.zkCommitment).length;
    const issuers = new Set(credentials.map((c) => c.issuerId)).size;
    return { total, active, revoked, expired, onchain, zkEnabled, issuers };
  }, [credentials]);

  if (!address) {
    return (
      <div className="flex gap-4">
        <Sidebar active="dashboard" />
        <div className="flex-1">
          <TopNavbar />
          <div className="card space-y-5 p-6">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-400">
                Wallet required
              </p>
              <p className="text-sm text-slate-200">
                Connect your wallet to load your PrivacyPass credentials and run
                end-to-end verifications.
              </p>
            </div>
            <button onClick={connect} className="btn-primary">
              Connect Wallet
            </button>
          </div>
        </div>
      </div>
    );
  }

  const filterChips: { key: StatusFilter; label: string; active: string }[] = [
    { key: "all", label: "All", active: "border-cyan-400 text-cyan-300" },
    { key: "active", label: "Active", active: "border-emerald-400 text-emerald-300" },
    { key: "revoked", label: "Revoked", active: "border-red-400 text-red-300" },
    { key: "expired", label: "Expired", active: "border-amber-400 text-amber-300" }
  ];

  return (
    <div className="flex gap-4">
      <Sidebar active="dashboard" />
      <div className="flex-1 space-y-6" ref={mainRef}>
        <TopNavbar searchValue={search} onSearchChange={setSearch} />

        {/* metrics */}
        <div
          data-animate
          className="grid gap-4 text-xs text-slate-300 sm:grid-cols-2 lg:grid-cols-4 sm:text-sm"
        >
          <DashboardCard
            label="Total credentials"
            value={overviewStats.total}
            icon="📂"
            accent="cyan"
          />
          <DashboardCard
            label="Active credentials"
            value={overviewStats.active}
            icon="🛡"
            accent="cyan"
          />
          <DashboardCard
            label="Revoked / expired"
            value={overviewStats.revoked + overviewStats.expired}
            icon="⚠️"
            accent="pink"
          />
          <DashboardCard
            label="On-chain anchors"
            value={overviewStats.onchain}
            icon="⛓"
            accent="violet"
          />
        </div>

        {/* main grid */}
        <div className="grid gap-6 md:grid-cols-[minmax(0,2fr)_minmax(0,1.2fr)]">
          {/* credentials table */}
          <div data-animate className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Manage Credentials</h2>
                <p className="mt-0.5 text-[11px] text-slate-500">
                  {credentials.length} credential{credentials.length !== 1 ? "s" : ""} linked to your wallet
                </p>
              </div>
              <div className="flex items-center gap-2">
                {loading && (
                  <span className="badge text-[10px] text-slate-300">
                    Loading…
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => {
                    if (!address) return;
                    setLoading(true);
                    api
                      .get<Credential[]>("/credentials", { params: { walletAddress: address } })
                      .then((res) => setCredentials(res.data))
                      .finally(() => setLoading(false));
                  }}
                  className="rounded-full border border-slate-700 bg-slate-900/80 px-3 py-1 text-[11px] text-slate-300 transition hover:border-cyan-400 hover:text-cyan-300"
                >
                  🔄 Refresh
                </button>
              </div>
            </div>

            <div className="card space-y-4 p-4">
              {/* search + filter bar */}
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="relative flex-1">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[13px] text-slate-500">
                    🔍
                  </span>
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by wallet, credential ID, or type"
                    className="input pl-9 text-xs sm:text-sm"
                  />
                </div>
                <div className="flex flex-wrap gap-1.5 text-[11px]">
                  {filterChips.map((f) => {
                    const count =
                      f.key === "all"
                        ? credentials.length
                        : credentials.filter((c) => effectiveStatus(c) === f.key).length;
                    return (
                      <button
                        key={f.key}
                        type="button"
                        className={`badge gap-1.5 transition ${
                          statusFilter === f.key
                            ? f.active + " shadow-sm"
                            : "hover:border-slate-500"
                        }`}
                        onClick={() => setStatusFilter(f.key)}
                      >
                        {f.label}
                        <span className="rounded-full bg-slate-800 px-1.5 text-[9px] tabular-nums">
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* credential cards */}
              <div className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
                {filteredCredentials.map((c) => {
                  const badge = statusBadge(c);
                  const eff = effectiveStatus(c);
                  const daysLeft = Math.ceil(
                    (new Date(c.expirationDate).getTime() - Date.now()) / 86400000
                  );
                  return (
                    <div
                      key={c.credentialId}
                      className={`group relative overflow-hidden rounded-xl border bg-slate-950/60 p-3 transition hover:bg-slate-900/50 ${
                        eff === "revoked"
                          ? "border-red-900/60"
                          : eff === "expired"
                          ? "border-amber-900/50"
                          : "border-slate-800/80 hover:border-cyan-800/60"
                      }`}
                    >
                      {/* subtle gradient accent */}
                      <div
                        className={`pointer-events-none absolute inset-0 opacity-0 transition group-hover:opacity-100 ${
                          eff === "active"
                            ? "bg-gradient-to-r from-cyan-500/5 to-transparent"
                            : eff === "revoked"
                            ? "bg-gradient-to-r from-red-500/5 to-transparent"
                            : "bg-gradient-to-r from-amber-500/5 to-transparent"
                        }`}
                      />

                      <div className="relative flex items-start gap-3">
                        {/* icon */}
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-800 bg-slate-900/90 text-lg">
                          {credIcon(c.credentialType)}
                        </div>

                        {/* main info */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="truncate text-sm font-medium text-slate-100">
                              {c.credentialType}
                            </span>
                            <span className="badge !py-0">
                              <span
                                className={`mr-1 h-1.5 w-1.5 rounded-full ${badge.dot}`}
                                aria-hidden
                              />
                              {badge.label}
                            </span>
                            {c.transactionHash && (
                              <span className="badge !border-violet-700/60 !bg-violet-900/30 !py-0 !text-violet-300">
                                ⛓ On-chain
                              </span>
                            )}
                            {c.zkCommitment && (
                              <span className="badge !border-emerald-700/60 !bg-emerald-900/30 !py-0 !text-emerald-300">
                                🔐 ZK
                              </span>
                            )}
                            {c.linkedIdentityId && (
                              <span className="badge !border-cyan-700/60 !bg-cyan-900/30 !py-0 !text-cyan-300" title="Verification returns your registered identity (display name, email verified)">
                                🪪 Identity
                              </span>
                            )}
                          </div>

                          <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-400">
                            <span className="flex items-center gap-1">
                              <span className="text-slate-500">Wallet:</span>
                              <span className="font-mono text-slate-300">
                                {c.walletAddress
                                  ? `${c.walletAddress.slice(0, 6)}…${c.walletAddress.slice(-4)}`
                                  : "—"}
                              </span>
                              {c.walletAddress && (
                                <button
                                  type="button"
                                  onClick={() => copyWallet(c.walletAddress || "", c.credentialId)}
                                  className="text-slate-500 transition hover:text-cyan-300"
                                  title="Copy wallet address"
                                >
                                  {copiedId === c.credentialId ? "✓" : "📋"}
                                </button>
                              )}
                            </span>
                            <span>
                              <span className="text-slate-500">Issuer:</span>{" "}
                              <span className="text-slate-300">{c.issuerId}</span>
                            </span>
                            <span>
                              <span className="text-slate-500">Issued:</span>{" "}
                              {new Date(c.issueDate).toLocaleDateString("en-GB", {
                                day: "numeric",
                                month: "short",
                                year: "numeric"
                              })}
                            </span>
                            {eff === "active" && daysLeft > 0 && (
                              <span
                                className={
                                  daysLeft <= 7
                                    ? "font-semibold text-amber-400"
                                    : daysLeft <= 30
                                    ? "text-amber-300"
                                    : "text-slate-400"
                                }
                              >
                                {daysLeft <= 7 ? "⚠ " : ""}
                                {daysLeft}d remaining
                              </span>
                            )}
                            {c.transactionHash && (
                              <a
                                href={explorerBase + c.transactionHash}
                                target="_blank"
                                rel="noreferrer"
                                className="text-cyan-400 transition hover:text-cyan-300 hover:underline"
                              >
                                Tx: {c.transactionHash.slice(0, 8)}…
                              </a>
                            )}
                          </div>
                        </div>

                        {/* actions */}
                        <div className="flex shrink-0 items-center gap-2 text-[11px]">
                          <button
                            type="button"
                            onClick={() => setQrFor(c)}
                            className="rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-1.5 font-medium text-slate-200 transition hover:border-cyan-500 hover:text-cyan-300 hover:shadow-[0_0_12px_rgba(34,211,238,0.15)]"
                          >
                            View
                          </button>
                          {eff === "active" && (
                            <button
                              type="button"
                              onClick={() => setRevokeTarget(c)}
                              className="rounded-lg border border-red-500/50 bg-red-950/40 px-3 py-1.5 font-medium text-red-300 transition hover:border-red-400 hover:bg-red-900/40"
                            >
                              Revoke
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* empty state */}
                {!loading && filteredCredentials.length === 0 && (
                  <div className="flex flex-col items-center gap-3 py-10">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-800 bg-slate-900/50 text-2xl">
                      {statusFilter === "all" ? "📂" : statusFilter === "active" ? "🛡" : statusFilter === "revoked" ? "🚫" : "⏳"}
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium text-slate-300">
                        {credentials.length === 0
                          ? "No credentials yet"
                          : "No credentials match your filters"}
                      </p>
                      <p className="mt-1 text-[11px] text-slate-500">
                        {credentials.length === 0
                          ? "Credentials issued to your wallet will appear here."
                          : "Try adjusting your search or filter criteria."}
                      </p>
                    </div>
                    {statusFilter !== "all" && (
                      <button
                        type="button"
                        onClick={() => {
                          setStatusFilter("all");
                          setSearch("");
                        }}
                        className="btn-outline px-3 py-1 text-[11px]"
                      >
                        Clear filters
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* summary footer */}
              {filteredCredentials.length > 0 && (
                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-800 pt-3 text-[11px] text-slate-500">
                  <span>
                    Showing {filteredCredentials.length} of {credentials.length} credential{credentials.length !== 1 ? "s" : ""}
                  </span>
                  <div className="flex gap-3">
                    <span>{overviewStats.onchain} on-chain</span>
                    <span>{overviewStats.zkEnabled} ZK-enabled</span>
                    <span>{overviewStats.issuers} issuer{overviewStats.issuers !== 1 ? "s" : ""}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* sidebar column */}
          <div className="space-y-4">
            {/* 3D Shield + stats combined */}
            <div data-animate className="card overflow-hidden p-0">
              <IdentityShieldScene />
              <div className="grid grid-cols-3 divide-x divide-slate-800 border-t border-slate-800">
                <div className="px-3 py-2.5 text-center">
                  <div className="text-lg font-semibold text-slate-50">{overviewStats.onchain}</div>
                  <div className="text-[9px] uppercase tracking-widest text-slate-500">On-chain</div>
                </div>
                <div className="px-3 py-2.5 text-center">
                  <div className="text-lg font-semibold text-slate-50">{overviewStats.zkEnabled}</div>
                  <div className="text-[9px] uppercase tracking-widest text-slate-500">ZK Proofs</div>
                </div>
                <div className="px-3 py-2.5 text-center">
                  <div className="text-lg font-semibold text-slate-50">{verifyCount}</div>
                  <div className="text-[9px] uppercase tracking-widest text-slate-500">Verified</div>
                </div>
              </div>
            </div>

            {/* verification pipeline */}
            <div data-animate className="space-y-2">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-100">
                  Verification Pipeline
                </h2>
                <span className={`badge text-[9px] ${verifyingId ? "!border-cyan-500 !text-cyan-300" : ""}`}>
                  {verifyingId ? "Active" : "Idle"}
                </span>
              </div>
              <div className="card p-4">
                <VerificationPipeline active={!!verifyingId} />
                {result && (
                  <div className={`mt-3 flex items-center gap-2 rounded-xl border px-3 py-2 text-xs ${
                    result.toLowerCase().includes("success")
                      ? "border-emerald-500/40 bg-emerald-900/20 text-emerald-200"
                      : "border-amber-500/40 bg-amber-900/20 text-amber-200"
                  }`}>
                    <span>{result.toLowerCase().includes("success") ? "✅" : "⚠️"}</span>
                    {result}
                  </div>
                )}
              </div>
            </div>

            {/* proof flow diagram */}
            <div data-animate className="space-y-2">
              <h2 className="text-sm font-semibold text-slate-100">
                ZK Proof Flow
              </h2>
              <div className="card p-3">
                <ProofVisualization />
              </div>
            </div>

            {/* 7-day activity chart */}
            <StatsChart values={statsValues} />

            {/* activity feed */}
            <ActivityFeed items={activityItems} />
          </div>
        </div>

        {/* verification log */}
        <div data-animate>
          <VerificationLog walletAddress={address || undefined} />
        </div>

        {/* identity graph */}
        <div data-animate className="space-y-3">
          <h2 className="text-lg font-semibold">Credential Network View</h2>
          <p className="text-xs text-slate-400 sm:text-sm">
            Explore how issuers, users, verifiers, and credentials relate in a
            holographic identity graph.
          </p>
          <IdentityGraph credentials={credentials} />
        </div>

        {/* revoke confirmation modal */}
        {revokeTarget && (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60">
            <div className="card w-full max-w-sm space-y-4 p-6">
              <h2 className="text-lg font-semibold text-red-300">
                Revoke credential?
              </h2>
              <p className="text-xs text-slate-300 sm:text-sm">
                You are about to permanently revoke{" "}
                <span className="font-semibold text-slate-100">
                  {revokeTarget.credentialType}
                </span>{" "}
                for wallet{" "}
                <span className="font-mono text-[11px] text-slate-100">
                  {revokeTarget.walletAddress
                    ? `${revokeTarget.walletAddress.slice(0, 6)}…${revokeTarget.walletAddress.slice(-4)}`
                    : "—"}
                </span>
                . This action is recorded on-chain and cannot be undone.
              </p>
              <div className="flex justify-end gap-3 pt-2 text-xs sm:text-sm">
                <button
                  type="button"
                  onClick={() => setRevokeTarget(null)}
                  className="btn-outline px-4 py-1"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={revoking}
                  onClick={() => revoke(revokeTarget)}
                  className="rounded-full border border-red-500 bg-red-900/50 px-4 py-1 text-sm font-semibold text-red-100 shadow-[0_0_20px_rgba(239,68,68,0.3)] transition hover:bg-red-900 disabled:opacity-60"
                >
                  {revoking ? "Revoking…" : "Revoke"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* QR & Key detail modal */}
        {qrFor && (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60">
            <div className="card w-full max-w-md space-y-3 p-6">
              <h3 className="mb-2 text-sm font-semibold">
                {credIcon(qrFor.credentialType)} {qrFor.credentialType}
                {qrFor.linkedIdentityId && (
                  <span className="ml-2 text-[10px] font-normal text-cyan-400">(identity data in QR & key)</span>
                )}
              </h3>
              <div className="space-y-1 text-[11px] text-slate-300 sm:text-xs">
                <p>
                  <span className="text-slate-500">Credential ID:</span>{" "}
                  {qrFor.credentialId}
                </p>
                <p>
                  <span className="text-slate-500">Issuer:</span>{" "}
                  {qrFor.issuerId}
                </p>
                <p>
                  <span className="text-slate-500">Status:</span>{" "}
                  {statusBadge(qrFor).label}
                </p>
                <p>
                  <span className="text-slate-500">Issued:</span>{" "}
                  {new Date(qrFor.issueDate).toLocaleDateString()}
                </p>
                <p>
                  <span className="text-slate-500">Expires:</span>{" "}
                  {new Date(qrFor.expirationDate).toLocaleDateString()}
                </p>
                {qrFor.transactionHash && (
                  <p>
                    <span className="text-slate-500">Tx:</span>{" "}
                    <a
                      href={explorerBase + qrFor.transactionHash}
                      target="_blank"
                      rel="noreferrer"
                      className="text-cyan-300 hover:underline"
                    >
                      {qrFor.transactionHash.slice(0, 10)}…
                    </a>
                  </p>
                )}
              </div>
              <div className="rounded-lg border border-slate-800 bg-slate-950/80 p-3">
                <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-slate-500">QR — scan to verify</p>
                <QRCode
                  value={qrFor.verifyUrl || `${backendBase}${qrFor.qrPath || `/verify/qr?cid=${qrFor.credentialId}&t=${qrFor.qrCodeToken}`}`}
                  size={160}
                  bgColor="#020617"
                  fgColor="#e5e7eb"
                />
              </div>
              <div className="rounded-lg border border-slate-800 bg-slate-950/80 p-3">
                <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-slate-500">Key — verify URL (copy for other sites)</p>
                <div className="flex items-center gap-2">
                  <code className="min-w-0 flex-1 truncate rounded bg-slate-900 px-2 py-1.5 text-[10px] text-slate-300">
                    {qrFor.verifyUrl || `${backendBase}${qrFor.qrPath || `/verify/qr?cid=${qrFor.credentialId}&t=${qrFor.qrCodeToken}`}`}
                  </code>
                  <button
                    type="button"
                    onClick={() => copyToClipboardSafe(qrFor.verifyUrl || `${backendBase}${qrFor.qrPath || ""}`)}
                    className="shrink-0 rounded border border-slate-600 bg-slate-800 px-2 py-1.5 text-xs text-slate-300 hover:bg-slate-700"
                  >
                    Copy
                  </button>
                </div>
              </div>
              {qrFor.linkedIdentityId && (
                <p className="text-[11px] text-slate-400">
                  When this credential is verified (QR or key), the server returns your registered identity from the database: <strong className="text-slate-300">display name</strong> and <strong className="text-slate-300">email verified</strong> — so sites can show &quot;Signed in as [name]&quot; without seeing your email or password.
                </p>
              )}
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => verify(qrFor.credentialId)}
                  disabled={!!verifyingId}
                  className="btn-primary px-4 py-1 text-xs disabled:opacity-60"
                >
                  {verifyingId === qrFor.credentialId
                    ? "Verifying…"
                    : "Verify"}
                </button>
                <button
                  onClick={() => setQrFor(null)}
                  className="btn-outline px-4 py-1 text-xs"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
