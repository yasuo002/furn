import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {Beats} from '../components/Beats';
import {KenBurns} from '../components/KenBurns';
import {ChapterCard, Counter, LowerThird, QuoteCard, RevealTitle} from '../components/Text';
import {BigStatement, DepthGauge, KeyLine} from '../components/Overlay';
import {AnatoliaMap, PLACES} from '../components/AnatoliaMap';
import {CrossSection} from '../components/CrossSection';
import {StoneDoor} from '../components/StoneDoor';
import {Ventilation} from '../components/Ventilation';
import {TuffFormation} from '../components/TuffFormation';
import {Timeline} from '../components/Timeline';
import {theme} from '../theme';
import {sans, serif} from '../components/Fonts';

const Stack: React.FC<{children: React.ReactNode}> = ({children}) => <AbsoluteFill>{children}</AbsoluteFill>;

/* 0 — SOGUK ACILIS */
export const ColdOpen: React.FC = () => (
  <Beats
    beats={[
      {
        w: 12,
        node: (
          <Stack>
            <KenBurns image="derinkuyu-entrance" from={1.25} to={1.05} panX={-0.2} darken={0.5} label="derinkuyu-entrance.jpg" />
            <BigStatement lines={['1963.', 'Nevşehir, Derinkuyu.', 'Bir adam bodrumundaki duvarı yıkıyor.']} size={72} />
          </Stack>
        ),
      },
      {
        w: 12,
        node: (
          <Stack>
            <KenBurns image="derinkuyu-corridor" from={1.0} to={1.2} panY={0.5} darken={0.35} caption="Derinkuyu koridorları" />
            <KeyLine text="Bir oda. Sonra bir koridor. Sonra bir oda daha." />
          </Stack>
        ),
      },
      {
        w: 10,
        node: (
          <Stack>
            <CrossSection descend showDoors={false} showShaft={false} />
          </Stack>
        ),
      },
      {
        w: 8,
        node: (
          <Stack>
            <BigStatement lines={['Adı yok.', 'Kim kazdığı kesin değil.', 'Ne zaman kazıldığı tartışmalı.']} size={76} />
          </Stack>
        ),
      },
      {
        w: 10,
        node: (
          <Stack>
            <KenBurns image="derinkuyu-stone-door" from={1.1} to={1.25} darken={0.55} />
            <TitleCard />
          </Stack>
        ),
      },
    ]}
  />
);

const TitleCard: React.FC = () => {
  const frame = useCurrentFrame();
  const {durationInFrames} = useVideoConfig();
  const out = interpolate(frame, [durationInFrames - 15, durationInFrames], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center', opacity: out}}>
      <div style={{fontFamily: sans, fontSize: 26, letterSpacing: 10, color: theme.accent, marginBottom: 20}}>KAPADOKYA'NIN ALTINDA</div>
      <RevealTitle text="DERİNKUYU" size={170} align="center" weight={900} />
      <div style={{fontFamily: serif, fontSize: 44, color: theme.sand, marginTop: 24, opacity: interpolate(frame, [40, 60], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})}}>
        Bunu kim, neden kazdı?
      </div>
    </AbsoluteFill>
  );
};

