import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Sequence} from 'remotion';
import {BeatsT} from './components/BeatsT';
import {KenBurns} from '../components/KenBurns';
import {StampChapter, Tag, Line, Statement, Odometer, Typewriter, SlamTitle, Stamp} from './components/Type';
import {Glitch, CRT, Fade} from './components/Glitch';
import {KoreaMap, KP} from './components/KoreaMap';
import {WorldArcs} from './components/WorldArcs';
import {DMZSection, SongbunPyramid, Dynasty, LightsOut, MoneyFlow, Ryugyong, MythCard, Intranet} from './components/Diagrams';
import {Stripes} from './components/Chrome';
import {nk} from './theme';
import {display, sans, serif} from '../components/Fonts';
import {hasFile, fileSrc} from '../assets';

const S: React.FC<{children: React.ReactNode}> = ({children}) => <AbsoluteFill>{children}</AbsoluteFill>;
const img = (name: string) => `images/nk/${name}`;

/* 00 — SOĞUK AÇILIŞ: gece uydu görüntüsü */
export const ColdOpen: React.FC = () => (
  <BeatsT
    beats={[
      {
        w: 16,
        node: (
          <S>
            <NightReveal />
          </S>
        ),
      },
      {
        w: 9,
        t: 'cut',
        node: (
          <Glitch at={[0]}>
            <Statement lines={['İnterneti yok.', 'Ama tarihin en büyük kripto soygununu yaptı.', 'Kıtlık gördü. Nükleer bombası var.']} size={64} />
          </Glitch>
        ),
      },
      {
        w: 10,
        t: 'cut',
        node: (
          <S>
            <Stripes opacity={0.07} />
            <KenBurns file={img('pyongyang-skyline.jpg')} from={1.25} to={1.05} darken={0.6} label="nk/pyongyang-skyline.jpg" />
            <TitleCard />
          </S>
        ),
      },
    ]}
  />
);

const NightReveal: React.FC = () => {
  const frame = useCurrentFrame();
  const {durationInFrames} = useVideoConfig();
  const lights = interpolate(frame, [20, 110], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const label = frame > 130;
  return (
    <S>
      <KoreaMap nightLights lightsProgress={lights} bbox={[121.5, 32.5, 133, 44]} zoomTo={1.12} />
      <div style={{position: 'absolute', left: 100, top: 96, fontFamily: display, fontSize: 24, letterSpacing: 6, color: nk.paperDim}}>UYDU GÖRÜNTÜSÜ · KORE YARIMADASI · GECE</div>
      {label ? (
        <>
          <Tag title="Güney Kore" sub="52 milyon · ışıl ışıl" right delay={0} />
          <div style={{position: 'absolute', left: 100, bottom: 120}}>
            <div style={{display: 'inline-block', background: '#000', color: nk.paper, fontFamily: display, fontSize: 34, padding: '6px 18px', letterSpacing: 2, border: `2px solid ${nk.red}`}}>KUZEY KORE</div>
            <div style={{background: 'rgba(6,8,14,0.85)', color: nk.paper, fontFamily: sans, fontSize: 24, padding: '8px 18px', borderLeft: `4px solid ${nk.red}`}}>26 milyon insan · tek ışık: Pyongyang</div>
          </div>
        </>
      ) : null}
      {frame > durationInFrames - 60 ? <Line text="Kuzey Kore nasıl hâlâ ayakta?" red delay={0} /> : null}
    </S>
  );
};

const TitleCard: React.FC = () => {
  const frame = useCurrentFrame();
  const {durationInFrames} = useVideoConfig();
  const out = interpolate(frame, [durationInFrames - 12, durationInFrames], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center', opacity: out}}>
      <div style={{fontFamily: sans, fontSize: 24, letterSpacing: 10, color: nk.red, marginBottom: 18}}>DÜNYANIN EN KAPALI ÜLKESİ</div>
      <SlamTitle text="Kuzey Kore" size={210} delay={6} />
      <div style={{marginTop: 26, opacity: interpolate(frame, [45, 60], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})}}>
        <Typewriter text="nasıl hâlâ ayakta?" delay={45} size={48} font={serif} color={nk.paper} />
      </div>
    </AbsoluteFill>
  );
};

