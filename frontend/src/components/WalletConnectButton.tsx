import React, { useState } from "react";
import { useWallet } from "../wallet/WalletContext";
import { DisconnectModal } from "./DisconnectModal";

type WalletConnectButtonProps = {
  variant?: "primary" | "outline";
};

export const WalletConnectButton: React.FC<WalletConnectButtonProps> = ({
  variant = "outline"
}) => {
  const { address, connect, disconnect } = useWallet();
  const [menuOpen, setMenuOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [connecting, setConnecting] = useState(false);

  const explorerBase =
    (import.meta as any).env?.VITE_EXPLORER_URL ||
    "https://sepolia.etherscan.io/tx/";

  const onConnect = async () => {
    try {
      setConnecting(true);
      await connect();
    } finally {
      setConnecting(false);
    }
  };

  const onCopy = async () => {
    if (!address) return;
    try {
      await navigator.clipboard.writeText(address);
    } catch {
      // ignore
    }
  };

  const baseClass =
    variant === "primary"
      ? "btn-primary text-xs"
      : "btn-outline text-xs bg-slate-900/80";

  if (!address) {
    return (
      <button
        type="button"
        onClick={onConnect}
        className={`${baseClass} relative flex items-center gap-2 px-4`}
      >
        {connecting && (
          <span className="h-3 w-3 animate-spin rounded-full border-2 border-cyan-300 border-t-transparent" />
        )}
        <span>{connecting ? "Connecting…" : "Connect Wallet"}</span>
      </button>
    );
  }

  return (
    <>
      <div className="relative">
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          className={`${baseClass} flex items-center gap-2 px-3`}
        >
          <span className="h-5 w-5 rounded-full bg-gradient-to-br from-cyan-400 to-fuchsia-500 text-[10px] font-semibold text-slate-950 flex items-center justify-center">
            {address.slice(2, 4).toUpperCase()}
          </span>
          <span className="hidden text-[11px] sm:inline">
            {address.slice(0, 6)}…{address.slice(-4)}
          </span>
          <span className="text-[10px]">▾</span>
        </button>
        {menuOpen && (
          <div className="absolute right-0 mt-2 w-44 rounded-2xl border border-slate-700 bg-slate-950/95 p-2 text-[11px] text-slate-200 shadow-lg shadow-slate-900/70">
            <button
              type="button"
              onClick={onCopy}
              className="flex w-full items-center justify-between rounded-xl px-2 py-1.5 hover:bg-slate-900/80"
            >
              <span>Copy address</span>
              <span>📋</span>
            </button>
            <a
              href={explorerBase.replace(/\/tx\/?$/, "")}
              target="_blank"
              rel="noreferrer"
              className="mt-1 flex w-full items-center justify-between rounded-xl px-2 py-1.5 hover:bg-slate-900/80"
            >
              <span>View on explorer</span>
              <span>🔗</span>
            </a>
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                setModalOpen(true);
              }}
              className="mt-1 flex w-full items-center justify-between rounded-xl px-2 py-1.5 text-red-300 hover:bg-red-900/30"
            >
              <span>Disconnect</span>
              <span>⏏</span>
            </button>
          </div>
        )}
      </div>
      <DisconnectModal
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onConfirm={() => {
          disconnect();
          setModalOpen(false);
        }}
      />
    </>
  );
};

