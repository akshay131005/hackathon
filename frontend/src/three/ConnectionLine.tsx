import React, { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

type ConnectionLineProps = {
  from: [number, number, number];
  to: [number, number, number];
};

export const ConnectionLine: React.FC<ConnectionLineProps> = ({ from, to }) => {
  const ref = useRef<THREE.Mesh>(null);
  const start = new THREE.Vector3(...from);
  const end = new THREE.Vector3(...to);
  const mid = start.clone().add(end).multiplyScalar(0.5);
  const dir = end.clone().sub(start);
  const len = dir.length();
  const orientation = new THREE.Matrix4();
  orientation.lookAt(start, end, new THREE.Vector3(0, 1, 0));
  orientation.multiply(new THREE.Matrix4().makeRotationX(Math.PI / 2));

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.getElapsedTime();
    const intensity = 0.4 + 0.3 * Math.sin(t * 2);
    (ref.current.material as THREE.MeshBasicMaterial).color.setRGB(
      0.3 + intensity,
      0.6 + intensity * 0.2,
      1
    );
  });

  return (
    <mesh
      ref={ref}
      position={mid.toArray()}
      matrix={orientation}
      matrixAutoUpdate={false}
    >
      <cylinderGeometry args={[0.03, 0.03, len, 12]} />
      <meshBasicMaterial color="#38bdf8" />
    </mesh>
  );
};

