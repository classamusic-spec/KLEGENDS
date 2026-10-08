# Kingdom Legends

A premium biblical trading-card game for iOS and Android (with a web preview), built with Expo and React Native. Players open beautifully crafted card packs, collect heroes, events and artifacts from Scripture, and walk through biblical stories in short interactive chapters.

> **Status: Milestone 1 prototype.** Rewards are recorded by an on-device development backend, every pack is a clearly labeled demo pack with fixed contents, and nothing can be purchased. See [docs/PROGRESS.md](docs/PROGRESS.md) for what is built, what is placeholder, and what still needs device validation.

## Quick start

Requirements: Node.js 20+ and npm. For phones, install **Expo Go** (SDK 57) on an iPhone or Android device on the same network.

```bash
npm install          # also copies CanvasKit (Skia for web) into public/
npm start            # Expo dev server — scan the QR code with Expo Go
npm run ios          # open in the iOS Simulator (macOS with Xcode)
npm run android      # open in an Android emulator or connected device
npm run web          # web preview at http://localhost:8081
```

Every native module used is bundled with Expo Go (Skia, Reanimated, Gesture Handler, SVG, audio, haptics, sensors), so no development build is needed for this milestone.

## Checks

```bash
npm run typecheck    # TypeScript (strict)
npm run lint         # ESLint (expo config + architecture boundaries)
npm test             # Jest unit tests (domain, engine, services, content, audio)
npm run verify       # all three
```

## Web end-to-end tests

The Playwright suite drives the real app in Chromium at a 390 × 844 phone viewport: the full pack-opening loop (buttons and physical gestures), an interrupted and resumed opening, the David chapter, trivia, settings and error recovery. Screenshots are written to `e2e-results/screens/`.

```bash
npm run e2e:web      # builds the production web export, serves it on :8082, runs the suite
npm run e2e:dev      # runs the suite against a dev server you started with `npm run web`
npm run build:web    # production web export into dist/
npm run serve:web    # serve dist/ on http://localhost:8082 (SPA fallback, correct wasm MIME type)
```

Without a GPU, Chromium renders WebGL in software (SwiftShader); the suite uses 1× pixel density and long timeouts for that reason. The web tests do not replace testing on phones — see the device checklist in [docs/PROGRESS.md](docs/PROGRESS.md).

## Developer routes (development builds only)

| Route | Purpose |
| --- | --- |
| `/dev/treasury` | Grants a demo pack and opens it immediately |
| `/dev/art?card=<id>` | One card, large, drag to tilt (`u=1` undiscovered, `flip=1` back) |
| `/dev/scene?card=<id>` | A card's illustration alone, without frame or foil |
| `/dev/pack?p=0.5` | The foil pack frozen at a tear pose |
| `/dev/icons` | Bakes the app icon set; `node scripts/export-icons.mjs` saves them to `assets/` |

Settings → **Prototype tools** can grant demo packs, simulate a dropped connection, and reset local data.

## Scripts

| Script | What it does |
| --- | --- |
| `scripts/copy-canvaskit.js` | Copies `canvaskit.wasm` to `public/` (runs on install) |
| `scripts/extract-scripture.mjs` | Regenerates `src/content/scripture/bsb.generated.ts` from the public-domain BSB |
| `scripts/generate-audio.mjs` | Re-synthesizes the placeholder sound set (`--verify` checks it) |
| `scripts/export-icons.mjs` | Exports the branded icon set from `/dev/icons` |
| `scripts/serve-web.mjs` | Dependency-free static server for `dist/` |

## Documentation

- [Product vision](docs/PRODUCT_VISION.md)
- [Design system](docs/DESIGN_SYSTEM.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Game economy](docs/GAME_ECONOMY.md)
- [Pack reveal specification](docs/PACK_REVEAL_SPEC.md)
- [Content guidelines](docs/CONTENT_GUIDELINES.md)
- [Implementation plan](docs/IMPLEMENTATION_PLAN.md)
- [Progress, asset register and device checklist](docs/PROGRESS.md)

## Credits and licenses

- Scripture quotations are from the **Berean Standard Bible (BSB)**, dedicated to the public domain by BSB Publishing, LLC.
- Fonts: **Cinzel**, **Manrope** and **Cormorant Garamond** (SIL Open Font License), via `@expo-google-fonts`.
- All artwork (cards, pack, icons) and all sound are original to this project, generated procedurally in code; they are placeholders pending commissioned art and sound design.
