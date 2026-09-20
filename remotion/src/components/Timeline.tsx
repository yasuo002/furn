import React from 'react';
import {interpolate, useCurrentFrame, useVideoConfig, Easing} from 'remotion';
import {theme} from '../theme';
import {sans, serif} from './Fonts';

export type Era = {year: number; label: string; sub?: string; color?: string; certainty?: 'kesin' | 'tahmin' | 'tartışmalı'};

export const Timeline: React.FC<{eras: Era[]; from: number; to: number; title?: string}> = ({eras, from, to, title}) => {
  const frame = useCurrentFrame();
  const {width, height, durationInFrames} = useVideoConfig();
  const fade = interpolate(frame, [0, 15, durationInFrames - 15, durationInFrames], [0, 1, 1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const x0 = 160;
  const x1 = width - 160;
  const y = height / 2 + 40;
  const line = interpolate(frame, [10, 70], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.inOut(Easing.cubic)});
  const X = (yr: number) => x0 + ((yr - from) / (to - from)) * (x1 - x0);
  const fmt = (yr: number) => (yr < 0 ? `MÖ ${-yr}` : `MS ${yr}`);
  return (
    <div style={{position: 'absolute', inset: 0, opacity: fade}}>
      <svg width={width} height={height}>
        {title ? (
          <text x={width / 2} y={140} textAnchor="middle" fill={theme.ink} fontFamily={serif} fontSize={48}>
            {title}
          </text>
        ) : null}
        <line x1={x0} y1={y} x2={x0 + (x1 - x0) * line} y2={y} stroke={theme.line} strokeWidth={3} />
        {eras.map((e, i) => {
          const x = X(e.year);
          const a = interpolate(frame - 40 - i * 18, [0, 18], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.back(1.4))});
          const up = i % 2 === 0;
          const color = e.color ?? theme.accent;
          const dash = e.certainty === 'tahmin' ? '6 6' : e.certainty === 'tartışmalı' ? '2 6' : undefined;
          return (
            <g key={i} opacity={a} transform={`translate(${x}, ${y})`}>
              <circle r={12 * a} fill={theme.bg} stroke={color} strokeWidth={3} strokeDasharray={dash} />
              <line x1={0} y1={0} x2={0} y2={up ? -70 : 70} stroke={color} strokeWidth={1.5} strokeDasharray={dash} />
              <text x={0} y={up ? -120 : 130} textAnchor="middle" fill={theme.ink} fontFamily={serif} fontSize={30}>
                {e.label}
              </text>
              <text x={0} y={up ? -88 : 98} textAnchor="middle" fill={color} fontFamily={sans} fontSize={22}>
                {fmt(e.year)}
              </text>
              {e.sub ? (
                <text x={0} y={up ? -150 : 160} textAnchor="middle" fill={theme.sandDim} fontFamily={sans} fontSize={20}>
                  {e.sub}
                </text>
              ) : null}
            </g>
          );
        })}
        <text x={x0} y={y + 220} fill={theme.sandDim} fontFamily={sans} fontSize={20}>
          ○ kesin · ◌ tahmin · ⋯ tartışmalı
        </text>
      </svg>
    </div>
  );
};
