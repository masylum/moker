export const SUITS = ["bamboo", "dots", "characters"] as const
export const WINDS = ["east", "south", "west", "north"] as const
export const DRAGONS = ["red", "green", "white"] as const
export const JOKER_COLORS = ["green", "blue", "red", "black"] as const
export const FLOWERS = ["white-lotus", "black-lotus"] as const

export type Suit = (typeof SUITS)[number]
export type Wind = (typeof WINDS)[number]
export type Dragon = (typeof DRAGONS)[number]
export type JokerColor = (typeof JOKER_COLORS)[number]
export type Flower = (typeof FLOWERS)[number]
export type CardColor = JokerColor
export type NumberedRank = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9

export type CardFace =
  | { kind: "numbered"; suit: Suit; rank: NumberedRank; color: CardColor }
  | { kind: "wind"; wind: Wind; color: "black" }
  | { kind: "dragon"; dragon: Dragon; color: CardColor }
  | { kind: "flower"; flower: Flower; color: null }
  | { kind: "joker"; color: JokerColor }
  | { kind: "blank"; color: null }

export type Card = CardFace & { id: string }
export type CardSource = "deck" | "discard-a" | "discard-b"
export type DiscardPile = "a" | "b"

export type CombinationKind =
  | "eye"
  | "chow"
  | "two-eyes"
  | "chow-eye"
  | "pung"
  | "three-dragons"
  | "pung-eye"
  | "three-winds"
  | "four-winds"
  | "kong"
  | "three-dragons-eye"

export type HandKind = "high-card" | CombinationKind

export interface ScoredCombination {
  kind: CombinationKind
  score: number
  cardIds: string[]
  label: string
  description: string
}

export interface HandScore {
  total: number
  selectedCardIds: string[]
  combinations: ScoredCombination[]
  tieBreak: number[]
}

export type PlayerController = "human" | "heuristic" | "llm"
export type Street = 0 | 1 | 2 | 3 | 4
export type GamePhase =
  | "between-hands"
  | "charleston"
  | "exposing"
  | "discarding"
  | "betting"
  | "showdown"
  | "finished"

export interface PlayerState {
  id: string
  name: string
  controller: PlayerController
  chips: number
  loans: number
  riichiSticks: number
  curses: number
  eliminated: boolean
  privateCards: Card[]
  publicCards: Card[]
  folded: boolean
  riichi: boolean
  roundCommitted: number
  handCommitted: number
  potCommitted: number
  score?: HandScore
}

export interface PendingDiscard {
  playerId: string
  drawnCardId: string
  source: CardSource
}

export interface BlankExchange {
  blankCardId: string
  pile: DiscardPile
  cardIndex: number
}

export interface DrawDiscardRecord {
  playerId: string
  source: CardSource | "blank-exchange"
  drawnCard: Card
  discardedCard: Card
  discardPile: DiscardPile
  discardIndex: number
  reason: "call" | "riichi-stick"
}

export interface ExposureRecord {
  playerId: string
  street: Street
  card: Card
}

export interface CharlestonRecord {
  fromPlayerId: string
  toPlayerId: string
  cards: Card[]
}

export type BettingAction =
  | {
      type: "check"
      drawSource?: CardSource
      blankExchange?: BlankExchange
      useRiichiStick?: boolean
      riichiDrawSource?: CardSource
      riichiBlankExchange?: BlankExchange
      curseTargetId?: string
      removeCurse?: boolean
    }
  | {
      type: "call"
      drawSource?: CardSource
      blankExchange?: BlankExchange
      useRiichiStick?: boolean
      riichiDrawSource?: CardSource
      riichiBlankExchange?: BlankExchange
      curseTargetId?: string
      removeCurse?: boolean
    }
  | {
      type: "bet"
      amount: number
      riichi?: boolean
      useRiichiStick?: boolean
      drawSource?: CardSource
      blankExchange?: BlankExchange
      curseTargetId?: string
      removeCurse?: boolean
    }
  | { type: "fold" }

export interface BettingRecord {
  playerId: string
  street: Street
  type: BettingAction["type"]
  amount?: number
  riichi?: boolean
  potBefore?: number
  cost?: number
  actorChipsBefore?: number
  curseTargetId?: string
  removeCurse?: boolean
}

export interface GameConfig {
  playerCount: number
  seed: string
  mode: "basic" | "riichi"
  orbits: number
  tournamentGames: 1 | 3 | 4
  startingChips: number
  heuristicSamples: number
}

export interface DrawContext {
  reason: "call" | "riichi-stick"
  actingPlayerId: string
  remaining: Array<{
    source: CardSource
    blankExchange?: BlankExchange
    reason: "call" | "riichi-stick"
  }>
  continuation: {
    aggressive: boolean
    fullRaise: boolean
    pendingBefore: string[]
  }
}

