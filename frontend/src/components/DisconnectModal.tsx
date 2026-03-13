import React from "react";

type DisconnectModalProps = {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export const DisconnectModal: React.FC<DisconnectModalProps> = ({
  open,
  onCancel,
  onConfirm
}) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60">
      <div className="card w-full max-w-sm space-y-4 p-6">
        <h2 className="text-lg font-semibold">Disconnect wallet?</h2>
        <p className="text-xs text-slate-300 sm:text-sm">
          You are about to disconnect your wallet. This will end the current
          session and you may lose unsaved actions.
        </p>
        <div className="flex justify-end gap-3 pt-2 text-xs sm:text-sm">
          <button
            type="button"
            onClick={onCancel}
            className="btn-outline px-4 py-1"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="btn-primary px-4 py-1"
          >
            Disconnect
          </button>
        </div>
      </div>
    </div>
  );
};

