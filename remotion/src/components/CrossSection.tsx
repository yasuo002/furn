import React from 'react';
import {interpolate, useCurrentFrame, useVideoConfig, Easing} from 'remotion';
import {theme} from '../theme';
import {sans, serif} from './Fonts';

/**
 * Yeralti sehri kesiti: kamera yukaridan asagiya iner, katlar belirir.
 * Sematik bir cizimdir; kat sayisi ve derinlik yaygin tahminlere dayanir.
 */
const LEVELS = [
  {n: 1, label: 'Ahırlar', note: 'Hayvanlar ve kokular yüzeye yakın'},
  {n: 2, label: 'Mutfaklar · Okul', note: 'Tonozlu tavanlı geniş salon'},
  {n: 3, label: 'Yaşam alanları', note: 'Uyuma odaları, ambarlar'},
  {n: 4, label: 'Şarap ve yağ presleri', note: 'Tahıl kuyuları'},
  {n: 5, label: 'Toplanma alanı', note: 'Taş kapılarla korunan bölge'},
  {n: 6, label: 'Su kuyusu ağzı', note: 'Baca aynı zamanda kuyu'},
  {n: 7, label: 'Haç planlı kilise', note: 'En derindeki kutsal alan'},
  {n: 8, label: '… ve altında 10 kat daha', note: 'Ziyarete kapalı, kısmen kazılmamış'},
];

export const CrossSection: React.FC<{showShaft?: boolean; showDoors?: boolean; descend?: boolean}> = ({
  showShaft = true,
  showDoors = true,
  descend = true,
}) => {
  const frame = useCurrentFrame();
  const {width, height, durationInFrames} = useVideoConfig();
  const levelH = 190;
  const totalH = LEVELS.length * levelH + 260;
  const camY = descend
    ? interpolate(frame, [30, durationInFrames - 40], [0, totalH - height + 40], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
        easing: Easing.inOut(Easing.quad),
      })
    : 0;
  const fade = interpolate(frame, [0, 15, durationInFrames - 15, durationInFrames], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const cx = width / 2;
  const shaftX = cx + 330;

  return (
    <div style={{position: 'absolute', inset: 0, opacity: fade, overflow: 'hidden'}}>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <defs>
          <linearGradient id="rock" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#4d3d2c" />
            <stop offset="1" stopColor="#1f1811" />
          </linearGradient>
          <pattern id="strata" width="1920" height="26" patternUnits="userSpaceOnUse">
            <line x1="0" y1="13" x2="1920" y2="13" stroke="rgba(0,0,0,0.18)" strokeWidth="2" />
          </pattern>
        </defs>
        <g transform={`translate(0, ${-camY})`}>
          {/* gokyuzu + yuzey */}
          <rect x={0} y={0} width={width} height={200} fill="#101820" />
          <rect x={0} y={200} width={width} height={totalH} fill="url(#rock)" />
          <rect x={0} y={200} width={width} height={totalH} fill="url(#strata)" />
          <line x1={0} y1={200} x2={width} y2={200} stroke={theme.sand} strokeWidth={3} />
          {/* yuzeydeki ev */}
          <g transform={`translate(${cx - 120}, 200)`}>
            <rect x={0} y={-70} width={160} height={70} fill="#2b2620" stroke={theme.sand} strokeWidth={2} />
            <polygon points="-10,-70 80,-125 170,-70" fill="#3a2f24" stroke={theme.sand} strokeWidth={2} />
            <text x={80} y={-140} textAnchor="middle" fill={theme.sand} fontFamily={sans} fontSize={22}>
              1963: yıkılan bodrum duvarı
            </text>
          </g>
          {/* ana merdiven govdesi */}
          <rect x={cx - 40} y={200} width={80} height={LEVELS.length * levelH + 40} fill="#0b0a09" />
          {/* havalandirma bacasi */}
          {showShaft ? (
            <g>
              <rect x={shaftX - 14} y={120} width={28} height={LEVELS.length * levelH + 120} fill="#0b0a09" />
              <text x={shaftX} y={105} textAnchor="middle" fill={theme.accent} fontFamily={sans} fontSize={22}>
                havalandırma bacası / kuyu
              </text>
              {Array.from({length: 26}).map((_, i) => {
                const y = 240 + ((i * 63 - frame * 3) % (LEVELS.length * levelH + 100) + (LEVELS.length * levelH + 100)) % (LEVELS.length * levelH + 100);
                return <circle key={i} cx={shaftX + Math.sin((frame + i * 9) / 10) * 6} cy={y} r={3} fill={theme.accent} opacity={0.7} />;
              })}
            </g>
          ) : null}
          {LEVELS.map((lv, i) => {
            const y = 200 + 40 + i * levelH;
            const appear = interpolate(frame - 20 - i * 10, [0, 20], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
            const doorOpen = interpolate(frame - 60 - i * 14, [0, 30], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.inOut(Easing.cubic)});
            const isDeep = i === LEVELS.length - 1;
            return (
              <g key={lv.n} opacity={appear}>
                {/* oda */}
                <rect x={cx - 520} y={y + 30} width={430} height={120} rx={26} fill={isDeep ? 'rgba(11,10,9,0.55)' : '#0b0a09'} stroke={theme.line} strokeWidth={1.5} strokeDasharray={isDeep ? '8 8' : undefined} />
                <rect x={cx + 90} y={y + 30} width={200} height={120} rx={26} fill="#0b0a09" stroke={theme.line} strokeWidth={1.5} />
                {/* koridor */}
                <rect x={cx - 90} y={y + 70} width={180} height={40} fill="#0b0a09" />
                {/* tas kapi */}
                {showDoors && !isDeep ? (
                  <g transform={`translate(${cx - 70 - doorOpen * 60}, ${y + 90})`}>
                    <circle r={34} fill="#6b5a44" stroke={theme.sand} strokeWidth={2} />
                    <circle r={6} fill="#0b0a09" />
                  </g>
                ) : null}
                {/* etiketler */}
                <text x={cx - 500} y={y + 12} fill={theme.accent} fontFamily={sans} fontSize={20} letterSpacing={3}>
                  KAT {lv.n} · {Math.round((i + 1) * 9)} m
                </text>
                <text x={cx - 500} y={y + 90} fill={theme.ink} fontFamily={serif} fontSize={34}>
                  {lv.label}
                </text>
                <text x={cx - 500} y={y + 126} fill={theme.sandDim} fontFamily={sans} fontSize={20}>
                  {lv.note}
                </text>
              </g>
            );
          })}
          <text x={cx} y={200 + 40 + LEVELS.length * levelH + 60} textAnchor="middle" fill={theme.sandDim} fontFamily={sans} fontSize={24}>
            ≈ 85 m derinlik · 18 kat (tahmini) · 8 kat ziyarete açık
          </text>
        </g>
      </svg>
    </div>
  );
};
