import React from 'react';
import {Sequence, useVideoConfig} from 'remotion';

/**
 * Bir bolumun suresini agirliklara gore alt sahnelere boler.
 * Boylece seslendirme suresi degisince tum sahne orantili uzar/kisalir.
 */
export type Beat = {w: number; node: React.ReactNode; name?: string};

export const Beats: React.FC<{beats: Beat[]}> = ({beats}) => {
  const {durationInFrames} = useVideoConfig();
  const total = beats.reduce((a, b) => a + b.w, 0);
  let cursor = 0;
  return (
    <>
      {beats.map((b, i) => {
        const len = Math.max(1, Math.round((b.w / total) * durationInFrames));
        const from = cursor;
        cursor += len;
        const dur = i === beats.length - 1 ? Math.max(1, durationInFrames - from) : len;
        return (
          <Sequence key={i} from={from} durationInFrames={dur} name={b.name ?? `beat-${i}`}>
            {b.node}
          </Sequence>
        );
      })}
    </>
  );
};
