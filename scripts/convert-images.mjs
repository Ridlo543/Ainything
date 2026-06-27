import { execSync } from 'child_process';
import { readdirSync, statSync } from 'fs';
import { join } from 'path';

const MAGICK = 'magick';

// 1. Resize + convert oversized 4096px logo PNGs → WebP at 512px max
const logos = [
  { src: 'static/images/ainything-logo-nobackground.png', dst: 'static/images/ainything-logo-nobackground.webp', size: 512 },
  { src: 'static/images/ainything-logo-white.png', dst: 'static/images/ainything-logo-white.webp', size: 512 },
];
console.log('=== Logo PNGs → WebP ===');
for (const { src, dst, size } of logos) {
  const before = statSync(src).size;
  execSync(`${MAGICK} "${src}" -resize "${size}x${size}>" -quality 90 "${dst}"`);
  const after = statSync(dst).size;
  console.log(`${src}: ${(before/1024).toFixed(0)}KB → ${(after/1024).toFixed(0)}KB`);
}

// 2. Convert all mock-images JPGs → WebP (resize to 1200px max, quality 82)
console.log('\n=== Mock images JPG → WebP ===');
const dir = 'static/mock-images';
const files = readdirSync(dir).filter(f => /\.(jpg|jpeg)$/i.test(f));
let totalBefore = 0, totalAfter = 0;
for (const f of files) {
  const src = join(dir, f);
  const dst = join(dir, f.replace(/\.jpe?g$/i, '.webp'));
  const before = statSync(src).size;
  execSync(`${MAGICK} "${src}" -resize "1200>" -quality 82 "${dst}"`);
  const after = statSync(dst).size;
  totalBefore += before;
  totalAfter += after;
  console.log(`${f}: ${(before/1024).toFixed(0)}KB → ${(after/1024).toFixed(0)}KB`);
}
const savedMB = ((totalBefore - totalAfter) / 1024 / 1024).toFixed(1);
const pct = (100 * (1 - totalAfter / totalBefore)).toFixed(0);
console.log(`\nTotal mock-images: ${(totalBefore/1024/1024).toFixed(1)}MB → ${(totalAfter/1024/1024).toFixed(1)}MB (saved ${savedMB}MB, ${pct}% reduction)`);
