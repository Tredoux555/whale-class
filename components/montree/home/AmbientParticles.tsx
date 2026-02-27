// components/montree/home/AmbientParticles.tsx
// CSS-only floating bioluminescent particles
// Pure decoration — no interaction, no JavaScript animation loops
'use client';

import { useMemo } from 'react';
import { BIO } from '@/lib/montree/bioluminescent-theme';

export default function AmbientParticles() {
  const particles = useMemo(() =>
    Array.from({ length: 18 }, (_, i) => ({
      size: 2 + (i % 5),
      color: i % 3 === 0 ? BIO.amber : BIO.mint,
      opacity: 0.08 + (i % 4) * 0.08,
      left: `${(i * 17 + 5) % 100}%`,
      delay: `${i * 2.2}s`,
      duration: `${18 + (i % 6) * 5}s`,
    })),
  []);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0" aria-hidden="true">
      {particles.map((p, i) => (
        <div
          key={i}
          className="absolute rounded-full bio-float-particle"
          style={{
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            opacity: p.opacity,
            left: p.left,
            bottom: '-10px',
            animationDuration: p.duration,
            animationDelay: p.delay,
            willChange: 'transform, opacity',
          }}
        />
      ))}
      {/* Use dangerouslySetInnerHTML instead of styled-jsx for Next.js App Router compatibility */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes bioFloat {
          0% { transform: translateY(0) translateX(0); opacity: 0; }
          8% { opacity: 1; }
          85% { opacity: 1; }
          100% { transform: translateY(-105vh) translateX(25px); opacity: 0; }
        }
        .bio-float-particle {
          animation-name: bioFloat;
          animation-timing-function: linear;
          animation-iteration-count: infinite;
        }
      `}} />
    </div>
  );
}
