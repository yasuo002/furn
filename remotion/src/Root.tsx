import React from 'react';
import {Composition, Folder} from 'remotion';
import {Video, sectionFrames} from './Video';
import {FPS, HEIGHT, WIDTH} from './theme';
import {AnatoliaMap, PLACES} from './components/AnatoliaMap';
import {CrossSection} from './components/CrossSection';
import {StoneDoor} from './components/StoneDoor';
import {Ventilation} from './components/Ventilation';
import {TuffFormation} from './components/TuffFormation';

const total = sectionFrames().reduce((a, p) => a + p.frames, 0);

export const Root: React.FC = () => (
  <>
    <Composition id="Derinkuyu" component={Video} durationInFrames={total} fps={FPS} width={WIDTH} height={HEIGHT} />
    <Folder name="Parcalar">
      <Composition
        id="Harita-Akinlar"
        component={() => (
          <AnatoliaMap
            bbox={[24, 32, 47, 43]}
            title="7.–10. yüzyıl: Bizans–Arap sınırı"
            markers={[{name: 'Kapadokya', lon: PLACES.derinkuyu[0], lat: PLACES.derinkuyu[1], kind: 'site'}]}
            routes={[{from: PLACES.damascus, via: [PLACES.antakya, PLACES.tarsus, PLACES.gulek], to: PLACES.derinkuyu, delay: 20, label: 'yaz akınları'}]}
          />
        )}
        durationInFrames={240}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />
      <Composition id="Kesit" component={() => <CrossSection />} durationInFrames={360} fps={FPS} width={WIDTH} height={HEIGHT} />
      <Composition id="TasKapi" component={StoneDoor} durationInFrames={180} fps={FPS} width={WIDTH} height={HEIGHT} />
      <Composition id="Havalandirma" component={Ventilation} durationInFrames={180} fps={FPS} width={WIDTH} height={HEIGHT} />
      <Composition id="Tuf" component={TuffFormation} durationInFrames={330} fps={FPS} width={WIDTH} height={HEIGHT} />
    </Folder>
  </>
);
