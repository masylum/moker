import { cardLabel, faceKey } from "../game/cards"
import { orbitFor } from "../game/rules"
import type { BettingAction, Card } from "../game/types"
import { playStud7, type StudSimulationOptions } from "./simulation"
import type { Stud7Config, StudGameState } from "./types"

const ACTION_TYPES = ["check", "call", "bet", "raise", "fold"] as const

type ActionType = (typeof ACTION_TYPES)[number]

interface CountTotal {
  count: number
  total: number
}

interface ConditionalWins {
  appearances: number
  wins: number
  winShares: number
}

interface StudTileBalance extends ConditionalWins {
  key: string
  label: string
}

export interface Stud7BalanceRaw {
  schemaVersion: 1
  profile: string
  rules: Pick<Stud7Config, "foldBlueSticks" | "riichiDrawMode">
  seedPrefix: string
  heuristicSamples: number
  fastMode: boolean
  gamesAttempted: number
  gamesCompleted: number
  failedGames: Record<string, number>
  hands: number
  seatHands: number
  initialPots: CountTotal
  initialPotsByOrbit: Record<string, CountTotal>
  pots: CountTotal
  loansTaken: number
  endingLoans: number
  playersTakingLoans: number
  endingBlueSticks: number
  actions: Record<ActionType, number>
  riichiDeclarations: number
  riichiSeatHands: number
  riichiWinningSeatHands: number
  showdowns: number
  uncontested: number
  winningRankPoints: number
  winningHands: Record<string, number>
  finalScores: CountTotal
  winningFinalScores: CountTotal
  finalScoreSpreads: CountTotal
  joker: ConditionalWins
  blank: ConditionalWins
  tiles: Record<string, StudTileBalance>
}

export interface Stud7BalanceOptions extends StudSimulationOptions {
  games: number
  profile: string
  seedPrefix: string
}

export function analyzeStud7Balance(options: Stud7BalanceOptions): Stud7BalanceRaw {
  const raw = createStud7BalanceRaw(options)

  for (let game = 0; game < options.games; game += 1) {
    raw.gamesAttempted += 1

    try {
      const { engine } = playStud7({
        ...options,
        seed: `${options.seedPrefix}-${game}`,
        collectDecisions: false,
      })
      addCompletedGame(raw, engine.state, engine.events)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      raw.failedGames[message] = (raw.failedGames[message] ?? 0) + 1
    }
  }

  return raw
}

export function mergeStud7Balance(parts: readonly Stud7BalanceRaw[]): Stud7BalanceRaw {
  const first = parts[0]

  if (!first) {
    throw new Error("At least one Stud7 balance result is required")
  }

  const merged = structuredClone(first)

  for (const part of parts.slice(1)) {
    assertCompatible(merged, part)
    merged.gamesAttempted += part.gamesAttempted
    merged.gamesCompleted += part.gamesCompleted
    merged.hands += part.hands
    merged.seatHands += part.seatHands
    addCountTotal(merged.initialPots, part.initialPots)
    addCountTotal(merged.pots, part.pots)
    merged.loansTaken += part.loansTaken
    merged.endingLoans += part.endingLoans
    merged.playersTakingLoans += part.playersTakingLoans
    merged.endingBlueSticks += part.endingBlueSticks
    merged.riichiDeclarations += part.riichiDeclarations
    merged.riichiSeatHands += part.riichiSeatHands
    merged.riichiWinningSeatHands += part.riichiWinningSeatHands
    merged.showdowns += part.showdowns
    merged.uncontested += part.uncontested
    merged.winningRankPoints += part.winningRankPoints
    addCountTotal(merged.finalScores, part.finalScores)
    addCountTotal(merged.winningFinalScores, part.winningFinalScores)
    addCountTotal(merged.finalScoreSpreads, part.finalScoreSpreads)
    addConditionalWins(merged.joker, part.joker)
    addConditionalWins(merged.blank, part.blank)

    for (const action of ACTION_TYPES) {
      merged.actions[action] += part.actions[action]
    }

    for (const [key, value] of Object.entries(part.failedGames)) {
      merged.failedGames[key] = (merged.failedGames[key] ?? 0) + value
    }

    for (const [orbit, value] of Object.entries(part.initialPotsByOrbit)) {
      const target = (merged.initialPotsByOrbit[orbit] ??= { count: 0, total: 0 })
      addCountTotal(target, value)
    }

    for (const [hand, count] of Object.entries(part.winningHands)) {
      merged.winningHands[hand] = (merged.winningHands[hand] ?? 0) + count
    }

    for (const [key, tile] of Object.entries(part.tiles)) {
      const target = (merged.tiles[key] ??= {
        key,
        label: tile.label,
        appearances: 0,
        wins: 0,
        winShares: 0,
      })
      addConditionalWins(target, tile)
    }
  }

  merged.seedPrefix = parts.map(({ seedPrefix }) => seedPrefix).join(",")

  return merged
}

function createStud7BalanceRaw(options: Stud7BalanceOptions): Stud7BalanceRaw {
  return {
    schemaVersion: 1,
    profile: options.profile,
    rules: {
      foldBlueSticks: options.foldBlueSticks ?? 2,
      riichiDrawMode: options.riichiDrawMode ?? "discard-drawn",
    },
    seedPrefix: options.seedPrefix,
    heuristicSamples: options.heuristicSamples ?? 1,
    fastMode: options.fastMode ?? false,
    gamesAttempted: 0,
    gamesCompleted: 0,
    failedGames: {},
    hands: 0,
    seatHands: 0,
    initialPots: { count: 0, total: 0 },
    initialPotsByOrbit: {},
    pots: { count: 0, total: 0 },
    loansTaken: 0,
    endingLoans: 0,
    playersTakingLoans: 0,
    endingBlueSticks: 0,
    actions: { check: 0, call: 0, bet: 0, raise: 0, fold: 0 },
    riichiDeclarations: 0,
    riichiSeatHands: 0,
    riichiWinningSeatHands: 0,
    showdowns: 0,
    uncontested: 0,
    winningRankPoints: 0,
    winningHands: {},
    finalScores: { count: 0, total: 0 },
    winningFinalScores: { count: 0, total: 0 },
    finalScoreSpreads: { count: 0, total: 0 },
    joker: { appearances: 0, wins: 0, winShares: 0 },
    blank: { appearances: 0, wins: 0, winShares: 0 },
    tiles: {},
  }
}

