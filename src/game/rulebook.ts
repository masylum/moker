import { specialHandRulesText } from "./patterns"
import {
  COMMUNITY_REVEALS,
  LOAN_VALUE,
  MAX_LOANS,
  ORBIT_VALUES,
  PRIVATE_CARD_COUNT,
  STARTING_CHIPS,
} from "./rules"
import type { SpecialHandId } from "./types"

export const CORE_RULES_TEXT = [
  `Players start with ${STARTING_CHIPS} chips, one blue stick, and ${PRIVATE_CARD_COUNT} private cards.`,
  `Three streets reveal ${COMMUNITY_REVEALS.join("/")} community cards. Check or call draws and discards; bet or raise sheds one blue stick and does not draw; fold gains one blue stick.`,
  "Draw from the deck or either live discard top, then discard back to pile A or B.",
  "A private Blank may claim another player's fresh discard in clockwise priority. Public Blanks never change.",
  "Green/blue/red/black Jokers substitute only for tiles of the same color and only inside combinations of at least three tiles. Jokers never form Eyes.",
  "Riichi is declared with a first- or second-street bet/raise and locks the private hand. A Riichi winner returns all remaining blue sticks, which surviving opponents take clockwise.",
  `A Loan adds ${LOAN_VALUE} chips; at most ${MAX_LOANS}. It must be charged once before repayment and subtracts ${LOAN_VALUE} from final score while outstanding.`,
  `Opening charges use orbit values ${ORBIT_VALUES.join(", ")} and equal orbit value times blue sticks plus Loans.`,
  "At showdown, choose the best eight of four private plus eight community tiles.",
  "Check active special patterns from highest score to lowest. The first completed pattern supplies its fixed score. If none completes, optimize disjoint Eyes, Chows, Pungs, Three Dragons, Four Winds, and Kongs.",
].join("\n")

export function agentRulebook(active?: readonly SpecialHandId[]): string {
  return `${CORE_RULES_TEXT}\n\nSpecial pattern notation:\n${specialHandRulesText(active)}`
}
