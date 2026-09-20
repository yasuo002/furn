import React from 'react';
import {AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig, Easing, random} from 'remotion';
import {nk} from '../theme';
import {display, sans, serif} from '../../components/Fonts';

const useFade = () => {
  const frame = useCurrentFrame();
  const {durationInFrames} = useVideoConfig();
  return interpolate(frame, [0, 14, durationInFrames - 12, durationInFrames], [0, 1, 1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
};

/* ---------------- DMZ KESİTİ (yandan) ---------------- */
export const DMZSection: React.FC = () => {
  const frame = useCurrentFrame();
  const {width, height} = useVideoConfig();
  const fade = useFade();
  const cx = width / 2;
  const ground = height - 240;
  const kmPx = 260; // 1 km
  const grow = interpolate(frame, [10, 60], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)});
  const poleS = interpolate(frame, [60, 110], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)});
  const poleN = interpolate(frame, [95, 150], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)});
  const mScale = 3.2; // px / m (direkler)
  const wave = (x: number, dir: number, i: number) => {
    const r = ((frame * 3 + i * 40) % 160) + 10;
    return <path key={i} d={`M${x + dir * r},${ground - 120 - r * 0.6} A${r},${r} 0 0 ${dir > 0 ? 1 : 0} ${x + dir * r},${ground - 120 + r * 0.6}`} fill="none" stroke={nk.steel} strokeWidth={2} opacity={1 - r / 170} />;
  };
  return (
    <AbsoluteFill style={{opacity: fade}}>
      <svg width={width} height={height}>
        <defs>
          <linearGradient id="dmzSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#0a1020" /><stop offset="1" stopColor="#1b2030" /></linearGradient>
        </defs>
        <rect width={width} height={height} fill="url(#dmzSky)" />
        <rect x={0} y={ground} width={width} height={height - ground} fill="#1e2a1e" />
        {/* 4 km serit */}
        <rect x={cx - 2 * kmPx * grow} y={ground} width={4 * kmPx * grow} height={height - ground} fill="rgba(212,161,58,0.12)" />
        <line x1={cx - 2 * kmPx * grow} y1={ground - 30} x2={cx - 2 * kmPx * grow} y2={height} stroke={nk.gold} strokeWidth={2} strokeDasharray="6 6" />
        <line x1={cx + 2 * kmPx * grow} y1={ground - 30} x2={cx + 2 * kmPx * grow} y2={height} stroke={nk.gold} strokeWidth={2} strokeDasharray="6 6" />
        <line x1={cx} y1={ground - 60} x2={cx} y2={height} stroke={nk.red} strokeWidth={3} />
        {grow > 0.9 ? (
          <g>
            <text x={cx} y={ground - 74} textAnchor="middle" fill={nk.red} fontFamily={display} fontSize={24} letterSpacing={3}>ATEŞKES HATTI (MDL)</text>
            <text x={cx - 2 * kmPx} y={height - 40} textAnchor="middle" fill={nk.gold} fontFamily={sans} fontSize={20}>2 km</text>
            <text x={cx + 2 * kmPx} y={height - 40} textAnchor="middle" fill={nk.gold} fontFamily={sans} fontSize={20}>2 km</text>
            <text x={cx} y={height - 40} textAnchor="middle" fill={nk.gold} fontFamily={display} fontSize={26} letterSpacing={2}>DMZ · 4 km</text>
          </g>
        ) : null}
        {/* mavi barakalar (JSA) */}
        <g opacity={grow}>
          {[-70, -20, 30].map((dx, i) => <rect key={i} x={cx + dx} y={ground - 26} width={40} height={26} fill="#3b7dd8" stroke="#dfe8ff" strokeWidth={1} />)}
          <text x={cx} y={ground + 30} textAnchor="middle" fill={nk.blue} fontFamily={sans} fontSize={18}>Panmunjom · mavi barakalar</text>
        </g>
        {/* tel orguler ve gozetleme kuleleri */}
        {[-1, 1].map((dir) => (
          <g key={dir} opacity={grow}>
            {Array.from({length: 9}).map((_, i) => <line key={i} x1={cx + dir * (2 * kmPx + 40 + i * 30)} y1={ground} x2={cx + dir * (2 * kmPx + 40 + i * 30)} y2={ground - 30} stroke={nk.steel} strokeWidth={2} />)}
            <line x1={cx + dir * (2 * kmPx + 40)} y1={ground - 28} x2={cx + dir * (2 * kmPx + 40 + 8 * 30)} y2={ground - 28} stroke={nk.steel} strokeWidth={2} strokeDasharray="4 4" />
            <rect x={cx + dir * (2 * kmPx + 330) - 12} y={ground - 90} width={24} height={90} fill="#2b3142" />
            <rect x={cx + dir * (2 * kmPx + 330) - 24} y={ground - 110} width={48} height={24} fill="#3a4256" />
          </g>
        ))}
        {/* hoparlorler */}
        {Array.from({length: 4}).map((_, i) => wave(cx - 2 * kmPx - 30, -1, i))}
        {Array.from({length: 4}).map((_, i) => wave(cx + 2 * kmPx + 30, 1, i))}
        {/* Guney direk: Daeseong-dong ~98 m */}
        <g>
          <line x1={cx - 3.1 * kmPx} y1={ground} x2={cx - 3.1 * kmPx} y2={ground - 98 * mScale * poleS} stroke={nk.paper} strokeWidth={4} />
          {poleS > 0.98 ? <g><rect x={cx - 3.1 * kmPx} y={ground - 98 * mScale} width={70} height={44} fill="#fff" /><circle cx={cx - 3.1 * kmPx + 35} cy={ground - 98 * mScale + 22} r={11} fill={nk.red} /><text x={cx - 3.1 * kmPx} y={ground - 98 * mScale - 20} textAnchor="middle" fill={nk.paper} fontFamily={display} fontSize={26}>98 m · Daeseong-dong</text></g> : null}
        </g>
        {/* Kuzey direk: Kijong-dong 160 m */}
        <g>
          <line x1={cx + 3.1 * kmPx} y1={ground} x2={cx + 3.1 * kmPx} y2={ground - 160 * mScale * poleN} stroke={nk.paper} strokeWidth={5} />
          {poleN > 0.98 ? <g><rect x={cx + 3.1 * kmPx - 90} y={ground - 160 * mScale} width={90} height={50} fill={nk.red} /><rect x={cx + 3.1 * kmPx - 90} y={ground - 160 * mScale + 12} width={90} height={26} fill={nk.blue} /><text x={cx + 3.1 * kmPx} y={ground - 160 * mScale - 20} textAnchor="middle" fill={nk.red} fontFamily={display} fontSize={30}>160 m · Kijong-dong</text></g> : null}
          {/* propaganda koyu binalari */}
          {poleN > 0.5 ? Array.from({length: 5}).map((_, i) => <rect key={i} x={cx + 2.6 * kmPx + i * 34} y={ground - 40 - (i % 2) * 20} width={26} height={40 + (i % 2) * 20} fill="#9aa8c0" opacity={0.7} />) : null}
        </g>
        <text x={120} y={ground - 40} fill={nk.blue} fontFamily={display} fontSize={34} letterSpacing={3}>GÜNEY KORE</text>
        <text x={width - 120} y={ground - 40} textAnchor="end" fill={nk.red} fontFamily={display} fontSize={34} letterSpacing={3}>KUZEY KORE</text>
      </svg>
    </AbsoluteFill>
  );
};

