import React, { useState, useRef, useEffect } from "react";
import api from "../api/client";
import { useWallet } from "../wallet/WalletContext";
import gsap from "gsap";

export const IdentityPage: React.FC = () => {
  const { address } = useWallet();
  const [mode, setMode] = useState<"register" | "login">("register");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [walletAddress, setWalletAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [identityToken, setIdentityToken] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (address) setWalletAddress(address);
  }, [address]);

  useEffect(() => {
    if (!containerRef.current) return;
    gsap.fromTo(
      containerRef.current.querySelectorAll("[data-identity-anim]"),
      { y: 20, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.5, stagger: 0.08, ease: "power3.out" }
    );
  }, [mode]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      const res = await api.post("/identity/register", {
        name: name.trim(),
        email: email.trim(),
        password,
        displayName: displayName.trim() || undefined,
        walletAddress: walletAddress || undefined
      });
      setIdentityToken(res.data.token);
      setSuccess("Identity registered! Commitment anchored on-chain.");
      setPassword("");
    } catch (err: any) {
      setError(err?.response?.data?.error || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      const res = await api.post("/identity/login", {
        email: email.trim(),
        password
      });
      setIdentityToken(res.data.token);
      setSuccess("Signed in successfully.");
      setPassword("");
    } catch (err: any) {
      setError(err?.response?.data?.error || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setIdentityToken(null);
    setSuccess(null);
    setError(null);
  };

  return (
    <div ref={containerRef} className="mx-auto max-w-2xl space-y-8">
      <div data-identity-anim className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          PrivacyPass Identity
        </h1>
        <p className="text-sm text-slate-400">
          Store your identity securely. Your data is hashed and anchored on-chain.
          Use your credential to sign in to other sites without exposing your details.
        </p>
      </div>

      {!identityToken ? (
        <div data-identity-anim className="card space-y-6 p-6">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => { setMode("register"); setError(null); setSuccess(null); }}
              className={`flex-1 rounded-xl px-4 py-2 text-sm font-medium transition ${
                mode === "register"
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                  : "border border-slate-700 text-slate-400 hover:text-slate-200"
              }`}
            >
              Register
            </button>
            <button
              type="button"
              onClick={() => { setMode("login"); setError(null); setSuccess(null); }}
              className={`flex-1 rounded-xl px-4 py-2 text-sm font-medium transition ${
                mode === "login"
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                  : "border border-slate-700 text-slate-400 hover:text-slate-200"
              }`}
            >
              Sign In
            </button>
          </div>

          <form
            onSubmit={mode === "register" ? handleRegister : handleLogin}
            className="space-y-4"
          >
            {mode === "register" && (
              <>
                <div>
                  <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-slate-500">
                    Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name"
                    className="input"
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-slate-500">
                    Display name (for other sites)
                  </label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="e.g. John D. (default: your name)"
                    className="input"
                  />
                  <p className="mt-1 text-[11px] text-slate-500">Shown when you sign in elsewhere. No email/password is ever shared.</p>
                </div>
              </>
            )}
            <div>
              <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-slate-500">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="input"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-slate-500">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="input"
                minLength={6}
                required
              />
              {mode === "register" && (
                <p className="mt-1 text-[11px] text-slate-500">Min 6 characters. Never stored in plaintext.</p>
              )}
            </div>
            {mode === "register" && (
              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-slate-500">
                  Wallet (optional)
                </label>
                <input
                  type="text"
                  value={walletAddress}
                  onChange={(e) => setWalletAddress(e.target.value)}
                  placeholder="0x..."
                  className="input font-mono text-sm"
                />
                <p className="mt-1 text-[11px] text-slate-500">Link your wallet for on-chain subject address.</p>
              </div>
            )}

            {error && (
              <div className="rounded-xl border border-red-500/40 bg-red-900/20 px-3 py-2 text-sm text-red-300">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full disabled:opacity-60"
            >
              {loading ? "Please wait…" : mode === "register" ? "Register Identity" : "Sign In"}
            </button>
          </form>
        </div>
      ) : (
        <>
          <div data-identity-anim className="card space-y-4 p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Sign in with PrivacyPass</h2>
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-full border border-slate-600 px-3 py-1 text-xs text-slate-400 hover:text-slate-200"
              >
                Sign out
              </button>
            </div>
            {success && (
              <div className="rounded-xl border border-emerald-500/40 bg-emerald-900/20 px-3 py-2 text-sm text-emerald-200">
                {success}
              </div>
            )}

            <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4 text-xs text-slate-400">
              <p className="font-medium text-slate-300">How identity verification works</p>
              <ul className="mt-2 list-inside list-disc space-y-1">
                <li>Your name, email, and password are hashed — never stored in plaintext.</li>
                <li>A commitment is anchored on-chain; your credential links to this commitment.</li>
                <li>Go to <strong className="text-slate-200">Dashboard → Manage Credentials</strong> to see your credentials. There you get the <strong className="text-slate-200">QR and verify URL (key)</strong> to use when signing in on other sites.</li>
                <li>When a site scans the QR or uses the key, we return only your display name and &quot;email verified&quot; — so it can show &quot;Signed in as [name]&quot; without ever seeing your email or password.</li>
                <li>Claims are signed so the other site can trust they came from PrivacyPass.</li>
              </ul>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
