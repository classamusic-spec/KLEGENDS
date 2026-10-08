#!/usr/bin/env node
// Writes the app icon, adaptive icon layers, splash mark and favicon to assets/.
// They are baked in the browser by the dev-only /dev/icons route, from the same
// crest artwork the game draws. Requires the dev server: `npm run web`.
// Usage: node scripts/export-icons.mjs [baseUrl=http://localhost:8081]
import { writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const base = process.argv[2] ?? 'http://localhost:8081';
const names = ['icon.png', 'android-icon-background.png', 'android-icon-foreground.png', 'android-icon-monochrome.png', 'splash-icon.png', 'favicon.png'];

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
try {
  const page = await browser.newPage();
  await page.goto(`${base}/dev/icons`, { waitUntil: 'load' });
  for (const name of names) {
    const img = page.locator(`[data-testid="icon-${name}"] img`).first();
    await img.waitFor({ state: 'attached', timeout: 120_000 });
    const src = await img.getAttribute('src');
    if (!src?.startsWith('data:image/png;base64,')) throw new Error(`No PNG for ${name}`);
    writeFileSync(join('assets', name), Buffer.from(src.slice('data:image/png;base64,'.length), 'base64'));
    console.log(`wrote assets/${name}`);
  }
} finally {
  await browser.close();
}
