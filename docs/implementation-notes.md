# Rule implementation notes

The engine follows the revised supplied Mahjong Poker rules: 110 cards, 4-card private hands, 4/2/2 community reveals, blue-stick and Loan charges, two fully visible discard lanes, own-turn buried-discard Blank exchanges, Riichi, the ranked single-Hand showdown, all basic Hands, all 14 optional Special Hand Cards, three dealer orbits, and the final charge.

The source rules leave a few procedural details open. The library makes these deterministic choices:

- A betting street starts with the first active player clockwise after the dealer.
- A raise reopens action for every other active player. A street closes once every remaining player has matched the current wager or folded.
- Chips have physical denominations of 5, 10, 20, 50, and 100. Every wager is a multiple of 5, and its `amount` is the player's target total for that street.
- The minimum opening wager is 5. Raises follow the poker full-raise rule: the increase must be at least the size of the previous opening bet or raise. A new street resets that minimum to 5.
- A new 110-card deck is shuffled for each hand.
- A tied pot is split in 5-chip units. Remaining 5-chip units are awarded clockwise after the dealer among the tied winners, so the engine never creates a chip denomination that does not exist.
- If the center has no blue stick when a player folds, the donor is the first clockwise player holding one.
- A Joker in Four Treasures must be part of a valid combination of at least three cards; it cannot qualify merely as a loose colored card. Terminals & Honors and Eight Blessings likewise reject loose Jokers.
- A player unable to make a payment must take an eligible Loan first. The engine rejects an unaffordable action; automated simulations take opening Loans when needed.
- At showdown, every completed basic and active Special Hand is compared at its fixed ladder rank. Only the highest single Hand counts. Equal Hands compare their defining cards from highest to lowest; suits are equal, and an exact tie splits the pot.

Normal Draw & Discard remains two engine transitions: the player chooses the source, sees the drawn card, then chooses the discard. The heuristic and LLM server steps execute both transitions before responding, so automated turns render once while preserving the hidden-information boundary. A Blank exchange is one transition because it replaces the Blank in place and requires no further discard.

Event timestamps in pure simulations are logical timestamps derived from event order, so complete replays remain byte-for-byte deterministic. Durable and LLM records use real timestamps because they are operational audit data.
