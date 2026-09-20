import React from 'react';
import {interpolate, useCurrentFrame, useVideoConfig, Easing} from 'remotion';
import {theme} from '../theme';
import {sans, serif} from './Fonts';

/** Volkan -> kul tabakalari -> tuf -> asinma ile peri bacasi. */
export const TuffFormation: React.FC = () => {
  const frame = useCurrentFrame();
  const {width, height, durationInFrames} = useVideoConfig();
  const fade = interpolate(frame, [0, 15, durationInFrames - 15, durationInFrames], [0, 1, 1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const ground = height - 200;
  const layers = 6;
  const layerProg = interpolate(frame, [20, 140], [0, layers], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const erosion = interpolate(frame, [190, 300], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.inOut(Easing.quad)});
  const eruptionOn = frame > 10 && frame < 150;
  const stage = frame < 150 ? 'Volkanik kül yağıyor (Erciyes, Hasan Dağı, Göllüdağ)' : frame < 190 ? 'Kül sıkışıp TÜF kayasına dönüşüyor' : 'Yağmur ve rüzgâr yumuşak tüfü aşındırıyor: peri bacası';
  return (
    <div style={{position: 'absolute', inset: 0, opacity: fade}}>
      <svg width={width} height={height}>
        <text x={width / 2} y={110} textAnchor="middle" fill={theme.ink} fontFamily={serif} fontSize={46}>
          {stage}
        </text>
        {/* volkan */}
        <polygon points={`${width - 520},${ground} ${width - 300},${ground - 420} ${width - 80},${ground}`} fill="#2b2620" stroke={theme.sand} strokeWidth={2} />
        {eruptionOn
          ? Array.from({length: 60}).map((_, i) => {
              const t = (frame * 2 + i * 17) % 160;
              const x = width - 300 - t * (1.6 + (i % 5) * 0.5) - Math.sin(i) * 20;
              const y = ground - 420 - t * 2.2 + (t * t) / 45;
              return <circle key={i} cx={x} cy={y} r={3 + (i % 3)} fill="#8a6f4e" opacity={0.7} />;
            })
          : null}
        {/* kul katmanlari: asinma clipPath ile iki yandan daralir */}
        <defs>
          <clipPath id="erode">
            <rect x={(width - 560) * 0.42 * erosion} y={0} width={(width - 560) * (1 - 0.84 * erosion)} height={height} />
          </clipPath>
        </defs>
        <g clipPath="url(#erode)">
          {Array.from({length: layers}).map((_, i) => {
            const h = Math.min(1, Math.max(0, layerProg - i)) * 34;
            const y = ground - (i + 1) * 34 + (34 - h);
            const shade = 70 + i * 14;
            return <rect key={i} x={0} y={y} width={width - 560} height={h} fill={`rgb(${shade + 60},${shade + 35},${shade})`} />;
          })}
          {frame > 160 ? (
            <rect x={0} y={ground - layers * 34 - 22} width={width - 560} height={22} fill="#1a1a1a" opacity={interpolate(frame, [160, 190], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})} />
          ) : null}
        </g>
        {erosion > 0.6 ? (
          <text x={(width - 560) / 2} y={ground - layers * 34 - 60} textAnchor="middle" fill={theme.accent} fontFamily={sans} fontSize={26} opacity={(erosion - 0.6) / 0.4}>
            sert bazalt şapka kalır, altındaki yumuşak tüf oyulabilir
          </text>
        ) : null}
        <line x1={0} y1={ground} x2={width} y2={ground} stroke={theme.sand} strokeWidth={2} />
        <text x={60} y={ground + 60} fill={theme.sandDim} fontFamily={sans} fontSize={24}>
          Tüf: taze kesildiğinde yumuşak, havayla temasta sertleşir
        </text>
      </svg>
    </div>
  );
};