/* ---------------- SONGBUN PİRAMİDİ ---------------- */
export const SongbunPyramid: React.FC = () => {
  const frame = useCurrentFrame();
  const {width, height, fps} = useVideoConfig();
  const fade = useFade();
  const tiers = [
    {name: 'ÇEKİRDEK', pct: '~%25', note: 'parti, ordu, devrim aileleri', color: nk.red},
    {name: 'KARARSIZ', pct: '~%55', note: 'sıradan işçi ve köylü', color: nk.steel},
    {name: 'DÜŞMAN', pct: '~%20', note: 'eski toprak sahipleri, güneye kaçanların akrabaları, din', color: nk.steelDim},
  ];
  const cx = width * 0.36;
  const top = 180;
  const H = 560;
  const W = 720;
  const card = spring({frame: frame - 90, fps, config: {damping: 200}});
  const fileLines = ['Dede: 1951, güneye kaçtı', 'Baba: kolektif çiftlik işçisi', 'Akraba: Japonya (Chongryon)', 'SINIF: DÜŞMAN · 3. KUŞAK'];
  return (
    <AbsoluteFill style={{opacity: fade}}>
      <svg width={width} height={height}>
        {tiers.map((t, i) => {
          const y0 = top + (i / 3) * H;
          const y1 = top + ((i + 1) / 3) * H;
          const w0 = (i / 3) * W;
          const w1 = ((i + 1) / 3) * W;
          const s = interpolate(frame - i * 18, [0, 20], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)});
          const pts = `${cx - w0 / 2},${y0} ${cx + w0 / 2},${y0} ${cx + w1 / 2},${y1} ${cx - w1 / 2},${y1}`;
          return (
            <g key={i} opacity={s} transform={`translate(0, ${(1 - s) * 40})`}>
              <polygon points={pts} fill={t.color} opacity={0.85} stroke="#06080e" strokeWidth={3} />
              {/* insan glifleri */}
              {Array.from({length: (i + 1) * 6}).map((_, k) => {
                const px = cx - w1 / 2 + 40 + ((k * 97) % Math.max(1, w1 - 80));
                const py = y0 + 40 + ((k * 53) % (H / 3 - 70));
                const inside = Math.abs(px - cx) < w0 / 2 + ((py - y0) / (y1 - y0)) * (w1 - w0) / 2 - 12;
                if (!inside) return null;
                return <g key={k} transform={`translate(${px},${py})`} opacity={0.9}><circle r={5} fill="#06080e" /><rect x={-6} y={7} width={12} height={14} rx={3} fill="#06080e" /></g>;
              })}
              <text x={cx + W / 2 + 40} y={(y0 + y1) / 2 - 8} fill={nk.paper} fontFamily={display} fontSize={40} letterSpacing={3}>{t.name} <tspan fill={t.color === nk.steelDim ? nk.steel : t.color}>{t.pct}</tspan></text>
              <text x={cx + W / 2 + 40} y={(y0 + y1) / 2 + 28} fill={nk.paperDim} fontFamily={sans} fontSize={22}>{t.note}</text>
            </g>
          );
        })}
        <text x={cx} y={top - 40} textAnchor="middle" fill={nk.paper} fontFamily={display} fontSize={40} letterSpacing={4}>SONGBUN · 3 SINIF, ~51 ALT KATEGORİ</text>
      </svg>
      {/* dosya karti */}
      <div style={{position: 'absolute', right: 110, top: 770, width: 560, transform: `translateY(${(1 - card) * 40}px) rotate(-2deg)`, opacity: card, background: nk.paper, color: '#111', padding: 18, boxShadow: '0 30px 60px rgba(0,0,0,0.6)', fontFamily: 'monospace'}}>
        <div style={{fontFamily: display, fontSize: 20, letterSpacing: 4, borderBottom: '2px solid #111', paddingBottom: 4, marginBottom: 6}}>KİŞİSEL DOSYA · No. 4471</div>
        {fileLines.map((l, i) => {
          const o = interpolate(frame - 100 - i * 14, [0, 8], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
          return <div key={i} style={{fontSize: 20, lineHeight: 1.45, opacity: o, color: i === fileLines.length - 1 ? nk.red : '#111', fontWeight: i === fileLines.length - 1 ? 700 : 400}}>▸ {l}</div>;
        })}
      </div>
    </AbsoluteFill>
  );
};

