// Generates the PWA PNG icons from the original SVG logo.
// Usage: npm run icons
import { mkdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = fileURLToPath(new URL('..', import.meta.url));
const logo = await readFile(`${root}public/logo.svg`);
const outDir = `${root}public/icons`;
await mkdir(outDir, { recursive: true });

// Full-bleed variant for maskable icons: the mark sits inside the 80% safe zone.
const maskable = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" fill="#6E3543"/>
  <g transform="translate(9.6 9.6) scale(0.7)">
    <path d="M32 47c-9-5.6-15-11.4-15-18.2C17 23.9 20.7 20 25.3 20c2.9 0 5.2 1.5 6.7 3.8C33.5 21.5 35.8 20 38.7 20 43.3 20 47 23.9 47 28.8c0 4.4-2.5 8.4-6.3 12" fill="none" stroke="#F9F7F5" stroke-width="4" stroke-linecap="round"/>
    <circle cx="40.7" cy="44.5" r="3.6" fill="#EBB870"/>
  </g>
</svg>`);

const jobs = [
  { input: logo, size: 192, file: 'icon-192.png' },
  { input: logo, size: 512, file: 'icon-512.png' },
  { input: maskable, size: 512, file: 'maskable-512.png' },
  { input: maskable, size: 180, file: 'apple-touch-icon.png' },
  { input: logo, size: 96, file: 'shortcut-pausa.png' },
];

for (const job of jobs) {
  await sharp(job.input, { density: 384 }).resize(job.size, job.size).png().toFile(`${outDir}/${job.file}`);
  console.log(`✓ ${job.file}`);
}
