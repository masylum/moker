import type {
  BettingAction,
  BlankExchange,
  Card,
  CardSource,
  DiscardPile,
  GameConfig,
  GameEvent,
  HandScore,
  LegalAction,
  PlayerController,
} from "../game/types"

export type StudCardVisibility = "public" | "private"
export type StudStreet = 0 | 1 | 2 | 3 | 4 | 5
type StudRiichiDrawMode = "skip" | "discard-drawn"
type StudPhase = "between-hands" | "discarding" | "betting" | "showdown" | "finished"

export interface Stud7Config extends GameConfig {
  foldBlueSticks: 1 | 2
  riichiDrawMode: StudRiichiDrawMode
}

export interface StudCard {
  card: Card
  visibility: StudCardVisibility
}

export interface StudPlayerState {
  id: string
  name: string
  controller: PlayerController
  chips: number
  blueSticks: number
  loans: number
  loansCharged: number[]
  cards: StudCard[]
  folded: boolean
  riichi: boolean
  roundCommitted: number
  handCommitted: number
  score?: HandScore
}

interface StudPendingDiscard {
  playerId: string
  drawnCard: Card
  source: CardSource
}

export interface StudDrawDiscardRecord {
  playerId: string
  source: CardSource | "blank-exchange"
  drawnCard: Card
  discardedCard: Card
  discardPile: DiscardPile
  discardIndex: number
  replacementVisibility: StudCardVisibility | null
}

interface StudHandResultPlayer {
  playerId: string
  name: string
  folded: boolean
  riichi: boolean
  publicCards: Card[]
  privateCards: Card[]
  score: HandScore
  committed: number
  payout: number
}

export interface StudHandResult {
  handNumber: number
  pot: number
  winnerIds: string[]
  reason: "showdown" | "uncontested"
  players: StudHandResultPlayer[]
}

export interface StudGameState {
  id: string
  variant: "stud7"
  config: Stud7Config
  rngState: number
  handNumber: number
  maxHands: number
  dealerIndex: number
  orbit: 1 | 2 | 3
  orbitValue: 5 | 10 | 15
  phase: StudPhase
  street: StudStreet
  players: StudPlayerState[]
  deck: Card[]
  discardA: Card[]
  discardB: Card[]
  removedCards: Card[]
  pot: number
  centerBlueSticks: number
  currentWager: number
  minimumRaise: number
  pendingPlayerIds: string[]
  actingPlayerId: string | null
  pendingDiscard: StudPendingDiscard | null
  drawDiscardHistory: StudDrawDiscardRecord[]
  handWinners: string[]
  handResults: StudHandResult[]
  finalScores: Record<string, number> | null
  version: number
}

interface PublicStudPlayerState extends Omit<StudPlayerState, "cards"> {
  publicCards: Card[]
  privateCards: Card[] | { count: number }
}

export interface PublicStudGameState extends Omit<
  StudGameState,
  "players" | "deck" | "drawDiscardHistory" | "removedCards"
> {
  players: PublicStudPlayerState[]
  deck: { count: number }
  removedCards: { count: number }
  pendingDiscard:
    | StudPendingDiscard
    | (Omit<StudPendingDiscard, "drawnCard"> & { drawnCard: null })
    | null
}

export interface StudDecisionEvaluation {
  action: BettingAction
  showdownEquity: number
  expectedRank: number
  utility: number
}

export interface StudHeuristicDecision {
  playerId: string
  action: BettingAction
  evaluations: StudDecisionEvaluation[]
  rationale: string
}

export interface StudDiscardChoice {
  discardCardId: string
  discardPile: DiscardPile
  expectedRank: number
  rationale: string
}

export interface StudPokerMathAnalysis {
  playerId: string
  samples: number
  opponents: number
  toCall: number
  potOdds: number
  showdownEquity: number
  callExpectedValue: number
  expectedRank: number
  improveRate: number
}

export interface StudSimulationResult {
  seed: string
  state: StudGameState
  events: GameEvent[]
  decisions: StudHeuristicDecision[]
}

export type { BettingAction, BlankExchange, GameConfig, LegalAction }
