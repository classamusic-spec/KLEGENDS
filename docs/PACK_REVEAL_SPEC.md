# Pack Reveal Specification — The Royal Treasury

Implementation: `src/features/treasury/*`, `src/graphics/pack/*`, `src/engine/packReveal.ts`, configuration in `src/domain/packs.ts` (`DEFAULT_REVEAL_CONFIGURATION`).

## Contract

The rewards of an opening are **committed before the treasury shows anything** (see [ARCHITECTURE.md](ARCHITECTURE.md#rewards-are-decided-before-anything-is-shown)). The treasury presents an immutable `PackOpening`; no gesture, skip, interruption or crash can change which cards were granted.

## State machine (`engine/packReveal.ts`)

```
LOADING ─▶ PRESENTING ─▶ READY_TO_GRAB ─▶ GRABBING ─▶ TENSION ─▶ TEARING ─▶ OPENED
   │                         ▲    │ AUTO_OPEN (button)                 │
   ▼                         └────┴────── RELEASE below threshold ◀────┘
 ERROR ─RETRY─▶ LOADING
OPENED ─▶ CARDS_EXTRACTING ─▶ REVEALING_CARD ─▶ RARITY_CELEBRATION ─▶ REVEAL_COMPLETE
                                    ▲                                      │
                                    └──────────────── NEXT ───────────────┤
                                                                           ▼
                                                        SUMMARY ─CLOSE─▶ CLOSED
```

Global events: `SKIP_TO_SUMMARY` (from any presentation phase), `BACKGROUND` / `FOREGROUND`, `CLOSE`. Every transition is unit-tested.

## Sequence

| Step | What the player sees and does | Accessible alternative |
| --- | --- | --- |
| Loading | Dark chamber; "Preparing the treasury…" after 300 ms | — |
| Presentation | The light rises (1.4 s) and the pack settles onto the pedestal (1.3 s); a soft shimmer | Instant under reduced motion |
| Ready | A hand glides along the seal until the first touch. "Swipe across the seal to tear it open." | **Open Pack** button tears it automatically |
| Grab | Touching near the seal grips the foil: a highlight stretches under the finger, a soft stretch loop plays | — |
| Tension | The seal resists the first **14 px** of travel, then gives (`seamSeparate` haptic) | — |
| Tearing | The strip follows the finger from the side it started on, curling away; a rip sound every **6 %** of progress, a tick haptic every fourth | — |
| Release | Releasing at **≥ 62 %** completes the tear by itself; below that the strip relaxes and the progress is kept | — |
| Opened | The strip flies off (0.76 s), warm light escapes the seal. "Slide the cards up to draw them out." | **Draw Cards** button, or tap the pack |
| Extracting | The stack rises with the finger while the wrapper sinks (45 % of the travel); releasing past **45 %** completes it, otherwise it springs back | — |
| Hand-off | The empty wrapper falls away (0.9 s) and the stack glides to the reveal position (0.72 s) | Instant under reduced motion |
| Reveal | One card at a time, face down on the stack. "Tap the card to reveal it." Drag to turn it in the light | **Reveal Card** button |
| Celebration | Flip and rarity celebration (below). "Tap to skip." | Tap skips to the end state |
| Complete | Name, epithet, passage, "New discovery" or "In your collection ×N". **Next Card** sends it away | Buttons; tap the card (except Legendary) |
| Legendary | "LEGENDARY DISCOVERED" with **Inspect**, **Biblical Story** and **Continue** | — |
| Summary | Every card in reveal order with "New" badges and duplicate counts; demo-pack notice; **View Collection** / **Return to Royal Hall** | — |

**Skip** (header) jumps to the summary from any point after loading. **Close** leaves; the opening can be resumed later.

## Reveal order and honesty

- Cards are presented in **ascending rarity** (Common → Legendary), ties in pack order, so the strongest moment lands last.
- Only cards that really are Epic or Legendary shimmer while face down ("honest anticipation"). Nothing ever teases a rarity that is not there.
- Progress marks above the card show each revealed card's rarity **emblem shape**.

## Timings (ms) — Settings → Card reveal speed

| Speed | Common flip / celebration | Rare | Epic | Legendary |
| --- | --- | --- | --- | --- |
| Cinematic | 560 / 450 | 600 / 900 | 650 / 1500 | 650 / 3600 |
| Standard (default) | 480 / 350 | 520 / 700 | 560 / 1100 | 600 / 2800 |
| Quick | 300 / 150 | 320 / 300 | 340 / 450 | 380 / 1100 |

## Celebrations

- **Common:** lift and flip; a soft bronze aura; `reveal_common`, light haptic.
- **Rare:** adds a burst ring; sapphire aura; `reveal_rare`, medium haptic.
- **Epic:** adds slowly turning rays; amethyst aura; `reveal_epic`, heavy haptic.
- **Legendary** (total = flip + celebration, e.g. 3.4 s standard):
  1. *Anticipation* — ambience ducks to 25 %, `legendary_anticipation`, the room dims, the card lifts and glows.
  2. *Suspense* (from 16 %) — a ribbon of gold light traces the card, the camera pushes in (×1.08), the card turns slightly.
  3. *Revelation* (flip at 44 %) — burst, rays and aura; `legendary_reveal` and the success haptic; the title appears; a shimmer tail.
  4. *Presentation* (from 72 %) — the card settles into an inspection pose; the room stays dim.

Effects are restrained: no flashes to white, no screen shake.

## Reduced motion

No 3D flips, camera moves, light sweeps, idle sway or particles. Cards cross-fade into place, the pack appears without its descent, the tear and extraction complete with short fades. Sounds and haptics still mark each moment.

## Interruptions and recovery

| Situation | Behavior |
| --- | --- |
| App backgrounded | Presentation pauses; a tear or extraction in progress returns to its stable phase; a celebration jumps to its end state |
| App returns | Continues from where it paused |
| App closed or crashed mid-reveal | Reopening the treasury resumes the same opening at the next card, with "Resuming your opening. Your cards were already saved to your collection." |
| Opening request fails | "The treasury is closed" with the reason, **Try Again** and **Return to Royal Hall**; nothing is lost |
| Revisiting a finished opening | Goes straight to the summary |

Reveal progress (`revealedCount`) is saved after each flip and only ever increases; the opening is marked `presented` at the summary.

## Sound and haptic cues

| Moment | Sound | Haptic |
| --- | --- | --- |
| Ambience | `ambient_treasury_loop` | — |
| Grip | `pack_grab`, `foil_stretch_loop` | `packGrab` |
| Seal gives | — | `seamSeparate` |
| Tearing | `foil_rip_1…4` | `tearTick` |
| Torn | `foil_release` | `tearComplete` |
| Drawing out | `cards_slide`, `card_shuffle` | `packGrab`, `cardReveal` |
| Wrapper falls | `wrapper_fall` | — |
| Flip | `card_flip` | — |
| Reveal | `reveal_common` / `reveal_rare` / `reveal_epic` / `legendary_reveal` | `cardReveal` / `rareReveal` / `epicReveal` / `legendaryReveal` |
| Next card | `card_whoosh` | — |

## Performance notes

- The faces of every card in the opening are baked while the pack is presented and torn, so flips never wait.
- Finger tracking, the strip mesh and the card projection run on the UI thread.
- The fallen wrapper stops drawing; burst, sparks and ribbon exist only during celebrations; ambient motion pauses when the treasury is hidden and is frozen in "Performance" quality.