/* ---------------- HANEDAN ZAMAN ÇİZELGESİ ---------------- */
export const Dynasty: React.FC<{images?: (string | null)[]}> = ({images = [null, null, null]}) => {
  const frame = useCurrentFrame();
  const {width, height, fps} = useVideoConfig();
  const fade = useFade();
  const people = [
    {name: 'Kim İl-sung', years: '1948–1994', note: 'kurucu · "ebedi başkan"'},
    {name: 'Kim Jong-il', years: '1994–2011', note: 'oğul · "sevgili lider"'},
    {name: 'Kim Jong-un', years: '2011–', note: 'torun · 27 yaşında başa geçti'},
  ];
  const y = 300;
  const gap = 520;
  const x0 = width / 2 - gap;
  const lineP = interpolate(frame, [20, 110], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.inOut(Easing.cubic)});
  return (
    <AbsoluteFill style={{opacity: fade}}>
      <svg width={width} height={height}>
        <line x1={x0} y1={y + 470} x2={x0 + 2 * gap * lineP} y2={y + 470} stroke={nk.red} strokeWidth={4} />
        {[1948, 1994, 2011, 2026].map((yr, i) => {
          const x = x0 + (i / 3) * 2 * gap;
          const show = lineP >= i / 3 - 0.01;
          return show ? <g key={i}><circle cx={x} cy={y + 470} r={8} fill={nk.bg} stroke={nk.red} strokeWidth={3} /><text x={x} y={y + 515} textAnchor="middle" fill={nk.paperDim} fontFamily={sans} fontSize={22}>{yr}</text></g> : null;
        })}
      </svg>
      {people.map((p, i) => {
        const s = spring({frame: frame - 10 - i * 30, fps, config: {damping: 16, stiffness: 120}});
        const x = x0 + i * gap - 150;
        return (
          <div key={i} style={{position: 'absolute', left: x, top: y - 120, width: 300, transform: `scale(${s})`, opacity: s, textAlign: 'center'}}>
            <div style={{width: 300, height: 360, border: `6px solid ${nk.gold}`, boxShadow: '0 0 0 2px #06080e, 0 30px 60px rgba(0,0,0,0.7)', background: images[i] ? `url(${images[i]}) center/cover` : 'linear-gradient(180deg,#2a3040,#141a28)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', overflow: 'hidden', position: 'relative'}}>
              {!images[i] ? (
                <svg width={300} height={360} viewBox="0 0 300 360" style={{position: 'absolute', inset: 0}}>
                  <circle cx={150} cy={140} r={64} fill="#0d1220" />
                  <path d="M40,360 C40,250 110,220 150,220 C190,220 260,250 260,360 Z" fill="#0d1220" />
                  <rect x={0} y={0} width={300} height={360} fill="url(#nkHatchP)" />
                </svg>
              ) : null}
              <div style={{position: 'absolute', right: 10, top: 10, fontFamily: sans, fontSize: 12, color: nk.steel}}>portre: public/images/nk/kim-{i + 1}.jpg</div>
            </div>
            <div style={{fontFamily: display, fontSize: 38, color: nk.paper, marginTop: 18, letterSpacing: 1}}>{p.name}</div>
            <div style={{fontFamily: display, fontSize: 26, color: nk.red, letterSpacing: 3}}>{p.years}</div>
            <div style={{fontFamily: sans, fontSize: 20, color: nk.paperDim, marginTop: 6}}>{p.note}</div>
          </div>
        );
      })}
      <div style={{position: 'absolute', left: 0, right: 0, top: 120, textAlign: 'center', fontFamily: display, fontSize: 44, color: nk.paper, letterSpacing: 4}}>ÜÇ KUŞAK · TEK AİLE</div>
    </AbsoluteFill>
  );
};

