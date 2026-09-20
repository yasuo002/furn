import React from 'react';
import {interpolate, spring, useCurrentFrame, useVideoConfig, Easing} from 'remotion';
import {theme} from '../theme';
import {sans, serif} from './Fonts';

/** Kelime kelime beliren buyuk baslik. */
export const RevealTitle: React.FC<{
  text: string;
  size?: number;
  delay?: number;
  color?: string;
  align?: 'left' | 'center';
  font?: 'serif' | 'sans';
  weight?: number;
}> = ({text, size = 84, delay = 0, color = theme.ink, align = 'left', font = 'serif', weight = 700}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const words = text.split(' ');
  return (
    <div
      style={{
        fontFamily: font === 'serif' ? serif : sans,
        fontSize: size,
        fontWeight: weight,
        color,
        lineHeight: 1.12,
        textAlign: align,
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: align === 'center' ? 'center' : 'flex-start',
        gap: `0 ${size * 0.25}px`,
      }}
    >
      {words.map((w, i) => {
        const s = spring({frame: frame - delay - i * 4, fps, config: {damping: 200, stiffness: 120}});
        return (
          <span
            key={i}
            style={{
              display: 'inline-block',
              opacity: s,
              transform: `translateY(${(1 - s) * 30}px)`,
            }}
          >
            {w}
          </span>
        );
      })}
    </div>
  );
};

/** Alt bant: baslik + kucuk aciklama. */
export const LowerThird: React.FC<{title: string; sub?: string; delay?: number}> = ({title, sub, delay = 0}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const s = spring({frame: frame - delay, fps, config: {damping: 200}});
  const line = interpolate(s, [0, 1], [0, 1]);
  return (
    <div style={{position: 'absolute', left: 96, bottom: 110}}>
      <div style={{width: 520 * line, height: 3, background: theme.accent, marginBottom: 14}} />
      <div
        style={{
          fontFamily: serif,
          fontSize: 44,
          color: theme.ink,
          opacity: s,
          transform: `translateX(${(1 - s) * -20}px)`,
        }}
      >
        {title}
      </div>
      {sub ? (
        <div
          style={{
            fontFamily: sans,
            fontSize: 24,
            color: theme.sandDim,
            marginTop: 6,
            opacity: s,
            transform: `translateX(${(1 - s) * -20}px)`,
          }}
        >
          {sub}
        </div>
      ) : null}
    </div>
  );
};

/** Bolum karti: numara + baslik + cizgi. */
export const ChapterCard: React.FC<{index: number; title: string}> = ({index, title}) => {
  const frame = useCurrentFrame();
  const {fps, durationInFrames} = useVideoConfig();
  const s = spring({frame, fps, config: {damping: 200}});
  const out = interpolate(frame, [durationInFrames - 15, durationInFrames], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: out,
      }}
    >
      <div style={{fontFamily: sans, fontSize: 26, letterSpacing: 8, color: theme.accent, opacity: s}}>
        BÖLÜM {String(index).padStart(2, '0')}
      </div>
      <div style={{width: interpolate(s, [0, 1], [0, 160]), height: 2, background: theme.line, margin: '26px 0'}} />
      <RevealTitle text={title} size={96} align="center" />
    </div>
  );
};

/** Buyuk sayi sayaci: 0'dan hedefe. */
export const Counter: React.FC<{to: number; suffix?: string; label: string; delay?: number; size?: number; plain?: boolean}> = ({
  to,
  suffix = '',
  label,
  delay = 0,
  size = 150,
  plain = false,
}) => {
  const frame = useCurrentFrame();
  const v = interpolate(frame - delay, [0, 50], [0, to], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });
  const op = interpolate(frame - delay, [0, 12], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', opacity: op}}>
      <div style={{fontFamily: serif, fontSize: size, fontWeight: 900, color: theme.accent, lineHeight: 1}}>
        {plain ? String(Math.round(v)) : Math.round(v).toLocaleString('tr-TR')}
        {suffix}
      </div>
      <div style={{fontFamily: sans, fontSize: 28, color: theme.sand, marginTop: 14, letterSpacing: 2}}>{label}</div>
    </div>
  );
};

/** Alinti karti. */
export const QuoteCard: React.FC<{quote: string; source: string}> = ({quote, source}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const s = spring({frame, fps, config: {damping: 200}});
  return (
    <div
      style={{
        position: 'absolute',
        left: 160,
        right: 160,
        top: '50%',
        transform: `translateY(-50%) translateY(${(1 - s) * 30}px)`,
        opacity: s,
        borderLeft: `4px solid ${theme.accent}`,
        paddingLeft: 48,
      }}
    >
      <div style={{fontFamily: serif, fontSize: 54, fontStyle: 'italic', color: theme.ink, lineHeight: 1.35}}>
        “{quote}”
      </div>
      <div style={{fontFamily: sans, fontSize: 26, color: theme.sandDim, marginTop: 28, letterSpacing: 2}}>{source}</div>
    </div>
  );
};