/* 01 — BİR ÇİZGİ */
export const TheLine: React.FC = () => (
  <BeatsT
    beats={[
      {w: 4, node: <StampChapter index={1} title="Bir Çizgi" sub="1945 · 38. paralel" />},
      {
        w: 9,
        node: (
          <S>
            <KenBurns file={img('korea-1945-liberation.jpg')} from={1.0} to={1.15} darken={0.4} caption="1945 · Japon işgalinin sonu" label="nk/korea-1945-liberation.jpg" />
            <Tag title="1945" sub="35 yıllık Japon işgali bitiyor · kuzeyden Sovyetler, güneyden ABD" delay={10} />
          </S>
        ),
      },
      {
        w: 12,
        t: 'wipe',
        node: (
          <S>
            <KoreaMap parallel parallelDelay={20} title="İki subay, bir gece, otuz dakika" markers={[{name: 'Pyongyang', lon: KP.pyongyang[0], lat: KP.pyongyang[1], delay: 60}, {name: 'Seul', lon: KP.seoul[0], lat: KP.seoul[1], delay: 70}]} />
            <Line text="Geçici bir çizgi. 80 yıldır orada." delay={80} red />
          </S>
        ),
      },
      {
        w: 18,
        t: 'cut',
        node: (
          <S>
            <KoreaMap
              title="Kore Savaşı · 1950–1953"
              front={[
                {frame: 0, lat: 38, label: 'Haziran 1950'},
                {frame: 60, lat: 35.3, label: 'Eylül 1950 · Busan cephesi'},
                {frame: 130, lat: 40.6, label: 'Kasım 1950 · Çin sınırı'},
                {frame: 210, lat: 38.2, label: 'Temmuz 1953 · ateşkes'},
              ]}
              markers={[{name: 'Busan', lon: KP.busan[0], lat: KP.busan[1], delay: 40}, {name: 'Sinuiju', lon: KP.sinuiju[0], lat: KP.sinuiju[1], delay: 120}]}
            />
            <Line text="Savaş bitmedi, durdu: ateşkes var, barış antlaşması yok." delay={230} />
          </S>
        ),
      },
      {
        w: 10,
        node: (
          <S>
            <KoreaMap dmz dmzDelay={10} bbox={[125.5, 36.6, 129.5, 39.6]} title="Silahsızlandırılmış Bölge" markers={[{name: 'Panmunjom', lon: KP.panmunjom[0], lat: KP.panmunjom[1], delay: 60, big: true}, {name: 'Seul', lon: KP.seoul[0], lat: KP.seoul[1], delay: 70}]} />
          </S>
        ),
      },
      {
        w: 9,
        t: 'slide',
        node: (
          <S>
            <KenBurns file={img('dmz-jsa.jpg')} from={1.0} to={1.2} darken={0.35} caption="Panmunjom, Ortak Güvenlik Alanı" label="nk/dmz-jsa.jpg" />
            <Line text="İsmi 'silahsızlandırılmış'. Gerçekte dünyanın en ağır silahlandırılmış sınırı." delay={20} red />
          </S>
        ),
      },
    ]}
  />
);

/* 02 — ÜÇ KİM */
export const Kims: React.FC = () => (
  <BeatsT
    beats={[
      {w: 4, node: <StampChapter index={2} title="Üç Kim" sub="1948 · bugün" />},
      {
        w: 9,
        node: (
          <CRT label="KCTV · ARŞİV">
            <KenBurns file={img('kim-il-sung-statue.jpg')} from={1.0} to={1.2} darken={0.3} label="nk/kim-il-sung-statue.jpg" />
            <Tag title="Kim İl-sung" sub="gerilla komutanı → kurucu lider → 'ebedi başkan'" delay={10} />
          </CRT>
        ),
      },
      {
        w: 8,
        node: (
          <S>
            <Stripes opacity={0.1} />
            <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center'}}>
              <SlamTitle text="Juche" size={220} color={nk.red} />
              <div style={{marginTop: 20, fontFamily: serif, fontSize: 40, color: nk.paper}}>주체 · "kendine yeterlilik"</div>
              <div style={{marginTop: 10, fontFamily: sans, fontSize: 26, color: nk.paperDim}}>kimseye muhtaç olmayacağız, her şeyi kendimiz yapacağız</div>
            </AbsoluteFill>
          </S>
        ),
      },
      {w: 16, t: 'wipe', node: <S><Dynasty images={['kim-1.jpg', 'kim-2.jpg', 'kim-3.jpg'].map((f) => (hasFile(img(f)) ? fileSrc(img(f)) : null))} /></S>},
      {
        w: 9,
        node: (
          <S>
            <KenBurns file={img('portraits-home.jpg')} from={1.1} to={1.25} darken={0.4} caption="Her evde iki portre" label="nk/portraits-home.jpg" />
            <Line text="Portreyi kadrajda kesmek bile suç sayılabiliyor." delay={20} />
          </S>
        ),
      },
    ]}
  />
);

