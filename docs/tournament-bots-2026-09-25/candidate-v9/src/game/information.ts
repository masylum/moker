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

  // Exposure happens after earlier lane draws. Remove public cards last so
  // replaying the draw history cannot reintroduce the same physical card as
  // a known concealed card (and manufacture pairs or Twin Lotus).
  for (const player of state.players) {
    for (const card of player.publicCards) knownByPlayer.get(player.id)?.delete(card.id)
  }

  return Object.fromEntries(
    [...knownByPlayer].map(([playerId, cards]) => [playerId, [...cards.values()]]),
  )
}
