This is an Expo/React Native mobile application. Prioritize mobile-first patterns, performance, and cross-platform compatibility.

## Expo has changed — do not trust your training data

Expo ships breaking changes every SDK release. APIs you remember are likely renamed, moved, or removed. Before writing any code that touches an Expo, EAS, or React Native API:

1. Read the major version of the `expo` package in `package.json`.
2. Fetch the matching versioned docs: `https://docs.expo.dev/versions/v<major>.0.0/`
3. For anything else, fetch https://docs.expo.dev/llms.txt — an index of all Expo docs with corrections to common LLM misconceptions. Follow its links to the specific page you need; never answer from memory.

## Commands

Use `bunx` instead of `npx` if the project uses bun (`bun.lock` present).

```bash
npx expo install <package>  # ALWAYS use instead of npm/yarn/pnpm/bun add — resolves SDK-compatible versions
npx expo start              # start the dev server
npx expo lint               # lint
npx tsc --noEmit            # typecheck
npx expo-doctor             # diagnose dependency and config issues
npx expo install --fix      # fix incompatible package versions
```

Run lint and typecheck before declaring any task done.

## Navigation & Routing

- Use **Expo Router** for all navigation. Routes live in `src/app/` — every file there is a screen, `_layout.tsx` files define navigators. Keep non-route code (components, hooks, utils) outside `src/app/`.
- Import `Link`, `router`, and `useLocalSearchParams` from `expo-router`.
- Docs: https://docs.expo.dev/router/introduction.md

## Building with EAS

Use EAS to build, sign, and submit the app in the cloud (`eas build`, `eas submit`) and to ship over-the-air updates (`eas update`) — no local Xcode or Android Studio required. Run EAS CLI as `bunx eas-cli <command>` in Bun projects, or `npx eas-cli@latest <command>` otherwise; substitute that for bare `eas` in docs examples.
Docs: https://docs.expo.dev/eas/index.md

## Rules

- If `ios/` and `android/` directories do not exist, they are generated (Continuous Native Generation). Never create or edit them by hand — configure native behavior in `app.json` and config plugins.
- Expo Go only includes its bundled native modules. After adding a library with native code, the app needs a development build: `npx expo run:ios|android` locally, or `eas build --profile development`.
- Prefer recommended Expo modules over third-party libraries, and check your available skills before adding dependencies. Docs: https://docs.expo.dev/versions/latest/index.md

## Kingdom Legends conventions

Read `docs/ARCHITECTURE.md` before changing code. In short:

- **Layers:** `src/domain`, `src/engine` and `src/content` are pure TypeScript (no React, React Native or Expo — ESLint enforces it). Screens live in `src/features`, routes in `src/app` are thin.
- **Rewards only through `GameService`** (`src/services/gameService.ts`). Never grant or compute rewards in UI code. Pack contents are committed before any presentation; presentation can never change them.
- **Skia objects never travel as props** of components that can re-render with a different value (React 19's dev Performance Tracks walk props and freeze web pages on CanvasKit objects). Use `Opaque<T>` (`src/graphics/skia/opaque.ts`), load inside the component, or remount with `key`.
- **Worklets** capture only plain values and shared values; use `.get()`/`.set()`; reach JS with `scheduleOnRN`.
- **SVG ids** come from `useSvgId` (web documents share ids across screens).
- **Clocks and effects:** use `useFrameTime(active)` and pause it when the screen is unfocused, the element is off screen, the app is backgrounded or reduced motion is on. Mount effect layers only while visible.
- **Accessibility:** every gesture needs a button; rarity is shape + label; use `aria-*` props for state; honor `useReducedMotion()`.
- **Content:** Scripture is BSB verbatim from `src/content/scripture` (regenerate with `scripts/extract-scripture.mjs`); summaries and dramatizations are labeled; card ids are permanent. See `docs/CONTENT_GUIDELINES.md`.
- **Checks before finishing:** `npm run verify`; for UI or treasury changes also `npm run e2e:web`.
