import React from 'react';
import {AbsoluteFill, Sequence} from 'remotion';
import {sections, sectionSeconds} from './script';
import {FPS} from './theme';
import {Background, Grain} from './components/Background';
import {ColdOpen, Discovery, Structure, Geology, Who, Why, Life, LastResidents, Kayasehir, Outro} from './scenes';

const sceneFor: Record<string, React.FC> = {
  'cold-open': ColdOpen,
  discovery: Discovery,
  structure: Structure,
  geology: Geology,
  who: Who,
  why: Why,
  life: Life,
  'last-residents': LastResidents,
  kayasehir: Kayasehir,
  outro: Outro,
};

export const sectionFrames = () =>
  sections.map((s) => ({id: s.id, frames: Math.round(sectionSeconds(s) * FPS)}));

export const Video: React.FC = () => {
  let from = 0;
  const parts = sectionFrames();
  return (
    <AbsoluteFill>
      <Background />
      {parts.map((p) => {
        const Scene = sceneFor[p.id];
        const start = from;
        from += p.frames;
        return (
          <Sequence key={p.id} from={start} durationInFrames={p.frames} name={p.id}>
            <Scene />
          </Sequence>
        );
      })}
      <Grain />
    </AbsoluteFill>
  );
};
