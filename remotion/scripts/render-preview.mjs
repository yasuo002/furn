// Dusuk cozunurluklu on izleme (veya tam kalite) render. Kullanim:
//   node scripts/render-preview.mjs [scale] [crf] [out]
import {bundle} from '@remotion/bundler';
import {renderMedia, selectComposition} from '@remotion/renderer';
import {mkdirSync} from 'node:fs';
import {resolve} from 'node:path';

const scale = Number(process.argv[2] ?? '0.5');
const crf = Number(process.argv[3] ?? '28');
const out = resolve(process.argv[4] ?? `out/derinkuyu-preview-${scale}.mp4`);
mkdirSync(resolve('out'), {recursive: true});
const browserExecutable = process.env.REMOTION_BROWSER_EXECUTABLE;
const envVariables = {REMOTION_OFFLINE_FONTS: process.env.REMOTION_OFFLINE_FONTS ?? ''};
const serveUrl = await bundle({entryPoint: resolve('src/index.ts')});
const composition = await selectComposition({serveUrl, id: process.env.COMP ?? 'Derinkuyu', browserExecutable, envVariables});
let last = 0;
await renderMedia({
  composition, serveUrl, codec: 'h264', outputLocation: out, scale, crf, browserExecutable, envVariables,
  concurrency: 4, imageFormat: 'jpeg', jpegQuality: 80,
  onProgress: ({progress, renderedFrames}) => { const p = Math.floor(progress * 100); if (p !== last) { last = p; if (p % 5 === 0) console.log(`${p}% (${renderedFrames} kare)`); } },
});
console.log('done', out);
