import {
  CHIP_DENOMINATIONS,
  COMMUNITY_REVEALS,
  LOAN_VALUE,
  MAX_LOANS,
  ORBIT_VALUES,
  PRIVATE_CARD_COUNT,
  STARTING_CHIPS,
} from "./rules"

const HAND_LADDER_TEXT = [
  "1 High Card — no other Hand",
  "2 Eye — two identical natural cards",
  "3 Chow — three consecutive numbered cards of one suit",
  "4 Pure Suit — five numbered cards of one suit, not necessarily consecutive",
  "5 Two Eyes — two different natural Eyes",
  "6 Chow + Eye — a Chow and a separate natural Eye",
  "7 Pung — three identical cards",
  "8 Three Dragons — Red, Green, and White Dragon",
  "9 Pung + Eye — a Pung and a separate natural Eye",
  "10 Three Dragons + Eye — Three Dragons and a separate natural Eye",
  "11 Four Winds — East, South, West, and North",
  "12 Dragon Dancer — a Chow and a natural Eye of its matching Dragon",
  "13 Kong — four identical cards; it necessarily uses the matching Joker",
  "14 Crosswinds — natural Eyes of East + West or North + South",
].join("; ")

export const CORE_RULES_TEXT = [
  `Players start with ${STARTING_CHIPS} chips, one blue stick, and ${PRIVATE_CARD_COUNT} private cards. The center starts with one additional blue stick per player.`,
  `At the start of each hand, every player pays Orbit Value x (blue sticks + Loans). Orbit values are ${ORBIT_VALUES.join(", ")}; there are no blinds or separate antes. Eligible Loans may be repaid after this charge.`,
  `Wagers use ${CHIP_DENOMINATIONS.join("/")}-chip denominations. The opening minimum is 5; a full raise must increase the wager by at least the previous bet or raise size.`,
  `There are four betting streets. Street 1 reveals no community cards; streets 2, 3, and 4 reveal ${COMMUNITY_REVEALS.slice(1).join("/")} cards, respectively. There are five community cards by showdown.`,
  "After every check or call, perform Draw & Discard, even after an earlier Draw & Discard on that street. Draw one card and discard one private card, always finishing with three. A bet or raise does not draw and returns one blue stick to the center when available; every aggressive action may return one.",
  "A fold gains one blue stick from the center. If the center is empty, take the first available stick clockwise after the folding player. Folded private cards are removed face down.",
  "Draw from the deck or Fish the newest card in either discard lane, then discard one private card to either lane. If one lane is empty, the discard must fill it. Both ordered lanes remain fully visible; Fishing a top card exposes the previous one.",
  "A player holding a private Blank may use it during their own Draw & Discard instead of drawing normally: exchange it for any card at any position in either discard lane. The Blank occupies that exact position, lane order is unchanged, and no additional discard occurs. Community Blanks remain blank.",
  "Green/blue/red/black Jokers substitute for Bamboo or Green Dragon, Dots or White Dragon, Characters or Red Dragon, and Winds respectively. A Joker takes an identity only inside a Hand of at least three cards. Jokers may help Chow, Pure Suit, Pung, Three Dragons, Chow + Eye, Pung + Eye, Three Dragons + Eye, Four Winds, Dragon Dancer, and Kong. They cannot form an Eye, Two Eyes, the Dragon Eye in Dragon Dancer, or Crosswinds.",
  "Riichi may accompany a bet or raise on street 1, 2, or 3, never the final street. It locks the three private cards: no later draw, Fishing, discard, or Blank exchange. Betting continues. A Riichi winner returns all remaining blue sticks; surviving opponents take one each clockwise while sticks remain.",
  `A Loan adds ${LOAN_VALUE} chips and one red stick; at most ${MAX_LOANS} may be held. Each Loan pays the opening charge at least once before repayment and subtracts ${LOAN_VALUE} from final score while outstanding.`,
  "At showdown, use any combination of the three private and five community cards to make the single highest Hand. No fixed private/community split is required. One physical card may fill only one position in the Hand.",
  `The fixed ladder, weakest to strongest, is: ${HAND_LADDER_TEXT}.`,
  "Dragon Dancer matches Bamboo with Green Dragon, Dots with White Dragon, and Characters with Red Dragon. Its Dragon Eye must be natural, although the matching colored Joker may complete the Chow.",
  "For equal Hands, compare the main combination cards high to low. Numbers rank 1 through 9; all numbered suits are equal; Dragons are equal above numbers; Winds are equal above Dragons. For compound Hands compare the main meld first, then the Eye or secondary component. Exact ties split the pot.",
  "After the final hand, charge 15 x (blue sticks + Loans) to the bank. Final score is chips minus 200 for each outstanding Loan.",
].join("\n")

export function agentRulebook(): string {
  return CORE_RULES_TEXT
}