/* 1 — DUVARIN ARKASI */
export const Discovery: React.FC = () => (
  <Beats
    beats={[
      {w: 5, node: <ChapterCard index={1} title="Duvarın Arkası" />},
      {
        w: 10,
        node: (
          <Stack>
            <KenBurns image="cappadocia-balloons" from={1.0} to={1.15} panX={0.4} darken={0.15} caption="Kapadokya" />
            <LowerThird title="Kapadokya" sub="Nevşehir · Orta Anadolu" delay={10} />
          </Stack>
        ),
      },
      {
        w: 12,
        node: (
          <Stack>
            <AnatoliaMap
              bbox={[33.6, 37.7, 36.0, 39.2]}
              title="Kapadokya'nın yeraltı yerleşimleri"
              markers={[
                {name: 'Derinkuyu', ...xy(PLACES.derinkuyu), kind: 'site'},
                {name: 'Kaymaklı', ...xy(PLACES.kaymakli), kind: 'site', delay: 20},
                {name: 'Nevşehir', ...xy(PLACES.nevsehir), delay: 30},
                {name: 'Kayseri', ...xy(PLACES.kayseri), delay: 36},
                {name: 'Erciyes', ...xy(PLACES.erciyes), kind: 'volcano', delay: 44},
                {name: 'Hasan Dağı', ...xy(PLACES.hasan), kind: 'volcano', delay: 50},
              ]}
            />
            <KeyLine text="Bölgede yüzlerce yeraltı yerleşimi var. En derini: Derinkuyu." delay={40} />
          </Stack>
        ),
      },
      {
        w: 10,
        node: (
          <Stack>
            <KenBurns image="derinkuyu-stable" from={1.05} to={1.2} darken={0.35} caption="Kiler ve ahır olarak kullanılan üst katlar" />
            <KeyLine text="Yöre halkı tünelleri biliyordu: kiler, ahır, mağara. 1963 büyük resmi birleştirdi." delay={20} />
          </Stack>
        ),
      },
      {
        w: 10,
        node: (
          <Stack>
            <div style={{position: 'absolute', inset: 0, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 220}}>
              <Counter to={1969} label="ZİYARETE AÇILDI" delay={0} size={130} plain />
              <Counter to={8} label="KAT GEZİLEBİLİR" delay={20} size={130} />
              <Counter to={18} label="KAT (TAHMİNİ)" delay={40} size={130} />
            </div>
            <KeyLine text="Ve şimdi ilk adımı atıyoruz." delay={80} accent />
          </Stack>
        ),
      },
    ]}
  />
);

const xy = (p: [number, number]) => ({lon: p[0], lat: p[1]});

/* 2 — KAT KAT ASAGI */
export const Structure: React.FC = () => (
  <Beats
    beats={[
      {w: 4, node: <ChapterCard index={2} title="Kat Kat Aşağı" />},
      {
        w: 9,
        node: (
          <Stack>
            <KenBurns image="derinkuyu-corridor" from={1.0} to={1.25} panY={0.4} darken={0.3} caption="Dar ve alçak koridorlar" />
            <DepthGauge depth={10} />
            <KeyLine text="Dar koridor bir hata değil, tasarım: düşman tek sıra, eğilerek gelmek zorunda." delay={30} />
          </Stack>
        ),
      },
      {
        w: 9,
        node: (
          <Stack>
            <KenBurns image="derinkuyu-stone-door" from={1.1} to={1.3} darken={0.3} caption="Taş kapı (değirmen taşı biçiminde)" />
            <DepthGauge depth={20} />
            <KeyLine text="≈ 1,5 m çap · yarım tona yakın · sadece içeriden kapanır" delay={30} />
          </Stack>
        ),
      },
      {w: 11, node: <Stack><StoneDoor /></Stack>},
      {
        w: 7,
        node: (
          <Stack>
            <CrossSection descend={false} showShaft={false} showDoors />
            <KeyLine text="Her katta ayrı kapı: bir kat düşse bile altı güvende." delay={20} />
          </Stack>
        ),
      },
      {
        w: 6,
        node: (
          <Stack>
            <BigStatement lines={['Peki bu kadar derinde', 'nasıl nefes alıyorsunuz?']} size={80} />
          </Stack>
        ),
      },
      {w: 12, node: <Stack><Ventilation /></Stack>},
      {
        w: 9,
        node: (
          <Stack>
            <KenBurns image="derinkuyu-ventilation-shaft" from={1.0} to={1.2} panY={-0.5} darken={0.35} caption="Havalandırma bacası / su kuyusu" />
            <DepthGauge depth={55} />
            <KeyLine text="Elektrik yok, fan yok. En alt katta bile hava temiz, sıcaklık ~13 °C." delay={20} />
          </Stack>
        ),
      },
      {
        w: 8,
        node: (
          <Stack>
            <KenBurns image="fairy-chimneys" from={1.0} to={1.15} darken={0.4} caption="Yüzey: Kapadokya" />
            <KeyLine text="Düşman şehrin tam üstünde dururken altında binlerce insan olduğunu anlayamıyor." delay={20} accent />
          </Stack>
        ),
      },
    ]}
  />
);

