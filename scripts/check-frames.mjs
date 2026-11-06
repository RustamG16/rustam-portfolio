// Hero frame sets (architecture.md section 9). Allowed red until phase 4 delivers.
// desktop: exactly frame_0001..0180.jpg at 1920x1080, baseline SOF0, total <= 12 MB, matte.webp 1920x1080.
// phone:   exactly frame_0001..0090.jpg at 720x1280,  baseline SOF0, total <= 3.5 MB, matte.webp 720x1280.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MB = 1024 * 1024;
const sets = [
  { name: 'desktop', count: 180, w: 1920, h: 1080, max: 12 * MB },
  { name: 'phone', count: 90, w: 720, h: 1280, max: 3.5 * MB },
];
const problems = [];

function jpegInfo(buf) {
  if (buf[0] !== 0xff || buf[1] !== 0xd8) return null;
  let i = 2;
  while (i + 9 < buf.length) {
    if (buf[i] !== 0xff) { i++; continue; }
    const m = buf[i + 1];
    if (m === 0xff) { i++; continue; }
    if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) {
      return { sof: m, h: buf.readUInt16BE(i + 5), w: buf.readUInt16BE(i + 7) };
    }
    i += 2 + buf.readUInt16BE(i + 2);
  }
  return null;
}
function webpSize(buf) {
  if (buf.toString('ascii', 0, 4) !== 'RIFF' || buf.toString('ascii', 8, 12) !== 'WEBP') return null;
  const t = buf.toString('ascii', 12, 16);
  if (t === 'VP8X') return { w: 1 + buf.readUIntLE(24, 3), h: 1 + buf.readUIntLE(27, 3) };
  if (t === 'VP8L') { const b = buf.readUInt32LE(21); return { w: (b & 0x3fff) + 1, h: ((b >> 14) & 0x3fff) + 1 }; }
  if (t === 'VP8 ') return { w: buf.readUInt16LE(26) & 0x3fff, h: buf.readUInt16LE(28) & 0x3fff };
  return null;
}

for (const s of sets) {
  const dir = path.join(root, 'public/frames/hero', s.name);
  if (!fs.existsSync(dir)) { problems.push(`${s.name}: folder missing`); continue; }
  const files = fs.readdirSync(dir).sort();
  const want = Array.from({ length: s.count }, (_, i) => `frame_${String(i + 1).padStart(4, '0')}.jpg`).concat('matte.webp').sort();
  const missing = want.filter((f) => !files.includes(f));
  const extra = files.filter((f) => !want.includes(f));
  if (missing.length) problems.push(`${s.name}: ${missing.length} missing (first: ${missing[0]})`);
  if (extra.length) problems.push(`${s.name}: unexpected files (${extra.slice(0, 3).join(', ')})`);
  let total = 0;
  for (const f of files.filter((x) => x.endsWith('.jpg'))) {
    const buf = fs.readFileSync(path.join(dir, f));
    total += buf.length;
    const info = jpegInfo(buf);
    if (!info) { problems.push(`${s.name}/${f}: not a JPEG`); break; }
    if (info.sof !== 0xc0) { problems.push(`${s.name}/${f}: not baseline (SOF 0x${info.sof.toString(16)})`); break; }
    if (info.w !== s.w || info.h !== s.h) { problems.push(`${s.name}/${f}: ${info.w}x${info.h}, want ${s.w}x${s.h}`); break; }
  }
  if (total > s.max) problems.push(`${s.name}: ${(total / MB).toFixed(2)} MB over ${(s.max / MB).toFixed(1)} MB`);
  const matte = path.join(dir, 'matte.webp');
  if (fs.existsSync(matte)) {
    const sz = webpSize(fs.readFileSync(matte));
    if (!sz || sz.w !== s.w || sz.h !== s.h) problems.push(`${s.name}/matte.webp: ${sz ? sz.w + 'x' + sz.h : 'unreadable'}, want ${s.w}x${s.h}`);
  }
  console.log(`frames/${s.name}: ${files.filter((f) => f.endsWith('.jpg')).length}/${s.count} jpg, ${(total / MB).toFixed(2)} MB`);
}

if (problems.length) {
  console.error(`\ncheck-frames: ${problems.length} problem(s)`);
  problems.forEach((p) => console.error('  ' + p));
  process.exit(1);
}
console.log('check-frames ok');
