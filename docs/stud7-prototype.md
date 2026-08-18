# Stud7 prototype

Stud7 is an isolated experimental variant. It keeps its original flowerless 110-tile deck and 14-rank Hand ladder while sharing the chip economy, blue sticks, Loans, discard lanes, and seeded random generator with the main game. It does not use community cards. Its implementation lives entirely under `src/stud7`, with separate CLI and simulation entrypoints.

## Five streets

The deal follows the familiar seven-card-stud shape while retaining the existing clockwise-after-dealer betting order:

| Street | New card          | Cards after dealing |
| -----: | ----------------- | ------------------- |
|      1 | 2 hole + 1 public | 2 hole, 1 public    |
|      2 | 1 public          | 2 hole, 2 public    |
|      3 | 1 public          | 2 hole, 3 public    |
|      4 | 1 public          | 2 hole, 4 public    |
|      5 | 1 hole            | 3 hole, 4 public    |

Every street has a normal poker betting round. The first active player clockwise after the dealer acts first on every street, matching the main game's ordering instead of introducing a separate Stud bring-in rule.

At showdown, each player scores their own seven cards. There is no shared board and no requirement to use a particular public/private split in the five-card Hand.

## Draw, discard, and visibility

Check and Call still trigger Draw & Discard. Bet and Raise do not.

- When drawing from the deck, the replacement inherits the visibility of the discarded owned card.
- Replacing a public card therefore produces a public card.
- Replacing a hole card produces another hole card.
- Discarding the newly drawn card leaves the owned cards unchanged.
- Any card Fished from either discard lane becomes public, regardless of the visibility of the card it replaces.
- A buried card claimed with a Blank also becomes public.

Fishing may therefore leave a player with more than four public cards and fewer than three hole cards. This is intentional: information that has entered a discard lane can never become secret again.

A deck draw remains visible only to its acting player until the discard is chosen. A Fished card is already public and is visible immediately. Public views omit the private draw/discard history, deck order, folded cards, and opponents' hole-card identities.

Riichi may accompany a Bet or Raise on streets 1 through 4, but not street 5. It locks the cards currently owned by the player. Check and Call still perform Draw & Discard, but the newly drawn card must be discarded, leaving the locked hand unchanged. Cards scheduled for later streets are still dealt normally.

A Fold gains two blue sticks under the current Stud7 rules. The engine retains named experiment profiles for the former one-stick Fold and skipped Riichi draw behavior so balance runs remain reproducible.

## Running independently

```bash
npm run play:stud7 -- --seed stud-table --players 4 --samples 32
npm run play:stud7 -- --debug
npm run play:stud7 -- --auto --seed stud-demo
npm run simulate:stud7 -- 10 stud7-balance 4
```

The original commands remain unchanged:

```bash
npm run play
npm run simulate
```
