# Rule implementation notes

The engine follows the supplied Mahjong Poker rules as written: 110 cards, 4-card private hands, 4/2/2 community reveals, blue-stick and Loan charges, two live discard piles, Blank interrupts, Riichi, best-8-of-12 scoring, all basic combinations, all 15 optional Special Hand Cards, three dealer orbits, and the final charge.

The source rules leave a few procedural details open. The library makes these deterministic choices:

- A betting street starts with the first active player clockwise after the dealer.
- A raise reopens action for every other active player. A street closes once every remaining player has matched the current wager or folded.
- A wager is an integer number of chips and its `amount` is the player's target total for that street.
- A new 110-card deck is shuffled for each hand.
- An indivisible chip left after a tied pot is awarded clockwise after the dealer among the tied winners.
- If the center has no blue stick when a player folds, the donor is the first clockwise player holding one.
- A Joker in Four Treasures or Heavenly Honors must be part of at least one valid, disjoint scoring combination; it cannot qualify merely as a loose colored card.
- A player unable to make a payment must take an eligible Loan first. The engine rejects an unaffordable action; automated simulations take opening Loans when needed.
- Following the requested scoring simplification, active Special Hand Cards are checked from highest printed score to lowest. The first completed pattern supplies its fixed score. Basic meld decomposition is used only when no active special pattern completes; special and basic scores are not combined.

Draw and discard is modeled as two transitions. This matters: the player chooses the draw source, sees the drawn card, and only then chooses the discard. It prevents a client or bot from using hidden deck information.

Event timestamps in pure simulations are logical timestamps derived from event order, so complete replays remain byte-for-byte deterministic. Durable and LLM records use real timestamps because they are operational audit data.