/* 3 — KAYA NEDEN IZIN VERDI */
export const Geology: React.FC = () => (
  <Beats
    beats={[
      {w: 4, node: <ChapterCard index={3} title="Kaya Neden İzin Verdi?" />},
      {
        w: 7,
        node: (
          <Stack>
            <BigStatement lines={['Bir kazma alıp', '80 metre aşağı şehir kazsanız', 'olur mu?']} size={78} />
          </Stack>
        ),
      },
      {
        w: 8,
        node: (
          <Stack>
            <KenBurns image="erciyes" from={1.0} to={1.15} panX={0.4} darken={0.3} caption="Erciyes Dağı" />
            <LowerThird title="Erciyes · Hasan Dağı · Göllüdağ" sub="Kapadokya'yı kül altında bırakan volkanlar" delay={10} />
          </Stack>
        ),
      },
      {w: 16, node: <Stack><TuffFormation /></Stack>},
      {
        w: 8,
        node: (
          <Stack>
            <KenBurns image="tuff-texture" from={1.3} to={1.05} darken={0.3} caption="Tüf dokusu" />
            <KeyLine text="Taze kesildiğinde yumuşak, havayla temasta sertleşir: oyduğunuz oda kendi kendine sağlamlaşır." delay={20} />
          </Stack>
        ),
      },
      {
        w: 7,
        node: (
          <Stack>
            <KenBurns image="fairy-chimneys" from={1.0} to={1.2} panY={-0.3} darken={0.3} caption="Peri bacaları" />
            <KeyLine text="Doğa dev bir 'kazılabilir' malzeme bıraktı. İnsanlar bunu fark etti." delay={20} accent />
          </Stack>
        ),
      },
    ]}
  />
);

/* 4 — KIM KAZDI */
export const Who: React.FC = () => (
  <Beats
    beats={[
      {w: 4, node: <ChapterCard index={4} title="Kim Kazdı?" />},
      {
        w: 7,
        node: (
          <Stack>
            <BigStatement lines={['Dürüst cevap:', 'kesin bilmiyoruz.']} size={84} />
          </Stack>
        ),
      },
      {
        w: 8,
        node: (
          <Stack>
            <KenBurns image="derinkuyu-corridor" from={1.2} to={1.05} darken={0.45} />
            <KeyLine text="Harç yok, tuğla yok. Kayadan eksilterek yapılmış: bir boşluğu karbon testine sokamazsınız." delay={20} />
          </Stack>
        ),
      },
      {
        w: 14,
        node: (
          <Stack>
            <Timeline
              title="Üç ipucu"
              from={-2100}
              to={-200}
              eras={[
                {year: -2000, label: 'Hititler', sub: 'kanıt zayıf', certainty: 'tartışmalı', color: theme.sandDim},
                {year: -750, label: 'Frigler', sub: 'ilk galeriler (Kültür Bakanlığı)', certainty: 'tahmin'},
                {year: -370, label: 'Ksenophon · Anabasis', sub: 'yazılı kaynak', certainty: 'kesin', color: theme.byzantium},
              ]}
            />
          </Stack>
        ),
      },
      {
        w: 8,
        node: (
          <Stack>
            <KenBurns image="phrygian-rock" from={1.0} to={1.15} darken={0.4} caption="Frig kaya işçiliği" />
            <LowerThird title="Frigler" sub="MÖ 8.–7. yüzyıl · büyük kaya işçiliğiyle tanınır" delay={10} />
          </Stack>
        ),
      },
      {
        w: 12,
        node: (
          <Stack>
            <KenBurns image="xenophon-bust" from={1.1} to={1.2} darken={0.6} />
            <QuoteCard quote="Evler yerin altındaydı; girişleri bir kuyu ağzı gibiydi, ama aşağısı genişti. Hayvanlar için yollar kazılmıştı, insanlar merdivenle inerdi." source="KSENOPHON · ANABASIS, IV. KİTAP · MÖ 4. YÜZYIL (serbest çeviri)" />
          </Stack>
        ),
      },
      {
        w: 8,
        node: (
          <Stack>
            <AnatoliaMap
              bbox={[26, 35.5, 45, 42.5]}
              title="Ksenophon'un yeraltı evleri: Derinkuyu değil, daha doğuda"
              markers={[
                {name: 'Derinkuyu', ...xy(PLACES.derinkuyu), kind: 'site'},
                {name: 'Doğu Anadolu (Anabasis)', lon: 41.5, lat: 39.6, kind: 'city', delay: 25},
              ]}
            />
            <KeyLine text="En az 2400 yıl önce Anadolu'da yeraltında yaşamak sıradan bir şeydi." delay={45} />
          </Stack>
        ),
      },
      {
        w: 8,
        node: (
          <Stack>
            <CrossSection descend={false} showShaft showDoors={false} />
            <KeyLine text="En makul tahmin: tek seferde değil, katman katman, yüzyıllar içinde büyüdü." delay={20} accent />
          </Stack>
        ),
      },
    ]}
  />
);

