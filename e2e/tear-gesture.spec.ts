import { expect, test } from '@playwright/test';

import { claimDailyPack, drag, shot, TREASURY, waitVisible } from './helpers';

test('physical interaction: tear the seal, slide the cards out, tap to reveal', async ({ page }) => {
  await claimDailyPack(page);
  await waitVisible(page, 'open-pack');
  await page.waitForTimeout(600);

  // A short pull is resisted and released: the pack stays closed.
  await drag(page, TREASURY.sealFrom, [TREASURY.sealFrom[0] + 10, TREASURY.sealFrom[1]], 6);
  await page.waitForTimeout(500);
  await expect(page.getByText('Swipe across the seal to tear it open')).toBeVisible();

  // A full swipe tears the seal open.
  await drag(page, TREASURY.sealFrom, TREASURY.sealTo, 30);
  await waitVisible(page, 'draw-cards');
  await shot(page, '12-torn-by-gesture');

  // Slide the stack up and out of the wrapper.
  await drag(page, TREASURY.packCenter, TREASURY.drawTo, 24);
  await waitVisible(page, 'reveal-button');
  await shot(page, '13-drawn-by-gesture');

  // Tap the face-down card itself to reveal it.
  await page.mouse.click(...TREASURY.card);
  await waitVisible(page, 'reveal-next');
  await expect(page.getByText('New discovery').first()).toBeVisible();
  await shot(page, '14-tap-revealed');
});
