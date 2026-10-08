import { defineConfig } from '@playwright/test';

/**
 * Web end-to-end tests. They drive the real app in Chromium at a phone-sized
 * viewport (390 × 844) and save screenshots to e2e-results/screens.
 *
 * By default the production web export is built and served on :8082. Set
 * E2E_BASE_URL (e.g. http://localhost:8081 for `npm run web`) to test a
 * running dev server instead (`npm run e2e:dev`).
 *
 * Rendering uses SwiftShader (software WebGL) when no GPU is available, so
 * timeouts are generous. Native iOS/Android behavior is NOT covered here.
 */
const external = process.env.E2E_BASE_URL;

export default defineConfig({
  testDir: './e2e',
  outputDir: './e2e-results/artifacts',
  timeout: 8 * 60_000,
  expect: { timeout: 45_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }]],
  use: {
    baseURL: external ?? 'http://localhost:8082',
    viewport: { width: 390, height: 844 },
    // 1× keeps software-rendered WebGL fast enough for reliable timing.
    deviceScaleFactor: 1,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    actionTimeout: 45_000,
    launchOptions: {
      args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
    },
  },
  webServer: external
    ? undefined
    : {
        command: 'npm run build:web && npm run serve:web',
        url: 'http://localhost:8082',
        reuseExistingServer: !process.env.CI,
        timeout: 15 * 60_000,
      },
});
