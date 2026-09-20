import React from 'react';
import {interpolate, useCurrentFrame, useVideoConfig, Easing} from 'remotion';
import {theme} from '../theme';
import {sans, serif} from './Fonts';

/** Koridora yuvarlanan tas kapi: ust gorunus (plan) semasi. */
export const StoneDoor: React.FC = () => {
  const frame = useCurrentFrame();
  const {width, height, durationInFrames} = useVideoConfig();
  const roll = interpolate(frame, [40, 110], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.inOut(Easing.cubic)});
  const enemy = interpolate(frame, [0, 90], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const fade = interpolate(frame, [0, 15, durationInFrames - 15, durationInFrames], [0, 1, 1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const cx = width / 2;
  const cy = height / 2;
  const r = 110;
  const slotX = cx + 260; // kapinin park yuvasi
  const doorX = interpolate(roll, [0, 1], [slotX, cx]);
  const rot = roll * 540;
  return (
    <div style={{position: 'absolute', inset: 0, opacity: fade}}>
      <svg width={width} height={height}>
        <text x={cx} y={150} textAnchor="middle" fill={theme.ink} fontFamily={serif} fontSize={48}>
          Taş kapı nasıl çalışır? (üstten görünüm)
        </text>
        {/* kaya */}
        <rect x={0} y={cy - 320} width={width} height={640} fill="#3a2e22" />
        {/* koridor */}
        <rect x={0} y={cy - 60} width={width} height={120} fill="#0b0a09" />
        {/* yuva */}
        <rect x={slotX - r - 10} y={cy - r - 10 - 120} width={r * 2 + 20} height={r * 2 + 20 + 120} fill="#0b0a09" />
        <text x={slotX} y={cy - r - 140} textAnchor="middle" fill={theme.sandDim} fontFamily={sans} fontSize={22}>
          kapı yuvası (sadece içeriden itilir)
        </text>
        {/* dusman */}
        {Array.from({length: 4}).map((_, i) => (
          <g key={i} transform={`translate(${-200 + enemy * (cx - 220) - i * 90}, ${cy})`} opacity={0.9}>
            <circle r={16} fill={theme.danger} />
            <line x1={0} y1={0} x2={60} y2={0} stroke={theme.danger} strokeWidth={4} />
          </g>
        ))}
        <text x={260} y={cy - 90} fill={theme.danger} fontFamily={sans} fontSize={24}>
          tek sıra, eğilerek ilerlemek zorunda
        </text>
        {/* kapi */}
        <g transform={`translate(${doorX}, ${cy}) rotate(${rot})`}>
          <circle r={r} fill="#6b5a44" stroke={theme.sand} strokeWidth={4} />
          <circle r={18} fill="#0b0a09" />
          {Array.from({length: 8}).map((_, i) => (
            <line key={i} x1={0} y1={0} x2={r * 0.9 * Math.cos((i * Math.PI) / 4)} y2={r * 0.9 * Math.sin((i * Math.PI) / 4)} stroke="rgba(0,0,0,0.25)" strokeWidth={3} />
          ))}
        </g>
        {/* icerdekiler */}
        <g transform={`translate(${cx + 420}, ${cy})`}>
          <circle r={14} fill={theme.accent} />
          <circle cx={40} cy={-30} r={14} fill={theme.accent} />
          <circle cx={40} cy={30} r={14} fill={theme.accent} />
        </g>
        {roll > 0.95 ? (
          <text x={cx} y={cy + 240} textAnchor="middle" fill={theme.accent} fontFamily={sans} fontSize={28}>
            ≈ 1–1,5 m çap · 200–500 kg · ortadaki delik: gözetleme ve mızrak
          </text>
        ) : null}
      </svg>
    </div>
  );
};
