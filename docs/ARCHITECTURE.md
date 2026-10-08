# Architecture

Kingdom Legends is an Expo SDK 57 app (React Native 0.86, React 19.2, TypeScript strict) using Expo Router, Reanimated 4 + Worklets, Gesture Handler, React Native Skia 2.6, React Native SVG, expo-audio, expo-haptics and expo-sensors. Every native module is part of Expo Go.

## Layers

```
src/
  app/        Routes only (Expo Router). Thin files that render feature screens.
  features/   Screens and feature components (treasury, hall, collection, cards, journey, quest, challenges, shop, settings, welcome, navigation).
  ui/         Design-system primitives (Button, Panel, AppText, Screen, …).
  design/     Tokens: colors, rarity materials, typography, motion, fonts.
  graphics/   Skia rendering: procedural art, card renderer and shaders, foil pack, effects.
  feedback/   Audio engine, sound manifest, semantic haptics.
  state/      External stores and React bindings (game data, settings).
  services/   The GameService contract and the local development backend.
  engine/     Pure game logic: transactions, state machines, quest runtime, trivia.
  domain/     Pure types and rules: cards, packs, quests, rarity, Scripture references.
  content/    The content catalog: cards, packs, quests, trivia, Scripture text.
  lib/        Small shared helpers (time).
```

**Boundaries are enforced by ESLint** (`eslint.config.js`): `domain`, `engine` and `content` may not import React, React Native or Expo. Gameplay rules therefore run (and are tested) without any UI.

## Data flow

```
 Screen ──hook──▶ state/game.ts (gameStore, selectors) ◀──onChange── GameService
   │                                                                     ▲
   └──────── actions (claimDailyPack, openPack, completeQuest, …) ───────┘
```

- **`GameService`** (`src/services/gameService.ts`) is the only way screens change player state. It exposes `load`, `claimDailyPack`, `openPack`, `recordRevealProgress`, `markOpeningPresented`, `saveQuestProgress`, `completeQuest`, `setFavorite`, plus clearly separated `prototype` tools.
- **`LocalGameService`** is the Milestone 1 implementation: an on-device development backend. It runs the pure engine transactions one at a time (a promise queue), persists the result to AsyncStorage (`kl.local-backend.v1`, localStorage on web) **before** publishing it, simulates latency (450 ms for opening packs) and can inject a dropped connection. It is labeled as non-production everywhere it appears: it cannot protect rewards from a modified client.
- **Stores** (`src/state/store.ts`) are tiny observable values read through `useSyncExternalStore`; selector results are cached per snapshot so selectors may build new objects.
- **Errors** become friendly copy via `describeServiceError` ("Your collection is safe — please try again.").

## Rewards are decided before anything is shown

1. `claimDailyPack` creates a **grant** (once per local day).
2. `openPack(grantId)` creates an immutable **PackOpening** — items, copies, "new" flags — and writes the cards to the inventory and the reward ledger in the same transaction. Calling it again returns the same opening (idempotent).
3. The Royal Treasury then **presents** that opening. Its state machine (`engine/packReveal.ts`) cannot add, remove or change a card; it only records presentation progress (`revealedCount`, monotonic) and finally marks the opening `presented`.

Closing the app mid-reveal therefore loses nothing: the next visit resumes the same opening at the next card. Quest completion follows the same rule: `completeQuest` validates the submitted progress and grants rewards exactly once; replays return `alreadyCompleted`.

## Rendering pipeline

### Cards

1. **Art** — each card has an `ArtScene` (`graphics/art/scenes/*`) drawn procedurally with Skia: a `back` layer (sky, land) and a transparent `front` layer (subjects), so the two can move with parallax. Figures are built from posed skeletons whose parts are boolean-unioned into single paths, then rim-lit; in **silhouette mode** the same paths become the undiscovered card.
2. **Bake** — `bakeArtLayers` and `bakeFrame` render art and frame (including Skia Paragraph text) into images on CPU raster surfaces, at a resolution chosen from the on-screen size and pixel ratio (`textureScaleFor`, quantized to 0.25 steps). Results are cached (LRU of 8 hero texture sets).
3. **Draw** — `CardView` renders one Skia canvas: a 4 × 4 perspective projection (`processTransform3d`) for tilt and flip, edge slices for thickness, a contact shadow, and the **holographic material** — an SkSL shader (`cardShader.ts`) combining art parallax, a rarity-tuned foil (rainbow band, patterned holo, sparse glitter, specular sweep) and reveal glow. All per-frame math runs on the UI thread.
4. **Grids** never use live shaders: `loadCardThumbnail` flattens art + frame into a PNG data URI shown with a plain `<Image>`.

