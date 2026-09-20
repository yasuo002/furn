import React from 'react';
import {AbsoluteFill, Sequence, useCurrentFrame} from 'remotion';
import {nkSections, sectionSeconds} from './script';
import {FPS} from '../theme';
import {Grain} from '../components/Background';
import {Chrome, NKBackground} from './components/Chrome';
import {ColdOpen, TheLine, Kims, Songbun, Famine, Money, Facade, Myths, Today, Outro} from './scenes';

const sceneFor: Record<string, React.FC> = {
  'cold-open': ColdOpen, line: TheLine, kims: Kims, songbun: Songbun, famine: Famine, money: Money, facade: Facade, myths: Myths, today: Today, outro: Outro,
};

export const nkFrames = () => nkSections.map((s) => ({id: s.id, label: s.chapter ?? (s.id === 'outro' ? 'Kapanış' : 'Açılış'), frames: Math.round(sectionSeconds(s) * FPS)}));

export const NKVideo: React.FC = () => {
  const frame = useCurrentFrame();
  const parts = nkFrames();
  const total = parts.reduce((a, p) => a + p.frames, 0);
  let from = 0;
  let current = 0;
  let cursor = 0;
  parts.forEach((p, i) => {
    if (frame >= cursor) current = i;
    cursor += p.frames;
  });
  return (
    <AbsoluteFill>
      <NKBackground />
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
      <Chrome label={parts[current].label} index={current} total={parts.length - 1} progress={frame / total} />
      <Grain />
    </AbsoluteFill>
  );
};
