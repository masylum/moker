# Historical proposal

Superseded in the HTML game by [the shared-pile Legacy revision](legacy-browser.md). The rules and simulation results below describe the earlier experiment.

# Legacy prototype rules

Branch: `codex/legacy-prototype`. This document records the headless simulation rules in `scripts/legacy/`. A [browser implementation](legacy-browser.md) now exposes Legacy as a normal game mode, with the revised middle ladder. The earlier proposed player-name gate is superseded. The historical simulator and its results retain the ladder below.

## Current rules

- Extend full Riichi: retain betting, Jokers, Lotuses, loans, Charleston, reveals, and **Riichi sticks unchanged**. There are no Riichi cards. Declaring Riichi does not immediately award sticks; the existing sole-win reward remains.
- Add ten black wild cards: one each of numbers 1–9 and one wild Dragon. Numbers retain their value and may represent any suit; the Dragon may represent any colored Dragon. Neither substitutes for Winds or special cards. Wild cards may form Eyes; existing Jokers still cannot.
- Add one extra copy of each Wind, two extra Blanks, and four distinct Treasures: **132 cards total**. Split the shuffled deck equally. At five players, set aside two random cards for the session.
- Each player owns a persistent deck and a discard lane. Four players therefore have four lanes. Normally fish from the top of, or discard into, either neighbor's lane. You cannot normally access your own lane. With two players, both directions reach the same other lane.
- Deal eight cards, choose one to seed the left neighbor's lane simultaneously, then pass two cards left simultaneously through Charleston. Seven cards remain before betting.
- When your deck is empty, draw from the first nonempty deck clockwise. This applies to dealing and fishing. It can transfer a card from a folded or eliminated player's deck too.
- At round cleanup, shuffle your remaining deck, your hand (including public and folded cards), and **your own lane** together. Destination lane ownership determines who receives unclaimed discards. Decks persist across rounds and tournament games in the session.
- A concealed Blank exchanges for any card at any depth in any lane, including your own. The Blank occupies the vacated position. This replaces the whole fishing action.
- A concealed Treasure replaces the whole fishing action: first discard it into either neighboring lane, then privately inspect up to three top cards of any chosen nonempty personal deck, including your own. Take one and leave the others on top in their original order. No extra draw or discard follows.
- Treasures have **no showdown payout and no ladder combinations**. They cannot form ordinary Eyes, Pungs, Kongs, or Quints. Public Treasures cannot be spent.
- Quint is five identical cards and ranks above Kong. Each physical wild or Joker can occupy only one position in a scored combination.

## Ladder under test

Weakest to strongest:

1. High Card
2. Eyes
3. Chow
4. Two Eyes
5. Chow and Eyes
6. Pung
7. Three Winds
8. Pung and Eyes
9. Three Dragons
10. Twin Lotus
11. Long Chow
12. Three Dragons and Eyes
13. Four Winds
14. Kong
15. Quint

Existing tie-break and lone-Lotus rules continue. The experiment measures this order; suggested changes in the report have not silently changed scoring.

## Explicit prototype interpretations

Seats and lane ownership remain fixed after elimination. Treasure searches may target any nonempty deck, including that of a Riichi-locked, folded, or eliminated player; they never touch that player's current hand. A Riichi-locked actor cannot fish. Choosing an empty deck for a Treasure search is invalid; ordinary deck draws use the clockwise fallback automatically.

There is no forced empty-lane refill. Cleanup is after each round, as requested. Collections reset only when creating a new session. Clockwise fallback exhausts the nearest available deck before moving farther clockwise on subsequent draws. If every deck is empty, a requested deck draw fails explicitly; lanes are not silently recycled. The runner reports such a session unfinished.

## Implementation and bot limits

The prototype subclasses the existing engine through protected rule hooks. That engine still handles betting, loans, settlement, Riichi rewards, reveals, and tournaments. Default Basic and Riichi behavior remains unchanged.

Experimental cards use distinct IDs with compatible existing card objects solely to reuse the betting engine. They must not enter the production evaluator, renderer, save loader, or room API. This adapter is not a production schema or save format.

Bots see their own hand, public cards and lanes, deck sizes, legitimately known transfers and returning deck cards, and remembered search leftovers. A search is committed before the selector receives offers. The opponent's unseen hand and true undealt order are not supplied to the policy. Private draws conservatively invalidate uncertain knowledge instead of leaking card identities.

Bots sample approximate hidden worlds and compare current pot equity plus a small development term. They choose Treasure targets before seeing offers, then select the best offered card. They can spend existing sticks after bets, checks, and calls. Ordinary discards consider neighbors' visible cards; Treasure discards currently choose the left lane. Long-term deck curation, adversarial targeting, and betting-range inference remain shallow. These are experimental heuristics, not trained or optimal Legacy bots.

## Reproduction

```bash
node --import tsx scripts/legacy-ladder.ts --samples 1000000 --deck legacy --seed legacy-v2-rarity-A --output /tmp/legacy-ladder.json
node --import tsx scripts/legacy-ladder.ts --samples 0 --deck legacy --output /tmp/legacy-exact.json
node --import tsx scripts/legacy-simulate.ts --games 150 --samples 32 --orbits 4 --output /tmp/legacy-search-on.json
node --import tsx scripts/legacy-simulate.ts --games 150 --samples 32 --orbits 4 --disable-treasures --output /tmp/legacy-search-off.json
python3 scripts/legacy/report.py
npx vitest run tests/legacy.test.ts
```

See the [current report](legacy-v2-2026-09-28/README.md) for results, exact rarity calculations, and limitations. The [earlier experiment](legacy-2026-09-28/README.md) and its source archive preserve the superseded hand-exchange/payout rules; its commands do not apply to the current scripts.
