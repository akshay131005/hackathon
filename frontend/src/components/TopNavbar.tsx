import React from "react";
import { WalletConnectButton } from "./WalletConnectButton";

interface Props {
  searchValue?: string;
  onSearchChange?: (value: string) => void;
}

export const TopNavbar: React.FC<Props> = ({ searchValue, onSearchChange }) => {
  return (
    <div className="mb-4 flex items-center justify-between gap-4">
      <div className="relative flex-1 max-w-md">
        <input
          value={searchValue ?? ""}
          onChange={(e) => onSearchChange?.(e.target.value)}
          className="w-full rounded-2xl border border-slate-700 bg-slate-900/80 px-9 py-2 text-xs text-slate-100 placeholder:text-slate-500 shadow-sm shadow-cyan-500/10 focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
          placeholder="Search credentials, issuers, or transactions"
        />
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[12px] text-slate-500">
          🔍
        </span>
      </div>
      <div className="flex items-center gap-3 text-xs">
        <WalletConnectButton />
      </div>
    </div>
  );
};
