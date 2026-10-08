import { expect, test } from '@playwright/test';

import { claimDailyPack, readDatabase, revealAll, shot, waitVisible } from './helpers';

test('daily pack: open with buttons, reveal every card, story link, collection', async ({ page }) => {
  await page.goto('/');
  await waitVisible(page, 'welcome-enter');
  await shot(page, '01-welcome');
  await page.getByTestId('welcome-enter').click();
  await expect(page.getByTestId('hall')).toBeVisible();
  await page.waitForTimeout(2500);
  await shot(page, '02-royal-hall');

  await page.getByTestId('hall-treasury-button').click();
  await waitVisible(page, 'packs-claim');
  await expect(page.getByTestId('packs').getByText('Demo pack with fixed contents', { exact: false })).toBeVisible();
  await shot(page, '03-pack-selection');
  await page.getByTestId('packs-claim').click();

  // The Royal Treasury: the accessible path uses buttons instead of gestures.
  await waitVisible(page, 'open-pack');
  await expect(page.getByTestId('treasury').getByText('Demo pack · fixed contents')).toBeVisible();
  await shot(page, '04-treasury');
  await page.getByTestId('open-pack').click();
  await waitVisible(page, 'draw-cards');
  await shot(page, '05-pack-opened');
  await page.getByTestId('draw-cards').click();

  await revealAll(page, 4, async (i) => shot(page, `06-reveal-${i + 1}`));

  // The fifth card is the Legendary: cinematic reveal with its own actions.
  await (await waitVisible(page, 'reveal-button')).click();
  await waitVisible(page, 'reveal-story');
  await expect(page.getByText('LEGENDARY DISCOVERED')).toBeVisible();
  await shot(page, '07-legendary');
  await page.getByTestId('reveal-story').click();
  await waitVisible(page, 'chamber-story');
  await expect(page.getByText('1 Samuel 17:45 · BSB')).toBeVisible();
  await shot(page, '08-biblical-story');
  // router.back() is a same-document history traversal; don't wait for a page navigation.
  await page.getByTestId('chamber-back').click({ noWaitAfter: true, timeout: 120_000 });

  await (await waitVisible(page, 'reveal-next')).click();
  await waitVisible(page, 'summary-collection');
  await expect(page.getByText('5 cards added to your collection · 5 new.')).toBeVisible();
  await page.waitForTimeout(3000);
  await shot(page, '09-summary');

  // Rewards were committed once, before the reveal.
  const db = (await readDatabase(page)) as { inventory: Record<string, { copies: number }>; packOpenings: Record<string, { status: string }> };
  expect(Object.keys(db.inventory)).toHaveLength(5);
  expect(Object.values(db.inventory).every((entry) => entry.copies === 1)).toBe(true);
  expect(Object.values(db.packOpenings).map((o) => o.status)).toEqual(['presented']);

  await page.getByTestId('summary-collection').click();
  await expect(page.getByTestId('collection')).toBeVisible();
  await expect(page.getByTestId('collection').getByText('5 of 12 discovered')).toBeVisible();
  await page.waitForTimeout(3000);
  await shot(page, '10-collection');

  // Today's pack is claimed; the treasury now shows when the next one arrives.
  await page.goto('/packs');
  await expect(page.getByTestId('packs-wait')).toBeVisible();
});

test('a claimed opening survives a reload mid-reveal and can be skipped', async ({ page }) => {
  await claimDailyPack(page);
  await (await waitVisible(page, 'open-pack')).click();
  await (await waitVisible(page, 'draw-cards')).click();
  await revealAll(page, 2);
  await waitVisible(page, 'reveal-button');

  // Interrupt: leave the app entirely and come back.
  await page.waitForTimeout(800);
  await page.goto('/treasury');
  await waitVisible(page, 'reveal-button');
  await expect(page.getByText('Resuming your opening', { exact: false })).toBeVisible();
  await expect(page.getByLabel('Card 3 of 5', { exact: true })).toBeVisible();
  await shot(page, '11-resumed');

  await page.getByTestId('treasury-skip').click();
  await waitVisible(page, 'summary-close');
  const db = (await readDatabase(page)) as {
    inventory: Record<string, unknown>;
    packGrants: Record<string, { status: string }>;
    packOpenings: Record<string, { status: string; revealedCount: number }>;
  };
  expect(Object.keys(db.inventory)).toHaveLength(5);
  expect(Object.values(db.packGrants).map((g) => g.status)).toEqual(['opened']);
  expect(Object.values(db.packOpenings).map((o) => [o.status, o.revealedCount])).toEqual([['presented', 5]]);
});