### Pack and reveal

- `packGeometry.ts` (pure, unit-tested) builds the tear profile, the wrapper outline open along the tear, and the bending seal-strip mesh.
- `PackStage` draws the stack, the wrapper (metallic shader over the baked wrapper art), the torn edges and the strip (Skia `Vertices`).
- Gestures (`usePackGestures`) track the finger entirely on the UI thread with Reanimated worklets; JS is only called for discrete moments (state-machine events, sounds, haptic ticks) via `scheduleOnRN`.
- The reveal choreography (`features/treasury/choreography.ts`) is a set of per-rarity timelines that can be cleared and snapped to their end state (skip).

## Rules every contributor must follow

1. **Never pass raw Skia objects as props of components that can re-render with a different value.** React 19's development build walks changed props for its Performance Tracks; on web every Skia object references the CanvasKit module, which exposes the WASM heap as typed arrays — walking it freezes the page. Use `Opaque<T>` (`graphics/skia/opaque.ts`), load the object inside the component, or remount with `key`.
2. **Worklets capture only plain data** (numbers, arrays, shared values). No Skia host objects, no non-worklet functions; call JS with `scheduleOnRN`. Use `.get()`/`.set()` on shared values.
3. **SVG ids are per instance** (`useSvgId`). On the web all SVGs share one document, and a `url(#id)` that resolves into a hidden screen paints nothing.
4. **Pay only for what is visible.** Effect layers mount only while they show; frame clocks (`useFrameTime`) pause when the screen loses focus, when the card scrolls away, under reduced motion and while backgrounded; "Performance" quality freezes ambient motion.
5. **Accessibility state uses `aria-*` props** (`aria-checked`, `aria-selected`, `aria-disabled`), which work on native and web alike.
6. **Rewards only through `GameService`.** Screens never compute or grant rewards themselves.

## Platform notes

- **iOS / Android (Expo Go):** primary targets. Skia renders on the GPU; Reanimated animations and gestures run on the UI thread, so texture baking on the JS thread does not stall the tear.
- **Web (preview):** `index.web.ts` loads CanvasKit (`/canvaskit.wasm`) before rendering. Reanimated runs on the main thread, so baking can cause brief hitches. Browsers block audio until the first click or key press; the audio engine waits for it. Each Skia canvas is a WebGL context, released on unmount. Haptics and motion tilt are unavailable.

## Testing

- **Unit (Jest, 88 tests):** domain rules, pack transactions (claim once per day, idempotent opening, monotonic reveal progress), the reveal state machine (every transition, interruption, background/foreground, resume, skip), the quest runtime and exactly-once completion, the local service (persistence, serialization, failure injection), content integrity (every card, edition, quest and Scripture reference resolves), trivia scoring, pack geometry, audio fades.
- **End-to-end (Playwright, 8 tests):** the production web export at a phone viewport — see the [README](../README.md#web-end-to-end-tests).
- **Not automated:** native rendering, haptics, audio output, sensors and performance on real devices (see [PROGRESS.md](PROGRESS.md#real-device-validation)).

## Milestone 2: the real backend

`GameService` is the seam. Milestone 2 replaces `LocalGameService` with a Supabase-backed implementation: Postgres tables mirroring `GameDatabase` (`player_profiles`, `player_inventory`, `pack_grants`, `pack_openings`, `reward_ledger`, `player_quest_progress`), row-level security, and server functions that own every reward decision (daily eligibility by server time and stored timezone, opening rolls, quest validation) with idempotency keys. Screens do not change.
