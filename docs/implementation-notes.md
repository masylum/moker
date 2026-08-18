# Rule implementation notes

The engine follows the revised supplied Mahjong Poker rules: 110 cards, 3-card private hands, an empty first street followed by 3/1/1 community reveals, blue-stick and Loan charges, two fully visible discard lanes, own-turn buried-discard Blank exchanges, early-street Riichi, the fixed 14-rank five-card Hand ladder, three dealer orbits, and the final charge.

The source rules leave a few procedural details open. The library makes these deterministic choices:

- A betting street starts with the first active player clockwise after the dealer.
- A raise reopens action for every other active player. A street closes once every remaining player has matched the current wager or folded.
- Chips have physical denominations of 5, 10, 20, 50, and 100. Every wager is a multiple of 5, and its `amount` is the player's target total for that street.
- The minimum opening wager is 5. Raises follow the poker full-raise rule: the increase must be at least the size of the previous opening bet or raise. A new street resets that minimum to 5.
- A new 110-card deck is shuffled for each hand.
- A tied pot is split in 5-chip units. Remaining 5-chip units are awarded clockwise after the dealer among the tied winners, so the engine never creates a chip denomination that does not exist.
- If the center has no blue stick when a player folds, the donor is the first clockwise player holding one.
- A Joker only takes an identity in a Hand of at least three cards. It cannot form natural Eyes, the natural Dragon Eye in Dragon Dancer, or Crosswinds. A Kong must contain its matching Joker because only three natural copies exist.
- A player unable to make a payment must take an eligible Loan first. The engine rejects an unaffordable action; automated simulations take opening Loans when needed.
- At showdown, each player chooses the highest completed Hand available from any mix of their three private and five community cards. Only that single Hand counts. Equal Hands compare the main combination first and any Eye or secondary component second; numbered suits are equal, and an exact tie splits the pot.

Normal Draw & Discard remains two engine transitions: the player chooses the source, sees the drawn card, then chooses the discard. The heuristic and LLM server steps execute both transitions before responding, so automated turns render once while preserving the hidden-information boundary. A Blank exchange is one transition because it replaces the Blank in place and requires no further discard.

Event timestamps in pure simulations are logical timestamps derived from event order, so complete replays remain byte-for-byte deterministic. Durable and LLM records use real timestamps because they are operational audit data.
