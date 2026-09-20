import React from 'react';
import {AbsoluteFill, Img, interpolate, useCurrentFrame, useVideoConfig, Easing} from 'remotion';
import {hasImage, imageSrc, ImageKey} from '../assets';
import {theme} from '../theme';
import {sans} from './Fonts';

type Props = {
  image: ImageKey;
  caption?: string; // ekranda alt yazi (kaynak)
  from?: number; // baslangic olcegi
  to?: number; // bitis olcegi
  panX?: number; // -1..1
  panY?: number; // -1..1
  darken?: number; // 0..1
  fadeIn?: number; // kare
  fadeOut?: number; // kare
  label?: string; // yer tutucu etiketi
};

/** Gercek fotograf icin yavas zoom/pan. Dosya yoksa stilize yer tutucu. */
export const KenBurns: React.FC<Props> = ({
  image,
  caption,
  from = 1.05,
  to = 1.18,
  panX = 0.3,
  panY = -0.2,
  darken = 0.25,
  fadeIn = 18,
  fadeOut = 18,
  label,
}) => {
  const frame = useCurrentFrame();
  const {durationInFrames} = useVideoConfig();
  const p = interpolate(frame, [0, durationInFrames], [0, 1], {extrapolateRight: 'clamp'});
  const scale = interpolate(p, [0, 1], [from, to]);
  const tx = interpolate(p, [0, 1], [0, panX * 40]);
  const ty = interpolate(p, [0, 1], [0, panY * 40]);
  const opacity = interpolate(
    frame,
    [0, fadeIn, durationInFrames - fadeOut, durationInFrames],
    [0, 1, 1, 0],
    {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.inOut(Easing.quad)},
  );
  const exists = hasImage(image);

  return (
    <AbsoluteFill style={{opacity}}>
      <AbsoluteFill style={{transform: `scale(${scale}) translate(${tx}px, ${ty}px)`}}>
        {exists ? (
          <Img src={imageSrc(image)} style={{width: '100%', height: '100%', objectFit: 'cover'}} />
        ) : (
          <Placeholder label={label ?? image} />
        )}
      </AbsoluteFill>
      <AbsoluteFill style={{background: `rgba(0,0,0,${darken})`}} />
      <AbsoluteFill
        style={{background: 'linear-gradient(180deg, rgba(0,0,0,0.35) 0%, transparent 30%, transparent 70%, rgba(0,0,0,0.6) 100%)'}}
      />
      {caption ? (
        <div
          style={{
            position: 'absolute',
            right: 48,
            bottom: 36,
            fontFamily: sans,
            fontSize: 20,
            color: theme.muted,
            letterSpacing: 0.5,
          }}
        >
          {caption}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};

/** Gorsel dosyasi yokken cizilen stilize "tuf" dokusu. */
const Placeholder: React.FC<{label: string}> = ({label}) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(160deg, #3a2e22 0%, #6b563d 45%, #2a2118 100%)`,
      }}
    >
      {Array.from({length: 14}).map((_, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: `${(i * 137) % 100}%`,
            top: `${(i * 61) % 100}%`,
            width: 420 + (i % 4) * 120,
            height: 260 + (i % 3) * 90,
            borderRadius: '50%',
            background: `rgba(${180 + (i % 3) * 20},${140 + (i % 4) * 12},${95},${0.06 + (i % 3) * 0.03})`,
            filter: 'blur(40px)',
            transform: `translate(-50%,-50%) translateX(${Math.sin((frame + i * 20) / 120) * 10}px)`,
          }}
        />
      ))}
      <div
        style={{
          position: 'absolute',
          left: 48,
          bottom: 36,
          fontFamily: sans,
          fontSize: 18,
          color: 'rgba(255,255,255,0.35)',
          letterSpacing: 1,
          textTransform: 'uppercase',
        }}
      >
        GÖRSEL YER TUTUCU · public/images/{label}
      </div>
    </AbsoluteFill>
  );
};