/* ---------------- IŞIKLAR SÖNÜYOR → PAZAR ---------------- */
export const LightsOut: React.FC = () => {
  const frame = useCurrentFrame();
  const {width, height} = useVideoConfig();
  const fade = useFade();
  const cols = 22;
  const rows = 9;
  const cw = 70;
  const ch = 58;
  const x0 = (width - cols * cw) / 2;
  const y0 = 220;
  const off = interpolate(frame, [30, 150], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const market = interpolate(frame, [180, 300], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const stage = frame < 160 ? '1991: Sovyet yardımı kesiliyor · fabrikalar, traktörler, erzak sistemi duruyor' : frame < 190 ? '"Zorlu Yürüyüş" · ölü sayısı: yüz binlerden 1 milyonun üzerine (tahmin)' : 'Jangmadang: insanlar kendi pazarlarını kuruyor';
  return (
    <AbsoluteFill style={{opacity: fade}}>
      <div style={{position: 'absolute', left: 0, right: 0, top: 120, textAlign: 'center', fontFamily: display, fontSize: 40, color: nk.paper, letterSpacing: 2}}>{stage}</div>
      <svg width={width} height={height}>
        {Array.from({length: cols * rows}).map((_, i) => {
          const c = i % cols;
          const r = Math.floor(i / cols);
          const order = random(`lo${i}`);
          const lit = order > off;
          const mk = random(`mk${i}`) < market * 0.45;
          const x = x0 + c * cw;
          const y = y0 + r * ch;
          return (
            <g key={i}>
              <rect x={x + 6} y={y + 6} width={cw - 12} height={ch - 12} fill={lit ? nk.light : '#0d1220'} opacity={lit ? 0.55 + 0.35 * Math.sin((frame + i) / 7) : 1} stroke="rgba(236,230,214,0.08)" />
              {mk ? <g transform={`translate(${x + cw / 2}, ${y + ch / 2})`}><polygon points="-22,-6 22,-6 26,2 -26,2" fill={random(`c${i}`) > 0.5 ? nk.red : nk.gold} /><rect x={-20} y={2} width={40} height={14} fill={nk.paper} opacity={0.85} /></g> : null}
            </g>
          );
        })}
      </svg>
      <div style={{position: 'absolute', left: 0, right: 0, bottom: 130, textAlign: 'center', fontFamily: sans, fontSize: 24, color: nk.steel}}>
        {frame < 180 ? `çalışan tesis: ${Math.round((1 - off) * 100)}%` : `gri pazar · hane gelirinin büyük kısmı`}
      </div>
    </AbsoluteFill>
  );
};

/* ---------------- PARA AKIŞI ---------------- */
export const MoneyFlow: React.FC = () => {
  const frame = useCurrentFrame();
  const {width, height} = useVideoConfig();
  const fade = useFade();
  const sources = [
    {name: 'HACKERLAR', sub: 'Lazarus · kripto, banka', delay: 10},
    {name: 'SAHTE UZAKTAN ÇALIŞANLAR', sub: 'çalıntı kimlikle IT işleri', delay: 40},
    {name: 'YURT DIŞI İŞÇİLER', sub: 'Rusya, Çin · inşaat, tekstil', delay: 70},
    {name: 'RUSYA', sub: 'mühimmat + asker karşılığı', delay: 100},
  ];
  const cx = width / 2 + 60;
  const cy = height / 2 + 30;
  const sx = 300;
  const outX = width - 260;
  const bez = (x0: number, y0: number, x1: number, y1: number, t: number) => {
    const mx = (x0 + x1) / 2;
    const x = (1 - t) ** 3 * x0 + 3 * (1 - t) ** 2 * t * mx + 3 * (1 - t) * t ** 2 * mx + t ** 3 * x1;
    const y = (1 - t) ** 3 * y0 + 3 * (1 - t) ** 2 * t * y0 + 3 * (1 - t) * t ** 2 * y1 + t ** 3 * y1;
    return [x, y];
  };
  const core = interpolate(frame, [0, 20], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.back(1.5))});
  const outP = interpolate(frame, [130, 170], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <AbsoluteFill style={{opacity: fade}}>
      <svg width={width} height={height}>
        <defs><filter id="mfGlow"><feGaussianBlur stdDeviation="5" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter></defs>
        {sources.map((s, i) => {
          const y = 250 + i * 170;
          const p = interpolate(frame - s.delay, [0, 30], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.inOut(Easing.cubic)});
          const d = `M${sx + 20},${y} C${(sx + cx) / 2},${y} ${(sx + cx) / 2},${cy} ${cx - 120},${cy}`;
          return (
            <g key={i}>
              <g opacity={p}>
                <rect x={sx - 280} y={y - 46} width={300} height={92} fill={nk.panel2} stroke={nk.steelDim} />
                <rect x={sx - 280} y={y - 46} width={8} height={92} fill={nk.red} />
                <text x={sx - 255} y={y - 8} fill={nk.paper} fontFamily={display} fontSize={24} letterSpacing={1}>{s.name}</text>
                <text x={sx - 255} y={y + 24} fill={nk.paperDim} fontFamily={sans} fontSize={18}>{s.sub}</text>
              </g>
              <path d={d} fill="none" stroke={nk.red} strokeWidth={3} opacity={0.5} strokeDasharray={900} strokeDashoffset={900 * (1 - p)} />
              {p >= 1 ? Array.from({length: 6}).map((_, k) => {
                const t = ((frame * 0.012 + k / 6 + i * 0.1) % 1);
                const [px, py] = bez(sx + 20, y, cx - 120, cy, t);
                return <circle key={k} cx={px} cy={py} r={5} fill={nk.gold} filter="url(#mfGlow)" />;
              }) : null}
            </g>
          );
        })}
        {/* merkez */}
        <g transform={`translate(${cx},${cy}) scale(${core})`}>
          <circle r={118} fill={nk.red} opacity={0.15} />
          <circle r={96} fill={nk.panel} stroke={nk.red} strokeWidth={4} />
          <text y={-8} textAnchor="middle" fill={nk.paper} fontFamily={display} fontSize={28} letterSpacing={2}>REJİM</text>
          <text y={24} textAnchor="middle" fill={nk.paperDim} fontFamily={sans} fontSize={18}>"39 Numaralı Oda"</text>
        </g>
        {/* cikis */}
        <path d={`M${cx + 100},${cy} L${outX - 160},${cy}`} stroke={nk.gold} strokeWidth={3} strokeDasharray={600} strokeDashoffset={600 * (1 - outP)} />
        <g opacity={outP} transform={`translate(${outX - 150}, ${cy})`}>
          <rect x={0} y={-70} width={300} height={140} fill={nk.panel2} stroke={nk.gold} />
          <text x={150} y={-20} textAnchor="middle" fill={nk.gold} fontFamily={display} fontSize={26} letterSpacing={2}>NÜKLEER · FÜZE</text>
          <text x={150} y={14} textAnchor="middle" fill={nk.paper} fontFamily={sans} fontSize={18}>6 deneme · ICBM</text>
          <text x={150} y={44} textAnchor="middle" fill={nk.paperDim} fontFamily={sans} fontSize={18}>elit sadakati · lüks ithalat</text>
        </g>
      </svg>
    </AbsoluteFill>
  );
};

