import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {theme} from '../theme';

/** Koyu zemin + hafif hareketli kum dokusu + vinyet + film greni. */
export const Background: React.FC<{tint?: string}> = ({tint = theme.bg}) => {
  const frame = useCurrentFrame();
  const drift = (frame * 0.15) % 200;
  return (
    <AbsoluteFill style={{background: tint}}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(1200px 700px at ${50 + Math.sin(frame / 90) * 6}% 40%, rgba(224,164,88,0.10), transparent 70%)`,
        }}
      />
      <AbsoluteFill
        style={{
          backgroundImage:
            'repeating-linear-gradient(115deg, rgba(255,255,255,0.012) 0 2px, transparent 2px 7px)',
          backgroundPosition: `${drift}px 0`,
          mixBlendMode: 'screen',
        }}
      />
      <AbsoluteFill
        style={{background: 'radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.75) 100%)'}}
      />
    </AbsoluteFill>
  );
};

export const Grain: React.FC = () => {
  const frame = useCurrentFrame();
  // Kare kare degisen ince gren; ucuz ama etkili.
  const seed = (frame * 37) % 97;
  return (
    <AbsoluteFill
      style={{
        pointerEvents: 'none',
        opacity: 0.08,
        mixBlendMode: 'overlay',
        backgroundImage: `radial-gradient(rgba(255,255,255,0.9) 0.6px, transparent 0.8px)`,
        backgroundSize: `${3 + (seed % 3)}px ${3 + ((seed * 7) % 3)}px`,
        backgroundPosition: `${seed}px ${(seed * 3) % 50}px`,
      }}
    />
  );
};
