import { expect, test } from '@playwright/test';

import { shot, waitVisible } from './helpers';

test('every tab is reachable and honest about what is not built yet', async ({ page }) => {
  await page.goto('/hall');
  await expect(page.getByTestId('hall')).toBeVisible();
  for (const [tab, screen] of [
    ['collection', 'collection'],
    ['journey', 'journey'],
    ['challenges', 'challenges'],
    ['shop', 'shop'],
    ['hall', 'hall'],
  ] as const) {
    await page.getByTestId(`tab-${tab}`).click();
    await expect(page.getByTestId(screen)).toBeVisible();
  }
  await page.getByTestId('tab-shop').click();
  await expect(page.getByText('Nothing can be purchased in this prototype', { exact: false })).toBeVisible();
  await shot(page, '19-shop');
});

test('challenges: a practice trivia round is scored from the answers', async ({ page }) => {
  await page.goto('/challenges');
  await page.getByTestId('trivia-start').click();
  for (let i = 0; i < 5; i++) {
    await expect(page.getByText(`Question ${i + 1} of 5`)).toBeVisible();
    await page.locator('[data-testid^="choice-"]').first().click();
    await expect(page.getByTestId('question-feedback')).toBeVisible();
    await page.getByTestId('trivia-next').click();
  }
  await expect(page.getByTestId('trivia-results')).toBeVisible();
  await expect(page.getByText(/^[0-5] of 5$/)).toBeVisible();
  await shot(page, '20-trivia-results');
});

test('settings persist across a reload', async ({ page }) => {
  await page.goto('/settings');
  await page.getByTestId('settings-reveal-speed-quick').click();
  await page.getByTestId('settings-reduced-motion-on').click();
  await page.reload();
  await expect(page.getByTestId('settings-reveal-speed-quick')).toHaveAttribute('aria-checked', 'true');
  await expect(page.getByTestId('settings-reduced-motion-on')).toHaveAttribute('aria-checked', 'true');
  await shot(page, '21-settings');
});

test('a failed request is reported, nothing is lost, and retrying works', async ({ page }) => {
  await page.goto('/hall');
  await page.getByTestId('hall-settings').click();
  // The failure flag lives in the running app, so stay inside it (no reloads).
  await page.getByTestId('tools-fail').click();
  await expect(page.getByTestId('tools-message')).toBeVisible();
  await page.getByTestId('header-back').click();
  await page.getByTestId('hall-treasury-button').click();
  await (await waitVisible(page, 'packs-claim')).click();
  await expect(page.getByText('The connection was interrupted. Your collection is safe — please try again.')).toBeVisible();
  await shot(page, '22-claim-failed');
  await page.getByTestId('packs-claim').click();
  await waitVisible(page, 'open-pack');
});