/* ---------------- RYUGYONG OTELİ ---------------- */
export const Ryugyong: React.FC = () => {
  const frame = useCurrentFrame();
  const {width, height} = useVideoConfig();
  const fade = useFade();
  const cx = width / 2;
  const base = height - 200;
  const H = 700;
  const floors = 105;
  const built = interpolate(frame, [20, 140], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.quad)});
  const year = Math.round(interpolate(frame, [20, 140], [1987, 1992], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}));
  const stall = frame > 140;
  const year2 = stall ? Math.min(2026, 1992 + Math.floor((frame - 140) / 4)) : year;
  const stampIn = frame > 140 + 34 * 4 + 10;
  return (
    <AbsoluteFill style={{opacity: fade}}>
      <svg width={width} height={height}>
        {/* silüet */}
        {Array.from({length: 30}).map((_, i) => {
          const w = 40 + random(`bw${i}`) * 60;
          const h = 60 + random(`bh${i}`) * 220;
          const x = (i / 30) * width;
          return <rect key={i} x={x} y={base - h} width={w} height={h} fill="#0f1524" />;
        })}
        <line x1={0} y1={base} x2={width} y2={base} stroke={nk.steelDim} />
        {/* piramit kule: 3 kanat sematik olarak tek ucgen + orta kule */}
        <clipPath id="tower"><polygon points={`${cx - 190},${base} ${cx},${base - H} ${cx + 190},${base}`} /></clipPath>
        <g clipPath="url(#tower)">
          <rect x={cx - 200} y={base - H * built} width={400} height={H * built} fill="#1c2436" />
          {Array.from({length: floors}).map((_, i) => {
            const y = base - (i / floors) * H;
            const on = i / floors < built;
            return <line key={i} x1={cx - 200} y1={y} x2={cx + 200} y2={y} stroke={on ? 'rgba(236,230,214,0.18)' : 'transparent'} strokeWidth={1} />;
          })}
          {/* cam kaplama isigi (2008 sonrasi) */}
          {year2 >= 2011 ? <rect x={cx - 200} y={base - H} width={400} height={H} fill={nk.blue} opacity={Math.min(0.25, (year2 - 2011) * 0.03)} /> : null}
        </g>
        <polygon points={`${cx - 190},${base} ${cx},${base - H} ${cx + 190},${base}`} fill="none" stroke={nk.paper} strokeWidth={2} opacity={0.6} />
        {/* vinç */}
        {!stall || year2 < 2011 ? <g opacity={built}><line x1={cx} y1={base - H * built - 10} x2={cx} y2={base - H * built - 120} stroke={nk.gold} strokeWidth={4} /><line x1={cx - 140} y1={base - H * built - 120} x2={cx + 60} y2={base - H * built - 120} stroke={nk.gold} strokeWidth={4} /></g> : null}
        <text x={cx + 260} y={base - H + 40} fill={nk.paper} fontFamily={display} fontSize={30} letterSpacing={2}>330 m · 105 kat</text>
        <text x={cx + 260} y={base - H + 80} fill={nk.paperDim} fontFamily={sans} fontSize={22}>{stall ? '1992: para bitti, inşaat durdu' : 'inşaat sürüyor'}</text>
      </svg>
      <div style={{position: 'absolute', left: 120, top: 200, fontFamily: display, fontSize: 150, color: nk.paper, lineHeight: 1}}>{year2}</div>
      <div style={{position: 'absolute', left: 124, top: 360, fontFamily: sans, fontSize: 24, color: nk.steel, letterSpacing: 3}}>RYUGYONG OTELİ</div>
      {stampIn ? (
        <div style={{position: 'absolute', left: 110, top: 440}}>
          <div style={{display: 'inline-block', transform: 'rotate(-10deg)', border: `5px solid ${nk.red}`, color: nk.red, fontFamily: display, fontSize: 54, padding: '6px 20px', letterSpacing: 6}}>HÂLÂ AÇILMADI</div>
        </div>
      ) : null}
    </AbsoluteFill>
  );
};

