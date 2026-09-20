import {readFileSync, existsSync} from 'node:fs';
import {resolve, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const dir = resolve(here, '../public/images');
const manifest = JSON.parse(readFileSync(resolve(dir, 'manifest.json'), 'utf8'));
let missing = 0;
for (const img of manifest.images) {
  const ok = existsSync(resolve(dir, img.file));
  if (!ok) missing++;
  console.log(`${ok ? 'OK ' : '-- '} ${img.file.padEnd(36)} ${ok ? '' : '→ Commons: ' + img.search}`);
}
console.log(`\n${manifest.images.length - missing}/${manifest.images.length} görsel mevcut. Eksikler yer tutucu ile render edilir.`);
