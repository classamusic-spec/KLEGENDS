# Game Economy

## Principles (non-negotiable)

1. **Packs are free.** Discovery Packs are earned (daily, quests, events) — never sold.
2. **No paid randomized rewards** of any kind: no paid packs, loot boxes, gacha or paid rerolls.
3. **No pay-to-win.** Anything sold in the future is cosmetic (card backs, pack themes, archive covers) and never changes play, odds or story.
4. **No spiritual ratings.** Cards and levels never measure faith or holiness. Journey levels measure game progress only.
5. **Calm by design.** No streak penalties, no expiring rewards pressure, nothing lost by taking a break.
6. **Server-authoritative and idempotent.** Every reward is decided and recorded by the backend, exactly once, with a ledger entry.
7. **Honest odds.** Fixed demo contents are labeled as such; when weighted packs arrive, their odds are published.

## Currencies and progression

| Thing | How it is earned | What it does |
| --- | --- | --- |
| **Cards** (editions) | Packs, quest rewards | Collected in the Royal Archive; duplicates increase the copy count |
| **Journey XP** | Completing chapters (and later, challenges) | Raises the Journey level: level *n* needs 100 · *n*(*n* − 1) / 2 total XP (L2 at 100, L3 at 300, L4 at 600 …) |

There is no premium currency in Milestone 1.

## Daily Discovery Pack

- One free pack per **local calendar day**; the allowance does not accumulate.
- Claiming creates a grant; opening it is separate (the grant waits if the player leaves).
- Milestone 1 evaluates the day with the device clock and timezone (`engine/dailyPack.ts`). **Milestone 2 must use server time and a stored player timezone** so changing the device clock cannot mint packs.

## The Milestone 1 demo pack

`kingdom-discovery-demo` — "Kingdom Discovery Pack", 5 cards, **fixed contents**:

| Card | Rarity |
| --- | --- |
| Ruth — Where You Go | Common |
| David — The Shepherd | Common |
| Joshua — Strong and Courageous | Rare |
| Esther — For Such a Time | Epic |
| David — The Giant Slayer | Legendary |

It is labeled "Demo pack · fixed contents" in the pack selection screen, the treasury header and the summary ("not live reward odds"). Every daily claim in Milestone 1 grants this pack, so repeat openings produce duplicates (copy counts increase).

## Quest rewards

*The Valley of Elah* (David, Chapter 1) grants **Sling & Stones (Rare)** and **150 Journey XP**, once. Replaying a completed chapter is welcome and grants nothing; the screen says so.

## Challenges

Scripture trivia is a **practice mode** in Milestone 1: scores are not saved and nothing is rewarded. Rewarded daily challenges require accounts and server validation (Milestone 2+).

## Shop

A preview only: planned cosmetics and the promises above. No payment system is connected and nothing can be bought.

## Future weighted packs (Milestone 2+)

When packs stop being fixed, contents will be rolled **on the server** from published, per-slot weights (e.g. a guaranteed rare-or-better slot), with the roll stored in the opening record before anything is shown. Odds will be shown in the pack selection screen. Packs remain free.

## Ledger

Every grant writes an append-only `RewardLedgerEntry` (`pack_granted`, `pack_opened`, `card_granted`, `xp_awarded`, `quest_completed`) with its source, for support and audits.
