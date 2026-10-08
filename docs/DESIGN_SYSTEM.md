# Design System — "Ancient Royal Luxury"

Source of truth: `src/design/tokens.ts`, `src/design/typography.ts`, `src/design/motion.ts`, `src/design/fonts.ts` and the primitives in `src/ui/`.

## Principles

- The interface is mostly **obsidian, stone and parchment**. Gold is reserved for primary actions, the current tab, milestones and Legendary materials.
- **Collectibles carry the spectacle.** Chrome stays quiet so cards and packs can shine.
- **Rarity is never color alone**: every rarity has a shape (circle, diamond, star, crown) and a written label.
- **Motion is physical** (springs) for objects and **cinematic** (curves) for camera-like moves, and always has a reduced-motion equivalent.

## Color

| Token | Value | Use |
| --- | --- | --- |
| `obsidian` / `background` | `#0B0D12` | App background |
| `royalMidnight` | `#111722` | Deep surfaces |
| `surface` / `surfaceElevated` | `#151920` / `#1B202A` | Panels, tiles |
| `ancientGold` | `#C6A46A` | Eyebrows, rules, accents |
| `radiantGold` | `#E8CB8E` | Selected states, primary text on dark gold moments |
| `antiqueBronze` | `#806442` | Deep metal |
| `agedParchment` | `#E8D8B8` | Scripture and epithets |
| `ivory` | `#F4EFE5` | Primary text |
| `weatheredStone` | `#8B8990` | Muted text |
| `success` / `notice` / `error` | `#A9C08A` / `#D7B677` / `#D88C82` | Feedback (gentle, never alarming) |

### Rarity materials

| Rarity | Emblem | Metal | Glow | Card layout |
| --- | --- | --- | --- | --- |
| Common | Circle | Weathered Bronze | `#C99A66` | Standard frame |
| Rare | Diamond | Sapphire Silver | `#79A7E8` | Standard frame, finer foil |
| Epic | Star | Royal Amethyst | `#B486F2` | Standard frame, patterned foil |
| Legendary | Crown | Radiant Antique Gold | `#FFD27A` | Full-art, strongest foil and glitter |

Undiscovered cards use a cold **stone** frame and a dark silhouette of the illustration.

## Typography

| Family | Use |
| --- | --- |
| **Cinzel** (600/700) | Display titles, card names (engraved capitals) |
| **Manrope** (400–700) | Interface text, labels, buttons |
| **Cormorant Garamond** (500, italic) | Scripture, epithets |

Variants (`useVariant`): `displayXL 40`, `displayL 30`, `displayM 22`, `displayS 16`, `eyebrow 11 (tracked caps, gold)`, `title 17`, `bodyL 16`, `body 14`, `bodyStrong`, `caption 12`, `label 13`, `button 14 (tracked caps)`, `scriptureL 23`, `scripture 19`, `scriptureItalic 19`. Compact phones (< 360 pt) scale type by 0.9. Each variant caps OS text scaling where layout requires it; body and Scripture text scale freely (up to 1.7–1.8×).

## Spacing, radii, layout

- Spacing scale: `2, 4, 8, 12, 16, 24, 32, 48`, gutter `20`.
- Radii are restrained: `4, 6, 10, 14` (and pills).
- Minimum touch target `44 pt`; tab bar `64 pt` plus the safe area.
- Cards keep physical trading-card proportions (63 × 88 mm), authored at 300 × 419 "card units".

## Motion

| Token | Value |
| --- | --- |
| `durations` | press 110, small 240, card lift 300, card flip 560, screen 400, reveal 500, reduced-motion fade 180 (ms) |
| `easings.standard` | `bezier(0.2, 0, 0, 1)` |
| `easings.cinematic` | `bezier(0.65, 0, 0.35, 1)` — camera pushes, light sweeps |
| `springs.press` | damping 20, stiffness 420 — buttons |
| `springs.object` | damping 16, stiffness 150 — cards and packs under the finger |
| `springs.settle` | damping 14, stiffness 90 — return to rest |

Reduced motion (system setting, or the in-app override) replaces flips, camera moves, light sweeps and idle sway with short fades; celebrations still play sound and haptics.

## Components (`src/ui`)

| Component | Notes |
| --- | --- |
| `AppText` | Typography primitive; respects text scaling caps |
| `Button` | `primary` (engraved gold), `secondary` (obsidian with gold edge), `ghost`; spring press; built-in tap/confirm feedback |
| `IconButton`, `Chip`, `OrnamentDivider` | Header controls, filters, editorial rules |
| `Panel` | Obsidian surface with optional engraved corner brackets |
| `ProgressBar` | Polished gold fill, animates on change |
| `RarityBadge`, `RarityEmblem` | Shape + label for every rarity |
| `Segmented` | Radio group for settings |
| `Screen`, `ScreenHeader`, `ScreenBackdrop` | Scaffold: safe areas, gutters, warm top light |
| `Icon` | Original engraved line icons (no icon font) |

Feature components: `HeroCard` (touchable live card), `CardThumb` (pre-rendered grid card), `PackPreview`, `TabBar`, `Atlas`.

## Iconography

Original stroke icons on a 24-unit grid (`src/ui/Icon.tsx`): home, collection, journey, challenges, shop, settings, back, close, heart, rotate, scripture, editions, lock, check, sparkle, arrowRight, crown, sound, map, replay, hand, skip.

## Sound and touch

Sounds are grouped (interface, effects, ambience) with category volumes in Settings. Interface sounds are soft wood-and-bell taps; rewards use bells and pads — never casino or arcade tropes. Haptics use semantic events (`tap`, `packGrab`, `tearTick`, `tearComplete`, `cardReveal` … `legendaryReveal`); Android uses the platform's semantic haptic constants, and repeats are coalesced (40 ms).

## Accessibility checklist

- Every gesture has a button: **Open Pack**, **Draw Cards**, **Reveal Card**, **Next Card**; trivia and quests are tap-only.
- Every celebration can be skipped (tap, or **Skip** to the summary).
- Rarity uses emblem shape + label; progress marks in the reveal are shape-coded.
- Screen-reader labels describe cards ("David, The Giant Slayer. Legendary."), reveals are announced, and controls use `aria-*` state (works on native and web).
- Reduced motion honored; text scales; touch targets ≥ 44 pt.
