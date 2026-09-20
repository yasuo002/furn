import React from 'react';
import {interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {theme} from '../theme';
import {sans, serif} from './Fonts';

/** Baca prensibi: sicak hava yukselir, taze hava katlara dagilir. */
export const Ventilation: React.FC = () => {
  const frame = useCurrentFrame();
  const {width, height, durationInFrames} = useVideoConfig();
  const fade = interpolate(frame, [0, 15, durationInFrames - 15, durationInFrames], [0, 1, 1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const cx = width / 2;
  const top = 220;
  const bottom = height - 120;
  const levels = 5;
  return (
    <div style={{position: 'absolute', inset: 0, opacity: fade}}>
      <svg width={width} height={height}>
        <text x={cx} y={120} textAnchor="middle" fill={theme.ink} fontFamily={serif} fontSize={48}>
          Elektriksiz havalandırma
        </text>
        <rect x={0} y={top} width={width} height={bottom - top} fill="#3a2e22" />
        <line x1={0} y1={top} x2={width} y2={top} stroke={theme.sand} strokeWidth={3} />
        {/* dikey baca */}
        <rect x={cx - 26} y={top - 60} width={52} height={bottom - top + 60} fill="#0b0a09" />
        {/* yatay kanallar */}
        {Array.from({length: levels}).map((_, i) => {
          const y = top + 90 + i * ((bottom - top - 140) / levels);
          return (
            <g key={i}>
              <rect x={cx - 560} y={y} width={1120} height={60} fill="#0b0a09" />
              <text x={cx - 540} y={y - 12} fill={theme.sandDim} fontFamily={sans} fontSize={20}>
                KAT {i + 1}
              </text>
              {/* yatay taze hava parcaciklari */}
              {Array.from({length: 10}).map((_, k) => {
                const dir = k % 2 === 0 ? 1 : -1;
                const x = cx + dir * ((frame * 4 + k * 110 + i * 40) % 540);
                return <circle key={k} cx={x} cy={y + 30 + Math.sin((frame + k * 7) / 6) * 8} r={4} fill={theme.byzantium} opacity={0.8} />;
              })}
            </g>
          );
        })}
        {/* yukselen sicak hava */}
        {Array.from({length: 40}).map((_, i) => {
          const span = bottom - top + 60;
          const y = bottom - ((frame * 5 + i * 41) % span);
          return <circle key={i} cx={cx + Math.sin((frame + i * 13) / 9) * 14} cy={y} r={4} fill={theme.danger} opacity={0.75} />;
        })}
        <text x={cx + 60} y={top - 20} fill={theme.danger} fontFamily={sans} fontSize={24}>
          sıcak hava yükselir ↑
        </text>
        <text x={cx - 520} y={bottom + 50} fill={theme.byzantium} fontFamily={sans} fontSize={24}>
          ● taze hava katlara çekilir
        </text>
        <text x={cx + 200} y={bottom + 50} fill={theme.accent} fontFamily={sans} fontSize={24}>
          50+ baca · ~13 °C sabit sıcaklık
        </text>
      </svg>
    </div>
  );
};
