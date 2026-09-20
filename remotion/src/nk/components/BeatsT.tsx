import React from 'react';
import {useVideoConfig} from 'remotion';
import {TransitionSeries, linearTiming, type TransitionPresentation} from '@remotion/transitions';
import {fade} from '@remotion/transitions/fade';
import {slide} from '@remotion/transitions/slide';
import {wipe} from '@remotion/transitions/wipe';

export type TBeat = {w: number; node: React.ReactNode; t?: 'fade' | 'slide' | 'wipe' | 'cut'; name?: string};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const pick = (t: TBeat['t']): TransitionPresentation<any> => {
  if (t === 'slide') return slide({direction: 'from-right'});
  if (t === 'wipe') return wipe({direction: 'from-left'});
  return fade();
};

/** Agirlikli alt sahneler + gercek gecisler (@remotion/transitions). Gecis suresi 14 kare. */
export const BeatsT: React.FC<{beats: TBeat[]; transition?: number}> = ({beats, transition = 14}) => {
  const {durationInFrames} = useVideoConfig();
  const total = beats.reduce((a, b) => a + b.w, 0);
  const overlap = transition * (beats.length - 1);
  const avail = durationInFrames + overlap; // gecisler ust uste bindigi icin toplam uzar
  const lens = beats.map((b) => Math.max(transition + 2, Math.round((b.w / total) * avail)));
  const diff = avail - lens.reduce((a, b) => a + b, 0);
  lens[lens.length - 1] += diff;
  return (
    <TransitionSeries>
      {beats.flatMap((b, i) => {
        const seq = (
          <TransitionSeries.Sequence key={`s${i}`} durationInFrames={lens[i]}>
            {b.node}
          </TransitionSeries.Sequence>
        );
        if (i === beats.length - 1) return [seq];
        const next = beats[i + 1];
        if (next.t === 'cut') return [seq];
        return [seq, <TransitionSeries.Transition key={`t${i}`} presentation={pick(next.t)} timing={linearTiming({durationInFrames: transition})} />];
      })}
    </TransitionSeries>
  );
};
