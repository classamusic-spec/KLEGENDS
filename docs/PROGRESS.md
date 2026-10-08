# Progress

## Milestone 0 — Foundation (complete)

- Expo SDK 57 app, TypeScript strict (`noUncheckedIndexedAccess`), Expo Router with routes in `src/app`, typed routes.
- Design tokens, typography (Cinzel, Manrope, Cormorant Garamond), motion tokens, UI primitives.
- Domain model and pure engine (cards, editions, packs, grants, openings, quests, progression, Scripture references), ESLint-enforced boundaries.
- Jest + jest-expo; web preview with CanvasKit loaded before the app renders.

## Milestone 1 — Vertical slice (complete)

### Screens

| Screen | Route | Notes |
| --- | --- | --- |
| Cinematic welcome | `/` | Light rises over the crown crest; static under reduced motion |
| Royal Hall | `/hall` | Featured live card, treasury status, current chapter, archive preview, Journey level |
| Pack selection | `/packs` | Pack on display, contents by rarity, demo notice, daily claim / resume / countdown |
| Royal Treasury | `/treasury` | Full opening ritual (see [PACK_REVEAL_SPEC.md](PACK_REVEAL_SPEC.md)) |
| Royal Archive | `/collection` | Binder of 12 cards, filters, rarity counts, silhouettes, favorites, copies |
| Artifact Chamber | `/card/[cardId]` | Drag / device-motion tilt, flip, story and verbatim key verse, favorite, editions, related chapter |
| Journey (Ancient Atlas) | `/journey` | Campaign map; David available, Moses and Esther shown honestly as in development |
| Quest player | `/quest/[questId]` | *The Valley of Elah*: 10 steps, saved after each, rewards once, review mode |
| Challenges | `/challenges` | Practice Scripture trivia (5 questions, scored, not saved) |
| Shop | `/shop` | Honest preview: promises and planned cosmetics, no purchasing |
| Settings | `/settings` | Volumes, haptics, motion tilt, reduced motion, reveal speed, visual quality, prototype tools, credits |

### Interactions

Physical seal tear with resistance and finger-following strip; slide-to-draw extraction; tap-to-reveal; drag-to-tilt cards; device-motion tilt (native, opt-in); per-rarity reveal celebrations and a staged cinematic Legendary; skip at any point; resume after interruption; button equivalents for every gesture; tap-to-gather discovery step; trivia and quest questions with explanations.

### Systems

Local development backend (serialized, persisted, failure injection) behind the `GameService` contract; idempotent pack opening and exactly-once quest rewards with a ledger; presentation state machine; audio engine (pools, fading loops, ducking, web autoplay handling); semantic haptics; settings persistence; texture baking with caching and prefetch; pre-rendered grid thumbnails.

### Art and sound

- **12 card illustrations**, original and procedural (`src/graphics/art/scenes`): David — The Giant Slayer (full-art Legendary), Ruth, David — The Shepherd, Joshua, Esther, Sling & Stones, Noah, Moses, David — The King, David — The Psalmist, Elijah, Daniel. Each also renders as an undiscovered silhouette.
- Foil pack wrapper, card back, crest, icons and app icon set — all drawn in code.
- **30 sounds** synthesized by `scripts/generate-audio.mjs` (deterministic; `--verify` checks levels, loops and silence).

## Verification

| Check | Result |
| --- | --- |
| `npm run typecheck` | Passes |
| `npm run lint` | Passes |
| `npm test` | **88 tests** in 10 suites pass |
| `npm run e2e:web` | **8 tests** pass against the production web export (Chromium, 390 × 844) |

E2E coverage: welcome → hall → pack selection → claim → open (buttons) → reveal five → Legendary → "Biblical Story" → back → summary → collection shows 5 of 12; the next visit shows the daily countdown. Physical tear (including a short pull that is resisted), slide-to-draw and tap-to-reveal. Reload mid-reveal → resumed at card 3 → skip → stored opening is `presented` with 5 cards granted exactly once. The David chapter played end to end (+150 XP, Sling & Stones), then replayed with no second reward. Trivia scoring, settings persistence, every tab, and a simulated dropped connection that is reported and recoverable.

