// Tek bir bundle ile bircok kareyi PNG olarak alir: hizli gorsel kontrol.
import {bundle} from '@remotion/bundler';
import {renderStill, selectComposition} from '@remotion/renderer';
import {mkdirSync} from 'node:fs';
import {resolve} from 'node:path';

const frames = (process.argv[2] ?? '0,300,600').split(',').map(Number);
const scale = Number(process.argv[3] ?? '0.5');
const out = resolve('out/stills');
mkdirSync(out, {recursive: true});
const serveUrl = await bundle({entryPoint: resolve('src/index.ts')});
const browserExecutable = process.env.REMOTION_BROWSER_EXECUTABLE;
const envVariables = {REMOTION_OFFLINE_FONTS: process.env.REMOTION_OFFLINE_FONTS ?? ''};
const composition = await selectComposition({serveUrl, id: process.env.COMP ?? 'Derinkuyu', browserExecutable, envVariables});
for (const f of frames) {
  await renderStill({composition, serveUrl, output: `${out}/f${String(f).padStart(5, '0')}.png`, frame: f, scale, browserExecutable, envVariables});
  console.log('still', f);
}
