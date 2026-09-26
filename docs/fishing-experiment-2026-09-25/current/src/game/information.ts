import type { Card, GameState } from "./types"

export function publicKnownPrivateCards(
  state: GameState,
  observerId?: string,
): Record<string, Card[]> {
  const knownByPlayer = new Map(
    state.players.map((player) => [player.id, new Map<string, Card>()] as const),
  )

  if (observerId) {
    for (const record of state.charlestonHistory.filter(
      (candidate) => candidate.fromPlayerId === observerId,
    )) {
      const known = knownByPlayer.get(record.toPlayerId)
      for (const card of record.cards) known?.set(card.id, structuredClone(card))
    }
  }

  for (const record of state.exposureHistory) {
    knownByPlayer.get(record.playerId)?.delete(record.card.id)
  }

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
