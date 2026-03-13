import React, { useEffect, useRef } from "react";
import gsap from "gsap";

export const ProofVisualization: React.FC = () => {
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (!svgRef.current) return;
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        repeat: -1,
        repeatDelay: 1.2,
        defaults: { ease: "power2.out" }
      });

      tl.set(".pv-packet", { opacity: 0 });
      tl.set("#pv-check", { scale: 0, opacity: 0, transformOrigin: "center" });
      tl.set("#pv-shield-glow", { opacity: 0, scale: 0.6, transformOrigin: "center" });
      tl.set(".pv-path-line", { strokeDasharray: "0 300", strokeDashoffset: 0 });

      // User pulses
      tl.fromTo(
        "#pv-user",
        { scale: 0.85, opacity: 0.5, transformOrigin: "30px 55px" },
        { scale: 1, opacity: 1, duration: 0.5 }
      );

      // User label fades in
      tl.fromTo("#pv-user-label", { opacity: 0 }, { opacity: 1, duration: 0.3 }, "-=0.2");

      // Path 1 draws
      tl.to("#pv-path1", { strokeDasharray: "300 0", duration: 0.7 }, "-=0.1");

      // Packet 1 travels
      tl.fromTo(
        "#pv-pkt1",
        { opacity: 0, x: 0, y: 0 },
        { opacity: 1, x: 55, y: -8, duration: 0.6 },
        "-=0.5"
      ).to("#pv-pkt1", { opacity: 0, duration: 0.2 });

      // Shield appears with glow
      tl.fromTo(
        "#pv-shield",
        { scale: 0.5, opacity: 0, transformOrigin: "130px 50px" },
        { scale: 1, opacity: 1, duration: 0.5, ease: "back.out(1.7)" },
        "-=0.2"
      );
      tl.fromTo(
        "#pv-shield-glow",
        { opacity: 0, scale: 0.6 },
        { opacity: 0.6, scale: 1.2, duration: 0.6, transformOrigin: "130px 50px" },
        "-=0.4"
      ).to("#pv-shield-glow", { opacity: 0.15, scale: 1, duration: 0.4 });

      // Proof ring spins in
      tl.fromTo(
        "#pv-ring",
        { scale: 0.4, opacity: 0, rotation: -90, transformOrigin: "130px 50px" },
        { scale: 1, opacity: 1, rotation: 0, duration: 0.7, ease: "back.out(1.4)" },
        "-=0.5"
      );

      // ZK label
      tl.fromTo("#pv-zk-label", { opacity: 0 }, { opacity: 1, duration: 0.3 }, "-=0.3");

      // Path 2 draws
      tl.to("#pv-path2", { strokeDasharray: "300 0", duration: 0.8 }, "-=0.1");

      // Packet 2
      tl.fromTo(
        "#pv-pkt2",
        { opacity: 0, x: 0, y: 0 },
        { opacity: 1, x: 65, y: 4, duration: 0.7 },
        "-=0.6"
      ).to("#pv-pkt2", { opacity: 0, duration: 0.2 });

      // Verifier glows
      tl.fromTo(
        "#pv-verifier",
        { scale: 0.85, opacity: 0.5, transformOrigin: "230px 55px" },
        { scale: 1, opacity: 1, duration: 0.4, ease: "back.out(1.2)" },
        "-=0.3"
      );

      // Check mark pops
      tl.fromTo(
        "#pv-check",
        { scale: 0, opacity: 0 },
        { scale: 1, opacity: 1, duration: 0.4, ease: "back.out(2)" }
      );

      // Status label
      tl.fromTo("#pv-status", { opacity: 0, y: 5 }, { opacity: 1, y: 0, duration: 0.3 });

      // Hold then fade
      tl.to({}, { duration: 1.5 });
      tl.to(
        "#pv-flow",
        { opacity: 0.3, duration: 1, ease: "power1.inOut" }
      );
      tl.set("#pv-flow", { opacity: 1 });

    }, svgRef);

    return () => ctx.revert();
  }, []);

  return (
    <svg
      ref={svgRef}
      viewBox="0 0 280 110"
      className="h-32 w-full"
    >
      <defs>
        <linearGradient id="pv-grad" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stopColor="#22d3ee" />
          <stop offset="50%" stopColor="#6366f1" />
          <stop offset="100%" stopColor="#a855f7" />
        </linearGradient>
        <radialGradient id="pv-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
        </radialGradient>
        <filter id="pv-blur">
          <feGaussianBlur stdDeviation="3" />
        </filter>
      </defs>

      <g id="pv-flow" fill="none" strokeWidth="1.5">
        {/* grid dots background */}
        {Array.from({ length: 12 }).map((_, row) =>
          Array.from({ length: 20 }).map((_, col) => (
            <circle
              key={`dot-${row}-${col}`}
              cx={14 * col + 7}
              cy={10 * row + 5}
              r="0.4"
              fill="#334155"
              opacity="0.4"
            />
          ))
        )}

        {/* user node */}
        <g id="pv-user">
          <circle cx="30" cy="55" r="16" fill="#0f172a" stroke="#22d3ee" strokeWidth="1.2" />
          <circle cx="30" cy="49" r="4.5" fill="none" stroke="#22d3ee" strokeWidth="0.8" />
          <path d="M22 63 Q30 57 38 63" stroke="#22d3ee" strokeWidth="0.8" fill="none" />
        </g>
        <text id="pv-user-label" x="30" y="80" textAnchor="middle" fontSize="7" fill="#94a3b8" fontWeight="600">
          Holder
        </text>

        {/* path 1 */}
        <path
          id="pv-path1"
          className="pv-path-line"
          d="M46 55 C 70 35, 95 35, 115 45"
          stroke="url(#pv-grad)"
          strokeLinecap="round"
        />

        {/* shield / ZK prover */}
        <circle id="pv-shield-glow" cx="130" cy="50" r="24" fill="url(#pv-glow)" filter="url(#pv-blur)" />
        <g id="pv-shield">
          <circle cx="130" cy="50" r="18" fill="#0f172a" stroke="#22d3ee" strokeWidth="1" strokeDasharray="3 3" />
          <path
            d="M130 38 L140 42 L138 52 C137 56,133 59,130 60 C127 59,123 56,122 52 L120 42 Z"
            fill="#0f172a"
            stroke="#6366f1"
            strokeWidth="1.2"
          />
          <circle cx="130" cy="49" r="3.5" fill="none" stroke="#22d3ee" strokeWidth="0.8" />
          <path d="M128 49 L129.5 50.5 L133 47" stroke="#22d3ee" strokeWidth="0.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </g>
        <circle
          id="pv-ring"
          cx="130"
          cy="50"
          r="22"
          fill="none"
          stroke="#a855f7"
          strokeWidth="0.8"
          strokeDasharray="4 6"
        />
        <text id="pv-zk-label" x="130" y="82" textAnchor="middle" fontSize="7" fill="#a78bfa" fontWeight="600">
          ZK Prover
        </text>

        {/* path 2 */}
        <path
          id="pv-path2"
          className="pv-path-line"
          d="M152 50 C 175 55, 195 55, 214 55"
          stroke="url(#pv-grad)"
          strokeLinecap="round"
        />

        {/* verifier node */}
        <g id="pv-verifier">
          <rect x="214" y="39" width="32" height="32" rx="8" fill="#0f172a" stroke="#a855f7" strokeWidth="1.2" />
          <path d="M224 55 L230 49 L236 55 L230 61 Z" fill="none" stroke="#a855f7" strokeWidth="0.8" />
          <circle cx="230" cy="55" r="2" fill="#a855f7" />
        </g>
        <text x="230" y="82" textAnchor="middle" fontSize="7" fill="#94a3b8" fontWeight="600">
          Verifier
        </text>

        {/* check mark */}
        <g id="pv-check" transform="translate(240 34)">
          <circle cx="0" cy="0" r="7" fill="#059669" />
          <path d="M-3 0 L-1 2 L4 -3" stroke="#e5e7eb" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </g>

        {/* status text */}
        <text id="pv-status" x="140" y="100" textAnchor="middle" fontSize="6.5" fill="#22d3ee" opacity="0">
          Privacy Preserved - No Data Exposed
        </text>

        {/* packets */}
        <circle id="pv-pkt1" className="pv-packet" cx="46" cy="55" r="2.5" fill="#22d3ee" />
        <circle id="pv-pkt2" className="pv-packet" cx="152" cy="50" r="2.5" fill="#a855f7" />
      </g>
    </svg>
  );
};
