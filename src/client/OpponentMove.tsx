import { createSignal, onCleanup, onMount } from "solid-js"
import type { CardSource, PublicGameState } from "../game/types"
import { cardLabel } from "../game/cards"
import { cardAsset } from "./assets"
import { cardJourney, DRAW_TIMING, DISCARD_TIMING, type Point } from "./card-journey"

export type DrawNotice = NonNullable<PublicGameState["publicDrawDiscards"]>[number] & {
  name: string
  origin?: Point
}
// Use table-local geometry so the moving card inherits the same perspective
// as the deck, lanes and seats throughout its journey.
function center(element: Element | null): Point | undefined {
  if (!(element instanceof HTMLElement)) return undefined
  const table = element.closest<HTMLElement>(".play-layout")
  if (!table) return undefined
  let x = element.offsetWidth / 2 - 48
  let y = element.offsetHeight / 2 - 64
  let node: HTMLElement | null = element
  while (node && node !== table) {
    x += node.offsetLeft
    y += node.offsetTop
    node = node.offsetParent as HTMLElement | null
  }
  return node === table ? { x, y } : undefined
}
export function sourcePosition(source: CardSource | "blank-exchange") {
  if (source === "deck") return center(document.querySelector(".deck"))
  const cards = document.querySelectorAll(
    `[data-lane="${source === "discard-b" ? "b" : "a"}"] .playing-card`,
  )
  return center(cards.item(cards.length - 1))
}

export function OpponentMove(props: {
  notice: DrawNotice
  onDone: () => void
  onSound: (sound: "shake" | "clack") => void
}) {
  const [discarding, setDiscarding] = createSignal(false)
  let element!: HTMLDivElement
  let animation: Animation | undefined
  const source = () =>
    props.notice.source === "deck"
      ? "the deck"
      : props.notice.source === "discard-b"
        ? "Lane B"
        : props.notice.source === "discard-a"
          ? "Lane A"
          : "a blank exchange"
  const card = () => (discarding() ? props.notice.discardedCard : props.notice.drawnCard)
  onMount(() => {
    const seat = center(
      document.querySelector(
        `[data-player-id="${CSS.escape(props.notice.playerId)}"] .opponent-cards`,
      ),
    )
    const target = center(
      document.querySelector(
        `[data-lane="${props.notice.discardPile}"] [data-motion-key="card-${CSS.escape(props.notice.discardedCard.id)}"]`,
      ),
    )
    const destination =
      target ?? center(document.querySelector(`[data-lane="${props.notice.discardPile}"]`))
    if (!seat || !destination) {
      props.onDone()
      return
    }
    props.onSound("shake")
    const origin = props.notice.origin ?? destination
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    const easing = getComputedStyle(document.documentElement).getPropertyValue("--ease-out").trim()
    const draw = cardJourney(reduced ? seat : origin, seat, DRAW_TIMING, easing)
    animation = element.animate(draw.keyframes, draw.options)
    animation.onfinish = () => {
      setDiscarding(true)
      animation?.cancel()
      const discard = cardJourney(seat, reduced ? seat : destination, DISCARD_TIMING, easing)
      animation = element.animate(discard.keyframes, discard.options)
      animation.onfinish = () => {
        props.onSound("clack")
        props.onDone()
      }
    }
  })
  onCleanup(() => animation?.cancel())
  return (
    <div
      ref={(node) => {
        element = node
      }}
      class="opponent-card-journey"
      role="status"
    >
      <img
        class="playing-card"
        src={card() ? cardAsset(card()!) : "/assets/cards/back.png"}
        alt={card() ? cardLabel(card()!) : "Hidden deck card"}
      />
      <span class="sr-only">
        {props.notice.name}{" "}
        {discarding()
          ? `discards ${cardLabel(props.notice.discardedCard)} to Lane ${props.notice.discardPile.toUpperCase()}`
          : `draws ${props.notice.drawnCard ? cardLabel(props.notice.drawnCard) : "a hidden card"} from ${source()}`}
      </span>
    </div>
  )
}
