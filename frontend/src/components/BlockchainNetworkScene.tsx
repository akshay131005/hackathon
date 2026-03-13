import React, { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";

const NODES = 16;

function Network() {
  const group = useRef<THREE.Group>(null!);

  useFrame(({ clock }) => {
    if (group.current) {
      group.current.rotation.y = clock.getElapsedTime() * 0.05;
    }
  });

  const nodes: THREE.Vector3[] = [];
  for (let i = 0; i < NODES; i++) {
    const angle = (i / NODES) * Math.PI * 2;
    nodes.push(
      new THREE.Vector3(Math.cos(angle) * 3, (Math.random() - 0.5) * 1.5, Math.sin(angle) * 3)
    );
  }

  return (
    <group ref={group}>
      {nodes.map((pos, idx) => (
        <mesh key={idx} position={pos.toArray()}>
          <sphereGeometry args={[0.15, 16, 16]} />
          <meshStandardMaterial emissive="#22d3ee" color="#0ea5e9" />
        </mesh>
      ))}
      {nodes.map((a, i) =>
        nodes.slice(i + 1).map((b, j) => {
          const mid = a.clone().add(b).multiplyScalar(0.5);
          const dir = b.clone().sub(a);
          const len = dir.length();
          const orientation = new THREE.Matrix4();
          orientation.lookAt(a, b, new THREE.Vector3(0, 1, 0));
          orientation.multiply(
            new THREE.Matrix4().makeRotationX(Math.PI / 2)
          );

          return (
            <mesh key={`edge-${i}-${j}`} position={mid.toArray()} matrix={orientation} matrixAutoUpdate={false}>
              <cylinderGeometry args={[0.01, 0.01, len, 8]} />
              <meshStandardMaterial color="#1e293b" />
            </mesh>
          );
        })
      )}
    </group>
  );
}

export const BlockchainNetworkScene: React.FC = () => {
  return (
    <div className="h-80 w-full rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900 to-slate-950 overflow-hidden">
      <Canvas camera={{ position: [0, 4, 8], fov: 45 }}>
        <color attach="background" args={["#020617"]} />
        <ambientLight intensity={0.5} />
        <pointLight position={[5, 5, 5]} intensity={1.2} />
        <Network />
        <OrbitControls enablePan={false} enableZoom={false} />
      </Canvas>
    </div>
  );
};

