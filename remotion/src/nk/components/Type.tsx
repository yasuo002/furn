import React from 'react';
import {AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig, Easing, random} from 'remotion';
import {nk} from '../theme';
import {display, sans, serif} from '../../components/Fonts';

/** Daktilo: harf harf yazilir, sonunda imlec yanip soner. */
export const Typewriter: React.FC<{text: string; delay?: number; cps?: number; size?: number; color?: string; font?: string}> = ({text, delay = 0, cps = 28, size = 30, color = nk.paper, font = sans}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const n = Math.max(0, Math.floor(((frame - delay) / fps) * cps));
  const shown = text.slice(0, n);
  const done = n >= text.length;
  const cursor = Math.floor(frame / 8) % 2 === 0;
  return (
    <span style={{fontFamily: font, fontSize: size, color, whiteSpace: 'pre-wrap'}}>
      {shown}
      <span style={{opacity: done ? (cursor ? 1 : 0) : 1, color: nk.red}}>▌</span>
    </span>
  );
};

/** Dev kondanse baslik: her kelime asagidan carparak gelir, hafif sarsinti. */
export const SlamTitle: React.FC<{text: string; size?: number; color?: string; delay?: number; align?: 'left' | 'center'}> = ({text, size = 150, color = nk.paper, delay = 0, align = 'center'}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const words = text.split(' ');
  return (
    <div style={{display: 'flex', flexWrap: 'wrap', justifyContent: align === 'center' ? 'center' : 'flex-start', gap: `0 ${size * 0.22}px`, fontFamily: display, fontSize: size, fontWeight: 700, lineHeight: 1, color, textTransform: 'uppercase', letterSpacing: -1}}>
      {words.map((w, i) => {
        const s = spring({frame: frame - delay - i * 5, fps, config: {damping: 14, stiffness: 160, mass: 0.8}});
        const shake = frame - delay - i * 5 > 6 && frame - delay - i * 5 < 14 ? (random(`${w}${frame}`) - 0.5) * 6 : 0;
        return (
          <span key={i} style={{display: 'inline-block', opacity: Math.min(1, s * 1.5), transform: `translateY(${(1 - s) * 80 + shake}px) scaleY(${0.8 + s * 0.2})`}}>
            {w}
          </span>
        );
      })}
    </div>
  );
};

/** Kirmizi damga: donerek buyur, carpma aninda kucuk sarsinti. */
export const Stamp: React.FC<{text: string; delay?: number; rotate?: number; size?: number; color?: string}> = ({text, delay = 0, rotate = -8, size = 44, color = nk.red}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const s = spring({frame: frame - delay, fps, config: {damping: 12, stiffness: 300, mass: 0.6}});
  const scale = interpolate(s, [0, 1], [2.2, 1]);
  const op = interpolate(frame - delay, [0, 4], [0, 0.92], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <div style={{display: 'inline-block', transform: `rotate(${rotate}deg) scale(${scale})`, opacity: op, border: `4px solid ${color}`, color, fontFamily: display, fontWeight: 700, fontSize: size, letterSpacing: 4, padding: '6px 18px', textTransform: 'uppercase', maskImage: 'radial-gradient(circle at 30% 40%, black 60%, rgba(0,0,0,0.75) 100%)'}}>
      {text}
    </div>
  );
};

/** Bolum karti: kirmizi seritler kayar, "DOSYA 03" damgalanir, baslik carpar. */
export const StampChapter: React.FC<{index: number; title: string; sub?: string}> = ({index, title, sub}) => {
  const frame = useCurrentFrame();
  const {durationInFrames} = useVideoConfig();
  const out = interpolate(frame, [durationInFrames - 12, durationInFrames], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const wipe = interpolate(frame, [0, 18], [0, 100], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)});
  return (
    <AbsoluteFill style={{opacity: out}}>
      <div style={{position: 'absolute', inset: 0, background: nk.red, clipPath: `polygon(0 0, ${wipe}% 0, ${Math.max(0, wipe - 12)}% 100%, 0 100%)`, opacity: 0.12}} />
      <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center', gap: 28}}>
        <Stamp text={`Dosya ${String(index).padStart(2, '0')}`} delay={4} />
        <SlamTitle text={title} delay={10} />
        {sub ? (
          <div style={{fontFamily: serif, fontSize: 32, color: nk.paperDim, opacity: interpolate(frame, [30, 45], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})}}>{sub}</div>
        ) : null}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/** Alt bant: kirmizi blok + beyaz metin, soldan kayar. */
