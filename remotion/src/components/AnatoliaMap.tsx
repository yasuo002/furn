import React, {useMemo} from 'react';
import {interpolate, useCurrentFrame, useVideoConfig, Easing} from 'remotion';
import {geoConicConformal, geoGraticule, geoPath, GeoProjection} from 'd3-geo';
import * as topojson from 'topojson-client';
import type {Topology, GeometryCollection} from 'topojson-specification';
import land50 from 'world-atlas/land-50m.json';
import countries50 from 'world-atlas/countries-50m.json';
import {theme} from '../theme';
import {sans, serif} from './Fonts';

/** Gercek cografya: world-atlas (Natural Earth 1:50m) verisiyle cizilir. */

export type Marker = {name: string; lon: number; lat: number; kind?: 'city' | 'volcano' | 'site'; delay?: number};
export type Route = {from: [number, number]; via?: [number, number][]; to: [number, number]; color?: string; delay?: number; label?: string};

type Props = {
  /** [minLon, minLat, maxLon, maxLat] */
  bbox?: [number, number, number, number];
  markers?: Marker[];
  routes?: Route[];
  highlightTurkey?: boolean;
  title?: string;
  zoomFrom?: number;
  zoomTo?: number;
};

export const PLACES = {
  derinkuyu: [34.734, 38.374] as [number, number],
  kaymakli: [34.752, 38.463] as [number, number],
  nevsehir: [34.712, 38.625] as [number, number],
  kayseri: [35.48, 38.72] as [number, number],
  erciyes: [35.45, 38.53] as [number, number],
  hasan: [34.17, 38.13] as [number, number],
  gollu: [34.55, 38.28] as [number, number],
  konya: [32.49, 37.87] as [number, number],
  tarsus: [34.9, 36.92] as [number, number],
  gulek: [34.77, 37.28] as [number, number], // Kilikya Kapilari / Gulek Bogazi
  antakya: [36.16, 36.2] as [number, number],
  malatya: [38.31, 38.35] as [number, number],
  istanbul: [28.98, 41.01] as [number, number],
  damascus: [36.29, 33.51] as [number, number],
  baghdad: [44.36, 33.31] as [number, number],
  athens: [23.73, 37.98] as [number, number],
  thessaloniki: [22.94, 40.64] as [number, number],
  tabriz: [46.29, 38.08] as [number, number],
};