/* 5 — NEDEN YERIN ALTI */
export const Why: React.FC = () => (
  <Beats
    beats={[
      {w: 4, node: <ChapterCard index={5} title="Neden Yerin Altı?" />},
      {
        w: 16,
        node: (
          <Stack>
            <AnatoliaMap
              bbox={[24, 29.5, 47, 43]}
              title="7.–10. yüzyıl: Bizans–Arap sınırı"
              markers={[
                {name: 'Konstantinopolis', ...xy(PLACES.istanbul), delay: 5},
                {name: 'Kapadokya', ...xy(PLACES.derinkuyu), kind: 'site', delay: 15},
                {name: 'Şam', ...xy(PLACES.damascus), delay: 25},
                {name: 'Bağdat', ...xy(PLACES.baghdad), delay: 30},
                {name: 'Gülek Boğazı', ...xy(PLACES.gulek), delay: 40},
              ]}
              routes={[
                {from: PLACES.damascus, via: [PLACES.antakya, PLACES.tarsus, PLACES.gulek], to: PLACES.derinkuyu, delay: 50, label: 'yaz akınları'},
                {from: PLACES.baghdad, via: [PLACES.malatya], to: PLACES.kayseri, delay: 70},
              ]}
            />
            <KeyLine text="Her yaz Toros geçitlerinden akınlar: yağma, esir. Kapadokya tam ortada." delay={80} />
          </Stack>
        ),
      },
      {
        w: 7,
        node: (
          <Stack>
            <BigStatement lines={['İki seçenek:', 'kaçmak ya da saklanmak.', 'Kaçacak yer yok. Ama saklanacak bir taş var.']} size={62} />
          </Stack>
        ),
      },
      {
        w: 9,
        node: (
          <Stack>
            <KenBurns image="derinkuyu-church" from={1.0} to={1.2} darken={0.3} caption="Kilise (Bizans dönemi)" />
            <LowerThird title="Bizans dönemi genişlemesi" sub="kiliseler, ambarlar, presler, ahırlar, okul" delay={10} />
          </Stack>
        ),
      },
      {
        w: 9,
        node: (
          <Stack>
            <KenBurns image="byzantine-cappadocia-church" from={1.15} to={1.0} darken={0.35} caption="Kapadokya kaya kiliseleri" />
            <KeyLine text="Burası mezar ya da tapınak değil. Yaşamak için değil, hayatta kalmak için." delay={20} />
          </Stack>
        ),
      },
      {
        w: 8,
        node: (
          <Stack>
            <CrossSection descend={false} showShaft showDoors />
            <KeyLine text="Tehlike gelince aşağı, geçince yukarı. Bir sığınak gibi." delay={20} />
          </Stack>
        ),
      },
      {
        w: 8,
        node: (
          <Stack>
            <AnatoliaMap
              bbox={[24, 32, 50, 43]}
              title="Yüzyıllar sonra: Moğol akınları"
              markers={[{name: 'Kapadokya', ...xy(PLACES.derinkuyu), kind: 'site'}]}
              routes={[{from: PLACES.tabriz, via: [[41.0, 39.0]], to: PLACES.derinkuyu, delay: 10, color: theme.danger, label: 'doğudan'}]}
            />
            <KeyLine text="Aynı şehir yeniden devreye giriyor." delay={50} accent />
          </Stack>
        ),
      },
    ]}
  />
);

