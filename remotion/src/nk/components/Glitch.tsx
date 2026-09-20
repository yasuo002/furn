import React from 'react';
import {AbsoluteFill, interpolate, random, useCurrentFrame, useVideoConfig} from 'remotion';
import {nk} from '../theme';

/** Sinyal bozulmasi: belirli karelerde yatay dilimler kayar, RGB ayrismasi. Sahne gecislerinde kullan. */
export const Glitch: React.FC<{children: React.ReactNode; at?: number[]; strength?: number}> = ({children, at = [0], strength = 1}) => {
  const frame = useCurrentFrame();
  const {durationInFrames} = useVideoConfig();
  const marks = [...at, durationInFrames - 8];
  const active = marks.some((m) => frame >= m && frame < m + 8);
  if (!active) return <AbsoluteFill>{children}</AbsoluteFill>;
  const slices = 7;
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{filter: 'saturate(1.6)'}}>{children}</AbsoluteFill>
      {Array.from({length: slices}).map((_, i) => {
        const top = (i / slices) * 100;
        const dx = (random(`g${frame}-${i}`) - 0.5) * 60 * strength;
        return (
          <AbsoluteFill key={i} style={{clipPath: `inset(${top}% 0 ${100 - top - 100 / slices}% 0)`, transform: `translateX(${dx}px)`}}>
            {children}
          </AbsoluteFill>
        );
      })}
      <AbsoluteFill style={{background: nk.red, mixBlendMode: 'screen', opacity: 0.06, transform: 'translateX(-6px)'}} />
      <AbsoluteFill style={{backgroundImage: 'repeating-linear-gradient(0deg, rgba(255,255,255,0.08) 0 2px, transparent 2px 6px)'}} />
    </AbsoluteFill>
  );
};

/** CRT televizyon cercevesi (propaganda yayini hissi). */
export const CRT: React.FC<{children: React.ReactNode; label?: string}> = ({children, label = 'KCTV · CANLI'}) => {
  const frame = useCurrentFrame();
  const roll = (frame * 3) % 1400 - 200;
  return (
    <AbsoluteFill style={{padding: 60}}>
      <div style={{position: 'relative', width: '100%', height: '100%', borderRadius: 26, overflow: 'hidden', boxShadow: '0 0 0 10px #1a1f2c, 0 0 80px rgba(0,0,0,0.8)', transform: 'perspective(1800px) rotateX(1.5deg)'}}>
        <AbsoluteFill>{children}</AbsoluteFill>
        <div style={{position: 'absolute', left: 0, right: 0, top: roll, height: 160, background: 'linear-gradient(180deg, transparent, rgba(255,255,255,0.07), transparent)'}} />
        <AbsoluteFill style={{backgroundImage: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.18) 0 2px, transparent 2px 5px)'}} />
        <AbsoluteFill style={{background: 'radial-gradient(ellipse at center, transparent 60%, rgba(0,0,0,0.6) 100%)'}} />
        <div style={{position: 'absolute', left: 30, top: 24, fontFamily: 'monospace', fontSize: 22, color: nk.red, letterSpacing: 3, opacity: Math.floor(frame / 20) % 2 ? 1 : 0.4}}>● {label}</div>
      </div>
    </AbsoluteFill>
  );
};

/** Yumusak fade; alt sahne icinde hizli kullanim. */
export const Fade: React.FC<{children: React.ReactNode; in?: number; out?: number}> = ({children, in: fi = 12, out = 12}) => {
  const frame = useCurrentFrame();
  const {durationInFrames} = useVideoConfig();
  const o = interpolate(frame, [0, fi, durationInFrames - out, durationInFrames], [0, 1, 1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return <AbsoluteFill style={{opacity: o}}>{children}</AbsoluteFill>;
};
