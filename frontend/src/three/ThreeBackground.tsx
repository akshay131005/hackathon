import React, { useEffect, useRef } from "react";
import { Canvas } from "@react-three/fiber";
import gsap from "gsap";
import { BackgroundScene } from "./BackgroundScene";

export const ThreeBackground: React.FC = () => {
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!wrapperRef.current) return;
    gsap.fromTo(
      wrapperRef.current,
      { opacity: 0 },
      { opacity: 0.7, duration: 1.2, ease: "power2.out" }
    );
  }, []);

  return (
    <div
      ref={wrapperRef}
      className="pointer-events-none fixed inset-0 -z-10 opacity-70"
    >
      <Canvas camera={{ position: [0, 0, 12], fov: 55 }}>
        <color attach="background" args={["#020617"]} />
        <BackgroundScene />
      </Canvas>
    </div>
  );
};