/* ---------------- MİT / GERÇEK KARTLARI ---------------- */
export const MythCard: React.FC<{claim: string; verdict: 'YANLIŞ' | 'DOĞRU' | 'ABARTILI'; why: string}> = ({claim, verdict, why}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const fade = useFade();
  const s = spring({frame, fps, config: {damping: 200}});
  const st = spring({frame: frame - 45, fps, config: {damping: 10, stiffness: 300}});
  const col = verdict === 'DOĞRU' ? nk.green : verdict === 'ABARTILI' ? nk.gold : nk.red;
  return (
    <AbsoluteFill style={{opacity: fade, justifyContent: 'center', alignItems: 'center'}}>
      <div style={{width: 1300, background: nk.paper, color: '#111', padding: '48px 56px', transform: `translateY(${(1 - s) * 60}px) rotate(-1deg)`, boxShadow: '0 40px 80px rgba(0,0,0,0.7)', position: 'relative'}}>
        <div style={{fontFamily: display, fontSize: 22, letterSpacing: 5, color: '#555', marginBottom: 14}}>İDDİA</div>
        <div style={{fontFamily: serif, fontSize: 52, lineHeight: 1.2}}>“{claim}”</div>
        <div style={{height: 2, background: '#111', margin: '28px 0'}} />
        <div style={{fontFamily: sans, fontSize: 28, color: '#222', lineHeight: 1.4, opacity: interpolate(frame, [30, 45], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})}}>{why}</div>
        <div style={{position: 'absolute', right: 50, top: 30, transform: `rotate(12deg) scale(${interpolate(st, [0, 1], [2.5, 1])})`, opacity: Math.min(1, st * 2), border: `6px solid ${col}`, color: col, fontFamily: display, fontSize: 64, padding: '4px 22px', letterSpacing: 6}}>{verdict}</div>
      </div>
    </AbsoluteFill>
  );
};

