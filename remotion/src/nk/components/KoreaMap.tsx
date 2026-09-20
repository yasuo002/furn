import React, {useMemo} from 'react';
import {interpolate, useCurrentFrame, useVideoConfig, Easing, random} from 'remotion';
import {geoConicConformal, geoPath, geoContains, geoGraticule, GeoProjection} from 'd3-geo';
import * as topojson from 'topojson-client';
import type {Topology, GeometryCollection} from 'topojson-specification';
import countries50 from 'world-atlas/countries-50m.json';
import {nk} from '../theme';
import {display, sans} from '../../components/Fonts';

/**
 * Kore Yarimadasi haritasi (Natural Earth 1:50m).
 * Modlar: gece isiklari, 38. paralel, savas cephesi suprumu, DMZ, sehir isaretleri.
 */
const MDL: [number, number][] = [
  [126.62, 37.78], [126.68, 37.95], [126.95, 37.98], [127.1, 38.1], [127.35, 38.3], [127.7, 38.32], [128.05, 38.35], [128.36, 38.62],
];

export type FrontKey = {frame: number; lat: number; label: string};

type Props = {
  bbox?: [number, number, number, number];
  nightLights?: boolean; // gece uydu gorunumu
  lightsProgress?: number; // 0..1 isiklarin yanma orani
  parallel?: boolean; // 38. paralel cizgisi
  parallelDelay?: number;
  front?: FrontKey[]; // savas cephesi anahtar kareleri (enlem)
  dmz?: boolean;
  dmzDelay?: number;
  markers?: {name: string; lon: number; lat: number; delay?: number; big?: boolean}[];
  title?: string;
  zoomTo?: number;
};

export const KP = {
  pyongyang: [125.75, 39.03] as [number, number],
  seoul: [126.98, 37.57] as [number, number],
  busan: [129.07, 35.18] as [number, number],
  panmunjom: [126.68, 37.96] as [number, number],
  kaesong: [126.55, 37.97] as [number, number],
  wonsan: [127.44, 39.15] as [number, number],
  sinuiju: [124.4, 40.1] as [number, number],
  dandong: [124.39, 40.12] as [number, number],
  shenyang: [123.43, 41.8] as [number, number],
  punggye: [129.08, 41.28] as [number, number],
};