export const Tag: React.FC<{title: string; sub?: string; delay?: number; right?: boolean}> = ({title, sub, delay = 0, right = false}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const s = spring({frame: frame - delay, fps, config: {damping: 200}});
  return (
    <div style={{position: 'absolute', [right ? 'right' : 'left']: 100, bottom: 120, transform: `translateX(${(1 - s) * (right ? 60 : -60)}px)`, opacity: s}}>
      <div style={{display: 'inline-block', background: nk.red, color: '#fff', fontFamily: display, fontSize: 34, padding: '6px 18px', letterSpacing: 2, textTransform: 'uppercase'}}>{title}</div>
      {sub ? <div style={{background: 'rgba(6,8,14,0.85)', color: nk.paper, fontFamily: sans, fontSize: 24, padding: '8px 18px', borderLeft: `4px solid ${nk.red}`}}>{sub}</div> : null}
    </div>
  );
};

/** Vurgu cumlesi (alt orta). */
export const Line: React.FC<{text: string; delay?: number; red?: boolean}> = ({text, delay = 0, red = false}) => {
  const frame = useCurrentFrame();
  const {durationInFrames} = useVideoConfig();
  const o = interpolate(frame, [delay, delay + 10, durationInFrames - 10, durationInFrames], [0, 1, 1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const w = interpolate(frame, [delay, delay + 16], [0, 100], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)});
  return (
    <div style={{position: 'absolute', left: 0, right: 0, bottom: 110, display: 'flex', justifyContent: 'center', opacity: o}}>
      <div style={{position: 'relative', fontFamily: red ? display : sans, fontSize: red ? 38 : 32, color: red ? '#fff' : nk.paper, background: red ? nk.red : 'rgba(6,8,14,0.82)', padding: '14px 32px', maxWidth: 1500, textAlign: 'center', clipPath: `inset(0 ${100 - w}% 0 0)`, letterSpacing: red ? 2 : 0, textTransform: red ? 'uppercase' : 'none'}}>
        {text}
      </div>
    </div>
  );
};

/** Tam ekran buyuk ifade; satirlar sirayla, son satir kirmizi blok. */
export const Statement: React.FC<{lines: string[]; size?: number}> = ({lines, size = 80}) => {
  const frame = useCurrentFrame();
  const {durationInFrames} = useVideoConfig();
  const out = interpolate(frame, [durationInFrames - 12, durationInFrames], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center', opacity: out}}>
      <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18, padding: '0 140px'}}>
        {lines.map((l, i) => {
          const last = i === lines.length - 1;
          const o = interpolate(frame, [i * 20, i * 20 + 14], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
          const x = interpolate(frame, [i * 20, i * 20 + 14], [-30, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)});
          return (
            <div key={i} style={{fontFamily: last ? display : serif, fontSize: last ? size * 1.1 : size, color: last ? '#fff' : nk.paper, background: last ? nk.red : 'transparent', padding: last ? '4px 26px' : 0, textTransform: last ? 'uppercase' : 'none', letterSpacing: last ? 2 : 0, textAlign: 'center', opacity: o, transform: `translateX(${x}px)`, lineHeight: 1.15}}>
              {l}
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

/** Sayac: rulo (odometre) etkisiyle basamaklar donerek yerine oturur. */
export const Odometer: React.FC<{value: number; prefix?: string; suffix?: string; delay?: number; size?: number; label?: string; duration?: number}> = ({value, prefix = '', suffix = '', delay = 0, size = 150, label, duration = 60}) => {
  const frame = useCurrentFrame();
  const t = interpolate(frame - delay, [0, duration], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)});
  const digits = value.toLocaleString('en-US').split('');
  const op = interpolate(frame - delay, [0, 10], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', opacity: op}}>
      <div style={{display: 'flex', fontFamily: display, fontSize: size, fontWeight: 700, color: nk.paper, lineHeight: 1}}>
        <span style={{color: nk.red}}>{prefix}</span>
        {digits.map((d, i) => {
          if (!/\d/.test(d)) return <span key={i} style={{color: nk.steel}}>{d}</span>;
          const target = Number(d);
          // her basamak farkli hizla yerine oturur
          const local = Math.min(1, Math.max(0, (t - i * 0.03) / (1 - i * 0.03)));
          const spins = 2 + i;
          const val = (target + (1 - local) * spins * 10) % 10;
          return (
            <span key={i} style={{display: 'inline-block', height: size, overflow: 'hidden', width: size * 0.56}}>
              <span style={{display: 'block', transform: `translateY(${-val * size}px)`}}>
                {Array.from({length: 11}).map((_, k) => (
                  <span key={k} style={{display: 'block', height: size, lineHeight: `${size}px`, textAlign: 'center'}}>
                    {k % 10}
                  </span>
                ))}
              </span>
            </span>
          );
        })}
        <span style={{color: nk.red}}>{suffix}</span>
      </div>
      {label ? <div style={{fontFamily: sans, fontSize: 26, color: nk.steel, letterSpacing: 4, marginTop: 16, textTransform: 'uppercase'}}>{label}</div> : null}
    </div>
  );
};
