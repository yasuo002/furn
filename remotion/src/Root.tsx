import React from 'react';
import {Composition, Folder} from 'remotion';
import {Video, sectionFrames} from './Video';
import {FPS, HEIGHT, WIDTH} from './theme';
import {AnatoliaMap, PLACES} from './components/AnatoliaMap';
import {CrossSection} from './components/CrossSection';
import {StoneDoor} from './components/StoneDoor';
import {Ventilation} from './components/Ventilation';
import {TuffFormation} from './components/TuffFormation';
import {NKVideo, nkFrames} from './nk/Video';
import {KoreaMap} from './nk/components/KoreaMap';
import {DMZSection, SongbunPyramid, MoneyFlow, Ryugyong, LightsOut, Dynasty} from './nk/components/Diagrams';
import {WorldArcs} from './nk/components/WorldArcs';

const total = sectionFrames().reduce((a, p) => a + p.frames, 0);
const nkTotal = nkFrames().reduce((a, p) => a + p.frames, 0);

export const Root: React.FC = () => (
  <>
    <Composition id="Derinkuyu" component={Video} durationInFrames={total} fps={FPS} width={WIDTH} height={HEIGHT} />
    <Composition id="KuzeyKore" component={NKVideo} durationInFrames={nkTotal} fps={FPS} width={WIDTH} height={HEIGHT} />
    <Folder name="KuzeyKore-Parcalar">
      <Composition id="NK-GeceHarita" component={() => <KoreaMap nightLights bbox={[121.5, 32.5, 133, 44]} />} durationInFrames={240} fps={FPS} width={WIDTH} height={HEIGHT} />
      <Composition id="NK-Savas" component={() => <KoreaMap front={[{frame: 0, lat: 38, label: 'Haziran 1950'}, {frame: 60, lat: 35.3, label: 'Eylül 1950'}, {frame: 130, lat: 40.6, label: 'Kasım 1950'}, {frame: 210, lat: 38.2, label: '1953'}]} />} durationInFrames={270} fps={FPS} width={WIDTH} height={HEIGHT} />
      <Composition id="NK-DMZ" component={DMZSection} durationInFrames={240} fps={FPS} width={WIDTH} height={HEIGHT} />
      <Composition id="NK-Songbun" component={SongbunPyramid} durationInFrames={240} fps={FPS} width={WIDTH} height={HEIGHT} />
      <Composition id="NK-Hanedan" component={() => <Dynasty />} durationInFrames={240} fps={FPS} width={WIDTH} height={HEIGHT} />
      <Composition id="NK-Isiklar" component={LightsOut} durationInFrames={330} fps={FPS} width={WIDTH} height={HEIGHT} />
      <Composition id="NK-Para" component={MoneyFlow} durationInFrames={300} fps={FPS} width={WIDTH} height={HEIGHT} />
      <Composition id="NK-Ryugyong" component={Ryugyong} durationInFrames={330} fps={FPS} width={WIDTH} height={HEIGHT} />
      <Composition id="NK-Dunya" component={() => <WorldArcs arcs={[{to: [90.41, 23.81], label: 'Bangladeş', amount: '$81 M', delay: 10}, {to: [55.27, 25.2], label: 'Bybit', amount: '$1,5 MİLYAR', delay: 50}]} />} durationInFrames={240} fps={FPS} width={WIDTH} height={HEIGHT} />
    </Folder>
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
