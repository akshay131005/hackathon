import React, { Suspense, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";

type FloatingOrbProps = {
  color: string;
  radius: number;
  position: [number, number, number];
  delay: number;
};

const FloatingOrb: React.FC<FloatingOrbProps> = ({
  color,
  radius,
  position,
  delay
}) => {
  const ref = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.getElapsedTime() + delay;
    ref.current.position.y = position[1] + Math.sin(t * 1.2) * 0.25;
    ref.current.position.x = position[0] + Math.cos(t * 0.8) * 0.15;
    ref.current.rotation.y = t * 0.6;
  });

  return (
    <mesh ref={ref} position={position}>
      <sphereGeometry args={[radius, 48, 48]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={0.9}
        roughness={0.1}
        metalness={0.6}
      />
    </mesh>
  );
};

const CoreNode: React.FC = () => {
  const ref = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.getElapsedTime();
    ref.current.rotation.y = t * 0.3;
    ref.current.rotation.x = Math.sin(t * 0.4) * 0.1;
  });

  return (
    <mesh ref={ref}>
      <icosahedronGeometry args={[1.1, 1]} />
      <meshStandardMaterial
        color="#6366f1"
        emissive="#22d3ee"
        emissiveIntensity={0.8}
        metalness={0.8}
        roughness={0.15}
      />
    </mesh>
  );
};

const FloatingRings: React.FC = () => {
  const group = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (!group.current) return;
    const t = clock.getElapsedTime();
    group.current.rotation.y = t * 0.1;
  });

  return (
    <group ref={group}>
      {[1.8, 2.3, 2.8].map((radius, idx) => (
        <mesh key={radius} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[radius, 0.02 + idx * 0.01, 32, 128]} />
          <meshBasicMaterial
            color={idx % 2 === 0 ? "#22d3ee" : "#a855f7"}
            transparent
            opacity={0.3 - idx * 0.05}
          />
        </mesh>
      ))}
    </group>
  );
};

const Particles: React.FC = () => {
  const ref = useRef<THREE.Points>(null);
  const count = 600;
  const positions = React.useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const r = 4.2 * Math.random() + 1.5;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.sin(phi) * Math.sin(theta);
      const z = r * Math.cos(phi);
      arr[i * 3 + 0] = x;
      arr[i * 3 + 1] = y;
      arr[i * 3 + 2] = z;
    }
    return arr;
  }, []);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.getElapsedTime();
    ref.current.rotation.y = t * 0.04;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute
          attach={"attributes-position"}
          count={positions.length / 3}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.03}
        sizeAttenuation
        color="#22d3ee"
        transparent
        opacity={0.6}
      />
    </points>
  );
};

const Scene: React.FC = () => {
  const group = useRef<THREE.Group>(null);

  useFrame(({ mouse }) => {
    if (!group.current) return;
    const targetX = mouse.x * 0.5;
    const targetY = mouse.y * 0.4;
    group.current.rotation.y += (targetX - group.current.rotation.y) * 0.04;
    group.current.rotation.x += (targetY - group.current.rotation.x) * 0.04;
  });

  return (
    <group ref={group}>
      <CoreNode />
      <FloatingRings />
      <Particles />
      <FloatingOrb
        color="#22d3ee"
        radius={0.35}
        position={[2.4, 0.4, 0.6]}
        delay={0}
      />
      <FloatingOrb
        color="#a855f7"
        radius={0.32}
        position={[-2.1, 0.8, -0.4]}
        delay={1.2}
      />
      <FloatingOrb
        color="#6366f1"
        radius={0.28}
        position={[0.5, -1.4, 1.2]}
        delay={2.4}
      />
    </group>
  );
};

export const Hero3D: React.FC = () => {
  return (
    <div className="relative h-[480px] w-full overflow-hidden rounded-3xl border border-slate-800/80 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 shadow-[0_0_80px_rgba(56,189,248,0.25)]">
      <Canvas camera={{ position: [0, 0, 7], fov: 45 }}>
        <color attach="background" args={["#020617"]} />
        <ambientLight intensity={0.4} />
        <pointLight position={[3, 4, 4]} intensity={1.4} color="#22d3ee" />
        <pointLight position={[-3, -4, -4]} intensity={1.2} color="#a855f7" />
        <Suspense fallback={null}>
          <Scene />
        </Suspense>
        <OrbitControls
          enableZoom={false}
          enablePan={false}
          enableRotate={false}
        />
      </Canvas>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.25),_transparent_55%)] mix-blend-screen opacity-70" />
    </div>
  );
};