export interface GameState {
  rulesVersion: 5
  id: string
  config: GameConfig
  rngState: number
  handNumber: number
  maxHands: number
  dealerIndex: number
  startingDealerIndex: number
  dealerSteps: number
  gameNumber: number
  gameScores: Record<string, number>[]
  orbit: number
  orbitValue: number
  phase: GamePhase
  street: Street
  players: PlayerState[]
  deck: Card[]
  discardA: Card[]
  discardB: Card[]
  removedCards: Card[]
  foldedPrivateCards: Record<string, Card[]>
  openingPrivateCards: Record<string, Card[]>
  openingChips: Record<string, number>
  charlestonSelections: Record<string, string[]>
  charlestonHistory: CharlestonRecord[]
  exposureSelections: Record<string, string[]>
  exposureHistory: ExposureRecord[]
  streetOpenerId: string | null
  lastAggressorId: string | null
  openingPot: number
  pot: number
  currentWager: number
  minimumRaise: number
  allInPlayerIds: string[]
  currentAllInBettorId: string | null
  raiseLockedPlayerIds: string[]
  pendingPlayerIds: string[]
  actingPlayerId: string | null
  pendingDiscard: PendingDiscard | null
  drawContext: DrawContext | null
  drawDiscardHistory: DrawDiscardRecord[]
  bettingHistory: BettingRecord[]
  cursePayments: CursePayment[]
  curseRemovals: CurseRemoval[]
  handWinners: string[]
  handResults: HandResult[]
  finalScores: Record<string, number> | null
  version: number
}

export interface LegalAction {
  type: BettingAction["type"]
  callAmount?: number
  minimum?: number
  maximum?: number
  canRiichi?: boolean
  canUseRiichiStick?: boolean
  curseTargetIds?: string[]
  canRemoveCurse?: boolean
}

export interface CursePayment {
  playerId: string
  curseCount: number
  amount: number
  burned: number
}

export interface CurseRemoval {
  playerId: string
  cursesRemoved: number
  sticksSpent: number
}

export interface PotResult {
  amount: number
  eligiblePlayerIds: string[]
  winnerIds: string[]
  payouts: Record<string, number>
}

export interface RiichiSettlement {
  declaredPlayerId: string | null
  won: boolean
  sticksAwarded: number
}

export interface HandResultPlayer {
  playerId: string
  name: string
  folded: boolean
  eliminated: boolean
  riichi: boolean
  lotusDisqualified: boolean
  openingCards: Card[]
  acquiredCards: Card[]
  cards: Card[]
  publicCards: Card[]
  score: HandScore
  chips: number
  loans: number
  riichiSticks: number
  curses: number
  committed: number
  potCommitted: number
  payout: number
  openingChips: number
}

export interface HandResult {
  handNumber: number
  openingPot: number
  pot: number
  allInPlayerIds: string[]
  pots: PotResult[]
  winnerIds: string[]
  reason: "showdown" | "uncontested"
  lotusBluff: { winnerId: string; perOpponent: number; total: number } | null
  riichiSettlement: RiichiSettlement
  cursePayments: CursePayment[]
  curseRemovals: CurseRemoval[]
  orbit: number
  orbitValue: number
  bettingHistory: BettingRecord[]
  players: HandResultPlayer[]
}

export interface DrawDecision {
  discardCardId: string
  discardPile: DiscardPile
}

export interface DecisionEvaluation {
  action: BettingAction
  expectedScore: number
  estimatedWinRate: number
  estimatedFoldout: number
  expectedChipDelta: number
  utility: number
  samples: number
  rationale: string
}

export interface HeuristicDecision {
  playerId: string
  street: Street
  action: BettingAction
  evaluations: DecisionEvaluation[]
  strategy?: "lotus-bluff" | "general-bluff"
  rationale: string
}

export interface HandProgressSummary {
  kind: HandKind
  label: string
  rank: number
  size: number
  missing: number
  matchedCardIds: string[]
}

export interface PokerMathAnalysis {
  playerId: string
  samples: number
  opponents: number
  knownOpponentTiles: number
  opponentAggressiveActions: number
  toCall: number
  potBeforeCall: number
  potAfterCall: number
  potOdds: number
  showdownEquity: number
  equityEdge: number
  callExpectedValue: number
  expectedScore: number
  improveRate: number
  currentBest: HandProgressSummary
  nextClosest: HandProgressSummary | null
}

export interface GameEvent<T = unknown> {
  sequence: number
  gameId: string
  handNumber: number
  type: string
  actorId?: string
  payload: T
  stateVersion: number
  createdAt: string
}

export interface SimulationResult {
  seed: string
  state: GameState
  events: GameEvent[]
  decisions: HeuristicDecision[]
}

export interface PublicPlayerState extends Omit<PlayerState, "privateCards"> {
  privateCards: Card[] | { count: number }
  knownPrivateCards: Card[]
}

export interface PublicGameState extends Omit<
  GameState,
  | "players"
  | "deck"
  | "removedCards"
  | "foldedPrivateCards"
  | "drawContext"
  | "drawDiscardHistory"
  | "openingPrivateCards"
  | "charlestonSelections"
  | "charlestonHistory"
  | "exposureSelections"
> {
  players: PublicPlayerState[]
  deck: { count: number }
}

export interface DebugGameView {
  state: PublicGameState
  analyses: PokerMathAnalysis[]
  actingDecision: HeuristicDecision | null
  recentDrawDiscards: DrawDiscardRecord[]
}
