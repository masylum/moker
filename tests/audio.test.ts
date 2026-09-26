import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { createGameAudio } from "../src/client/audio"

class FakeAudio extends EventTarget {
  static instances: FakeAudio[] = []
  paused = true
  volume = 1
  currentTime = 0
  preload = ""
  constructor(public src: string) {
    super()
    FakeAudio.instances.push(this)
  }
  play = vi.fn<() => Promise<void>>(async () => {
    this.paused = false
  })
  pause = vi.fn<() => void>(() => {
    this.paused = true
  })
}
let page: EventTarget & { hidden: boolean }
let audio: ReturnType<typeof createGameAudio>
beforeEach(() => {
  vi.useFakeTimers()
  FakeAudio.instances = []
  page = Object.assign(new EventTarget(), { hidden: false })
  const stored = new Map<string, string>()
  vi.stubGlobal("document", page)
  vi.stubGlobal(
    "Element",
    class {
      closest() {
        return null
      }
    },
  )
  vi.stubGlobal("Audio", FakeAudio)
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => stored.get(key),
    setItem: (key: string, value: string) => stored.set(key, value),
  })
  audio = createGameAudio()
})
afterEach(() => {
  audio.dispose()
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe("game audio", () => {
  it("waits for interaction, loops only the selected sprite and fades to a quiet volume", async () => {
    audio.play("tiles")
    expect(FakeAudio.instances).toHaveLength(0)
    page.dispatchEvent(new Event("pointerdown"))
    await Promise.resolve()
    await vi.advanceTimersByTimeAsync(1200)
    const music = FakeAudio.instances[0]!
    expect(music.volume).toBe(0.16)
    music.currentTime = 353
    music.dispatchEvent(new Event("timeupdate"))
    expect(music.currentTime).toBe(0)
    audio.setScene("game")
    expect(music.currentTime).toBe(354)
    music.currentTime = 707
    music.dispatchEvent(new Event("timeupdate"))
    expect(music.currentTime).toBe(354)
  })
  it("mutes music and effects independently and remembers preferences", () => {
    page.dispatchEvent(new Event("pointerdown"))
    audio.setMusic(false)
    audio.play("clack")
    expect(FakeAudio.instances[0]!.paused).toBe(true)
    const effect = FakeAudio.instances[1]!
    expect(effect.paused).toBe(false)
    audio.setEffects(false)
    expect(effect.paused).toBe(true)
    audio.play("clack")
    expect(effect.play).toHaveBeenCalledTimes(1)
    audio.dispose()
    audio = createGameAudio()
    expect(audio.musicEnabled()).toBe(false)
    expect(audio.effectsEnabled()).toBe(false)
  })
  it("suspends hidden tabs and removes listeners on cleanup", () => {
    page.dispatchEvent(new Event("pointerdown"))
    audio.play("tiles")
    page.hidden = true
    page.dispatchEvent(new Event("visibilitychange"))
    expect(FakeAudio.instances.every((item) => item.paused)).toBe(true)
    audio.play("coin2")
    expect(FakeAudio.instances).toHaveLength(2)
    page.hidden = false
    page.dispatchEvent(new Event("visibilitychange"))
    expect(FakeAudio.instances[0]!.paused).toBe(false)
    audio.dispose()
    page.dispatchEvent(new Event("pointerdown"))
    expect(FakeAudio.instances[0]!.paused).toBe(true)
  })
})
