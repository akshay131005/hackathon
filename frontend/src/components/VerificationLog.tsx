import React, { useCallback, useEffect, useRef, useState } from "react";
import gsap from "gsap";
import api from "../api/client";

interface BackendLogEntry {
  _id?: string;
  credentialId: string;
  walletAddress: string;
  issuerId: string;
  timestamp: string;
  result: "SUCCESS" | "FAILURE";
  reason?: string;
  viaQr?: boolean;
  txHash?: string;
  usedZkp?: boolean;
}

interface LogEntry {
  id: string;
  verificationType: "zkp" | "blockchain" | "standard";
  timestamp: string;
  walletAddress: string;
  result: "success" | "failed";
  transactionHash?: string;
  credentialId?: string;
  reason?: string;
}

interface Props {
  issuerId?: string;
  walletAddress?: string;
  token?: string | null;
}

function mapBackendLog(raw: BackendLogEntry, idx: number): LogEntry {
  return {
    id: raw._id || `vl-${idx}`,
    verificationType: raw.usedZkp ? "zkp" : raw.txHash ? "blockchain" : "standard",
    timestamp: raw.timestamp,
    walletAddress: raw.walletAddress,
    result: raw.result === "SUCCESS" ? "success" : "failed",
    transactionHash: raw.txHash,
    credentialId: raw.credentialId,
    reason: raw.reason
  };
}