/* 03 — SONGBUN */
export const Songbun: React.FC = () => (
  <BeatsT
    beats={[
      {w: 4, node: <StampChapter index={3} title="Doğuştan Dosya" sub="Songbun sistemi" />},
      {w: 20, node: <S><SongbunPyramid /></S>},
      {
        w: 9,
        node: (
          <S>
            <KenBurns file={img('pyongyang-apartments.jpg')} from={1.0} to={1.18} darken={0.35} caption="Pyongyang" label="nk/pyongyang-apartments.jpg" />
            <Tag title="Pyongyang" sub="başkentte yaşamak hak değil, ayrıcalık · izinle" delay={10} />
          </S>
        ),
      },
      {
        w: 8,
        t: 'cut',
        node: (
          <Glitch>
            <Statement lines={['Bir kişi suç işler.', 'Ceza üç kuşağa gider.', 'Korku sistemin içine gömülü.']} size={68} />
          </Glitch>
        ),
      },
    ]}
  />
);

/* 04 — IŞIKLAR SÖNÜYOR */
export const Famine: React.FC = () => (
  <BeatsT
    beats={[
      {w: 4, node: <StampChapter index={4} title="Işıklar Sönüyor" sub="1991 · Zorlu Yürüyüş" />},
      {w: 20, node: <S><LightsOut /></S>},
      {
        w: 9,
        node: (
          <S>
            <KenBurns file={img('jangmadang-market.jpg')} from={1.0} to={1.2} darken={0.35} caption="Jangmadang · sokak pazarı" label="nk/jangmadang-market.jpg" />
            <Tag title="Jangmadang" sub="yasak → göz yumma → vergi" delay={10} />
          </S>
        ),
      },
      {
        w: 7,
        t: 'cut',
        node: (
          <S>
            <Statement lines={['Resmen sosyalist.', 'Gayri resmi kapitalist.', 'Rejimin parası da aynı gri alandan geçiyor.']} size={66} />
          </S>
        ),
      },
    ]}
  />
);

/* 05 — PARA NEREDEN GELİYOR */
export const Money: React.FC = () => (
  <BeatsT
    beats={[
      {w: 4, node: <StampChapter index={5} title="Para Nereden Geliyor?" sub="yaptırım altında bir ekonomi" />},
      {
        w: 12,
        node: (
          <S>
            <KenBurns file={img('bangladesh-bank.jpg')} from={1.0} to={1.15} darken={0.5} caption="Bangladeş Merkez Bankası, Dakka" label="nk/bangladesh-bank.jpg" />
            <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center'}}>
              <Odometer value={951000000} prefix="$" label="2016 · denenen transfer" delay={10} size={120} />
            </AbsoluteFill>
          </S>
        ),
      },
      {
        w: 11,
        t: 'cut',
        node: (
          <S>
            <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center', gap: 30}}>
              <div style={{fontFamily: 'monospace', fontSize: 40, color: nk.paper, background: nk.panel2, padding: '24px 40px', border: `1px solid ${nk.steelDim}`}}>
                <Typewriter text={'Beneficiary: Shalika F' + 'ANDATION'} cps={20} size={40} font="monospace" />
              </div>
              <div style={{opacity: 1}}><Stamp text="DURDURULDU" delay={90} rotate={-6} /></div>
              <div style={{fontFamily: sans, fontSize: 26, color: nk.paperDim}}>bir yazım hatası ≈ 870 milyon doları kurtardı · gidene: 81 milyon $</div>
            </AbsoluteFill>
          </S>
        ),
      },
      {
        w: 18,
        node: (
          <S>
            <WorldArcs
              title="Lazarus Grubu · seçilmiş operasyonlar"
              arcs={[
                {to: [-118.24, 34.05], label: 'Sony Pictures · 2014', amount: 'sızıntı + sabotaj', delay: 10},
                {to: [90.41, 23.81], label: 'Bangladeş Bankası · 2016', amount: '$81 M', delay: 40, dx: 10, dy: 70},
                {to: [-0.12, 51.5], label: 'WannaCry · 2017', amount: '150+ ülke', delay: 70, dx: -60, dy: -80},
                {to: [55.27, 25.2], label: 'Bybit · Şubat 2025', amount: '$1,5 MİLYAR', delay: 100, dx: -300, dy: -60},
              ]}
            />
          </S>
        ),
      },
      {
        w: 10,
        t: 'cut',
        node: (
          <Glitch>
            <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center'}}>
              <Odometer value={1500000000} prefix="$" label="Bybit · tarihin en büyük kripto soygunu" delay={5} size={150} duration={70} />
            </AbsoluteFill>
          </Glitch>
        ),
      },
      {w: 20, t: 'wipe', node: <S><MoneyFlow /></S>},
      {
        w: 8,
        node: (
          <S>
            <KenBurns file={img('nk-soldiers.jpg')} from={1.0} to={1.2} darken={0.45} caption="2024–25 · Rusya'ya asker ve mühimmat" label="nk/nk-soldiers.jpg" />
            <Line text="Dışarıya kapalı bir ülke, dünyanın finans sisteminin tam içinde yaşıyor." delay={15} red />
          </S>
        ),
      },
    ]}
  />
);

