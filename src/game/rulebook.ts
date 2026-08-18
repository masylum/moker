import { specialHandRulesText } from "./patterns"
import {
  CHIP_DENOMINATIONS,
  COMMUNITY_REVEALS,
  LOAN_VALUE,
  MAX_LOANS,
  ORBIT_VALUES,
  PRIVATE_CARD_COUNT,
  STARTING_CHIPS,
} from "./rules"
import type { SpecialHandId } from "./types"

const HAND_LADDER_TEXT = [
  "1 High Card",
  "2 Eye",
  "3 Chow",
  "4 Pung",
  "5 Three Dragons",
  "6 Sisters",
  "7 Four Treasures",
  "8 Terminals & Honors",
  "9 Four Eyes",
  "10 Staircase",
  "11 Eight Blessings",
  "12 Kong",
  "13 Four Winds",
  "14 Twin Gates",
  "15 Crossing Winds",
  "16 Mirror Chows",
  "17 Brothers",
  "18 Rainbow Eyes",
  "19 Dragon Dance",
  "20 Raging Winds",
  "21 Four Winds at Peace",
].join("; ")

export const CORE_RULES_TEXT = [
  `Players start with ${STARTING_CHIPS} chips, one blue stick, and ${PRIVATE_CARD_COUNT} private cards. The center starts with one additional blue stick per player.`,
  `At the start of each hand, every player pays Orbit Value x (blue sticks + Loans). Orbit values are ${ORBIT_VALUES.join(", ")}; there are no blinds or separate antes. Eligible Loans may be repaid after this charge.`,
  `Wagers use ${CHIP_DENOMINATIONS.join("/")}-chip denominations. The opening minimum is 5; a full raise must increase the wager by at least the previous bet or raise size.`,
  `Three streets reveal ${COMMUNITY_REVEALS.join("/")} community cards. After every check or call, perform Draw & Discard, even after an earlier Draw & Discard on that street. A bet or raise does not draw and returns one blue stick to the center when available; every aggressive action may return one.`,
  "A fold gains one blue stick from the center. If the center is empty, take the first available stick clockwise, starting after the folding player. Folded private cards are removed face down.",
  "For Draw & Discard, draw from the deck or Fish the newest card in either discard lane, then discard one private card to either lane. If a lane is empty, the discard must fill it. Both ordered lanes remain fully visible.",
  "A player holding a private Blank may use it during their own Draw & Discard instead of drawing normally: exchange it for any card at any position in either discard lane. The Blank occupies that exact position, lane order is unchanged, and no additional discard occurs. Community Blanks remain blank.",
  "Green/blue/red/black Jokers substitute for Bamboo or Green Dragon, Dots or White Dragon, Characters or Red Dragon, and Winds respectively. A Joker takes an identity only inside a combination of at least three cards. It cannot form an Eye or satisfy a Special Hand as a loose card. Every Kong therefore requires its matching Joker.",
  "Riichi may accompany a bet or raise on street one or two. It locks the four private cards: no later draw, Fishing, discard, or Blank exchange. Betting continues. A Riichi winner returns all remaining blue sticks; surviving opponents take one each clockwise while sticks remain.",
  `A Loan adds ${LOAN_VALUE} chips and one red stick; at most ${MAX_LOANS} may be held. It may be taken whenever liquidity is needed. Each Loan pays the opening charge at least once before repayment and subtracts ${LOAN_VALUE} from final score while outstanding.`,
  "At showdown, use the four private and eight community cards to find the highest active single Hand. Do not add several hands and do not select a fixed number of cards. Basic Hands are always active; only configured Special Hands count.",
  `The complete ladder, weakest to strongest, is: ${HAND_LADDER_TEXT}.`,
  "For equal Hands, compare the defining cards highest to lowest. Numbered cards rank 1 through 9; Dragons rank above numbers; Winds rank above Dragons; suits are equal. A Joker has its represented identity. Exact ties split the pot.",
  "After the final hand, charge 15 x (blue sticks + Loans) to the bank. Final score is chips minus 200 for each outstanding Loan.",
].join("\n")

export function agentRulebook(active?: readonly SpecialHandId[]): string {
  const heading = active ? "Active Special Hand patterns" : "Complete optional Special Hand catalog"

  return `${CORE_RULES_TEXT}\n\nPattern notation: B/D/C are Bamboo/Dots/Characters; E/S/W/N are Winds; R/G/H are Red/Green/White Dragons; ! means natural cards only; repeated symbols require repeated cards.\n${heading}:\n${specialHandRulesText(active)}`
}