export const AnatoliaMap: React.FC<Props> = ({
  bbox = [24, 33.5, 46, 43],
  markers = [],
  routes = [],
  highlightTurkey = true,
  title,
  zoomFrom = 1,
  zoomTo = 1.06,
}) => {
  const frame = useCurrentFrame();
  const {width, height, fps, durationInFrames} = useVideoConfig();

  const {projection, landPath, turkeyPath, bordersPath, graticulePath} = useMemo(() => {
    const landTopo = land50 as unknown as Topology<{land: GeometryCollection}>;
    const countriesTopo = countries50 as unknown as Topology<{countries: GeometryCollection}>;
    const land = topojson.feature(landTopo, landTopo.objects.land);
    const countries = topojson.feature(countriesTopo, countriesTopo.objects.countries);
    const borders = topojson.mesh(countriesTopo, countriesTopo.objects.countries, (a, b) => a !== b);
    const turkey = (countries as any).features.find((f: any) => f.properties?.name === 'Turkey');

    const proj: GeoProjection = geoConicConformal().parallels([36, 42]).rotate([-35, 0]);
    const frameGeo = {
      type: 'Polygon' as const,
      coordinates: [
        [
          [bbox[0], bbox[1]],
          [bbox[0], bbox[3]],
          [bbox[2], bbox[3]],
          [bbox[2], bbox[1]],
          [bbox[0], bbox[1]],
        ],
      ],
    };
    proj.fitExtent(
      [
        [80, 80],
        [width - 80, height - 80],
      ],
      frameGeo as any,
    );
    const path = geoPath(proj);
    const span = bbox[2] - bbox[0];
    const step = span > 12 ? 5 : span > 4 ? 1 : 0.25;
    const grat = geoGraticule().step([step, step]);
    return {
      graticulePath: path(grat()) ?? '',
      projection: proj,
      landPath: path(land as any) ?? '',
      turkeyPath: turkey ? path(turkey) ?? '' : '',
      bordersPath: path(borders as any) ?? '',
    };
  }, [bbox, width, height]);

  const zoom = interpolate(frame, [0, durationInFrames], [zoomFrom, zoomTo]);
  const fade = interpolate(frame, [0, 20, durationInFrames - 15, durationInFrames], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <div style={{position: 'absolute', inset: 0, opacity: fade}}>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{transform: `scale(${zoom})`, transformOrigin: '50% 50%'}}>
        <defs>
          <pattern id="hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(35)">
            <line x1="0" y1="0" x2="0" y2="8" stroke="rgba(224,164,88,0.12)" strokeWidth="1" />
          </pattern>
          <filter id="glow">
            <feGaussianBlur stdDeviation="6" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <rect width={width} height={height} fill="#0a0f14" />
        <path d={graticulePath} fill="none" stroke="rgba(217,195,163,0.10)" strokeWidth={1} />
        <path d={landPath} fill="#1f1c17" stroke="rgba(217,195,163,0.35)" strokeWidth={1.2} />
        <path d={landPath} fill="url(#hatch)" />
        <path d={bordersPath} fill="none" stroke="rgba(217,195,163,0.18)" strokeWidth={0.8} strokeDasharray="3 4" />
        {highlightTurkey ? <path d={turkeyPath} fill="rgba(224,164,88,0.10)" stroke={theme.accent} strokeWidth={1.6} /> : null}

        {routes.map((r, i) => {
          const pts = [r.from, ...(r.via ?? []), r.to].map((p) => projection(p) as [number, number]);
          const d = pts.map((p, j) => `${j === 0 ? 'M' : 'L'}${p[0]},${p[1]}`).join(' ');
          const len = pts.reduce((acc, p, j) => (j === 0 ? 0 : acc + Math.hypot(p[0] - pts[j - 1][0], p[1] - pts[j - 1][1])), 0);
          const prog = interpolate(frame - (r.delay ?? 0), [0, 55], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
            easing: Easing.inOut(Easing.cubic),
          });
          const color = r.color ?? theme.danger;
          const end = pts[pts.length - 1];
          const prev = pts[pts.length - 2];
          const ang = (Math.atan2(end[1] - prev[1], end[0] - prev[0]) * 180) / Math.PI;
          return (
            <g key={i}>
              <path d={d} fill="none" stroke={color} strokeWidth={4} strokeLinecap="round" strokeDasharray={len} strokeDashoffset={len * (1 - prog)} filter="url(#glow)" />
              <path d={d} fill="none" stroke="rgba(0,0,0,0.5)" strokeWidth={1} strokeDasharray="6 10" strokeDashoffset={-frame * 1.5} opacity={prog} />
              {prog > 0.98 ? (
                <polygon points="0,-9 18,0 0,9" fill={color} transform={`translate(${end[0]},${end[1]}) rotate(${ang})`} />
              ) : null}
              {r.label && prog > 0.5 ? (
                <text x={pts[0][0]} y={pts[0][1] - 16} fill={color} fontFamily={sans} fontSize={22} textAnchor="middle" opacity={(prog - 0.5) * 2}>
                  {r.label}
                </text>
              ) : null}
            </g>
          );
        })}

        {markers.map((m, i) => {
          const [x, y] = projection([m.lon, m.lat]) as [number, number];
          const s = interpolate(frame - (m.delay ?? i * 6), [0, 18], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.back(1.5))});
          const pulse = 1 + 0.25 * Math.sin((frame + i * 10) / 8);
          const color = m.kind === 'volcano' ? theme.danger : m.kind === 'site' ? theme.accent : theme.sand;
          return (
            <g key={i} transform={`translate(${x},${y}) scale(${s})`}>
              {m.kind === 'site' ? <circle r={18 * pulse} fill="none" stroke={color} strokeWidth={2} opacity={0.5} /> : null}
              {m.kind === 'volcano' ? <polygon points="-11,9 0,-11 11,9" fill={color} /> : <circle r={7} fill={color} />}
              <text x={16} y={7} fill={theme.ink} fontFamily={sans} fontSize={m.kind === 'site' ? 28 : 22} fontWeight={m.kind === 'site' ? 600 : 400} stroke="#0a0f14" strokeWidth={5} paintOrder="stroke">
                {m.name}
              </text>
            </g>
          );
        })}
      </svg>
      {title ? (
        <div style={{position: 'absolute', left: 96, top: 72, fontFamily: serif, fontSize: 46, color: theme.ink}}>{title}</div>
      ) : null}
      <div style={{position: 'absolute', right: 48, bottom: 30, fontFamily: sans, fontSize: 18, color: theme.muted}}>
        Harita verisi: Natural Earth (world-atlas)
      </div>
    </div>
  );
};
