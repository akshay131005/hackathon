import React from "react";
import { Routes, Route, Link, NavLink } from "react-router-dom";
import { WalletProvider, useWallet } from "./wallet/WalletContext";
import { LandingPage } from "./pages/LandingPage";
import { DashboardPage } from "./pages/DashboardPage";
import { IssuerDashboardPage } from "./pages/IssuerDashboardPage";
import { IdentityPage } from "./pages/IdentityPage";
import { ThreeBackground } from "./three/ThreeBackground";
import { LoadingScreen } from "./components/LoadingScreen";
import { WalletConnectButton } from "./components/WalletConnectButton";

function Header() {
  const chainName =
    (import.meta as any).env?.VITE_CHAIN_NAME || "Ethereum Sepolia";

  return (
    <header className="sticky top-0 z-20 border-b border-slate-800/70 bg-background/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link to="/" className="text-xl font-semibold tracking-tight">
          <span className="text-neon-cyan">Privacy</span>
          <span className="text-neon-magenta">Pass</span>
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          <NavLink
            to="/dashboard"
            className={({ isActive }) =>
              `px-3 py-1 rounded-full text-xs transition ${
                isActive
                  ? "bg-slate-800 text-neon-cyan"
                  : "text-slate-300 hover:text-white"
              }`
            }
          >
            Dashboard
          </NavLink>
          <NavLink
            to="/issuer"
            className={({ isActive }) =>
              `px-3 py-1 rounded-full text-xs transition ${
                isActive
                  ? "bg-slate-800 text-neon-magenta"
                  : "text-slate-300 hover:text-white"
              }`
            }
          >
            Issuer
          </NavLink>
          <NavLink
            to="/identity"
            className={({ isActive }) =>
              `px-3 py-1 rounded-full text-xs transition ${
                isActive
                  ? "bg-slate-800 text-emerald-400"
                  : "text-slate-300 hover:text-white"
              }`
            }
          >
            Identity
          </NavLink>
          <div className="hidden text-[11px] text-slate-400 md:block">
            {chainName}
          </div>
          <WalletConnectButton />
        </nav>
      </div>
    </header>
  );
}

function App() {
  return (
    <WalletProvider>
      <div className="relative min-h-screen bg-background text-white">
        <LoadingScreen />
        <ThreeBackground />
        <Header />
        <main className="relative z-10 px-4 py-8">
          <div className="mx-auto flex max-w-6xl flex-col gap-8">
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/issuer" element={<IssuerDashboardPage />} />
              <Route path="/identity" element={<IdentityPage />} />
            </Routes>
          </div>
        </main>
      </div>
    </WalletProvider>
  );
}

export default App;

