import type { Card, GameState } from "./types"

export function publicKnownPrivateCards(state: GameState): Record<string, Card[]> {
  const knownByPlayer = new Map(
    state.players.map((player) => [player.id, new Map<string, Card>()] as const),
  )

  for (const record of state.drawDiscardHistory) {
    const known = knownByPlayer.get(record.playerId)

    if (!known) {
      continue
    }

    known.delete(record.discardedCard.id)

    if (record.source !== "deck" && record.drawnCard.id !== record.discardedCard.id) {
      known.set(record.drawnCard.id, structuredClone(record.drawnCard))
    }
  }

  return Object.fromEntries(
    [...knownByPlayer].map(([playerId, cards]) => [playerId, [...cards.values()]]),
  )
}