/* ---------------- KAPALI AĞ (Kwangmyong) ---------------- */
export const Intranet: React.FC = () => {
  const frame = useCurrentFrame();
  const {width, height} = useVideoConfig();
  const fade = useFade();
  const cx = width / 2;
  const cy = height / 2 + 20;
  const wall = interpolate(frame, [40, 80], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)});
  const nodes = Array.from({length: 14}).map((_, i) => ({x: cx - 380 + random(`nx${i}`) * 400, y: cy - 220 + random(`ny${i}`) * 440}));
  return (
    <AbsoluteFill style={{opacity: fade}}>
      <svg width={width} height={height}>
        {/* ic ag */}
        {nodes.map((n, i) => nodes.slice(i + 1, i + 3).map((m, k) => <line key={`${i}${k}`} x1={n.x} y1={n.y} x2={m.x} y2={m.y} stroke={nk.steel} strokeWidth={1.5} opacity={0.5} />))}
        {nodes.map((n, i) => <circle key={i} cx={n.x} cy={n.y} r={9} fill={nk.paper} opacity={0.6 + 0.4 * Math.sin((frame + i * 9) / 8)} />)}
        <rect x={cx - 420} y={cy - 270} width={480} height={540} fill="none" stroke={nk.red} strokeWidth={4} strokeDasharray={2040} strokeDashoffset={2040 * (1 - wall)} />
        <text x={cx - 180} y={cy - 290} textAnchor="middle" fill={nk.red} fontFamily={display} fontSize={30} letterSpacing={4}>KWANGMYONG · KAPALI AĞ</text>
        {/* dis dunya */}
        <circle cx={cx + 380} cy={cy} r={150} fill="none" stroke={nk.blue} strokeWidth={3} opacity={0.6} />
        <ellipse cx={cx + 380} cy={cy} rx={60} ry={150} fill="none" stroke={nk.blue} strokeWidth={2} opacity={0.5} />
        <line x1={cx + 230} y1={cy} x2={cx + 530} y2={cy} stroke={nk.blue} strokeWidth={2} opacity={0.5} />
        <text x={cx + 380} y={cy + 200} textAnchor="middle" fill={nk.blue} fontFamily={display} fontSize={30} letterSpacing={4}>İNTERNET</text>
        {/* engellenen baglanti */}
        <line x1={cx + 60} y1={cy} x2={cx + 230} y2={cy} stroke={nk.paperDim} strokeWidth={3} strokeDasharray="10 8" />
        {wall >= 1 ? <g transform={`translate(${cx + 145}, ${cy})`}><circle r={30} fill={nk.red} /><line x1={-14} y1={-14} x2={14} y2={14} stroke="#fff" strokeWidth={5} /><line x1={14} y1={-14} x2={-14} y2={14} stroke="#fff" strokeWidth={5} /></g> : null}
      </svg>
      <div style={{position: 'absolute', left: 0, right: 0, bottom: 130, textAlign: 'center', fontFamily: sans, fontSize: 26, color: nk.steel}}>milyonlarca telefon · sıfır internet · radyolar devlet frekansına mühürlü</div>
    </AbsoluteFill>
  );
};
