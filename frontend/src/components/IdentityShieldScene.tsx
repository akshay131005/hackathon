import React, { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

const PARTICLE_COUNT = 120;

function OrbitingParticles() {
  const ref = useRef<THREE.Points>(null!);

  const { positions, speeds, radii, offsets } = useMemo(() => {
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const speeds = new Float32Array(PARTICLE_COUNT);
    const radii = new Float32Array(PARTICLE_COUNT);
    const offsets = new Float32Array(PARTICLE_COUNT);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      radii[i] = 1.4 + Math.random() * 1.6;
      speeds[i] = 0.2 + Math.random() * 0.6;
      offsets[i] = Math.random() * Math.PI * 2;
      const angle = offsets[i];
      positions[i * 3] = Math.cos(angle) * radii[i];
      positions[i * 3 + 1] = (Math.random() - 0.5) * 1.8;
      positions[i * 3 + 2] = Math.sin(angle) * radii[i];
    }
    return { positions, speeds, radii, offsets };
  }, []);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const pos = ref.current.geometry.attributes.position.array as Float32Array;
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const angle = offsets[i] + t * speeds[i];
      pos[i * 3] = Math.cos(angle) * radii[i];
      pos[i * 3 + 2] = Math.sin(angle) * radii[i];
    }
    ref.current.geometry.attributes.position.needsUpdate = true;
    ref.current.rotation.y = t * 0.05;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
          count={PARTICLE_COUNT}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.035}
        color="#22d3ee"
        transparent
        opacity={0.7}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  );
}

function GlowRing({ radius, color, speed, tilt }: { radius: number; color: string; speed: number; tilt: number }) {
  const ref = useRef<THREE.Mesh>(null!);

  useFrame(({ clock }) => {
    ref.current.rotation.z = clock.getElapsedTime() * speed;
  });

  return (
    <mesh ref={ref} rotation={[tilt, 0, 0]}>
      <torusGeometry args={[radius, 0.012, 16, 100]} />
      <meshBasicMaterial color={color} transparent opacity={0.45} />
    </mesh>
  );
}

function CoreSphere() {
  const groupRef = useRef<THREE.Group>(null!);
  const innerRef = useRef<THREE.Mesh>(null!);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    groupRef.current.rotation.y = t * 0.35;
    groupRef.current.rotation.x = Math.sin(t * 0.2) * 0.1;
    const s = 1 + Math.sin(t * 1.5) * 0.04;
    innerRef.current.scale.set(s, s, s);
  });

  return (
    <group ref={groupRef}>
      {/* inner glowing core */}
      <mesh ref={innerRef}>
        <icosahedronGeometry args={[0.5, 2]} />
        <meshStandardMaterial
          color="#a855f7"
          emissive="#c084fc"
          emissiveIntensity={0.8}
          roughness={0.2}
          metalness={0.6}
        />
      </mesh>

      {/* translucent shield layer */}
      <mesh>
        <icosahedronGeometry args={[0.72, 1]} />
        <meshStandardMaterial
          color="#22d3ee"
          transparent
          opacity={0.12}
          emissive="#22d3ee"
          emissiveIntensity={0.3}
          wireframe
        />
      </mesh>

      {/* outer glow shell */}
      <mesh>
        <sphereGeometry args={[0.95, 32, 32]} />
        <meshStandardMaterial
          color="#22d3ee"
          transparent
          opacity={0.06}
          emissive="#22d3ee"
          emissiveIntensity={0.2}
        />
      </mesh>
    </group>
  );
}

function DataStream() {
  const ref = useRef<THREE.Points>(null!);
  const count = 40;

  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 0.3;
      arr[i * 3 + 1] = -2 + Math.random() * 4;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 0.3;
    }
    return arr;
  }, []);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const pos = ref.current.geometry.attributes.position.array as Float32Array;
    for (let i = 0; i < count; i++) {
      pos[i * 3 + 1] += 0.015;
      if (pos[i * 3 + 1] > 2) pos[i * 3 + 1] = -2;
    }
    ref.current.geometry.attributes.position.needsUpdate = true;
    ref.current.rotation.y = t * 0.3;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} count={count} />
      </bufferGeometry>
      <pointsMaterial
        size={0.04}
        color="#a855f7"
        transparent
        opacity={0.6}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  );
}

export const IdentityShieldScene: React.FC = () => {
  return (
    <div className="relative h-52 w-full overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <Canvas camera={{ position: [0, 0, 4], fov: 45 }}>
        <color attach="background" args={["#020617"]} />
        <ambientLight intensity={0.3} />
        <pointLight position={[3, 3, 3]} intensity={1.2} color="#22d3ee" />
        <pointLight position={[-3, -2, -3]} intensity={0.6} color="#a855f7" />
        <pointLight position={[0, 0, 4]} intensity={0.4} color="#6366f1" />

        <CoreSphere />
        <GlowRing radius={1.3} color="#22d3ee" speed={0.3} tilt={Math.PI / 6} />
        <GlowRing radius={1.6} color="#a855f7" speed={-0.2} tilt={-Math.PI / 4} />
        <GlowRing radius={2.0} color="#6366f1" speed={0.15} tilt={Math.PI / 3} />
        <OrbitingParticles />
        <DataStream />
      </Canvas>

      {/* overlay label */}
      <div className="pointer-events-none absolute bottom-3 left-3 right-3 flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-400/60">
          Identity Shield
        </span>
        <span className="text-[9px] text-slate-500">Zero-knowledge protected</span>
      </div>
    </div>
  );
};
