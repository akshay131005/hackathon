import React, { useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";

export type CredentialNodeProps = {
  position: [number, number, number];
  label: string;
  type: "issuer" | "user" | "verifier" | "credential";
  meta: string;
};

export const CredentialNode: React.FC<CredentialNodeProps> = ({
  position,
  label,
  type,
  meta
}) => {
  const ref = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.getElapsedTime();
    ref.current.position.y = position[1] + Math.sin(t * 0.8 + position[0]) * 0.12;
    ref.current.rotation.y = t * 0.25;
  });

  const color =
    type === "issuer"
      ? "#22d3ee"
      : type === "verifier"
      ? "#a855f7"
      : type === "user"
      ? "#6366f1"
      : "#38bdf8";

  const emissive =
    type === "issuer"
      ? "#22d3ee"
      : type === "verifier"
      ? "#a855f7"
      : type === "user"
      ? "#6366f1"
      : "#0ea5e9";

  return (
    <group position={position}>
      <mesh
        ref={ref}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
        }}
        onPointerOut={(e) => {
          e.stopPropagation();
          setHovered(false);
        }}
        scale={hovered ? 1.2 : 1}
      >
        <sphereGeometry args={[0.4, 32, 32]} />
        <meshStandardMaterial
          color={color}
          emissive={emissive}
          emissiveIntensity={hovered ? 1.1 : 0.7}
          metalness={0.7}
          roughness={0.25}
        />
      </mesh>
      {hovered && (
        <Html distanceFactor={10} position={[0, 0.9, 0]}>
          <div className="rounded-xl border border-slate-700 bg-slate-950/95 px-2 py-1 text-[10px] text-slate-100 shadow-lg shadow-slate-900/80">
            <div className="font-semibold">{label}</div>
            <div className="text-[9px] text-slate-400">{meta}</div>
          </div>
        </Html>
      )}
    </group>
  );
};