/* 06 — VİTRİN */
export const Facade: React.FC = () => (
  <BeatsT
    beats={[
      {w: 4, node: <StampChapter index={6} title="Vitrin" sub="Pyongyang · Kijong-dong" />},
      {
        w: 9,
        node: (
          <S>
            <KenBurns file={img('pyongyang-boulevard.jpg')} from={1.0} to={1.18} panX={0.5} darken={0.3} caption="Pyongyang" label="nk/pyongyang-boulevard.jpg" />
            <Tag title="Pyongyang" sub="geniş bulvarlar, pastel bloklar, dev anıtlar" delay={10} />
          </S>
        ),
      },
      {w: 16, t: 'wipe', node: <S><Ryugyong /></S>},
      {
        w: 8,
        node: (
          <S>
            <KenBurns file={img('ryugyong.jpg')} from={1.2} to={1.0} darken={0.35} caption="Ryugyong Oteli" label="nk/ryugyong.jpg" />
            <Line text="Dünyanın en yüksek boş binası." delay={15} red />
          </S>
        ),
      },
      {w: 18, t: 'slide', node: <S><DMZSection /></S>},
      {
        w: 9,
        node: (
          <S>
            <KenBurns file={img('kijong-dong.jpg')} from={1.0} to={1.2} darken={0.35} caption="Kijong-dong, 'propaganda köyü'" label="nk/kijong-dong.jpg" />
            <Line text="Kat yok, cam yok, ışıklar aynı saatte yanıp sönüyor." delay={15} />
          </S>
        ),
      },
    ]}
  />
);

/* 07 — MİT VE GERÇEK */
export const Myths: React.FC = () => (
  <BeatsT
    beats={[
      {w: 4, node: <StampChapter index={7} title="Mit ve Gerçek" sub="dolaşan haberlerin testi" />},
      {w: 9, node: <S><MythCard claim="Kuzey Kore'de sadece 28 saç modeline izin var." verdict="YANLIŞ" why="Kaynağı belirsiz bir haber; ülkeden kaçanlar böyle bir resmî liste görmediğini söylüyor. Kuaförlerde 'önerilen' modeller var, yasak listesi değil." /></S>},
      {w: 9, node: <S><MythCard claim="Kim Jong-un amcasını köpeklere yedirtti." verdict="YANLIŞ" why="Hong Kong'da bir hiciv yazısından çıktı, dünya basını gerçek sandı. Jang Song-thaek 2013'te idam edildi; yöntem bilinmiyor." /></S>},
      {w: 9, node: <S><MythCard claim="Milyonlarca cep telefonu var ama internet yok." verdict="DOĞRU" why="Koryolink abonesi milyonlarca; erişim yalnızca Kwangmyong adlı kapalı ağa. Küresel internet birkaç yüz üst düzey kullanıcıya açık." /></S>},
      {w: 12, t: 'wipe', node: <S><Intranet /></S>},
      {
        w: 9,
        node: (
          <S>
            <KenBurns file={img('usb-smuggling.jpg')} from={1.0} to={1.2} darken={0.4} caption="USB bellekler, Güney Kore dizileri" label="nk/usb-smuggling.jpg" />
            <Tag title="USB" sub="Çin'den kaçak diziler elden ele · yakalanan ağır cezalandırılıyor" delay={10} />
          </S>
        ),
      },
      {
        w: 9,
        node: (
          <S>
            <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center', gap: 60}}>
              <Odometer value={34000} suffix="+" label="Güney'e ulaşan kaçak · toplam" delay={0} size={130} />
              <div style={{fontFamily: sans, fontSize: 30, color: nk.paperDim}}>2020 sınır kapanışı sonrası: yılda birkaç yüz</div>
            </AbsoluteFill>
            <Line text="Posterlerdeki ülke değil. Karikatürlerdeki ülke de değil." delay={60} red />
          </S>
        ),
      },
    ]}
  />
);

