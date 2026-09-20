import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {nk} from '../theme';
import {display, sans} from '../../components/Fonts';

/** Tum video boyunca duran "dosya" cercevesi: kose parantezleri, ust bant, tarama cizgileri, ilerleme. */
export const Chrome: React.FC<{label: string; index: number; total: number; progress: number}> = ({label, index, total, progress}) => {
  const frame = useCurrentFrame();
  const {width, height} = useVideoConfig();
  const blink = Math.floor(frame / 15) % 2 === 0;
  const m = 40;
  const L = 34;
  const corner = (x: number, y: number, sx: number, sy: number) => (
    <path d={`M${x + sx * L},${y} L${x},${y} L${x},${y + sy * L}`} fill="none" stroke={nk.paper} strokeWidth={2} opacity={0.55} />
  );
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      <svg width={width} height={height} style={{position: 'absolute', inset: 0}}>
        {corner(m, m, 1, 1)}
        {corner(width - m, m, -1, 1)}
        {corner(m, height - m, 1, -1)}
        {corner(width - m, height - m, -1, -1)}
        <line x1={m} y1={height - m - 12} x2={m + (width - 2 * m) * progress} y2={height - m - 12} stroke={nk.red} strokeWidth={2} />
      </svg>
      <div style={{position: 'absolute', left: m + 14, top: m + 6, fontFamily: display, fontSize: 20, letterSpacing: 5, color: nk.paperDim}}>
        DOSYA {String(index).padStart(2, '0')}/{String(total).padStart(2, '0')} <span style={{color: nk.red}}>■</span> {label.toUpperCase()}
      </div>
      <div style={{position: 'absolute', right: m + 14, top: m + 6, fontFamily: sans, fontSize: 16, letterSpacing: 3, color: nk.paperDim}}>
        KUZEY KORE <span style={{color: nk.red, opacity: blink ? 1 : 0.2}}>●</span> KAYIT
      </div>
      {/* tarama cizgileri */}
      <AbsoluteFill style={{backgroundImage: 'repeating-linear-gradient(0deg, rgba(255,255,255,0.025) 0 1px, transparent 1px 4px)', mixBlendMode: 'overlay'}} />
      {/* yavas gecen parlak bant (CRT) */}
      <div style={{position: 'absolute', left: 0, right: 0, top: ((frame * 2) % (height + 300)) - 300, height: 220, background: 'linear-gradient(180deg, transparent, rgba(255,255,255,0.03), transparent)'}} />
    </AbsoluteFill>
  );
};

/** Arka plan: lacivert zemin + hafif izgara + koseden gelen kirmizi isik + vinyet. */
export const NKBackground: React.FC<{redGlow?: number}> = ({redGlow = 0.12}) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{background: nk.bg}}>
      <AbsoluteFill style={{backgroundImage: 'linear-gradient(rgba(236,230,214,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(236,230,214,0.035) 1px, transparent 1px)', backgroundSize: '80px 80px', backgroundPosition: `${(frame * 0.2) % 80}px 0`}} />
      <AbsoluteFill style={{background: `radial-gradient(900px 600px at ${15 + Math.sin(frame / 200) * 5}% 110%, rgba(200,16,46,${redGlow}), transparent 70%)`}} />
      <AbsoluteFill style={{background: 'radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.8) 100%)'}} />
    </AbsoluteFill>
  );
};

/** Kirmizi diyagonal seritler (propaganda afisi dokusu), kayar. */
export const Stripes: React.FC<{opacity?: number}> = ({opacity = 0.08}) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{opacity, backgroundImage: `repeating-linear-gradient(135deg, ${nk.red} 0 40px, transparent 40px 120px)`, backgroundPosition: `${frame * 1.5}px 0`}} />
  );
};
