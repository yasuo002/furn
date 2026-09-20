import {continueRender, delayRender, getStaticFiles, staticFile} from 'remotion';

/**
 * Yazi tipi stratejisi (sirayla):
 *  1) public/fonts/ altinda yerel dosya varsa onu kullan (cevrimdisi render icin en guvenlisi)
 *  2) REMOTION_OFFLINE_FONTS=1 degilse Google Fonts'tan yukle
 *  3) Hicbiri yoksa sistem yazi tiplerine dus (DejaVu / Liberation / Georgia)
 */
const SERIF_FALLBACK = '"DejaVu Serif", "Liberation Serif", Georgia, serif';
const SANS_FALLBACK = '"DejaVu Sans", "Liberation Sans", Arial, sans-serif';

const files = new Set(getStaticFiles().map((f) => f.name.replace(/^\/?/, '')));
const localSerif = ['fonts/PlayfairDisplay-Bold.ttf', 'fonts/PlayfairDisplay-Regular.ttf', 'fonts/PlayfairDisplay-Italic.ttf'];
const localSans = ['fonts/Inter-Regular.ttf', 'fonts/Inter-SemiBold.ttf'];
const hasLocalSerif = localSerif.some((f) => files.has(f));
const hasLocalSans = localSans.some((f) => files.has(f));
const offline = process.env.REMOTION_OFFLINE_FONTS === '1';

const loadLocal = (family: string, file: string, weight: string, style: 'normal' | 'italic') => {
  if (!files.has(file) || typeof document === 'undefined') return;
  const handle = delayRender(`font ${file}`);
  const face = new FontFace(family, `url(${staticFile(file)})`, {weight, style});
  face
    .load()
    .then((f) => {
      (document.fonts as unknown as {add: (f: FontFace) => void}).add(f);
      continueRender(handle);
    })
    .catch(() => continueRender(handle));
};

let serifFamily = SERIF_FALLBACK;
let sansFamily = SANS_FALLBACK;

if (hasLocalSerif) {
  loadLocal('PlayfairLocal', 'fonts/PlayfairDisplay-Bold.ttf', '700', 'normal');
  loadLocal('PlayfairLocal', 'fonts/PlayfairDisplay-Regular.ttf', '400', 'normal');
  loadLocal('PlayfairLocal', 'fonts/PlayfairDisplay-Italic.ttf', '400', 'italic');
  serifFamily = `PlayfairLocal, ${SERIF_FALLBACK}`;
} else if (!offline) {
  import('@remotion/google-fonts/PlayfairDisplay').then((m) =>
    m.loadFont('normal', {weights: ['400', '700', '900'], subsets: ['latin', 'latin-ext']}),
  );
  serifFamily = `"Playfair Display", ${SERIF_FALLBACK}`;
}

if (hasLocalSans) {
  loadLocal('InterLocal', 'fonts/Inter-Regular.ttf', '400', 'normal');
  loadLocal('InterLocal', 'fonts/Inter-SemiBold.ttf', '600', 'normal');
  sansFamily = `InterLocal, ${SANS_FALLBACK}`;
} else if (!offline) {
  import('@remotion/google-fonts/Inter').then((m) =>
    m.loadFont('normal', {weights: ['400', '500', '600'], subsets: ['latin', 'latin-ext']}),
  );
  sansFamily = `Inter, ${SANS_FALLBACK}`;
}

export const serif = serifFamily;
export const sans = sansFamily;
