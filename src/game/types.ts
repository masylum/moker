export const SUITS = ["bamboo", "dots", "characters"] as const
export const WINDS = ["east", "south", "west", "north"] as const
export const DRAGONS = ["red", "green", "white"] as const
export const JOKER_COLORS = ["green", "blue", "red", "black"] as const
export const FLOWERS = ["plum", "orchid", "bamboo", "chrysanthemum"] as const

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
  | { kind: "flower"; flower: Flower; color: "black" }
  | { kind: "joker"; color: JokerColor }
  | { kind: "blank"; color: null }

export type Card = CardFace & { id: string }
export type CardSource = "deck" | "discard-a" | "discard-b"
export type DiscardPile = "a" | "b"

export type CombinationKind =
  | "eye"
  | "chow"
  | "pure-suit"
  | "two-eyes"
  | "chow-eye"
  | "pung"
  | "three-dragons"
  | "pung-eye"
  | "three-dragons-eye"
  | "four-winds"
  | "dragon-dancer"
  | "kong"
  | "crosswinds"
  | "bouquet"
  | "imperial-garden"

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

export type HandWinReason = "showdown" | "uncontested"

export interface HandResultPlayer {
  playerId: string
  name: string
  folded: boolean
  riichi: boolean
  flowerDisqualified: boolean
  cards: Card[]
  score: HandScore
  committed: number
  payout: number
}

export interface HandResult {
  handNumber: number
  pot: number
  community: Card[]
  winnerIds: string[]
  reason: HandWinReason
  flowerBonus: { winnerId: string; perOpponent: number; total: number } | null
  boardResets: number
  players: HandResultPlayer[]
}

export type PlayerController = "human" | "heuristic" | "llm"

export interface PlayerState {
  id: string
  name: string
  controller: PlayerController
  chips: number
  blueSticks: number
  loans: number
  loansCharged: number[]
  privateCards: Card[]
  folded: boolean
  riichi: boolean
  roundCommitted: number
  handCommitted: number
  score?: HandScore
}

export type Street = 0 | 1 | 2 | 3 | 4
export type GamePhase =
  | "between-hands"
  | "seeding"
  | "discarding"
  | "betting"
  | "showdown"
  | "finished"

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
}

export interface SeedDiscardRecord {
  playerId: string
  discardedCard: Card
  discardPile: DiscardPile
  discardIndex: number
}

export interface GameConfig {
  playerCount: number
  seed: string
  startingChips: number
  heuristicSamples: number
}

export interface GameState {
  id: string
  config: GameConfig
  rngState: number
  handNumber: number
  maxHands: number
  dealerIndex: number
  orbit: 1 | 2 | 3
  orbitValue: 5 | 10 | 15
  phase: GamePhase
  street: Street
  players: PlayerState[]
  deck: Card[]
  community: Card[]
  discardA: Card[]
  discardB: Card[]
  removedCards: Card[]
  scrappedCommunity: Card[]
  pot: number
  centerBlueSticks: number
  currentWager: number
  minimumRaise: number
  pendingPlayerIds: string[]
  actingPlayerId: string | null
  pendingDiscard: PendingDiscard | null
  drawDiscardHistory: DrawDiscardRecord[]
  seedDiscardHistory: SeedDiscardRecord[]
  boardResetCount: number
  handWinners: string[]
  handResults: HandResult[]
  finalScores: Record<string, number> | null
  version: number
}

export type BettingAction =
  | { type: "check"; drawSource: CardSource; blankExchange?: BlankExchange }
  | { type: "call"; drawSource: CardSource; blankExchange?: BlankExchange }
  | { type: "bet"; amount: number; riichi?: boolean }
  | { type: "raise"; amount: number; riichi?: boolean }
  | { type: "fold" }

export interface DrawDecision {
  discardCardId: string
  discardPile: DiscardPile
}

export interface LegalAction {
  type: BettingAction["type"]
  callAmount?: number
  minimum?: number
  maximum?: number
  canRiichi?: boolean
}

export interface DecisionEvaluation {
  action: BettingAction
  expectedScore: number
  estimatedWinRate: number
  expectedChipDelta: number
  utility: number
  samples: number
  rationale: string
}

export interface HeuristicDecision {
  playerId: string
  action: BettingAction
  evaluations: DecisionEvaluation[]
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
}

export interface PublicGameState extends Omit<
  GameState,
  "players" | "deck" | "drawDiscardHistory"
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