## Demo data and placeholders

| Item | Status |
| --- | --- |
| Packs | The only pack is a **demo pack with fixed contents**, labeled as such everywhere |
| Backend | **On-device development backend** — not secure against a modified client |
| Daily pack | Eligibility uses the **device clock** (server time in Milestone 2) |
| Card text, quest, trivia | **Draft**, awaiting biblical editorial review |
| Artwork | Procedural placeholders pending commissioned illustration (labeled in the Artifact Chamber) |
| Sound | Procedural placeholders pending sound design |
| Challenges | Practice mode: no saved scores, no rewards |
| Shop | Preview only; no payment system |
| Player name | Fixed "Collector" (accounts arrive in Milestone 2) |
| Reflection answers | Not stored |

## Known limitations

- **Native behavior has not been run on a physical device or simulator in this environment** (no device available). Rendering, gestures, audio, haptics and sensors were exercised on the web build only; see the checklist below.
- On the web, Reanimated and texture baking share the main thread: brief hitches can occur when card faces are baked (most bakes are prefetched while the pack is torn). In software-rendered browsers (no GPU), the treasury runs at a few frames per second and unmounting a Skia canvas can block for seconds while its WebGL context is released.
- The treasury layers three full-screen canvases; merging them is planned for low-end Android tuning.
- Haptics and motion tilt are unavailable on web.
- Only Expo Go–bundled native modules are used; no development build has been made yet.

## Real-device validation

Run on at least one recent iPhone, one older iPhone (e.g. A13-class), one mid-range and one low-end Android:

- [ ] Holographic card shader renders correctly (no banding, correct parallax, back face, thickness edges) at 1×–3× pixel ratios
- [ ] Tear, extraction and card tilt track the finger at 60 fps (120 fps on ProMotion) without dropped frames while card faces bake
- [ ] Legendary celebration timing, dimming and audio ducking feel right; skip works mid-sequence
- [ ] Haptics: tear ticks are crisp but not buzzing; iOS and Android patterns feel appropriate
- [ ] Audio: iOS silent switch respected, mixes with other apps, loops seamless, no clipping at max volume, pauses in background
- [ ] Device-motion tilt (Settings) is stable, re-centres, and stops when leaving the Artifact Chamber
- [ ] System reduced-motion setting is honored; in-app override works both ways
- [ ] Dynamic type / font scaling at the largest sizes: no clipped buttons or titles
- [ ] VoiceOver and TalkBack: every control labeled; reveals announced; the treasury fully operable with buttons
- [ ] Backgrounding and killing the app mid-tear and mid-reveal; resume behaves as specified
- [ ] Memory: opening several packs and browsing the archive stays within budget (texture LRU, thumbnails)
- [ ] Safe areas on notched devices and Android gesture navigation; the treasury cannot be dismissed by an accidental back swipe
- [ ] Battery and thermals during a 10-minute session in the treasury

## Asset register

| Asset | Source | License |
| --- | --- | --- |
| Scripture text | Berean Standard Bible via ebible.org (`scripts/extract-scripture.mjs`) | Public domain (BSB Publishing, LLC) |
| Cinzel, Manrope, Cormorant Garamond | `@expo-google-fonts/*` | SIL Open Font License 1.1 |
| Card, pack, back and emblem artwork | Original, procedural (`src/graphics`) | Project-owned |
| App icon, adaptive icon, splash mark, favicon | Original, baked from the crest (`/dev/icons`, `scripts/export-icons.mjs`) | Project-owned |
| Sound effects and ambience (30 files) | Original, synthesized (`scripts/generate-audio.mjs`) | Project-owned |
| Interface icons | Original SVG paths (`src/ui/Icon.tsx`) | Project-owned |
| CanvasKit (web Skia runtime) | `canvaskit-wasm`, copied by `scripts/copy-canvaskit.js` | BSD-3-Clause (Skia) |

No third-party artwork, music, sound packs or translations are used.

## Recommended next milestone

**Milestone 2 — Accounts and server authority** (see [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md#milestone-2--accounts-and-server-authority-recommended-next)): EAS development builds and the device checklist above first, then the Supabase backend behind the existing `GameService` contract so every reward is decided on the server.
