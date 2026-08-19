# Rule implementation notes

The engine follows the revised Mahjong Poker rules: 114 tiles including four Flowers, 4-card opening hands that seed the discard lanes down to 3 private tiles, an empty first street followed by 3/1/1 community reveals, Flower board resets and bluff bonuses, blue-stick and Loan charges, two fully visible discard lanes, own-turn buried-discard Blank exchanges, early-street Riichi, the fixed 16-rank five-card Hand ladder, three dealer orbits, and the final charge.

The source rules leave a few procedural details open. The library makes these deterministic choices:

- Numbered suits are presented to players and the LLM as Cracks, Bams, and Dots. The serialized values remain `characters`, `bamboo`, and `dots` so existing saved sessions can still be restored.
- A betting street starts with the first active player clockwise after the dealer.
- A raise reopens action for every other active player. A street closes once every remaining player has matched the current wager or folded.
- Chips have physical denominations of 5, 10, 20, 50, and 100. Every wager is a multiple of 5, and its `amount` is the player's target total for that street.
- The minimum opening wager is 5. Raises follow the poker full-raise rule: the increase must be at least the size of the previous opening bet or raise. A new street resets that minimum to 5.
- A new 114-tile deck is shuffled for each hand.
- Each player receives four private tiles and, clockwise after the dealer, seeds one face-up discard before street 1. The first two seed discards must populate the two separate lanes.
- A Flower revealed on any community street scraps the whole board and the triggering reveal. A Flower-free replacement flop starts a new street-2 betting round without changing the pot, commitments, folded players, Riichi, sticks, or Loans. Replacement flops are redealt until Flower-free.
- Flowers have no ordinary High Card, Eye, or meld value. Two distinct natural Flowers plus a separate natural Eye make rank-15 Bouquet. Three distinct Flowers make rank-16 Imperial Garden, and one Black Joker may substitute there.
- Exactly one natural private Flower disqualifies a player at showdown, even alongside the Black Joker. If all contenders are disqualified, they split the pot as a dead heat. An uncontested winner with exactly one natural private Flower instead receives 20 chips directly from every opponent.
- A tied pot is split in 5-chip units. Remaining 5-chip units are awarded clockwise after the dealer among the tied winners, so the engine never creates a chip denomination that does not exist.
- Folding gives the player two penalty blue sticks. If the center runs out while paying either stick, the donor is the first clockwise player holding one.
- Only the first Riichi declaration in a hand is legal. If that player wins, their remaining blue sticks return to the center before one stick is paid clockwise to each opponent still in the hand. This settlement also runs after an uncontested win, when there are no remaining opponents to receive a stick.
- Publicly Fished tiles and buried tiles claimed with a Blank remain attached to that opponent's public range until visibly discarded. Equity rollouts pin those tiles to that opponent and weight the remaining range by their public calls, bets, and raises.
- A Joker only takes an identity in a Hand of at least three cards. It cannot form natural Eyes, the natural Dragon Eye in Dragon Dancer, or Crosswinds. A Kong must contain its matching Joker because only three natural copies exist.
- A player unable to make a payment must take an eligible Loan first. Optional wagers remain capped by available chips. Once both Loans are already held, mandatory opening charges may make the chip balance negative so a heavily penalized player cannot halt the game.
- At showdown, each player chooses the highest completed Hand available from any mix of their three private and five community cards. Only that single Hand counts. Equal Hands compare the main combination first and any Eye or secondary component second; numbered suits are equal, and an exact tie splits the pot.

Normal Draw & Discard remains two engine transitions: the player chooses the source, sees the drawn card, then chooses the discard. The heuristic and LLM server steps execute both transitions before responding, so automated turns render once while preserving the hidden-information boundary. A Blank exchange is one transition because it replaces the Blank in place and requires no further discard.

Event timestamps in pure simulations are logical timestamps derived from event order, so complete replays remain byte-for-byte deterministic. Durable and LLM records use real timestamps because they are operational audit data.
