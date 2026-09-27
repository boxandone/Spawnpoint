// Rasterizes public/favicon.svg into the PNG icons the PWA manifest needs.
// Usage: npm run icons   (uses Playwright's Chromium; set PLAYWRIGHT_CHROMIUM_PATH if needed)
import { readFileSync } from 'node:fs';
import { chromium } from '@playwright/test';

const svg = readFileSync('public/favicon.svg', 'utf8');
const targets = [
  { file: 'public/icons/icon-192.png', size: 192, pad: 0 },
  { file: 'public/icons/icon-512.png', size: 512, pad: 0 },
  // Maskable icons keep the art inside the 80% safe zone.
  { file: 'public/icons/maskable-512.png', size: 512, pad: 0.12, bg: '#3B6FE0' },
  { file: 'public/apple-touch-icon.png', size: 180, pad: 0.06, bg: '#3B6FE0' },
];

const browser = await chromium.launch(
  process.env.PLAYWRIGHT_CHROMIUM_PATH
    ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH }
    : {},
);
const page = await browser.newPage();
for (const { file, size, pad, bg } of targets) {
  await page.setViewportSize({ width: size, height: size });
  const inner = Math.round(size * (1 - pad * 2));
  await page.setContent(
    `<html><body style="margin:0;display:grid;place-items:center;width:${size}px;height:${size}px;background:${bg ?? 'transparent'}">
      <div style="width:${inner}px;height:${inner}px">${svg.replace('<svg ', `<svg width="${inner}" height="${inner}" `)}</div>
    </body></html>`,
  );
  await page.screenshot({ path: file, omitBackground: !bg });
  console.log('wrote', file);
}
await browser.close();
