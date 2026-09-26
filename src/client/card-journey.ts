export type Point = { x: number; y: number }

export const DRAW_TIMING = { before: 0, travel: 300, after: 1400 }
export const DISCARD_TIMING = { before: 450, travel: 350, after: 100 }

// Ease only the travel segment; pauses must keep their actual duration.
export function cardJourney(from: Point, to: Point, timing: typeof DRAW_TIMING, easing: string) {
  const duration = timing.before + timing.travel + timing.after
  const transform = (point: Point) => `translate(${point.x}px, ${point.y}px)`
  const keyframes: Keyframe[] = []
  if (timing.before > 0) keyframes.push({ transform: transform(from), offset: 0 })
  keyframes.push(
    { transform: transform(from), offset: timing.before / duration, easing },
    { transform: transform(to), offset: (timing.before + timing.travel) / duration },
  )
  if (timing.after > 0) keyframes.push({ transform: transform(to), offset: 1 })
  return {
    keyframes,
    options: { duration, fill: "forwards", easing: "linear" } satisfies KeyframeAnimationOptions,
  }
}
