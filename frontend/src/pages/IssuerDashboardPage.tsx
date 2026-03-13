import React, { useEffect, useRef, useState } from "react";
import api, { setAuthToken } from "../api/client";
import { Sidebar } from "../components/Sidebar";
import { TopNavbar } from "../components/TopNavbar";
import { VerificationLog } from "../components/VerificationLog";
import { keccak256, toUtf8Bytes } from "ethers";
import gsap from "gsap";

const CREDENTIAL_TYPES = [
  { value: "Age Verification", icon: "🛡", label: "Age Verification" },
  { value: "Membership Pass", icon: "⭐", label: "Membership Pass" },
  { value: "Employee ID", icon: "🪪", label: "Employee ID" },
  { value: "Student Credential", icon: "🎓", label: "Student Credential" },
  { value: "KYC Verified", icon: "✅", label: "KYC Verified" }
];

interface IssuedCredential {
  credentialId: string;
  walletAddress: string;
  credentialType: string;
  issueDate: string;
  expirationDate: string;
  status: string;
  transactionHash?: string;
}

interface SecuritySettings {
  enforceZkVerification: boolean;
  allowQrVerification: boolean;
  sessionTimeoutMinutes: number;
  autoRevokeExpired: boolean;
  rateLimitPerMinute: number;
  auditRetentionDays: number;
}

const DEFAULT_SECURITY: SecuritySettings = {
  enforceZkVerification: false,
  allowQrVerification: true,
  sessionTimeoutMinutes: 60,
  autoRevokeExpired: true,
  rateLimitPerMinute: 30,
  auditRetentionDays: 90
};

type IssuerSection = "issue" | "credentials" | "security" | "logs";