/* 6 — YERALTINDA HAYAT */
export const Life: React.FC = () => (
  <Beats
    beats={[
      {w: 4, node: <ChapterCard index={6} title="Yeraltında Hayat" />},
      {
        w: 9,
        node: (
          <Stack>
            <KenBurns image="derinkuyu-stable" from={1.0} to={1.2} darken={0.3} caption="Ahırlar (üst katlar)" />
            <DepthGauge depth={8} />
            <KeyLine text="Hayvanlar üstte: koku ve ısı aşağı inmesin, insanlar en derinde kalsın." delay={20} />
          </Stack>
        ),
      },
      {
        w: 8,
        node: (
          <Stack>
            <KenBurns image="derinkuyu-school" from={1.1} to={1.25} darken={0.3} caption="Tonozlu tavanlı salon (misyoner okulu olduğu düşünülüyor)" />
            <DepthGauge depth={18} />
            <KeyLine text="Mutfaklar: duvarlarda hâlâ is izleri. İkinci katta tonozlu bir okul." delay={20} />
          </Stack>
        ),
      },
      {
        w: 8,
        node: (
          <Stack>
            <KenBurns image="derinkuyu-wine-press" from={1.0} to={1.2} panX={-0.4} darken={0.3} caption="Şarap / yağ presi" />
            <DepthGauge depth={35} />
            <KeyLine text="Şarap ve yağ presleri, tahıl kuyuları, ambarlar." delay={20} />
          </Stack>
        ),
      },
      {
        w: 9,
        node: (
          <Stack>
            <KenBurns image="derinkuyu-church" from={1.2} to={1.0} darken={0.35} caption="Haç planlı kilise" />
            <DepthGauge depth={55} />
            <KeyLine text="En derin noktada, en kutsal yer." delay={20} accent />
          </Stack>
        ),
      },
      {
        w: 7,
        node: (
          <Stack>
            <BigStatement lines={['Küçücük bir hücre.', '“Hapishane” mi?', 'Kesin değil. Ama bir düzen var.']} size={74} />
          </Stack>
        ),
      },
      {
        w: 12,
        node: (
          <Stack>
            <AnatoliaMap
              bbox={[34.45, 38.25, 35.05, 38.6]}
              title="İddia: Derinkuyu–Kaymaklı tüneli (~9 km)"
              highlightTurkey={false}
              markers={[
                {name: 'Derinkuyu', ...xy(PLACES.derinkuyu), kind: 'site'},
                {name: 'Kaymaklı', ...xy(PLACES.kaymakli), kind: 'site', delay: 15},
              ]}
              routes={[{from: PLACES.derinkuyu, to: PLACES.kaymakli, delay: 30, color: theme.sandDim, label: 'kısmen var, kesintisiz yol kanıtlanmadı'}]}
            />
            <KeyLine text="Tünelin bir kısmı gerçekten var. Uçtan uca bağlantı henüz kanıtlanmadı." delay={70} />
          </Stack>
        ),
      },
    ]}
  />
);

/* 7 — SON SAKINLER */
export const LastResidents: React.FC = () => (
  <Beats
    beats={[
      {w: 4, node: <ChapterCard index={7} title="Son Sakinler" />},
      {
        w: 9,
        node: (
          <Stack>
            <KenBurns image="derinkuyu-entrance" from={1.0} to={1.15} darken={0.35} />
            <KeyLine text="Terk edilmiş bir antik kalıntı değil: 20. yüzyıla kadar kullanıldı." delay={20} />
          </Stack>
        ),
      },
      {
        w: 9,
        node: (
          <Stack>
            <KenBurns image="population-exchange-1923" from={1.0} to={1.2} panX={0.4} darken={0.35} caption="1923 nüfus mübadelesi" />
            <LowerThird title="Malakopi → Derinkuyu" sub="Kapadokyalı Rumlar · 1923 mübadelesi" delay={10} />
          </Stack>
        ),
      },
      {
        w: 12,
        node: (
          <Stack>
            <AnatoliaMap
              bbox={[20, 34, 42, 43]}
              title="1923: Lozan ve nüfus mübadelesi"
              markers={[
                {name: 'Derinkuyu (Malakopi)', ...xy(PLACES.derinkuyu), kind: 'site'},
                {name: 'Selanik', ...xy(PLACES.thessaloniki), delay: 20},
                {name: 'Atina', ...xy(PLACES.athens), delay: 26},
              ]}
              routes={[{from: PLACES.derinkuyu, via: [[31.5, 39.6], [27.0, 40.3]], to: PLACES.thessaloniki, delay: 30, color: theme.byzantium, label: 'hafıza da gidiyor'}]}
            />
          </Stack>
        ),
      },
      {
        w: 9,
        node: (
          <Stack>
            <BigStatement lines={['Şehir kaybolmadı.', 'Sadece anlatacak kimse kalmadı.']} size={80} />
          </Stack>
        ),
      },
    ]}
  />
);