export const KoreaMap: React.FC<Props> = ({
  bbox = [123.5, 33.2, 131.5, 43.2],
  nightLights = false,
  lightsProgress = 1,
  parallel = false,
  parallelDelay = 0,
  front,
  dmz = false,
  dmzDelay = 0,
  markers = [],
  title,
  zoomTo = 1.04,
}) => {
  const frame = useCurrentFrame();
  const {width, height, durationInFrames} = useVideoConfig();

  const geo = useMemo(() => {
    const topo = countries50 as unknown as Topology<{countries: GeometryCollection}>;
    const fc = topojson.feature(topo, topo.objects.countries) as any;
    const by = (n: string) => fc.features.find((f: any) => f.properties?.name === n);
    const nkF = by('North Korea');
    const skF = by('South Korea');
    const cn = by('China');
    const jp = by('Japan');
    const ru = by('Russia');
    const proj: GeoProjection = geoConicConformal().parallels([35, 42]).rotate([-127.5, 0]);
    const frameGeo = {type: 'Polygon' as const, coordinates: [[[bbox[0], bbox[1]], [bbox[0], bbox[3]], [bbox[2], bbox[3]], [bbox[2], bbox[1]], [bbox[0], bbox[1]]]]};
    proj.fitExtent([[60, 60], [width - 60, height - 60]], frameGeo as any);
    const path = geoPath(proj);
    const all = fc.features.filter((f: any) => ['North Korea', 'South Korea', 'China', 'Japan', 'Russia', 'Mongolia', 'Taiwan'].includes(f.properties?.name));
    const land = {type: 'FeatureCollection', features: all};
    // gece isiklari: deterministik rastgele noktalar, karada ve ilgili ulkede
    const lights: {x: number; y: number; r: number; k: number; order: number}[] = [];
    const seed = (s: string) => random(s);
    const cities: [number, number, number, number][] = [
      // lon, lat, yarıçap(derece), yoğunluk
      [126.98, 37.57, 0.55, 260], [129.07, 35.18, 0.3, 90], [128.6, 35.87, 0.25, 60], [126.85, 35.16, 0.2, 40], [127.38, 36.35, 0.2, 40], [126.7, 37.45, 0.25, 60], [129.3, 35.55, 0.2, 40], [127.0, 36.6, 0.5, 70], [128.0, 36.5, 0.9, 120], [127.7, 34.9, 0.4, 50],
      [124.39, 40.12, 0.25, 40], [123.43, 41.8, 0.4, 70], [121.6, 38.9, 0.3, 50], [130.4, 33.59, 0.35, 70], [131.9, 43.1, 0.25, 30], [130.9, 33.9, 0.3, 40],
    ];
    let order = 0;
    cities.forEach(([lon, lat, rad, n], ci) => {
      for (let i = 0; i < n; i++) {
        const a = seed(`a${ci}-${i}`) * Math.PI * 2;
        const d = Math.sqrt(seed(`d${ci}-${i}`)) * rad;
        const p: [number, number] = [lon + Math.cos(a) * d * 1.3, lat + Math.sin(a) * d];
        if (nkF && geoContains(nkF, p)) continue; // Kuzey Kore karanlik
        const onLand = (skF && geoContains(skF, p)) || (cn && geoContains(cn, p)) || (jp && geoContains(jp, p)) || (ru && geoContains(ru, p));
        if (!onLand) continue;
        const [x, y] = proj(p) as [number, number];
        lights.push({x, y, r: 1.2 + seed(`r${ci}-${i}`) * 2.2, k: ci, order: order++});
      }
    });
    const pyo = proj(KP.pyongyang) as [number, number];
    const mdlPath = MDL.map((p, i) => `${i === 0 ? 'M' : 'L'}${(proj(p) as number[]).join(',')}`).join(' ');
    return {proj, path, landPath: path(land as any) ?? '', nkPath: nkF ? path(nkF) ?? '' : '', skPath: skF ? path(skF) ?? '' : '', lights, pyo, mdlPath, grat: path(geoGraticule().step([2, 2])()) ?? ''};
  }, [bbox, width, height]);

  const zoom = interpolate(frame, [0, durationInFrames], [1, zoomTo]);
  const fade = interpolate(frame, [0, 15, durationInFrames - 12, durationInFrames], [0, 1, 1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});

  // savas cephesi: enlem anahtar kareleri arasinda interpolasyon
  let frontLat: number | null = null;
  let frontLabel = '';
  if (front && front.length) {
    const fr = front.map((k) => k.frame);
    const la = front.map((k) => k.lat);
    frontLat = interpolate(frame, fr, la, {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.inOut(Easing.quad)});
    const idx = front.findIndex((k, i) => frame >= k.frame && (i === front.length - 1 || frame < front[i + 1].frame));
    frontLabel = front[Math.max(0, idx)].label;
  }
  const frontPoly = frontLat !== null ? geo.path({type: 'Polygon', coordinates: [[[120, frontLat], [120, 44], [134, 44], [134, frontLat], [120, frontLat]]]} as any) ?? '' : '';
  const parallelPath = geo.path({type: 'LineString', coordinates: [[122, 38], [134, 38]]} as any) ?? '';
  const parallelLen = 1400;
  const pProg = interpolate(frame - parallelDelay, [0, 40], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.inOut(Easing.cubic)});
  const dProg = interpolate(frame - dmzDelay, [0, 45], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.inOut(Easing.cubic)});
  const shown = Math.floor(geo.lights.length * lightsProgress);

  return (
    <div style={{position: 'absolute', inset: 0, opacity: fade}}>
      <svg width={width} height={height} style={{transform: `scale(${zoom})`, transformOrigin: '50% 50%'}}>
        <defs>
          <filter id="lightGlow"><feGaussianBlur stdDeviation="3" /></filter>
          <filter id="softGlow"><feGaussianBlur stdDeviation="8" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
          <clipPath id="frontClip"><path d={frontPoly} /></clipPath>
          <clipPath id="nkClip"><path d={geo.nkPath} /></clipPath>
          <clipPath id="skClip"><path d={geo.skPath} /></clipPath>
          <pattern id="nkHatch" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="10" stroke={nk.red} strokeWidth="1.5" opacity="0.35" /></pattern>
        </defs>
        <rect width={width} height={height} fill={nightLights ? '#02040a' : '#070b14'} />
        <path d={geo.grat} fill="none" stroke="rgba(236,230,214,0.06)" />
        <path d={geo.landPath} fill={nightLights ? '#0a0f18' : '#141a28'} stroke={nightLights ? 'rgba(236,230,214,0.12)' : 'rgba(236,230,214,0.3)'} strokeWidth={1.2} />
        {!nightLights ? <path d={geo.nkPath} fill="url(#nkHatch)" stroke={nk.red} strokeWidth={1.6} /> : null}
        {!nightLights ? <path d={geo.skPath} fill="rgba(59,125,216,0.14)" stroke={nk.blue} strokeWidth={1.2} /> : null}

        {/* gece isiklari */}
        {nightLights
          ? geo.lights.slice(0, shown).map((l, i) => {
              const tw = 0.7 + 0.3 * Math.sin((frame + i * 7) / 9);
              return <circle key={i} cx={l.x} cy={l.y} r={l.r} fill={nk.light} opacity={0.85 * tw} filter="url(#lightGlow)" />;
            })
          : null}
        {nightLights && lightsProgress >= 1 ? (
          <g>
            <circle cx={geo.pyo[0]} cy={geo.pyo[1]} r={12 + 6 * Math.sin(frame / 10)} fill="none" stroke={nk.light} opacity={0.5} />
            <circle cx={geo.pyo[0]} cy={geo.pyo[1]} r={3.5} fill={nk.light} filter="url(#lightGlow)" />
          </g>
        ) : null}

        {/* savas cephesi: kirmizi = Kuzey kontrolu */}
        {frontLat !== null ? (
          <g>
            <g clipPath="url(#frontClip)">
              <path d={geo.nkPath} fill={nk.red} opacity={0.45} />
              <path d={geo.skPath} fill={nk.red} opacity={0.45} />
            </g>
            <path d={geo.path({type: 'LineString', coordinates: [[124, frontLat], [131, frontLat]]} as any) ?? ''} fill="none" stroke={nk.paper} strokeWidth={3} strokeDasharray="14 8" filter="url(#softGlow)" />
            <text x={width - 110} y={170} textAnchor="end" fill={nk.paper} fontFamily={display} fontSize={54}>{frontLabel}</text>
          </g>
        ) : null}

        {/* 38. paralel */}
        {parallel ? (
          <g>
            <path d={parallelPath} fill="none" stroke={nk.red} strokeWidth={4} strokeDasharray={parallelLen} strokeDashoffset={parallelLen * (1 - pProg)} filter="url(#softGlow)" />
            {pProg > 0.9 ? <text x={width - 110} y={(geo.proj([131.2, 38]) as number[])[1] - 14} textAnchor="end" fill={nk.red} fontFamily={display} fontSize={30} letterSpacing={3}>38° KUZEY</text> : null}
          </g>
        ) : null}

        {/* DMZ */}
        {dmz ? (
          <g>
            <path d={geo.mdlPath} fill="none" stroke={nk.gold} strokeWidth={14} opacity={0.25 * dProg} strokeLinecap="round" />
            <path d={geo.mdlPath} fill="none" stroke={nk.gold} strokeWidth={3} strokeDasharray={900} strokeDashoffset={900 * (1 - dProg)} />
            {dProg > 0.95 ? <text x={(geo.proj([128.7, 38.75]) as number[])[0]} y={(geo.proj([128.7, 38.75]) as number[])[1]} fill={nk.gold} fontFamily={display} fontSize={28} letterSpacing={3}>DMZ · 250 km · 4 km genişlik</text> : null}
          </g>
        ) : null}

        {markers.map((m, i) => {
          const [x, y] = geo.proj([m.lon, m.lat]) as [number, number];
          const s = interpolate(frame - (m.delay ?? i * 8), [0, 16], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.back(1.6))});
          return (
            <g key={i} transform={`translate(${x},${y}) scale(${s})`}>
              {m.big ? <circle r={16 + 5 * Math.sin(frame / 8)} fill="none" stroke={nk.red} strokeWidth={2} opacity={0.6} /> : null}
              <circle r={m.big ? 6 : 4.5} fill={m.big ? nk.red : nk.paper} />
              <text x={14} y={7} fill={nk.paper} fontFamily={sans} fontSize={m.big ? 30 : 22} fontWeight={m.big ? 600 : 400} stroke="#02040a" strokeWidth={5} paintOrder="stroke">{m.name}</text>
            </g>
          );
        })}
      </svg>
      {title ? <div style={{position: 'absolute', left: 100, top: 96, fontFamily: display, fontSize: 44, color: nk.paper, letterSpacing: 1}}>{title}</div> : null}
      <div style={{position: 'absolute', right: 100, bottom: 76, fontFamily: sans, fontSize: 16, color: nk.steelDim}}>Harita: Natural Earth · {nightLights ? 'gece ışıkları şematik (NASA VIIRS görüntüsüne göre)' : 'sınırlar 1:50m'}</div>
    </div>
  );
};
