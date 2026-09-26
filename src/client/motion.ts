// Animate actual game changes, not Solid's replacement of server response objects.
// No cloned cards: hidden information never persists in a departing animation.
const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches

type Snapshot = Map<string, { x: number; y: number; value: string }>

function elements(root?: HTMLElement) {
  return Array.from(root?.querySelectorAll<HTMLElement>("[data-motion-key]") ?? []).filter(
    (element) => !element.closest("dialog"),
  )
}

export function createTableMotion(root: () => HTMLElement | undefined) {
  const running = new Set<Animation>()
  let frame = 0
  const preference = window.matchMedia("(prefers-reduced-motion: reduce)")
  function cancel() {
    cancelAnimationFrame(frame)
    running.forEach((animation) => animation.cancel())
    running.clear()
  }
  preference.addEventListener("change", cancel)
  function inputMode(event: Event) {
    document.documentElement.dataset.motionInput = event.type === "keydown" ? "keyboard" : "pointer"
  }
  document.addEventListener("keydown", inputMode)
  document.addEventListener("pointerdown", inputMode)
  function capture(): Snapshot {
    const snapshot: Snapshot = new Map()
    for (const element of elements(root())) {
      const rect = element.getBoundingClientRect()
      snapshot.set(element.dataset.motionKey!, {
        x: rect.x,
        y: rect.y,
        value:
          element.dataset.motionValue ??
          (element.matches("img")
            ? String(Boolean(element.closest(".is-public")))
            : (element.textContent ?? "")),
      })
    }
    return snapshot
  }
  return {
    capture,
    play(before: Snapshot, deal = false) {
      cancel()
      if (
        reducedMotion() ||
        document.hidden ||
        document.documentElement.dataset.motionInput === "keyboard"
      )
        return
      frame = requestAnimationFrame(() => {
        // CSS and Web Animations share the same motion tokens.
        const tokens = getComputedStyle(document.documentElement)
        const easing = tokens.getPropertyValue("--ease-out").trim()
        const standardDuration = parseFloat(tokens.getPropertyValue("--duration-standard"))
        const fastDuration = parseFloat(tokens.getPropertyValue("--duration-fast"))
        // Read geometry together before starting any animations.
        const after = capture()
        let cardIndex = 0
        for (const element of elements(root())) {
          const key = element.dataset.motionKey!
          const previous = deal ? undefined : before.get(key)
          const next = after.get(key)!
          const card = element.matches("img")
          const changed = previous && previous.value !== next.value
          const moved =
            previous &&
            card &&
            (Math.abs(previous.x - next.x) > 2 || Math.abs(previous.y - next.y) > 2)
          if (previous && !changed && !moved) continue
          if (!card && !changed && !element.classList.contains("seat-wager")) continue
          const clamp = (n: number) => Math.max(-32, Math.min(32, n))
          const transform = card
            ? previous && moved
              ? `translate(${clamp(previous.x - next.x)}px, ${clamp(previous.y - next.y)}px)`
              : "translateY(-10px) scale(0.97)"
            : "scale(0.97)"
          const opacity = Number(getComputedStyle(element).opacity)
          const animation = element.animate(
            [
              { opacity: previous ? 0.65 : 0, transform },
              { opacity, transform: "none" },
            ],
            {
              duration: card ? standardDuration : fastDuration,
              delay: deal && card ? (cardIndex++ % 7) * 10 : 0,
              easing,
              fill: "backwards",
            },
          )
          running.add(animation)
          animation.onfinish = () => running.delete(animation)
        }
      })
    },
    dispose() {
      cancel()
      preference.removeEventListener("change", cancel)
      document.removeEventListener("keydown", inputMode)
      document.removeEventListener("pointerdown", inputMode)
    },
  }
}
