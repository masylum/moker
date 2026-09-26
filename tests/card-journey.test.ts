import { describe, expect, it } from "vitest"
import { cardJourney, DRAW_TIMING, DISCARD_TIMING } from "../src/client/card-journey"

const table = { x: 10, y: 200 }
const hand = { x: 100, y: 20 }
const easing = "cubic-bezier(0.23, 1, 0.32, 1)"

describe("opponent card journey", () => {
  it("eases the draw while preserving the full pause over the hand", () => {
    const { keyframes, options } = cardJourney(table, hand, DRAW_TIMING, easing)
    expect(options.duration).toBe(1700)
    expect(options.easing).toBe("linear")
    expect(keyframes[0]!.easing).toBe(easing)
    expect(Number(keyframes[1]!.offset) * options.duration).toBe(300)
    expect(keyframes[1]!.transform).toBe(keyframes[2]!.transform)
    expect(keyframes[2]!.offset).toBe(1)
  })

  it("holds the discard before easing its trip back to the table", () => {
    const { keyframes, options } = cardJourney(hand, table, DISCARD_TIMING, easing)
    expect(options.duration).toBe(900)
    expect(options.easing).toBe("linear")
    expect(keyframes[0]!.transform).toBe(keyframes[1]!.transform)
    expect(Number(keyframes[1]!.offset) * options.duration).toBe(450)
    expect(keyframes[1]!.easing).toBe(easing)
    expect(Number(keyframes[2]!.offset) * options.duration).toBe(800)
    expect(keyframes[2]!.transform).toBe(keyframes[3]!.transform)
  })

  it("can stay stationary for reduced motion without skipping the observation time", () => {
    for (const timing of [DRAW_TIMING, DISCARD_TIMING]) {
      const { keyframes, options } = cardJourney(hand, hand, timing, easing)
      expect(new Set(keyframes.map((frame) => frame.transform)).size).toBe(1)
      expect(options.duration).toBe(timing.before + timing.travel + timing.after)
    }
  })
})