export const VerificationLog: React.FC<Props> = ({
  issuerId,
  walletAddress,
  token
}) => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    gsap.fromTo(
      containerRef.current,
      { y: 20, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.5, ease: "power3.out" }
    );
  }, []);

  const fetchLogs = useCallback(async () => {
    setRefreshing(true);
    try {
      const params: Record<string, string> = {};
      if (issuerId) params.issuerId = issuerId;
      if (walletAddress) params.walletAddress = walletAddress;

      const res = await api.get<BackendLogEntry[]>("/verificationLogs", {
        params
      });

      if (Array.isArray(res.data)) {
        setLogs(res.data.map(mapBackendLog));
      }
      setLoaded(true);
    } catch {
      setLoaded(true);
    } finally {
      setRefreshing(false);
    }
  }, [issuerId, walletAddress]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const downloadCSV = () => {
    const header = "ID,Type,Timestamp,Wallet,Result,TxHash\n";
    const rows = logs
      .map(
        (l) =>
          `${l.id},${l.verificationType},${l.timestamp},${l.walletAddress},${l.result},${l.transactionHash || ""}`
      )
      .join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `verification-log-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const toggle = (id: string) => {
    setExpanded((prev) => (prev === id ? null : id));
  };

  const explorerBase =
    (import.meta as any).env?.VITE_EXPLORER_URL ||
    "https://sepolia.etherscan.io/tx/";

  const typeIcon = (t: LogEntry["verificationType"]) => {
    if (t === "zkp") return "🔐";
    if (t === "blockchain") return "⛓";
    return "🔍";
  };

  const typeLabel = (t: LogEntry["verificationType"]) => {
    if (t === "zkp") return "ZK Proof";
    if (t === "blockchain") return "On-chain";
    return "Standard";
  };

  const resultColor = (r: string) =>
    r === "success" ? "text-cyan-300" : "text-red-400";

  const timeAgo = (iso: string) => {
    const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (s < 0) return "just now";
    if (s < 60) return `${s}s ago`;
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
    return new Date(iso).toLocaleDateString();
  };

  return (
    <div ref={containerRef} className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Verification Activity Log</h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchLogs}
            disabled={refreshing}
            className="rounded-full border border-slate-700 bg-slate-900/80 px-3 py-1 text-[11px] text-slate-300 transition hover:border-cyan-400 hover:text-cyan-300 hover:shadow-[0_0_12px_rgba(34,211,238,0.3)] disabled:opacity-60"
          >
            {refreshing ? "⟳" : "🔄"} Refresh
          </button>
          <button
            type="button"
            onClick={downloadCSV}
            className="rounded-full border border-slate-700 bg-slate-900/80 px-3 py-1 text-[11px] text-slate-300 transition hover:border-violet-400 hover:text-violet-300"
          >
            📄 Download CSV
          </button>
        </div>
      </div>

      <div className="card space-y-1 p-0">
        {logs.map((entry) => (
          <div key={entry.id}>
            <button
              type="button"
              onClick={() => toggle(entry.id)}
              className="grid w-full grid-cols-[auto_1.4fr_1.4fr_1fr_auto] items-center gap-3 border-b border-slate-800/60 px-4 py-3 text-left text-xs transition last:border-b-0 hover:bg-slate-900/70"
            >
              <span className="text-base">
                {typeIcon(entry.verificationType)}
              </span>
              <span>
                <span
                  className={
                    entry.verificationType === "zkp"
                      ? "text-violet-300"
                      : "text-slate-200"
                  }
                >
                  {typeLabel(entry.verificationType)}
                </span>
                {entry.credentialId && (
                  <span className="ml-1 text-[10px] text-slate-500">
                    · {entry.credentialId.slice(0, 8)}
                  </span>
                )}
              </span>
              <span className="truncate text-slate-400">
                {entry.walletAddress.slice(0, 6)}…
                {entry.walletAddress.slice(-4)}
              </span>
              <span className={`font-semibold ${resultColor(entry.result)}`}>
                {entry.result === "success" ? "✓ Success" : "✗ Failed"}
              </span>
              <span className="text-[10px] text-slate-500">
                {timeAgo(entry.timestamp)}
              </span>
            </button>

            {expanded === entry.id && (
              <div className="space-y-3 border-b border-slate-800/60 bg-slate-950/50 px-4 py-3 last:border-b-0">
                {entry.transactionHash && (
                  <div>
                    <span className="text-[10px] uppercase tracking-[0.14em] text-slate-500">
                      Transaction hash
                    </span>
                    <div className="mt-1 flex items-center gap-2">
                      <a
                        href={explorerBase + entry.transactionHash}
                        target="_blank"
                        rel="noreferrer"
                        className="break-all font-mono text-[11px] text-cyan-300 hover:underline"
                      >
                        {entry.transactionHash}
                      </a>
                      <button
                        type="button"
                        onClick={() =>
                          navigator.clipboard.writeText(
                            entry.transactionHash || ""
                          )
                        }
                        className="text-[10px] text-slate-400 hover:text-cyan-300"
                      >
                        📋
                      </button>
                    </div>
                  </div>
                )}
                {entry.reason && (
                  <div>
                    <span className="text-[10px] uppercase tracking-[0.14em] text-slate-500">
                      Reason
                    </span>
                    <p className="mt-1 text-[11px] text-slate-300">
                      {entry.reason}
                    </p>
                  </div>
                )}
                <div>
                  <span className="text-[10px] uppercase tracking-[0.14em] text-slate-500">
                    Verification pipeline
                  </span>
                  <div className="mt-2 flex items-center gap-2 text-[11px]">
                    <span className="rounded-full bg-slate-800 px-2 py-0.5 text-slate-200">
                      User
                    </span>
                    <span className="text-slate-600">→</span>
                    <span className="rounded-full bg-violet-900/50 px-2 py-0.5 text-violet-300">
                      Proof Generated
                    </span>
                    <span className="text-slate-600">→</span>
                    <span className="rounded-full bg-slate-800 px-2 py-0.5 text-slate-200">
                      Verifier
                    </span>
                    <span className="text-slate-600">→</span>
                    <span
                      className={`rounded-full px-2 py-0.5 ${
                        entry.result === "success"
                          ? "bg-cyan-900/40 text-cyan-300"
                          : "bg-red-900/40 text-red-300"
                      }`}
                    >
                      {entry.result === "success" ? "✓ Success" : "✗ Failed"}
                    </span>
                  </div>
                </div>
                <div className="text-[10px] text-slate-500">
                  Full timestamp:{" "}
                  {new Date(entry.timestamp).toLocaleString()}
                </div>
              </div>
            )}
          </div>
        ))}
        {loaded && logs.length === 0 && (
          <div className="px-4 py-6 text-center text-[11px] text-slate-400">
            No verification activity yet.
          </div>
        )}
        {!loaded && (
          <div className="px-4 py-6 text-center text-[11px] text-slate-400">
            Loading verification logs…
          </div>
        )}
      </div>
    </div>
  );
};
