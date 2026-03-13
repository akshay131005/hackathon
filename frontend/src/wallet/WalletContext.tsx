import React, { createContext, useContext, useState, useCallback } from "react";
import { BrowserProvider, JsonRpcSigner } from "ethers";

interface WalletContextValue {
  address: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
}

const WalletContext = createContext<WalletContextValue | undefined>(undefined);

export const WalletProvider: React.FC<{ children: React.ReactNode }> = ({
  children
}) => {
  const [address, setAddress] = useState<string | null>(null);

  const connect = useCallback(async () => {
    const anyWindow = window as any;
    if (!anyWindow.ethereum) {
      alert("MetaMask not found");
      return;
    }
    const provider = new BrowserProvider(anyWindow.ethereum);
    await provider.send("eth_requestAccounts", []);
    const signer: JsonRpcSigner = await provider.getSigner();
    const addr = await signer.getAddress();
    setAddress(addr);
  }, []);

  const disconnect = useCallback(() => {
    setAddress(null);
  }, []);

  return (
    <WalletContext.Provider value={{ address, connect, disconnect }}>
      {children}
    </WalletContext.Provider>
  );
};

export function useWallet() {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used within WalletProvider");
  return ctx;
}