/* 8 — HIKAYE BITMEDI */
export const Kayasehir: React.FC = () => (
  <Beats
    beats={[
      {w: 4, node: <ChapterCard index={8} title="Hikâye Bitmedi" />},
      {
        w: 10,
        node: (
          <Stack>
            <KenBurns image="nevsehir-castle-kayasehir" from={1.0} to={1.2} panY={0.3} darken={0.3} caption="Nevşehir Kalesi çevresi · Kayaşehir" />
            <LowerThird title="2013 · Kayaşehir" sub="Toplu konut kazısında bulundu" delay={10} />
          </Stack>
        ),
      },
      {
        w: 10,
        node: (
          <Stack>
            <div style={{position: 'absolute', inset: 0, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 200}}>
              <Counter to={2013} label="KEŞİF YILI" delay={0} size={120} plain />
              <Counter to={700} suffix="+" label="ODA" delay={20} size={120} />
              <Counter to={1985} label="UNESCO LİSTESİ" delay={40} size={120} plain />
            </div>
            <KeyLine text="Bir şehrin göbeğinde, insanların tam altında." delay={70} />
          </Stack>
        ),
      },
      {
        w: 10,
        node: (
          <Stack>
            <AnatoliaMap
              bbox={[33.6, 37.7, 36.0, 39.2]}
              title="Kapadokya'nın altını hâlâ tam bilmiyoruz"
              markers={[
                {name: 'Derinkuyu', ...xy(PLACES.derinkuyu), kind: 'site'},
                {name: 'Kaymaklı', ...xy(PLACES.kaymakli), kind: 'site', delay: 10},
                {name: 'Kayaşehir (2013)', ...xy(PLACES.nevsehir), kind: 'site', delay: 20},
              ]}
            />
            <KeyLine text="Her yeni inşaat, her yeni kazı, yeni bir kapı açabilir." delay={40} accent />
          </Stack>
        ),
      },
    ]}
  />
);

/* 9 — KAPANIS */
export const Outro: React.FC = () => (
  <Beats
    beats={[
      {
        w: 12,
        node: (
          <Stack>
            <div style={{position: 'absolute', left: 160, right: 160, top: 200}}>
              <RevealTitle text="Toparlayalım" size={64} color={theme.accent} />
              <div style={{height: 40}} />
              <RevealTitle text="Kim? Muhtemelen Frigler başlattı, Bizanslılar büyüttü, Rumlar son kullanan oldu." size={46} font="sans" weight={500} delay={20} />
              <div style={{height: 24}} />
              <RevealTitle text="Neden? Kaçacak yer yoktu, ama kazılabilir bir taş vardı." size={46} font="sans" weight={500} delay={70} />
              <div style={{height: 24}} />
              <RevealTitle text="Sonuç: elektrik yok, makine yok; havalandırması, kapı sistemi ve planı olan 18 katlı bir yapı." size={46} font="sans" weight={500} delay={120} />
            </div>
          </Stack>
        ),
      },
      {
        w: 8,
        node: (
          <Stack>
            <KenBurns image="derinkuyu-corridor" from={1.0} to={1.3} panY={0.6} darken={0.5} />
            <KeyLine text="Bin yıl önce Kapadokya'da insanlar bunu gerçekten yaptı." delay={10} accent />
          </Stack>
        ),
      },
      {
        w: 10,
        node: (
          <Stack>
            <BigStatement lines={['Bir sonraki video:', 'bin yıl değil, yüz bin yıl dayanması gereken bir yeraltı yapısı.', 'Finlandiya.']} size={64} />
          </Stack>
        ),
      },
      {w: 6, node: <EndCard />},
    ]}
  />
);

const EndCard: React.FC = () => {
  const frame = useCurrentFrame();
  const o = interpolate(frame, [0, 20], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center', opacity: o}}>
      <div style={{fontFamily: serif, fontSize: 60, color: theme.ink}}>Görüşmek üzere.</div>
      <div style={{fontFamily: sans, fontSize: 26, color: theme.sandDim, marginTop: 20, letterSpacing: 4}}>ABONE OL · BİLDİRİMLERİ AÇ</div>
    </AbsoluteFill>
  );
};