function addCompletedGame(
  raw: Stud7BalanceRaw,
  state: StudGameState,
  events: ReturnType<typeof playStud7>["engine"]["events"],
): void {
  raw.gamesCompleted += 1
  const loanPlayers = new Set<string>()

  for (const event of events) {
    if (event.type === "hand-started") {
      const initialPot = numericProperty(event.payload, "initialPot")

      if (initialPot !== null) {
        raw.initialPots.count += 1
        raw.initialPots.total += initialPot
        const orbit = String(orbitFor(event.handNumber, state.config.playerCount))
        const byOrbit = (raw.initialPotsByOrbit[orbit] ??= { count: 0, total: 0 })
        byOrbit.count += 1
        byOrbit.total += initialPot
      }
    } else if (event.type === "loan-taken") {
      raw.loansTaken += 1

      if (event.actorId) {
        loanPlayers.add(event.actorId)
      }
    } else if (event.type === "betting-action") {
      const action = objectProperty(event.payload, "action") as BettingAction | null

      if (action && ACTION_TYPES.includes(action.type)) {
        raw.actions[action.type] += 1

        if ((action.type === "bet" || action.type === "raise") && action.riichi) {
          raw.riichiDeclarations += 1
        }
      }
    }
  }

  raw.playersTakingLoans += loanPlayers.size
  raw.endingLoans += state.players.reduce((total, player) => total + player.loans, 0)
  raw.endingBlueSticks += state.players.reduce((total, player) => total + player.blueSticks, 0)
  const finalScores = Object.values(state.finalScores ?? {})

  for (const score of finalScores) {
    raw.finalScores.count += 1
    raw.finalScores.total += score
  }

  if (finalScores.length > 0) {
    raw.winningFinalScores.count += 1
    raw.winningFinalScores.total += Math.max(...finalScores)
    raw.finalScoreSpreads.count += 1
    raw.finalScoreSpreads.total += Math.max(...finalScores) - Math.min(...finalScores)
  }

  for (const hand of state.handResults) {
    raw.hands += 1
    raw.seatHands += hand.players.length
    raw.pots.count += 1
    raw.pots.total += hand.pot
    raw[hand.reason === "showdown" ? "showdowns" : "uncontested"] += 1
    const winner = hand.players.find((player) => hand.winnerIds.includes(player.playerId))

    if (winner) {
      raw.winningRankPoints += winner.score.total
      const label = winner.score.combinations[0]?.label ?? "High Card"
      const key = `${winner.score.total}:${label}`
      raw.winningHands[key] = (raw.winningHands[key] ?? 0) + 1
    }

    for (const player of hand.players) {
      const won = hand.winnerIds.includes(player.playerId)
      const winShare = won ? 1 / hand.winnerIds.length : 0
      const cards = [...player.publicCards, ...player.privateCards]

      if (player.riichi) {
        raw.riichiSeatHands += 1

        if (won) {
          raw.riichiWinningSeatHands += 1
        }
      }

      addSpecial(
        raw.joker,
        cards.some((card) => card.kind === "joker"),
        won,
        winShare,
      )
      addSpecial(
        raw.blank,
        cards.some((card) => card.kind === "blank"),
        won,
        winShare,
      )
      const uniqueFaces = new Map(cards.map((card) => [faceKey(card), card]))

      for (const [key, card] of uniqueFaces) {
        const tile = (raw.tiles[key] ??= createTileBalance(key, card))
        tile.appearances += 1
        tile.wins += Number(won)
        tile.winShares += winShare
      }
    }
  }
}

function createTileBalance(key: string, card: Card): StudTileBalance {
  return { key, label: cardLabel(card), appearances: 0, wins: 0, winShares: 0 }
}

function addSpecial(
  target: ConditionalWins,
  appears: boolean,
  won: boolean,
  winShare: number,
): void {
  if (!appears) {
    return
  }

  target.appearances += 1
  target.wins += Number(won)
  target.winShares += winShare
}

function addCountTotal(target: CountTotal, source: CountTotal): void {
  target.count += source.count
  target.total += source.total
}

function addConditionalWins(target: ConditionalWins, source: ConditionalWins): void {
  target.appearances += source.appearances
  target.wins += source.wins
  target.winShares += source.winShares
}

function numericProperty(value: unknown, property: string): number | null {
  const found = objectProperty(value, property)

  return typeof found === "number" ? found : null
}

function objectProperty(value: unknown, property: string): unknown {
  return typeof value === "object" && value !== null && property in value
    ? (value as Record<string, unknown>)[property]
    : null
}

function assertCompatible(left: Stud7BalanceRaw, right: Stud7BalanceRaw): void {
  if (
    left.profile !== right.profile ||
    JSON.stringify(left.rules) !== JSON.stringify(right.rules) ||
    left.heuristicSamples !== right.heuristicSamples ||
    left.fastMode !== right.fastMode
  ) {
    throw new Error("Cannot merge incompatible Stud7 balance results")
  }
}
