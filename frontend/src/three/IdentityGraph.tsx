import React, { useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { CredentialNode } from "./CredentialNode";
import { ConnectionLine } from "./ConnectionLine";

interface CredentialData {
  credentialId: string;
  credentialType: string;
  issuerId: string;
  walletAddress?: string;
  status?: string;
}

type IdentityGraphProps = {
  className?: string;
  credentials?: CredentialData[];
};

type NodeDef = {
  id: string;
  type: "issuer" | "user" | "verifier" | "credential";
  label: string;
  meta: string;
  position: [number, number, number];
};

type EdgeDef = {
  from: string;
  to: string;
};

function buildGraphFromCredentials(creds: CredentialData[]) {
  const nodes: NodeDef[] = [];
  const edges: EdgeDef[] = [];
  const seen = new Set<string>();

  const verifierId = "verifier-global";
  nodes.push({
    id: verifierId,
    type: "verifier",
    label: "Verifier",
    meta: "Validates proofs without seeing data",
    position: [4, 1.5, 0]
  });
  seen.add(verifierId);

  const issuerPositions: Record<string, [number, number, number]> = {};
  let issuerIdx = 0;

  const walletPositions: Record<string, [number, number, number]> = {};
  let walletIdx = 0;

  creds.forEach((c, i) => {
    if (c.issuerId && !seen.has(`issuer-${c.issuerId}`)) {
      const angle = -Math.PI / 2 + (issuerIdx * Math.PI) / Math.max(creds.length, 3);
      const pos: [number, number, number] = [
        -3 + Math.cos(angle) * 1.2,
        2 - issuerIdx * 1.4,
        0
      ];
      issuerPositions[c.issuerId] = pos;
      nodes.push({
        id: `issuer-${c.issuerId}`,
        type: "issuer",
        label: c.issuerId.length > 12 ? c.issuerId.slice(0, 12) + "…" : c.issuerId,
        meta: "Credential issuer",
        position: pos
      });
      seen.add(`issuer-${c.issuerId}`);
      issuerIdx++;
    }

    const wallet = c.walletAddress || "unknown";
    if (!seen.has(`user-${wallet}`)) {
      const pos: [number, number, number] = [
        0 + walletIdx * 1.4,
        -0.5 - walletIdx * 0.8,
        0
      ];
      walletPositions[wallet] = pos;
      nodes.push({
        id: `user-${wallet}`,
        type: "user",
        label: wallet.length > 10 ? `${wallet.slice(0, 6)}…${wallet.slice(-4)}` : wallet,
        meta: "Credential holder",
        position: pos
      });
      seen.add(`user-${wallet}`);
      walletIdx++;
    }

    const credId = `cred-${c.credentialId}`;
    if (!seen.has(credId)) {
      const angle = (i / Math.max(creds.length, 1)) * Math.PI * 1.5 - Math.PI / 4;
      const pos: [number, number, number] = [
        Math.cos(angle) * 2.2,
        -2.5 + Math.sin(angle) * 1.2,
        0
      ];
      nodes.push({
        id: credId,
        type: "credential",
        label: c.credentialType,
        meta: `Status: ${c.status || "active"}`,
        position: pos
      });
      seen.add(credId);

      if (c.issuerId) edges.push({ from: `issuer-${c.issuerId}`, to: credId });
      edges.push({ from: credId, to: `user-${wallet}` });
      edges.push({ from: `user-${wallet}`, to: verifierId });
    }
  });

  return { nodes, edges };
}

const FALLBACK_NODES: NodeDef[] = [
  { id: "issuer", type: "issuer", label: "Issuer", meta: "Issues privacy-preserving credentials", position: [-3, 1.2, 0] },
  { id: "user", type: "user", label: "User", meta: "Holds credentials in wallet", position: [0, -0.2, 0] },
  { id: "verifier", type: "verifier", label: "Verifier", meta: "Validates proofs without seeing data", position: [3, 1.2, 0] },
  { id: "cred-age", type: "credential", label: "Age 18+", meta: "Status: active", position: [-1.2, -2, 0] },
  { id: "cred-student", type: "credential", label: "Student", meta: "Status: active", position: [1.2, -2.2, 0] }
];

const FALLBACK_EDGES: EdgeDef[] = [
  { from: "issuer", to: "cred-age" },
  { from: "issuer", to: "cred-student" },
  { from: "cred-age", to: "user" },
  { from: "cred-student", to: "user" },
  { from: "user", to: "verifier" }
];

const IdentityGraphScene: React.FC<{ credentials?: CredentialData[] }> = ({
  credentials
}) => {
  const { nodes, edges } = useMemo(() => {
    if (credentials && credentials.length > 0) {
      return buildGraphFromCredentials(credentials.slice(0, 12));
    }
    return { nodes: FALLBACK_NODES, edges: FALLBACK_EDGES };
  }, [credentials]);

  const nodeById = useMemo(() => {
    const map = new Map<string, NodeDef>();
    nodes.forEach((n) => map.set(n.id, n));
    return map;
  }, [nodes]);

  return (
    <>
      <color attach="background" args={["#020617"]} />
      <ambientLight intensity={0.4} />
      <pointLight position={[4, 5, 4]} intensity={1.1} color="#22d3ee" />
      <pointLight position={[-4, -5, -6]} intensity={0.7} color="#a855f7" />
      {edges.map((e) => {
        const a = nodeById.get(e.from);
        const b = nodeById.get(e.to);
        if (!a || !b) return null;
        return (
          <ConnectionLine
            key={`${e.from}-${e.to}`}
            from={a.position}
            to={b.position}
          />
        );
      })}
      {nodes.map((n) => (
        <CredentialNode
          key={n.id}
          position={n.position}
          label={n.label}
          meta={n.meta}
          type={n.type}
        />
      ))}
      <OrbitControls
        enableDamping
        dampingFactor={0.08}
        enablePan
        minDistance={6}
        maxDistance={18}
      />
    </>
  );
};

export const IdentityGraph: React.FC<IdentityGraphProps> = ({
  className,
  credentials
}) => {
  return (
    <div
      className={
        className ??
        "h-80 w-full overflow-hidden rounded-3xl border border-slate-800 bg-slate-950/80"
      }
    >
      <Canvas camera={{ position: [0, 0, 12], fov: 50 }}>
        <IdentityGraphScene credentials={credentials} />
      </Canvas>
    </div>
  );
};