async function copyToClipboardSafe(value: string): Promise<boolean> {
  if (!value) return false;
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(value);
      return true;
    }
  } catch {
    // fall back to legacy path
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

export const IssuerDashboardPage: React.FC = () => {
  const [issuerId, setIssuerId] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loggingIn, setLoggingIn] = useState(false);

  const [walletAddress, setWalletAddress] = useState("");
  const [credentialType, setCredentialType] = useState("Age Verification");
  const [expirationDate, setExpirationDate] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [issuing, setIssuing] = useState(false);
  const [zkSecret, setZkSecret] = useState("");
  const [zkCommitment, setZkCommitment] = useState<string | null>(null);
  const [zkTooltipOpen, setZkTooltipOpen] = useState(false);
  const [issued, setIssued] = useState<IssuedCredential[]>([]);
  const [revokeTarget, setRevokeTarget] = useState<IssuedCredential | null>(
    null
  );
  const [revoking, setRevoking] = useState(false);
  const [issueSuccess, setIssueSuccess] = useState(false);
  const [search, setSearch] = useState("");

  const [security, setSecurity] = useState<SecuritySettings | null>(null);
  const [loadingSecurity, setLoadingSecurity] = useState(false);
  const [savingSecurity, setSavingSecurity] = useState(false);
  const [securityMsg, setSecurityMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const [section, setSection] = useState<IssuerSection>("issue");

  const formRef = useRef<HTMLDivElement | null>(null);
  const sectionRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!formRef.current) return;
    gsap.fromTo(
      formRef.current.querySelectorAll("[data-animate]"),
      { y: 16, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.5, stagger: 0.06, ease: "power3.out" }
    );
  }, []);

  useEffect(() => {
    if (!sectionRef.current) return;
    const cards = sectionRef.current.querySelectorAll("[data-section-card]");
    if (!cards.length) return;
    gsap.fromTo(
      cards,
      { y: 24, opacity: 0, scale: 0.97 },
      { y: 0, opacity: 1, scale: 1, duration: 0.45, stagger: 0.07, ease: "power3.out" }
    );
  }, [section, token]);

  const isValidAddress =
    walletAddress.length === 0 ||
    (walletAddress.startsWith("0x") && walletAddress.length === 42);

  const selectedType = CREDENTIAL_TYPES.find(
    (t) => t.value === credentialType
  );

  const login = async () => {
    if (!issuerId) {
      setLoginError("Enter an issuer ID.");
      return;
    }
    setLoggingIn(true);
    setLoginError(null);
    try {
      const res = await api.post("/auth/issuer/login", { issuerId });
      const jwt = res.data.token;
      setToken(jwt);
      setAuthToken(jwt);
      setStatus(null);
      await loadIssued();
      await loadSecurity();
    } catch (err: any) {
      const msg =
        err?.response?.data?.error || "Login failed. Is the backend running?";
      setLoginError(msg);
    } finally {
      setLoggingIn(false);
    }
  };

  const loadIssued = async () => {
    if (!token) return;
    try {
      const res = await api.get<IssuedCredential[]>("/credentials", {
        params: { issuerId }
      });
      setIssued(Array.isArray(res.data) ? res.data : []);
    } catch {
      /* ignore */
    }
  };

  const loadSecurity = async () => {
    if (!token) return;
    try {
      setLoadingSecurity(true);
      const res = await api.get<SecuritySettings>("/issuer/securitySettings");
      setSecurity(res.data);
    } catch {
      setSecurity({ ...DEFAULT_SECURITY });
    } finally {
      setLoadingSecurity(false);
    }
  };

  useEffect(() => {
    if (token) {
      loadIssued();
      loadSecurity();
    }
  }, [token]);

  const issue = async () => {
    if (!token) {
      setStatus("Login as issuer first.");
      return;
    }
    if (!walletAddress || !isValidAddress) {
      setStatus("Enter a valid 0x wallet address.");
      return;
    }
    if (!expirationDate) {
      setStatus("Set an expiration date.");
      return;
    }
    try {
      setIssuing(true);
      setIssueSuccess(false);

      const payload: any = {
        walletAddress: walletAddress.toLowerCase(),
        credentialType,
        issuerID: issuerId,
        expirationDate
      };

      if (zkCommitment) {
        payload.zkCommitment = zkCommitment;
        payload.zkCircuitType = "AGE_OVER_18";
      }

      const res = await api.post("/issueCredential", payload);

      const credentialId = res.data.credentialId;
      const txHash = (res.data as any).transactionHash;
      setStatus(
        txHash
          ? `Credential ${credentialId} issued on-chain. Tx: ${txHash}`
          : `Credential ${credentialId} issued.`
      );
      setIssueSuccess(true);
      loadIssued();
    } catch (err: any) {
      const msg =
        err?.response?.data?.error || "Issue failed. Check backend logs.";
      setStatus(msg);
    } finally {
      setIssuing(false);
    }
  };

  const revoke = async (cred: IssuedCredential) => {
    if (!token) return;
    try {
      setRevoking(true);
      await api.post("/revokeCredential", {
        credentialID: cred.credentialId
      });
      setRevokeTarget(null);
      setStatus(`Credential ${cred.credentialId} revoked.`);
      loadIssued();
    } catch (err: any) {
      const msg = err?.response?.data?.error || "Revocation failed.";
      setStatus(msg);
    } finally {
      setRevoking(false);
    }
  };

  const explorerBase =
    (import.meta as any).env?.VITE_EXPLORER_URL ||
    "https://sepolia.etherscan.io/tx/";

  const credIcon = (type: string) => {
    const found = CREDENTIAL_TYPES.find((t) => t.value === type);
    return found?.icon ?? "🛡";
  };

  const statusColor = (s: string) => {
    const lower = s.toLowerCase();
    if (lower.includes("revoked")) return "bg-red-400";
    if (lower.includes("expired")) return "bg-amber-400";
    return "bg-emerald-400";
  };

  const filteredIssued = issued.filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      c.walletAddress?.toLowerCase().includes(q) ||
      c.credentialId.toLowerCase().includes(q) ||
      c.credentialType.toLowerCase().includes(q)
    );
  });

  const handleSectionChange = (next: IssuerSection) => {
    if (!token) {
      setSection("issue");
      setStatus("Login as issuer first.");
      document
        .getElementById("issuer-login")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    setSection(next);
    const targetId =
      next === "issue"
        ? "issuer-issue"
        : next === "credentials"
        ? "issuer-credentials"
        : next === "security"
        ? "issuer-security"
        : "issuer-logs";
    document
      .getElementById(targetId)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="flex gap-4">
      <Sidebar active="issuer" onIssuerSectionChange={handleSectionChange} />
      <div className="flex-1 space-y-6" ref={formRef}>
        <TopNavbar searchValue={search} onSearchChange={setSearch} />
        <div className="space-y-6" ref={sectionRef}>
          {/* --- stats row --- */}
          <div
            data-animate
            className="grid gap-4 text-xs text-slate-300 sm:grid-cols-4 sm:text-sm"
          >
            <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/80 p-4 shadow-[0_0_40px_rgba(15,23,42,0.9)]">
              <div className="pointer-events-none absolute inset-px rounded-2xl bg-gradient-to-br from-cyan-500/10 via-transparent to-indigo-500/10 opacity-50 blur-xl" />
              <div className="relative">
                <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Issuer
                </span>
                <p className="mt-1 truncate text-base font-semibold text-slate-50">
                  {issuerId || "—"}
                </p>
              </div>
            </div>
            <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/80 p-4 shadow-[0_0_40px_rgba(15,23,42,0.9)]">
              <div className="pointer-events-none absolute inset-px rounded-2xl bg-gradient-to-br from-emerald-500/10 via-transparent to-cyan-500/10 opacity-50 blur-xl" />
              <div className="relative">
                <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Session
                </span>
                <p className="mt-1 flex items-center gap-2 text-base font-semibold text-slate-50">
                  {token ? (
                    <>
                      <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)]" />
                      Active
                    </>
                  ) : (
                    <>
                      <span className="h-2 w-2 rounded-full bg-slate-600" />
                      Offline
                    </>
                  )}
                </p>
              </div>
            </div>
            <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/80 p-4 shadow-[0_0_40px_rgba(15,23,42,0.9)]">
              <div className="pointer-events-none absolute inset-px rounded-2xl bg-gradient-to-br from-violet-500/10 via-transparent to-fuchsia-500/10 opacity-50 blur-xl" />
              <div className="relative">
                <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Credentials
                </span>
                <p className="mt-1 text-2xl font-semibold text-slate-50">
                  {issued.length}
                </p>
              </div>
            </div>
            <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/80 p-4 shadow-[0_0_40px_rgba(15,23,42,0.9)]">
              <div className="pointer-events-none absolute inset-px rounded-2xl bg-gradient-to-br from-amber-500/10 via-transparent to-orange-500/10 opacity-50 blur-xl" />
              <div className="relative">
                <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Active Section
                </span>
                <p className="mt-1 text-base font-semibold capitalize text-slate-50">
                  {section === "issue" ? "Issue" : section === "credentials" ? "Manage" : section === "security" ? "Security" : "Logs"}
                </p>
              </div>
            </div>
          </div>

          {/* --- login card --- */}
          {!token && (
            <div
              id="issuer-login"
              data-animate
              className="card space-y-4 p-5 scroll-mt-20"
            >
              <h2 className="text-lg font-semibold">Issuer Login</h2>
              <p className="text-sm text-slate-400">
                Authenticate with your issuer ID to get a signed JWT token. This
                token authorizes credential issuance and revocation.
              </p>
              <div className="flex gap-2">
                <input
                  value={issuerId}
                  onChange={(e) => setIssuerId(e.target.value)}
                  placeholder="Issuer ID"
                  className="input"
                  onKeyDown={(e) => e.key === "Enter" && login()}
                />
                <button
                  onClick={login}
                  disabled={loggingIn}
                  className="rounded-lg bg-neon-magenta px-4 py-2 text-sm font-semibold text-black transition hover:bg-pink-400 disabled:opacity-60"
                >
                  {loggingIn ? "Logging in…" : "Login"}
                </button>
              </div>
              {loginError && (
                <p className="text-xs text-red-400">{loginError}</p>
              )}
            </div>
          )}

          {/* --- logged in indicator --- */}
          {token && (
            <div
              data-animate
              className="card flex items-center justify-between p-4"
            >
              <div>
                <p className="text-xs text-slate-400">
                  Logged in as{" "}
                  <span className="font-semibold text-slate-100">
                    {issuerId}
                  </span>
                </p>
                <p className="text-[10px] text-slate-500">
                  JWT token active · authorized for issue &amp; revoke
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setToken(null);
                  setAuthToken(null);
                  setIssued([]);
                  setSecurity(null);
                }}
                className="btn-outline px-3 py-1 text-xs"
              >
                Logout
              </button>
            </div>
          )}

          {/* --- issue credential card --- */}
          {token && section === "issue" && (
            <div
              id="issuer-issue"
              data-animate
              data-section-card
              className="card space-y-5 p-6 scroll-mt-20"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold">Issue Credential</h2>
                  <p className="text-xs text-slate-400">
                    Fill all fields, optionally add a ZK commitment, then sign
                    and anchor on-chain.
                  </p>
                </div>
                <span className="badge text-[10px]">Issue &amp; sign</span>
              </div>

              <div className="space-y-3">
                {/* wallet address */}
                <div>
                  <label className="mb-1 block text-[11px] uppercase tracking-[0.16em] text-slate-400">
                    Recipient wallet address
                  </label>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[13px] text-slate-500">
                      💳
                    </span>
                    <input
                      value={walletAddress}
                      onChange={(e) => setWalletAddress(e.target.value)}
                      placeholder="0x742d35Cc6634C0532925a3b844Bc454e4438f44e"
                      className={`input pl-9 ${
                        !isValidAddress
                          ? "border-red-500 focus:border-red-500 focus:ring-red-500/40"
                          : ""
                      }`}
                    />
                    {walletAddress.length > 10 && isValidAddress && (
                      <button
                        type="button"
                        onClick={async () => {
                          await copyToClipboardSafe(walletAddress);
                        }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] text-slate-400 hover:text-cyan-300"
                        title="Copy address"
                      >
                        📋
                      </button>
                    )}
                  </div>
                  {!isValidAddress && (
                    <p className="mt-1 text-[10px] text-red-400">
                      Address must start with 0x and be 42 characters.
                    </p>
                  )}
                  {walletAddress.length >= 42 && isValidAddress && (
                    <p className="mt-1 text-[10px] text-slate-400">
                      {walletAddress.slice(0, 6)}…{walletAddress.slice(-4)}
                    </p>
                  )}
                </div>

                {/* credential type */}
                <div>
                  <label className="mb-1 block text-[11px] uppercase tracking-[0.16em] text-slate-400">
                    Credential type
                  </label>
                  <select
                    value={credentialType}
                    onChange={(e) => setCredentialType(e.target.value)}
                    className="select"
                  >
                    {CREDENTIAL_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.icon} {t.label}
                      </option>
                    ))}
                  </select>
                  {selectedType && (
                    <p className="mt-1 flex items-center gap-1 text-[10px] text-slate-400">
                      <span>{selectedType.icon}</span> {selectedType.label}{" "}
                      selected
                    </p>
                  )}
                </div>

                {/* expiration */}
                <div>
                  <label className="mb-1 block text-[11px] uppercase tracking-[0.16em] text-slate-400">
                    Expiration date
                  </label>
                  <input
                    type="date"
                    value={expirationDate}
                    onChange={(e) => setExpirationDate(e.target.value)}
                    className="input"
                  />
                  {expirationDate && (
                    <p className="mt-1 text-[10px] text-slate-400">
                      Valid until:{" "}
                      {new Date(expirationDate).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric"
                      })}
                    </p>
                  )}
                </div>

                {/* ZK commitment */}
                <div className="space-y-3 rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] uppercase tracking-[0.16em] text-slate-400">
                      ZK Commitment (optional)
                    </label>
                    <button
                      type="button"
                      onClick={() => setZkTooltipOpen((v) => !v)}
                      className="text-[11px] text-cyan-400 underline underline-offset-2 hover:text-cyan-300"
                    >
                      What is this?
                    </button>
                  </div>
                  {zkTooltipOpen && (
                    <div className="rounded-xl border border-slate-700 bg-slate-900/90 px-3 py-2 text-[11px] text-slate-300">
                      A ZK commitment allows verification of a fact (like age
                      &gt; 18) without revealing the actual value. The issuer
                      hashes the secret data; the verifier later confirms the
                      proof against this commitment on-chain.
                    </div>
                  )}
                  <div className="grid gap-3 sm:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
                    <input
                      value={zkSecret}
                      onChange={(e) => setZkSecret(e.target.value)}
                      placeholder="Secret value (e.g. Age = 21)"
                      className="input"
                    />
                    <button
                      type="button"
                      className="btn-outline text-xs"
                      onClick={() => {
                        if (!zkSecret) {
                          setZkCommitment(null);
                          return;
                        }
                        const hash = keccak256(toUtf8Bytes(zkSecret));
                        setZkCommitment(hash);
                      }}
                    >
                      Generate ZK Commitment
                    </button>
                  </div>
                  {zkCommitment && (
                    <div className="flex items-center gap-2 rounded-xl bg-slate-900 px-3 py-2 font-mono text-[11px] text-cyan-300">
                      <span className="truncate">{zkCommitment}</span>
                      <button
                        type="button"
                        onClick={async () => {
                          await copyToClipboardSafe(zkCommitment);
                        }}
                        className="shrink-0 text-[11px] text-slate-400 hover:text-cyan-300"
                      >
                        📋
                      </button>
                    </div>
                  )}
                </div>

                {/* preview */}
                <div className="rounded-xl bg-slate-900/80 px-3 py-2 text-[11px] text-slate-300">
                  <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500">
                    Preview
                  </div>
                  <div className="mt-1">
                    {selectedType?.icon} {credentialType} for{" "}
                    {walletAddress
                      ? `${walletAddress.slice(0, 6)}…${walletAddress.slice(-4)}`
                      : "0x…"}{" "}
                    until{" "}
                    {expirationDate
                      ? new Date(expirationDate).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                          year: "numeric"
                        })
                      : "—"}
                  </div>
                  {zkCommitment && (
                    <div className="mt-1 break-all text-[10px] text-cyan-300">
                      ZK commitment: {zkCommitment.slice(0, 10)}…
                      {zkCommitment.slice(-6)}
                    </div>
                  )}
                </div>

                {/* issue button */}
                <button
                  onClick={issue}
                  disabled={issuing}
                  className="btn-issue-pulse w-full disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <span>
                    {issuing
                      ? "Issuing & signing…"
                      : "Issue & Sign Credential"}
                  </span>
                </button>

                {issueSuccess && (
                  <div className="flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-900/20 px-3 py-2 text-xs text-emerald-200">
                    <span>✅</span>
                    Credential successfully issued and anchored on-chain.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* status */}
          {status && !issueSuccess && (
            <p data-animate className="text-sm text-slate-300">
              {status}
            </p>
          )}

          {/* --- issued credentials table --- */}
          {token && section === "credentials" && (
            <div
              id="issuer-credentials"
              data-animate
              data-section-card
              className="space-y-3 scroll-mt-20"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Issued Credentials</h2>
                <button
                  type="button"
                  onClick={loadIssued}
                  className="rounded-full border border-slate-700 bg-slate-900/80 px-3 py-1 text-[11px] text-slate-300 transition hover:border-cyan-400 hover:text-cyan-300"
                >
                  🔄 Refresh
                </button>
              </div>
              <div className="card overflow-hidden p-0">
                <div className="hidden gap-2 border-b border-slate-800 px-3 py-2 text-[10px] uppercase tracking-[0.16em] text-slate-400 sm:grid sm:grid-cols-[1.6fr_1.4fr_1fr_0.9fr_1.3fr]">
                  <span>Wallet</span>
                  <span>Type</span>
                  <span>Issued</span>
                  <span>Status</span>
                  <span className="text-right">Actions</span>
                </div>
                <div className="max-h-56 overflow-y-auto">
                  {filteredIssued.map((c) => (
                    <div
                      key={c.credentialId}
                      className="grid grid-cols-1 gap-2 border-b border-slate-800/60 px-3 py-2 text-xs text-slate-200 transition hover:bg-slate-900/40 last:border-b-0 sm:grid-cols-[1.6fr_1.4fr_1fr_0.9fr_1.3fr]"
                    >
                      <span className="flex items-center gap-1 truncate">
                        <span className="text-slate-400">
                          {c.walletAddress?.slice(0, 6)}…
                          {c.walletAddress?.slice(-4)}
                        </span>
                        <button
                          type="button"
                          onClick={async () => {
                            await copyToClipboardSafe(c.walletAddress || "");
                          }}
                          className="text-[10px] text-slate-500 hover:text-cyan-300"
                        >
                          📋
                        </button>
                      </span>
                      <span className="flex items-center gap-1">
                        <span>{credIcon(c.credentialType)}</span>
                        {c.credentialType}
                      </span>
                      <span className="text-slate-400">
                        {new Date(c.issueDate).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                          year: "numeric"
                        })}
                      </span>
                      <span>
                        <span className="badge">
                          <span
                            className={`mr-1.5 h-1.5 w-1.5 rounded-full ${statusColor(
                              c.status
                            )} shadow-[0_0_10px_rgba(52,211,153,0.9)]`}
                            aria-hidden
                          />
                          {c.status}
                        </span>
                      </span>
                      <span className="flex justify-end gap-2 text-[10px]">
                        {c.transactionHash && (
                          <a
                            href={explorerBase + c.transactionHash}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-full border border-slate-700 bg-slate-900/70 px-2 py-1 hover:border-cyan-400"
                          >
                            View Tx
                          </a>
                        )}
                        {!c.status.toLowerCase().includes("revoked") && (
                          <button
                            type="button"
                            onClick={() => setRevokeTarget(c)}
                            className="rounded-full border border-red-500/70 bg-red-900/30 px-2 py-1 text-red-200 hover:bg-red-900/50"
                          >
                            Revoke
                          </button>
                        )}
                      </span>
                    </div>
                  ))}
                  {filteredIssued.length === 0 && (
                    <div className="px-3 py-4 text-[11px] text-slate-400">
                      {issued.length === 0
                        ? "No credentials issued yet."
                        : "No credentials match your search."}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* --- security settings --- */}
          {token && section === "security" && (
            <div
              id="issuer-security"
              data-animate
              data-section-card
              className="card space-y-5 p-6 scroll-mt-20"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold">Security Settings</h2>
                  <p className="text-xs text-slate-400">
                    Configure verification policies, session management, and
                    audit controls for your issuer account.
                  </p>
                </div>
                <span className="badge text-[10px]">
                  {loadingSecurity ? "Loading…" : "Issuer-level"}
                </span>
              </div>

              {securityMsg && (
                <div
                  className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs ${
                    securityMsg.ok
                      ? "border-emerald-500/40 bg-emerald-900/20 text-emerald-200"
                      : "border-red-500/40 bg-red-900/20 text-red-200"
                  }`}
                >
                  <span>{securityMsg.ok ? "✅" : "⚠️"}</span>
                  {securityMsg.text}
                </div>
              )}

              {security && (
                <div className="space-y-5">
                  {/* verification policies */}
                  <div>
                    <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Verification Policies
                    </h3>
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-950/70 p-3 text-xs">
                        <div>
                          <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                            Enforce ZK verification
                          </div>
                          <p className="mt-1 text-slate-300">
                            Require zero-knowledge proofs for supported credential
                            types. Disables plain lookups where a ZK circuit is
                            configured.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setSecurity((prev) =>
                              prev
                                ? { ...prev, enforceZkVerification: !prev.enforceZkVerification }
                                : prev
                            )
                          }
                          className={`flex h-6 w-11 shrink-0 items-center rounded-full border px-0.5 transition ${
                            security.enforceZkVerification
                              ? "border-emerald-400 bg-emerald-500/30"
                              : "border-slate-600 bg-slate-800/80"
                          }`}
                        >
                          <span
                            className={`h-4 w-4 rounded-full bg-white shadow transition ${
                              security.enforceZkVerification ? "translate-x-4" : "translate-x-0"
                            }`}
                          />
                        </button>
                      </div>

                      <div className="flex items-start justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-950/70 p-3 text-xs">
                        <div>
                          <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                            Allow QR verification
                          </div>
                          <p className="mt-1 text-slate-300">
                            Permit verifiers to resolve credentials via QR codes.
                            Disable to force wallet-based verification only.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setSecurity((prev) =>
                              prev
                                ? { ...prev, allowQrVerification: !prev.allowQrVerification }
                                : prev
                            )
                          }
                          className={`flex h-6 w-11 shrink-0 items-center rounded-full border px-0.5 transition ${
                            security.allowQrVerification
                              ? "border-cyan-400 bg-cyan-500/30"
                              : "border-slate-600 bg-slate-800/80"
                          }`}
                        >
                          <span
                            className={`h-4 w-4 rounded-full bg-white shadow transition ${
                              security.allowQrVerification ? "translate-x-4" : "translate-x-0"
                            }`}
                          />
                        </button>
                      </div>

                      <div className="flex items-start justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-950/70 p-3 text-xs">
                        <div>
                          <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                            Auto-revoke expired credentials
                          </div>
                          <p className="mt-1 text-slate-300">
                            Automatically mark credentials as revoked once their
                            expiration date passes. Prevents stale credentials
                            from being verified.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setSecurity((prev) =>
                              prev
                                ? { ...prev, autoRevokeExpired: !prev.autoRevokeExpired }
                                : prev
                            )
                          }
                          className={`flex h-6 w-11 shrink-0 items-center rounded-full border px-0.5 transition ${
                            security.autoRevokeExpired
                              ? "border-amber-400 bg-amber-500/30"
                              : "border-slate-600 bg-slate-800/80"
                          }`}
                        >
                          <span
                            className={`h-4 w-4 rounded-full bg-white shadow transition ${
                              security.autoRevokeExpired ? "translate-x-4" : "translate-x-0"
                            }`}
                          />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* session & rate limits */}
                  <div>
                    <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Session &amp; Rate Limits
                    </h3>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2 rounded-2xl border border-slate-800 bg-slate-950/70 p-4 text-xs">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                          Session timeout
                        </div>
                        <p className="text-slate-300">
                          How long the JWT session remains valid before
                          re-authentication is required.
                        </p>
                        <div className="flex items-center gap-3 pt-1">
                          <input
                            type="number"
                            min={5}
                            max={1440}
                            value={security.sessionTimeoutMinutes}
                            onChange={(e) =>
                              setSecurity((prev) =>
                                prev
                                  ? { ...prev, sessionTimeoutMinutes: Number(e.target.value) || 0 }
                                  : prev
                              )
                            }
                            className="input w-24 px-2 py-1 text-xs"
                          />
                          <span className="text-[11px] text-slate-400">
                            min (5 – 1440)
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500">
                          Current:{" "}
                          <span className="text-slate-200">
                            {security.sessionTimeoutMinutes} min
                          </span>
                        </p>
                      </div>

                      <div className="space-y-2 rounded-2xl border border-slate-800 bg-slate-950/70 p-4 text-xs">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                          API rate limit
                        </div>
                        <p className="text-slate-300">
                          Maximum number of API requests allowed per minute
                          from this issuer account.
                        </p>
                        <div className="flex items-center gap-3 pt-1">
                          <input
                            type="number"
                            min={1}
                            max={300}
                            value={security.rateLimitPerMinute}
                            onChange={(e) =>
                              setSecurity((prev) =>
                                prev
                                  ? { ...prev, rateLimitPerMinute: Number(e.target.value) || 1 }
                                  : prev
                              )
                            }
                            className="input w-24 px-2 py-1 text-xs"
                          />
                          <span className="text-[11px] text-slate-400">
                            req/min (1 – 300)
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500">
                          Current:{" "}
                          <span className="text-slate-200">
                            {security.rateLimitPerMinute} req/min
                          </span>
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* audit & retention */}
                  <div>
                    <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Audit &amp; Retention
                    </h3>
                    <div className="space-y-2 rounded-2xl border border-slate-800 bg-slate-950/70 p-4 text-xs">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                        Audit log retention
                      </div>
                      <p className="text-slate-300">
                        Number of days verification and activity logs are retained
                        before automatic cleanup.
                      </p>
                      <div className="flex items-center gap-3 pt-1">
                        <input
                          type="number"
                          min={1}
                          max={365}
                          value={security.auditRetentionDays}
                          onChange={(e) =>
                            setSecurity((prev) =>
                              prev
                                ? { ...prev, auditRetentionDays: Number(e.target.value) || 1 }
                                : prev
                            )
                          }
                          className="input w-24 px-2 py-1 text-xs"
                        />
                        <span className="text-[11px] text-slate-400">
                          days (1 – 365)
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500">
                        Current:{" "}
                        <span className="text-slate-200">
                          {security.auditRetentionDays} days
                        </span>
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {!security && !loadingSecurity && (
                <p className="text-xs text-slate-400">
                  Security settings will appear here after a successful login.
                </p>
              )}

              <div className="flex items-center justify-between gap-3 border-t border-slate-800 pt-4">
                <button
                  type="button"
                  disabled={!security}
                  onClick={() => {
                    setSecurity({ ...DEFAULT_SECURITY });
                    setSecurityMsg({ text: "Reset to defaults. Click Save to apply.", ok: true });
                  }}
                  className="rounded-full border border-slate-700 px-3 py-1 text-[11px] text-slate-400 transition hover:border-slate-500 hover:text-slate-200 disabled:opacity-40"
                >
                  Reset to defaults
                </button>
                <button
                  type="button"
                  disabled={!security || savingSecurity}
                  onClick={async () => {
                    if (!security) return;
                    setSecurityMsg(null);
                    try {
                      setSavingSecurity(true);
                      const res = await api.post("/issuer/securitySettings", security);
                      setSecurity(res.data);
                      setSecurityMsg({ text: "Security settings saved successfully.", ok: true });
                    } catch {
                      setSecurityMsg({ text: "Failed to save settings. Please try again.", ok: false });
                    } finally {
                      setSavingSecurity(false);
                    }
                  }}
                  className="btn-primary px-5 py-1.5 text-xs disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {savingSecurity ? "Saving…" : "Save settings"}
                </button>
              </div>
            </div>
          )}

          {/* --- verification activity log --- */}
          {token && section === "logs" && (
            <div
              id="issuer-logs"
              data-animate
              data-section-card
              className="scroll-mt-20"
            >
              <VerificationLog issuerId={issuerId} token={token} />
            </div>
          )}
        </div>
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
                {revokeTarget.walletAddress?.slice(0, 6)}…
                {revokeTarget.walletAddress?.slice(-4)}
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
    </div>
  );
};