/* 08 — BUGÜN */
export const Today: React.FC = () => (
  <BeatsT
    beats={[
      {w: 4, node: <StampChapter index={8} title="Bugün" sub="2026" />},
      {
        w: 10,
        node: (
          <S>
            <KoreaMap bbox={[122, 33, 133, 44]} title="Punggye-ri · 6 nükleer deneme (2006–2017)" markers={[{name: 'Punggye-ri', lon: KP.punggye[0], lat: KP.punggye[1], big: true, delay: 10}, {name: 'Pyongyang', lon: KP.pyongyang[0], lat: KP.pyongyang[1], delay: 30}]} />
            <Line text="ICBM menzili: ABD ana karası." delay={50} />
          </S>
        ),
      },
      {
        w: 9,
        node: (
          <S>
            <KenBurns file={img('missile-parade.jpg')} from={1.0} to={1.2} darken={0.35} caption="Askerî geçit töreni" label="nk/missile-parade.jpg" />
            <Tag title="Rusya ile antlaşma" sub="2024 · karşılıklı savunma maddesi" delay={10} />
          </S>
        ),
      },
      {
        w: 9,
        node: (
          <S>
            <KenBurns file={img('kim-ju-ae.jpg')} from={1.1} to={1.25} darken={0.4} caption="Kim Ju-ae törenlerde" label="nk/kim-ju-ae.jpg" />
            <Tag title="Dördüncü kuşak" sub="şimdiden sahnede" delay={10} />
          </S>
        ),
      },
      {
        w: 9,
        node: (
          <S>
            <KenBurns file={img('wonsan-kalma.jpg')} from={1.0} to={1.15} panX={-0.4} darken={0.3} caption="Wonsan-Kalma tatil bölgesi · 2025" label="nk/wonsan-kalma.jpg" />
            <Tag title="Turizm" sub="Rus turistler için yepyeni bir sahil" delay={10} />
          </S>
        ),
      },
      {
        w: 9,
        t: 'cut',
        node: (
          <Glitch>
            <Statement lines={['Kapalı ama izole değil.', 'Fakir ama silahlı.', 'Hayatta kalmak bir sanayi.']} size={70} />
          </Glitch>
        ),
      },
    ]}
  />
);

/* 09 — KAPANIŞ */
export const Outro: React.FC = () => (
  <BeatsT
    beats={[
      {
        w: 12,
        node: (
          <S>
            <div style={{position: 'absolute', left: 140, right: 140, top: 180}}>
              <SlamTitle text="Toparlayalım" size={90} color={nk.red} align="left" />
              {['İçeride korku bir sisteme dönüştü.', 'Dışarıda gri para akmaya devam ediyor.', 'Nükleer silah rejime sigorta sağlıyor.'].map((t, i) => (
                <div key={i} style={{marginTop: i === 0 ? 40 : 18}}>
                  <Sequence from={30 + i * 40} layout="none">
                    <div style={{fontFamily: serif, fontSize: 46, color: nk.paper, borderLeft: `6px solid ${nk.red}`, paddingLeft: 24}}>
                      <Typewriter text={t} size={46} font={serif} cps={40} />
                    </div>
                  </Sequence>
                </div>
              ))}
            </div>
          </S>
        ),
      },
      {
        w: 8,
        node: (
          <S>
            <KenBurns file={img('dmz-jsa.jpg')} from={1.0} to={1.3} darken={0.5} label="nk/dmz-jsa.jpg" />
            <Line text="Bir sonraki video: iki askerin göz göze durduğu mavi barakalar." delay={10} red />
          </S>
        ),
      },
      {w: 5, node: <EndCard />},
    ]}
  />
);

const EndCard: React.FC = () => {
  const frame = useCurrentFrame();
  const o = interpolate(frame, [0, 20], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center', opacity: o}}>
      <SlamTitle text="Görüşmek üzere." size={110} />
      <div style={{fontFamily: sans, fontSize: 26, color: nk.steel, marginTop: 20, letterSpacing: 5}}>ABONE OL · BİLDİRİMLERİ AÇ</div>
    </AbsoluteFill>
  );
};
