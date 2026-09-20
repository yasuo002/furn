import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {theme} from '../theme';
import {sans, serif} from './Fonts';

/** Ekranin altinda kisa vurgu cumlesi (anahtar fikir). */
export const KeyLine: React.FC<{text: string; delay?: number; accent?: boolean}> = ({text, delay = 0, accent = false}) => {
  const frame = useCurrentFrame();
  const {durationInFrames} = useVideoConfig();
  const o = interpolate(frame, [delay, delay + 12, durationInFrames - 12, durationInFrames], [0, 1, 1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 96,
        display: 'flex',
        justifyContent: 'center',
        opacity: o,
      }}
    >
      <div
        style={{
          fontFamily: accent ? serif : sans,
          fontSize: accent ? 46 : 34,
          color: accent ? theme.accent : theme.ink,
          background: 'rgba(11,10,9,0.72)',
          padding: '16px 34px',
          borderLeft: `4px solid ${theme.accent}`,
          maxWidth: 1500,
          textAlign: 'center',
        }}
      >
        {text}
      </div>
    </div>
  );
};

/** Tam ekran koyu karartma ile buyuk soru/cumle. */
export const BigStatement: React.FC<{lines: string[]; size?: number}> = ({lines, size = 84}) => {
  const frame = useCurrentFrame();
  const {durationInFrames} = useVideoConfig();
  const out = interpolate(frame, [durationInFrames - 15, durationInFrames], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center', opacity: out}}>
      <div style={{display: 'flex', flexDirection: 'column', gap: 24, alignItems: 'center', padding: '0 160px'}}>
        {lines.map((l, i) => {
          const o = interpolate(frame, [i * 22, i * 22 + 18], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
          const y = interpolate(frame, [i * 22, i * 22 + 18], [24, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
          return (
            <div key={i} style={{fontFamily: serif, fontSize: size, color: i === lines.length - 1 ? theme.accent : theme.ink, textAlign: 'center', opacity: o, transform: `translateY(${y}px)`, lineHeight: 1.15}}>
              {l}
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

/** Ilerleme cubugu: sol ustte derinlik gostergesi (kacinci kattayiz). */
export const DepthGauge: React.FC<{depth: number}> = ({depth}) => {
  return (
    <div style={{position: 'absolute', left: 48, top: 48, fontFamily: sans, fontSize: 20, color: theme.sandDim, letterSpacing: 3}}>
      DERİNLİK <span style={{color: theme.accent}}>{depth} m</span>
    </div>
  );
};
