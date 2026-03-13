import React, { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { FloatingParticles } from "./FloatingParticles";

const NetworkNodes: React.FC = () => {
  const group = useRef<THREE.Group>(null);
  const nodes = React.useMemo(() => {
    const pts: THREE.Vector3[] = [];
    const count = 18;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const radius = 4 + Math.random() * 2;
      const y = (Math.random() - 0.5) * 2;
      pts.push(new THREE.Vector3(Math.cos(angle) * radius, y, Math.sin(angle) * radius));
    }
    return pts;
  }, []);

  useFrame(({ clock }) => {
    if (!group.current) return;
    const t = clock.getElapsedTime();
    group.current.rotation.y = t * 0.03;
  });

  return (
    <group ref={group}>
      {nodes.map((pos, idx) => (
        <mesh key={idx} position={pos.toArray()}>
          <sphereGeometry args={[0.15, 16, 16]} />
          <meshStandardMaterial emissive="#22d3ee" color="#0ea5e9" />
        </mesh>
      ))}
      {nodes.map((a, i) =>
        nodes.slice(i + 1, i + 4).map((b, j) => {
          const mid = a.clone().add(b).multiplyScalar(0.5);
          const dir = b.clone().sub(a);
          const len = dir.length();
          const orientation = new THREE.Matrix4();
          orientation.lookAt(a, b, new THREE.Vector3(0, 1, 0));
          orientation.multiply(new THREE.Matrix4().makeRotationX(Math.PI / 2));
          return (
            <mesh
              key={`edge-${i}-${j}`}
              position={mid.toArray()}
              matrix={orientation}
              matrixAutoUpdate={false}
            >
              <cylinderGeometry args={[0.015, 0.015, len, 6]} />
              <meshBasicMaterial color="#1e293b" />
            </mesh>
          );
        })
      )}
    </group>
  );
};

const BackgroundOrbs: React.FC = () => {
  const left = useRef<THREE.Mesh>(null);
  const right = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (left.current) left.current.rotation.y = t * 0.1;
    if (right.current) right.current.rotation.y = -t * 0.08;
  });

  return (
    <>
      <mesh ref={left} position={[-6, 3, -4]}>
        <icosahedronGeometry args={[1.6, 0]} />
        <meshStandardMaterial
          color="#6366f1"
          emissive="#6366f1"
          emissiveIntensity={0.4}
          roughness={0.3}
          metalness={0.7}
        />
      </mesh>
      <mesh ref={right} position={[6, -2, -5]}>
        <dodecahedronGeometry args={[1.4, 0]} />
        <meshStandardMaterial
          color="#a855f7"
          emissive="#a855f7"
          emissiveIntensity={0.35}
          roughness={0.3}
          metalness={0.7}
        />
      </mesh>
    </>
  );
};

export const BackgroundScene: React.FC = () => {
  const group = useRef<THREE.Group>(null);
  const { mouse } = useThree();

  useFrame(() => {
    if (!group.current) return;
    const targetX = mouse.x * 0.15;
    const targetY = mouse.y * 0.1;
    group.current.rotation.y += (targetX - group.current.rotation.y) * 0.03;
    group.current.rotation.x += (targetY - group.current.rotation.x) * 0.03;
  });

  return (
    <group ref={group}>
      <ambientLight intensity={0.25} />
      <pointLight position={[4, 6, 5]} intensity={1.1} color="#22d3ee" />
      <pointLight position={[-5, -4, -6]} intensity={0.7} color="#a855f7" />
      <FloatingParticles count={600} radius={10} />
      <NetworkNodes />
      <BackgroundOrbs />
    </group>
  );
};

