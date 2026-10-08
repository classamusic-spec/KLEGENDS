import { expect, test } from '@playwright/test';

import { readDatabase, shot, waitVisible } from './helpers';

const next = async (page: import('@playwright/test').Page) => {
  const button = page.getByTestId('quest-next');
  await expect(button).toBeEnabled();
  await button.click();
};

test('David — The Valley of Elah: play the chapter and earn its rewards exactly once', async ({ page }) => {
  await page.goto('/journey');
  await expect(page.getByTestId('atlas')).toBeVisible();
  await shot(page, '15-atlas');
  await page.getByTestId('chapter-valley-of-elah-start').click();

  await expect(page.getByText('Two Armies, One Valley')).toBeVisible();
  await expect(page.getByText('Dramatization')).toBeVisible();
  await page.waitForTimeout(2000);
  await shot(page, '16-quest-narrative');
  await next(page); // narrative
  await expect(page.getByText('1 Samuel 17:3–4 · BSB')).toBeVisible();
  await next(page); // the champion
  await next(page); // a shepherd volunteers

  // Question: answers are final and always explained.
  await expect(page.getByTestId('quest-next')).toBeDisabled();
  await page.getByTestId('choice-sheep').click();
  await expect(page.getByText('That’s right.')).toBeVisible();
  await next(page);
  await next(page); // the LORD who delivered me

  // Discovery: gather five stones.
  await expect(page.getByTestId('brook')).toBeVisible();
  for (let i = 0; i < 5; i++) await page.getByTestId(`stone-${i}`).click();
  await expect(page.getByText('Five smooth stones, gathered.')).toBeVisible();
  await shot(page, '17-quest-discovery');
  await next(page);
  await next(page); // in the name of the LORD

  // A wrong answer is gentle and still teaches.
  await page.getByTestId('choice-saul').click();
  await expect(page.getByText('Not quite — here is what the passage says.')).toBeVisible();
  await next(page);
  await next(page); // one stone

  await page.getByTestId('reflection-input').fill('Trust God when something feels too big.');
  await next(page); // complete

  await waitVisible(page, 'quest-complete');
  await expect(page.getByText('+150 Journey XP')).toBeVisible();
  await page.waitForTimeout(3500);
  await shot(page, '18-quest-complete');

  const db = (await readDatabase(page)) as { player: { journeyXp: number }; inventory: Record<string, unknown> };
  expect(db.player.journeyXp).toBe(150);
  expect(Object.keys(db.inventory)).toEqual(['sling-and-stones/standard']);

  // Replaying the chapter never grants its rewards again.
  await page.goto('/quest/valley-of-elah');
  await expect(page.getByText('Chapter 1 · Review')).toBeVisible();
  for (let i = 0; i < 10; i++) {
    if (await page.getByTestId('choice-sheep').isVisible()) await page.getByTestId('choice-sheep').click();
    if (await page.getByTestId('choice-lord').isVisible()) await page.getByTestId('choice-lord').click();
    if (await page.getByTestId('brook').isVisible()) for (let s = 0; s < 5; s++) await page.getByTestId(`stone-${s}`).click();
    await next(page);
  }
  await expect(page.getByTestId('quest-review-complete')).toBeVisible();
  const after = (await readDatabase(page)) as { player: { journeyXp: number }; inventory: Record<string, { copies: number }> };
  expect(after.player.journeyXp).toBe(150);
  expect(after.inventory['sling-and-stones/standard']?.copies).toBe(1);
});
