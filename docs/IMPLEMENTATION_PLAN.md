# Implementation Plan

Each milestone ends with a runnable app, passing checks, updated docs and an honest report of what is real, what is placeholder and what needs device validation.

## Milestone 0 — Foundation ✅

Expo SDK 57 + TypeScript strict, Expo Router (`src/app`), design tokens and fonts, core libraries (Skia, Reanimated, Gesture Handler, SVG, audio, haptics, sensors), domain model and pure engine with tests, ESLint architecture boundaries, Jest, asset structure, web preview with CanvasKit.

## Milestone 1 — AAA vertical slice ✅ (this delivery)

Cinematic welcome; Royal Hall; holographic card renderer and Artifact Chamber; the Royal Treasury (physical tear, extraction, individual reveals, cinematic Legendary, summary); pack selection with the free daily pack; Royal Archive; the David chapter *The Valley of Elah*; practice trivia; honest shop preview; settings and prototype tools; local development backend with idempotent, exactly-once rewards; twelve procedurally painted cards; placeholder sound set; Playwright web E2E suite. Details in [PROGRESS.md](PROGRESS.md).

## Milestone 2 — Accounts and server authority (recommended next)

Goal: rewards that cannot be forged, progress that follows the player.

1. **Development builds and CI** — EAS development builds for iOS/Android; GitHub Actions running `verify` and the web E2E suite on every PR; on-device smoke tests per the [device checklist](PROGRESS.md#real-device-validation).
2. **Supabase project** — Postgres schema mirroring `GameDatabase` (`player_profiles`, `player_inventory`, `pack_grants`, `pack_openings`, `reward_ledger`, `player_quest_progress`), row-level security (players read their own rows; only server functions write rewards).
3. **Server functions** — `claim_daily_pack` (server time + stored timezone), `open_pack` (server-side roll, idempotency key = grant id), `record_reveal_progress`, `complete_quest` (validates progress, exactly once), all writing ledger entries in one transaction.
4. **`SupabaseGameService`** implementing the existing `GameService` contract; offline queueing for presentation-only calls; migration of local prototype data on first sign-in.
5. **Auth** — anonymous start, upgrade to Sign in with Apple / Google / email; account deletion.
6. **Observability** — crash reporting and privacy-respecting analytics (no advertising identifiers; child-appropriate defaults).

## Milestone 3 — Content at scale

A content pipeline ("Kingdom Legends Studio") with the editorial workflow in [CONTENT_GUIDELINES.md](CONTENT_GUIDELINES.md); commissioned illustrations replacing procedural art; Moses and Esther campaigns; Series I expanded; **free weighted packs with published odds**; cosmetic editions (Holo, Celestial); collection milestones.

## Milestone 4 — Engagement and polish

Rewarded daily challenges (server-validated), achievements, professional music and sound design, localization, a full accessibility audit (VoiceOver, TalkBack, dynamic type, switch control), performance tuning for low-end Android (texture budgets, merged canvases in the treasury).

## Milestone 5 — Launch readiness

Store listings and assets, privacy and children's-privacy review, parental information, cosmetic-only shop (if any), beta program, live-ops tools.
