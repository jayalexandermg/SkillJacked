'use client';

import { useState, useEffect } from 'react';

const STATUS_MESSAGES = [
  'Extracting transcript...',
  'Analyzing frameworks...',
  'Distilling techniques...',
  'Weaving skill together...',
  'Formatting skill file...',
];

// Deterministic (not random) so server and client render identically —
// avoids Next.js hydration mismatches while still looking organic.
const PARTICLE_COUNT = 14;
const PARTICLES = Array.from({ length: PARTICLE_COUNT }, (_, i) => {
  const angle = (i / PARTICLE_COUNT) * Math.PI * 2;
  const radius = 92 + (i % 3) * 10; // slight radius variance per particle
  return {
    sx: Math.cos(angle) * radius,
    sy: Math.sin(angle) * radius,
    duration: 2.6 + (i % 4) * 0.45,
    delay: (i * 0.17) % 2.6,
    size: i % 5 === 0 ? 5 : i % 3 === 0 ? 3.5 : 2.5,
    color: i % 3 === 0 ? '#e0c866' : i % 3 === 1 ? '#c4a84d' : '#f8fafc',
  };
});

export default function LoadingState() {
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % STATUS_MESSAGES.length);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full max-w-2xl mx-auto text-center py-16">
      {/* Energy core — particles converging while a "skill card" draws itself */}
      <div className="relative w-56 h-56 mx-auto mb-8">
        {/* Breathing ambient glow */}
        <div className="energy-glow absolute inset-0 rounded-full bg-accent/30 blur-2xl" />

        {/* Counter-rotating energy rings */}
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 224 224" fill="none">
          <circle
            cx="112"
            cy="112"
            r="96"
            stroke="url(#ringGradA)"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeDasharray="40 20 8 20 60 20 8 40"
            className="energy-ring-a origin-center"
          />
          <circle
            cx="112"
            cy="112"
            r="78"
            stroke="url(#ringGradB)"
            strokeWidth="1"
            strokeLinecap="round"
            strokeDasharray="10 14 4 14 30 14"
            className="energy-ring-b origin-center"
          />
          <defs>
            <linearGradient id="ringGradA" x1="0" y1="0" x2="224" y2="224">
              <stop offset="0%" stopColor="#e0c866" stopOpacity="0" />
              <stop offset="50%" stopColor="#e0c866" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#c4a84d" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="ringGradB" x1="224" y1="0" x2="0" y2="224">
              <stop offset="0%" stopColor="#c4a84d" stopOpacity="0" />
              <stop offset="50%" stopColor="#f0d876" stopOpacity="0.7" />
              <stop offset="100%" stopColor="#e0c866" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>

        {/* Particles drawn inward toward the forming skill */}
        {PARTICLES.map((p, i) => (
          <span
            key={i}
            className="particle absolute top-1/2 left-1/2 rounded-full"
            style={
              {
                width: p.size,
                height: p.size,
                background: p.color,
                boxShadow: `0 0 6px ${p.color}`,
                '--sx': `${p.sx}px`,
                '--sy': `${p.sy}px`,
                '--dur': `${p.duration}s`,
                '--delay': `${p.delay}s`,
              } as React.CSSProperties
            }
          />
        ))}

        {/* The skill itself, drawn in a continuous loop */}
        <svg className="absolute inset-0 w-full h-full drop-shadow-[0_0_10px_rgba(224,200,102,0.5)]" viewBox="0 0 224 224" fill="none">
          <rect
            x="62"
            y="52"
            width="100"
            height="120"
            rx="12"
            stroke="url(#cardGrad)"
            strokeWidth="2.5"
            className="draw-stroke"
            style={{ '--len': 420, animationDelay: '0s' } as React.CSSProperties}
          />
          <path
            d="M78 88 H146"
            stroke="#e0c866"
            strokeWidth="2"
            strokeLinecap="round"
            className="draw-stroke"
            style={{ '--len': 68, animationDelay: '0.9s' } as React.CSSProperties}
          />
          <path
            d="M78 108 H146"
            stroke="#e0c866"
            strokeWidth="2"
            strokeLinecap="round"
            className="draw-stroke"
            style={{ '--len': 68, animationDelay: '1.05s' } as React.CSSProperties}
          />
          <path
            d="M78 128 H120"
            stroke="#e0c866"
            strokeWidth="2"
            strokeLinecap="round"
            className="draw-stroke"
            style={{ '--len': 42, animationDelay: '1.2s' } as React.CSSProperties}
          />
          <defs>
            <linearGradient id="cardGrad" x1="62" y1="52" x2="162" y2="172">
              <stop offset="0%" stopColor="#f0d876" />
              <stop offset="100%" stopColor="#c4a84d" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* Status text */}
      <p key={messageIndex} className="status-fade text-accent font-body text-lg">
        {STATUS_MESSAGES[messageIndex]}
      </p>

      <style jsx>{`
        .energy-glow {
          animation: breathe 3.2s ease-in-out infinite;
        }
        @keyframes breathe {
          0%, 100% { opacity: 0.35; transform: scale(0.92); }
          50% { opacity: 0.65; transform: scale(1.05); }
        }

        .energy-ring-a {
          animation: spin-cw 9s linear infinite;
        }
        .energy-ring-b {
          animation: spin-ccw 7s linear infinite;
        }
        @keyframes spin-cw {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes spin-ccw {
          from { transform: rotate(0deg); }
          to { transform: rotate(-360deg); }
        }

        .particle {
          animation-name: particle-converge;
          animation-duration: var(--dur);
          animation-delay: var(--delay);
          animation-timing-function: ease-in;
          animation-iteration-count: infinite;
        }
        @keyframes particle-converge {
          0% {
            transform: translate(calc(-50% + var(--sx)), calc(-50% + var(--sy))) scale(1);
            opacity: 0;
          }
          15% { opacity: 1; }
          80% { opacity: 0.9; }
          100% {
            transform: translate(-50%, -50%) scale(0.2);
            opacity: 0;
          }
        }

        .draw-stroke {
          stroke-dasharray: var(--len);
          stroke-dashoffset: var(--len);
          animation: stroke-draw 4.5s ease-in-out infinite;
        }
        @keyframes stroke-draw {
          0% { stroke-dashoffset: var(--len); opacity: 0; }
          8% { opacity: 1; }
          50% { stroke-dashoffset: 0; opacity: 1; }
          80% { stroke-dashoffset: 0; opacity: 1; }
          94% { opacity: 0; }
          100% { stroke-dashoffset: var(--len); opacity: 0; }
        }

        .status-fade {
          animation: fade-in-up 0.4s ease-out;
        }
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @media (prefers-reduced-motion: reduce) {
          .energy-glow,
          .energy-ring-a,
          .energy-ring-b,
          .particle,
          .draw-stroke,
          .status-fade {
            animation: none !important;
          }
          .draw-stroke {
            stroke-dashoffset: 0;
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
