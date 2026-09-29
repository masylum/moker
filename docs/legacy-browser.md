# Legacy HTML implementation

Legacy is selectable in Game mode with the “unfinished, testing” pointer. Basic and Riichi retain their existing cards and rules.

The Legacy deck has 192 cards: four copies of ranks 1–9 in Bamboo, Dots, Characters and Shadow; four copies of each of four Dragons and four Winds; five Blanks, four Jokers, two Lotuses, five Treasures. Black Joker represents Shadow numbers, Black Dragon or Winds; it cannot form Eyes.

Reserve two shared-pile seeds and divide every other card dealer-first among personal decks. Deal seven personal cards and run normal Charleston. No central draw deck or central Treasure target exists. An empty personal deck requires fishing a shared pile or using an available Blank/Treasure.

After every hand, return complete hands (including folded/public cards) to their personal decks. Shuffle shared discards, reserve two seeds, and distribute the remainder dealer-first among all seated players. Shuffle personal decks. Collections carry between games; the one-to-four-game selector remains enabled.

Weakest to strongest: High Card, Eyes, Chow, Two Eyes, Pung, Three Dragons, Three Winds, Chow and Eyes, Pung and Eyes, Twin Lotus, Three Dragons and Eyes, Long Chow, Four Dragons, Four Winds, Kong, Quint.

Three Dragons uses any three distinct Dragons. Four Dragons uses all four. The bots retain the named betting/Riichi eligibility categories tested in the Shadow study, avoiding accidental aggression changes from rank numbers.

Shadow cards use black corner numerals with crescent motifs. Black Dragon uses the existing Dragon illustration style and 龙 corners. Treasure artwork remains yellow/orange with 宝 corners. Personal deck counts and draw animation sources are preserved; only other nonempty player decks are Treasure targets.

Legacy save version is now 3. Old Legacy saves are rejected with a request to start a new table because their deck composition and central-deck rules are incompatible.

Verification: independent four-suit scoring oracle over 5,000 hands; every natural face's Kong/Quint; distinct Dragon/Joker cases; 2–6-player restored tournaments and card conservation; dealer-first cleanup; empty deck rejection; Treasure privacy and exchanges; Basic/Riichi regression coverage. Browser smoke check confirms seeded lanes, no central deck, Shadow artwork and personal drawing.

Historical experiment results remain under `docs/legacy-shadow/`. Their patch launcher targets the pre-implementation source; use the original study revision to rerun those patches. The production engine now implements the adopted rules directly.
