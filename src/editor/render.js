// Turns a timeline into a real MP4 with ffmpeg:
//   captions + vector graphics -> ASS (libass burn-in)
//   zoom / shake                -> zoompan
//   images                      -> overlay
//   sfx                         -> adelay + amix
// Output keeps the source resolution, so a vertical input exports vertical.
import fs from 'node:fs/promises';
import path from 'node:path';
import { ffmpeg } from './bin.js';
import { buildAss } from './ass.js';
import { mediaDir, exportDir, newId } from './store.js';

const esc = (p) => p.replace(/\\/g, '/').replace(/:/g, '\\:').replace(/'/g, "\\'");
const even = (n) => (n % 2 === 0 ? n : n - 1);

function zoomExpr(timeline, fps) {
  const zooms = timeline.layers.filter((l) => l.visible !== false && l.type === 'motion' && l.preset === 'zoom');
  const shakes = timeline.layers.filter((l) => l.visible !== false && l.type === 'motion' && l.preset === 'shake');
  if (!zooms.length && !shakes.length) return null;

  const T = `(on/${fps})`;
  const base = shakes.length ? 1.03 : 1;
  const zParts = zooms.map((l) => {
    const s = l.start, e = Math.max(l.start + 0.1, l.end);
    const amp = 0.16 * (l.params?.intensity ?? 1);
    return `if(between(${T},${s},${e}),${amp}*sin(PI*(${T}-${s})/${(e - s).toFixed(3)}),0)`;
  });
  const z = `'${[String(base), ...zParts].join('+')}'`;

  const shakeAmp = (axis) => shakes.map((l) => {
    const s = l.start, e = Math.max(l.start + 0.1, l.end);
    const a = (axis === 'x' ? 9 : 7) * (l.params?.intensity ?? 1);
    const speed = axis === 'x' ? 47 : 39;
    return `if(between(${T},${s},${e}),${a}*sin(${speed}*${T}),0)`;
  });
  const sx = shakes.length ? '+' + shakeAmp('x').join('+') : '';
  const sy = shakes.length ? '+' + shakeAmp('y').join('+') : '';
  return {
    z,
    x: `'iw/2-(iw/zoom/2)${sx}'`,
    y: `'ih/2-(ih/zoom/2)${sy}'`,
  };
}

export async function renderProject(project, { onLog } = {}) {
  const timeline = project.timeline;
  if (!timeline) throw new Error('Önce zaman çizelgesi oluşturun.');
  const src = path.join(mediaDir(project.id), project.target.fileName);
  const W = even(timeline.output.width);
  const H = even(timeline.output.height);
  const fps = timeline.output.fps || 30;

  const assPath = path.join(exportDir(project.id), `${newId('sub_')}.ass`);
  await fs.writeFile(assPath, buildAss({ ...timeline, output: { ...timeline.output, width: W, height: H } }));

  const images = timeline.layers.filter((l) => l.visible !== false && l.type === 'image' && l.file);
  const sfx = timeline.layers.filter((l) => l.visible !== false && l.type === 'sfx' && l.file);

  const args = ['-i', src];
  for (const im of images) args.push('-i', path.join(mediaDir(project.id), im.file));
  for (const s of sfx) args.push('-i', path.join(mediaDir(project.id), s.file));

  const chains = [];
  let v = '[0:v]';
  chains.push(`${v}scale=${W}:${H}:force_original_aspect_ratio=decrease,pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=${fps}[base]`);
  v = '[base]';

  const zp = zoomExpr(timeline, fps);
  if (zp) {
    chains.push(`${v}zoompan=z=${zp.z}:x=${zp.x}:y=${zp.y}:d=1:s=${W}x${H}:fps=${fps}[zm]`);
    v = '[zm]';
  }

  images.forEach((im, i) => {
    const idx = i + 1;
    const w = Math.max(2, Math.round((im.scale ?? 30) / 100 * W));
    const op = Math.min(1, Math.max(0, im.opacity ?? 1));
    const rot = im.rotation ? `,rotate=${(im.rotation * Math.PI / 180).toFixed(4)}:c=none:ow=rotw(${(im.rotation * Math.PI / 180).toFixed(4)}):oh=roth(${(im.rotation * Math.PI / 180).toFixed(4)})` : '';
    chains.push(`[${idx}:v]format=rgba,scale=${w}:-1${rot},colorchannelmixer=aa=${op}[img${i}]`);
    const x = `(main_w*${(im.x ?? 50) / 100})-(overlay_w/2)`;
    const y = `(main_h*${(im.y ?? 50) / 100})-(overlay_h/2)`;
    const enable = `:enable='between(t,${im.start ?? 0},${im.end ?? timeline.output.duration})'`;
    chains.push(`${v}[img${i}]overlay=${x}:${y}${enable}[ov${i}]`);
    v = `[ov${i}]`;
  });

  chains.push(`${v}ass='${esc(assPath)}'[vout]`);

  // ---- audio ----
  const audioLabels = [];
  const hasSrcAudio = project.target.meta?.hasAudio;
  const srcGain = timeline.output.sourceAudioGain ?? 1;
  if (hasSrcAudio && srcGain > 0) {
    chains.push(`[0:a]volume=${srcGain}[a0]`);
    audioLabels.push('[a0]');
  }
  sfx.forEach((s, i) => {
    const idx = 1 + images.length + i;
    const delay = Math.max(0, Math.round((s.start || 0) * 1000));
    chains.push(`[${idx}:a]aformat=sample_fmts=fltp:sample_rates=48000:channel_layouts=stereo,volume=${s.gain ?? 1},adelay=${delay}|${delay}[s${i}]`);
    audioLabels.push(`[s${i}]`);
  });
  let hasAudio = audioLabels.length > 0;
  if (audioLabels.length > 1) {
    chains.push(`${audioLabels.join('')}amix=inputs=${audioLabels.length}:normalize=0:dropout_transition=0[aout]`);
  } else if (audioLabels.length === 1) {
    chains.push(`${audioLabels[0]}anull[aout]`);
  }

  const outFile = path.join(exportDir(project.id), `${newId('export_')}.mp4`);
  args.push(
    '-filter_complex', chains.join(';'),
    '-map', '[vout]',
    ...(hasAudio ? ['-map', '[aout]', '-c:a', 'aac', '-b:a', '192k'] : ['-an']),
    '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20', '-pix_fmt', 'yuv420p',
    '-movflags', '+faststart',
    '-t', String(timeline.output.duration || 10),
    outFile
  );

  onLog?.(`ffmpeg başlıyor → ${W}x${H} @${fps}fps (${timeline.output.orientation})`);
  await ffmpeg(args, { onLog: (s) => { const m = s.match(/time=\S+/); if (m) onLog?.(m[0]); } });
  await fs.rm(assPath, { force: true });

  return {
    file: path.basename(outFile),
    url: `/editor-exports/${project.id}/${path.basename(outFile)}`,
    absPath: outFile,
    width: W,
    height: H,
    createdAt: new Date().toISOString(),
  };
}
