import {
  CHIP_DENOMINATIONS,
  COMMUNITY_REVEALS,
  LOAN_VALUE,
  MAX_LOANS,
  OPENING_PRIVATE_CARD_COUNT,
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
  "15 Bouquet — two different natural Flowers plus a separate natural Eye",
  "16 Imperial Garden — three different Flowers; a Black Joker may replace one",
].join("; ")

export const CORE_RULES_TEXT = [
  "The 114-tile deck adds one each of Plum 🀢, Orchid 🀣, Bamboo 🀤, and Chrysanthemum 🀥 Flower to the original 110 tiles. All Flowers are black.",
  `Players start with ${STARTING_CHIPS} chips, one blue stick, and ${OPENING_PRIVATE_CARD_COUNT} private cards. Starting clockwise after the dealer, each player discards one face-up tile to discard lane A or B, seeding the lanes and leaving the usual ${PRIVATE_CARD_COUNT}-tile private hand. If one lane is empty, it must be filled first. The center starts with one additional blue stick per player.`,
  `At the start of each hand, every player pays Orbit Value x (blue sticks + Loans). Orbit values are ${ORBIT_VALUES.join(", ")}; there are no blinds or separate antes. Eligible Loans may be repaid after this charge.`,
  `Wagers use ${CHIP_DENOMINATIONS.join("/")}-chip denominations. The opening minimum is 5; a full raise must increase the wager by at least the previous bet or raise size.`,
  `There are four betting streets. Street 1 reveals no community cards; streets 2, 3, and 4 reveal ${COMMUNITY_REVEALS.slice(1).join("/")} cards, respectively. There are five community cards by showdown.`,
  "If any revealed community tile is a Flower, scrap the entire current board, including that reveal, and deal a new three-tile Flower-free flop. The pot, commitments, folded players, blue sticks, Loans, and Riichi declarations remain. Betting resumes as street 2, followed by new turn and river streets. If the replacement flop contains a Flower, scrap it and redeal again.",
  "After every check or call, perform Draw & Discard, even after an earlier Draw & Discard on that street. Draw one card and discard one private card, always finishing with three. A bet or raise does not draw and returns one blue stick to the center when available; every aggressive action may return one.",
  "A fold gains two blue sticks as its penalty. Take them from the center; whenever the center is empty, take the first available stick clockwise after the folding player. Folded private cards are removed face down.",
  "Draw from the deck or Fish the newest card in either discard lane, then discard one private card to either lane. If one lane is empty, the discard must fill it. Both ordered lanes remain fully visible; Fishing a top card exposes the previous one.",
  "A player holding a private Blank may use it during their own Draw & Discard instead of drawing normally: exchange it for any card at any position in either discard lane. The Blank occupies that exact position, lane order is unchanged, and no additional discard occurs. Community Blanks remain blank.",
  "Green/blue/red/black Jokers substitute for Bams or Green Dragon, Dots or White Dragon, Cracks or Red Dragon, and Winds or Flowers respectively. A Joker takes an identity only inside a Hand of at least three cards, except that the Black Joker may complete Imperial Garden. Jokers may help Chow, Pure Suit, Pung, Three Dragons, Chow + Eye, Pung + Eye, Three Dragons + Eye, Four Winds, Dragon Dancer, Kong, and Imperial Garden. They cannot form an Eye, Two Eyes, Bouquet, the Dragon Eye in Dragon Dancer, or Crosswinds.",
  "Only one player may declare Riichi in a hand. Riichi may accompany a bet or raise on street 1, 2, or 3, never the final street. It locks the three private cards: no later draw, Fishing, discard, or Blank exchange. Betting continues. Whether the win reaches showdown or everyone folds, a Riichi winner returns all of their remaining blue sticks to the center, then each opponent still in the hand takes one clockwise while sticks remain.",
  `A Loan adds ${LOAN_VALUE} chips and one red stick; at most ${MAX_LOANS} may be held. Each Loan pays the opening charge at least once before repayment and subtracts ${LOAN_VALUE} from final score while outstanding.`,
  "At showdown, use any combination of the three private and five community cards to make the single highest Hand. No fixed private/community split is required. One physical card may fill only one position in the Hand.",
  "Flowers add no ordinary Hand value. A player whose three private tiles contain exactly one natural Flower is ineligible to win at showdown, no matter how strong the scored Hand. If every remaining player is ineligible, the pot is split as a dead heat.",
  "If every opponent folds and the uncontested winner holds exactly one natural Flower privately, every opponent pays that winner a 20-chip Flower bluff bonus in addition to the pot.",
  `The fixed ladder, weakest to strongest, is: ${HAND_LADDER_TEXT}.`,
  "Dragon Dancer matches Bams with Green Dragon, Dots with White Dragon, and Cracks with Red Dragon. Its Dragon Eye must be natural, although the matching colored Joker may complete the Chow.",
  "For equal Hands, compare the main combination cards high to low. Numbers rank 1 through 9; all numbered suits are equal; Dragons are equal above numbers; Winds are equal above Dragons; Flowers rank above Winds. For compound Hands compare the main meld first, then the Eye or secondary component. Exact ties split the pot.",
  "After the final hand, charge 15 x (blue sticks + Loans) to the bank. Final score is chips minus 200 for each outstanding Loan.",
].join("\n")

export function agentRulebook(): string {
  return CORE_RULES_TEXT
}
