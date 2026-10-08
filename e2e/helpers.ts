import { expect, type Page } from '@playwright/test';

/** Screenshots for visual review land in e2e-results/screens. */
export const shot = (page: Page, name: string) => page.screenshot({ path: `e2e-results/screens/${name}.png` });

/** Waits until an element exists and is fully opaque (animations finished). */
export const waitVisible = async (page: Page, testId: string, timeout = 90_000) => {
  const locator = page.getByTestId(testId).first();
  await locator.waitFor({ state: 'visible', timeout });
  await expect
    .poll(
      () =>
        locator.evaluate((el) => {
          let opacity = 1;
          for (let node: Element | null = el; node; node = node.parentElement) opacity *= Number(getComputedStyle(node).opacity);
          return opacity;
        }),
      { timeout },
    )
    .toBeGreaterThan(0.98);
  return locator;
};

/** Pointer drag in small steps (the gesture system needs intermediate moves). */
export const drag = async (page: Page, from: readonly [number, number], to: readonly [number, number], steps = 26) => {
  await page.mouse.move(from[0], from[1]);
  await page.mouse.down();
  for (let i = 1; i <= steps; i++) {
    await page.mouse.move(from[0] + ((to[0] - from[0]) * i) / steps, from[1] + ((to[1] - from[1]) * i) / steps);
    await page.waitForTimeout(20);
  }
  await page.mouse.up();
};

/**
 * Treasury geometry at the 390 × 844 test viewport (no safe-area insets on
 * web): the pack's seal line and the reveal card's center. See
 * src/features/treasury/layout.ts.
 */
export const TREASURY = {
  sealFrom: [92, 243] as const,
  sealTo: [330, 250] as const,
  packCenter: [195, 430] as const,
  drawTo: [195, 150] as const,
  card: [195, 374] as const,
};

/** Reads the local development backend's database from browser storage. */
export const readDatabase = (page: Page) =>
  page.evaluate(() => {
    const raw = localStorage.getItem('kl.local-backend.v1');
    return raw ? (JSON.parse(raw) as Record<string, unknown>) : null;
  });

/** Welcome → Royal Hall → pack selection → claim today's pack → treasury. */
export const claimDailyPack = async (page: Page) => {
  await page.goto('/');
  await (await waitVisible(page, 'welcome-enter')).click();
  await expect(page.getByTestId('hall')).toBeVisible();
  await page.getByTestId('hall-treasury-button').click();
  await (await waitVisible(page, 'packs-claim')).click();
};

/** Reveals every remaining card with the buttons (the accessible path). */
export const revealAll = async (page: Page, count: number, onRevealed?: (index: number) => Promise<void>) => {
  for (let i = 0; i < count; i++) {
    await (await waitVisible(page, 'reveal-button')).click();
    await waitVisible(page, 'reveal-next');
    if (onRevealed) await onRevealed(i);
    await page.getByTestId('reveal-next').click();
  }
};
