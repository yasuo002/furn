import React, {useMemo} from 'react';
import {interpolate, useCurrentFrame, useVideoConfig, Easing} from 'remotion';
import {geoNaturalEarth1, geoPath, geoInterpolate} from 'd3-geo';
import * as topojson from 'topojson-client';
import type {Topology, GeometryCollection} from 'topojson-specification';
import land110 from 'world-atlas/land-110m.json';
import {nk} from '../theme';
import {display, sans} from '../../components/Fonts';

export type Arc = {to: [number, number]; label: string; amount: string; delay: number; dx?: number; dy?: number};

/** Dunya haritasi: Pyongyang'dan hedeflere buyuk daire yaylari, ucta etiket + tutar. */
export const WorldArcs: React.FC<{arcs: Arc[]; title?: string}> = ({arcs, title}) => {
  const frame = useCurrentFrame();
  const {width, height, durationInFrames} = useVideoConfig();
  const from: [number, number] = [125.75, 39.03];
  const {landPath, proj} = useMemo(() => {
    const topo = land110 as unknown as Topology<{land: GeometryCollection}>;
    const land = topojson.feature(topo, topo.objects.land);
    const p = geoNaturalEarth1().rotate([-150, 0]).fitExtent([[80, 120], [width - 80, height - 80]], {type: 'Sphere'} as any);
    return {landPath: geoPath(p)(land as any) ?? '', proj: p};
  }, [width, height]);
  const fade = interpolate(frame, [0, 15, durationInFrames - 12, durationInFrames], [0, 1, 1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const [fx, fy] = proj(from) as [number, number];
  return (
    <div style={{position: 'absolute', inset: 0, opacity: fade}}>
      <svg width={width} height={height}>
        <defs><filter id="arcGlow"><feGaussianBlur stdDeviation="4" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter></defs>
        <rect width={width} height={height} fill="#070b14" />
        <path d={geoPath(proj)({type: 'Sphere'} as any) ?? ''} fill="#0a0f1a" stroke="rgba(236,230,214,0.15)" />
        <path d={landPath} fill="#161d2c" stroke="rgba(236,230,214,0.2)" strokeWidth={0.8} />
        {arcs.map((a, i) => {
          const interp = geoInterpolate(from, a.to);
          const prog = interpolate(frame - a.delay, [0, 50], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.inOut(Easing.cubic)});
          const N = 60;
          const pts: [number, number][] = [];
          for (let k = 0; k <= Math.floor(N * prog); k++) pts.push(proj(interp(k / N)) as [number, number]);
          if (pts.length < 2) return null;
          const d = pts.map((p, k) => `${k === 0 ? 'M' : 'L'}${p[0]},${p[1]}`).join(' ');
          const head = pts[pts.length - 1];
          const [tx, ty] = proj(a.to) as [number, number];
          const labelOp = interpolate(frame - a.delay, [50, 62], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
          return (
            <g key={i}>
              <path d={d} fill="none" stroke={nk.red} strokeWidth={3} filter="url(#arcGlow)" />
              <circle cx={head[0]} cy={head[1]} r={5} fill={nk.paper} />
              {prog >= 1 ? <circle cx={tx} cy={ty} r={10 + 4 * Math.sin(frame / 6)} fill="none" stroke={nk.red} strokeWidth={2} /> : null}
              <g opacity={labelOp} transform={`translate(${tx + 16 + (a.dx ?? 0)}, ${ty - 8 + (a.dy ?? 0)})`}>
                {(a.dx || a.dy) ? <line x1={-16 - (a.dx ?? 0)} y1={8 - (a.dy ?? 0)} x2={0} y2={0} stroke={nk.steel} strokeWidth={1} /> : null}
                <rect x={-6} y={-30} width={a.label.length * 13 + 40} height={64} fill="rgba(6,8,14,0.85)" stroke={nk.red} strokeWidth={1} />
                <text x={6} y={-6} fill={nk.paper} fontFamily={sans} fontSize={20}>{a.label}</text>
                <text x={6} y={24} fill={nk.red} fontFamily={display} fontSize={28}>{a.amount}</text>
              </g>
            </g>
          );
        })}
        <circle cx={fx} cy={fy} r={7} fill={nk.red} />
        <text x={fx + 14} y={fy - 10} fill={nk.paper} fontFamily={display} fontSize={26} letterSpacing={2}>PYONGYANG</text>
      </svg>
      {title ? <div style={{position: 'absolute', left: 100, top: 96, fontFamily: display, fontSize: 44, color: nk.paper}}>{title}</div> : null}
    </div>
  );
};
