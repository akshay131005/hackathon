import React from "react";

export const CredentialManagementDoc: React.FC = () => {
  return (
    <section className="card space-y-3 p-5 text-xs text-slate-200 sm:text-sm">
      <h2 className="text-base font-semibold text-slate-50">
        Credential Management
      </h2>
      <p className="text-slate-300">
        The issuer dashboard exposes a live view of all credentials issued by
        the current issuer. Records are fetched from the backend
        <code className="mx-1 rounded bg-slate-900 px-1 py-0.5 text-[11px]">
          /credentials
        </code>
        endpoint, filtered by{" "}
        <code className="rounded bg-slate-900 px-1 py-0.5 text-[11px]">
          issuerId
        </code>
        .
      </p>
      <ul className="list-disc space-y-1 pl-5 text-slate-300">
        <li>
          Search bar filters by wallet address, credential ID, or credential
          type in real time.
        </li>
        <li>
          Status badges reflect on-chain lifecycle:{" "}
          <span className="text-emerald-300">active</span>,{" "}
          <span className="text-amber-300">expired</span>, or{" "}
          <span className="text-red-300">revoked</span>.
        </li>
        <li>
          Responsive layout collapses to a stacked “card per credential” view on
          small screens while keeping a compact grid on desktop.
        </li>
        <li>
          Issuers can revoke credentials, which triggers an on-chain update and
          writes an audit entry to the verification log.
        </li>
      </ul>
    </section>
  );
};

export const VerificationLogDoc: React.FC = () => {
  return (
    <section className="card space-y-3 p-5 text-xs text-slate-200 sm:text-sm">
      <h2 className="text-base font-semibold text-slate-50">
        Verification Activity Log
      </h2>
      <p className="text-slate-300">
        The verification log panel visualizes every credential check that flows
        through the backend
        <code className="mx-1 rounded bg-slate-900 px-1 py-0.5 text-[11px]">
          /verificationLogs
        </code>
        endpoint, mapped into a UI-friendly structure.
      </p>
      <ul className="list-disc space-y-1 pl-5 text-slate-300">
        <li>
          Each row is tagged as a{" "}
          <span className="text-violet-300">ZK proof</span>,{" "}
          <span className="text-cyan-300">on-chain</span>, or standard
          verification depending on which fields are present.
        </li>
        <li>
          Expanding a row reveals full transaction hash, failure reason (if
          any), and a human-readable pipeline from holder to verifier.
        </li>
        <li>
          A CSV export button lets teams download raw verification events for
          auditing or analytics pipelines.
        </li>
        <li>
          The layout is fully responsive, keeping key signal (type, wallet,
          result, time ago) visible even on narrow screens.
        </li>
      </ul>
    </section>
  );
};

export const SecuritySettingsDoc: React.FC = () => {
  return (
    <section className="card space-y-3 p-5 text-xs text-slate-200 sm:text-sm">
      <h2 className="text-base font-semibold text-slate-50">
        Issuer Security Settings
      </h2>
      <p className="text-slate-300">
        Security settings are persisted via the issuer-scoped
        <code className="mx-1 rounded bg-slate-900 px-1 py-0.5 text-[11px]">
          /issuer/securitySettings
        </code>
        API and control how strictly downstream verifiers must behave.
      </p>
      <ul className="list-disc space-y-1 pl-5 text-slate-300">
        <li>
          <span className="font-semibold text-slate-100">
            Enforce ZK verification
          </span>{" "}
          toggles whether plain lookups are allowed when a ZK circuit exists for
          a credential type.
        </li>
        <li>
          <span className="font-semibold text-slate-100">
            Allow QR verification
          </span>{" "}
          lets issuers disable QR-based resolution and force wallet-bound flows
          only.
        </li>
        <li>
          <span className="font-semibold text-slate-100">
            Session timeout
          </span>{" "}
          sets the issuer&apos;s JWT lifetime (up to 24 hours), balancing UX
          with security for admin consoles.
        </li>
        <li>
          All controls are wired to live state and update immediately in the UI,
          with explicit save affordances and inline status feedback.
        </li>
      </ul>
    </section>
  );
};

