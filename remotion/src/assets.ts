import {getStaticFiles, staticFile} from 'remotion';

/**
 * Gercek gorseller `public/images/` altina bu dosya adlariyla konur.
 * Dosya yoksa sahne otomatik olarak stilize bir yer tutucu cizer,
 * yani video gorsel eksik olsa bile render edilir.
 * Kaynak/lisans listesi: public/images/manifest.json
 */
export type ImageKey =
  | 'cappadocia-balloons'
  | 'fairy-chimneys'
  | 'derinkuyu-entrance'
  | 'derinkuyu-corridor'
  | 'derinkuyu-stone-door'
  | 'derinkuyu-ventilation-shaft'
  | 'derinkuyu-church'
  | 'derinkuyu-stable'
  | 'derinkuyu-school'
  | 'derinkuyu-wine-press'
  | 'kaymakli'
  | 'erciyes'
  | 'hasan-dagi'
  | 'xenophon-bust'
  | 'phrygian-rock'
  | 'byzantine-cappadocia-church'
  | 'population-exchange-1923'
  | 'nevsehir-castle-kayasehir'
  | 'tuff-texture';

export const imageFiles: Record<ImageKey, string> = {
  'cappadocia-balloons': 'cappadocia-balloons.jpg',
  'fairy-chimneys': 'fairy-chimneys.jpg',
  'derinkuyu-entrance': 'derinkuyu-entrance.jpg',
  'derinkuyu-corridor': 'derinkuyu-corridor.jpg',
  'derinkuyu-stone-door': 'derinkuyu-stone-door.jpg',
  'derinkuyu-ventilation-shaft': 'derinkuyu-ventilation-shaft.jpg',
  'derinkuyu-church': 'derinkuyu-church.jpg',
  'derinkuyu-stable': 'derinkuyu-stable.jpg',
  'derinkuyu-school': 'derinkuyu-school.jpg',
  'derinkuyu-wine-press': 'derinkuyu-wine-press.jpg',
  kaymakli: 'kaymakli.jpg',
  erciyes: 'erciyes.jpg',
  'hasan-dagi': 'hasan-dagi.jpg',
  'xenophon-bust': 'xenophon-bust.jpg',
  'phrygian-rock': 'phrygian-rock.jpg',
  'byzantine-cappadocia-church': 'byzantine-cappadocia-church.jpg',
  'population-exchange-1923': 'population-exchange-1923.jpg',
  'nevsehir-castle-kayasehir': 'nevsehir-castle-kayasehir.jpg',
  'tuff-texture': 'tuff-texture.jpg',
};

const present = new Set(getStaticFiles().map((f) => f.name.replace(/^\/?/, '')));

export const hasImage = (key: ImageKey) => present.has(`images/${imageFiles[key]}`);
export const imageSrc = (key: ImageKey) => staticFile(`images/${imageFiles[key]}`);

/** Serbest dosya yolu (public/ altina gore), ornegin "images/nk/pyongyang.jpg". */
export const hasFile = (rel: string) => present.has(rel.replace(/^\/?/, ''));
export const fileSrc = (rel: string) => staticFile(rel);
