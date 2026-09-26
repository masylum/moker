export type Sound = "click2" | "clack" | "tiles" | "shake" | "coin2" | "won" | "lost" | "gong"
type Scene = "home" | "game"
const TRACKS = { home: [0, 352.052], game: [354, 706.052] } as const

export function createGameAudio() {
  const read = (key: string) => {
    try {
      return localStorage.getItem(`moker-${key}`) !== "off"
    } catch {
      return true
    }
  }
  let musicEnabled = read("music")
  let effectsEnabled = read("effects")
  let scene: Scene = "home"
  let unlocked = false
  let disposed = false
  let music: HTMLAudioElement | undefined
  let fade: ReturnType<typeof setInterval> | undefined
  const effects = new Map<Sound, HTMLAudioElement>()
  const save = (key: string, enabled: boolean) => {
    try {
      localStorage.setItem(`moker-${key}`, enabled ? "on" : "off")
    } catch {
      /* Private browsing can deny storage. */
    }
  }
  function stopMusic() {
    clearInterval(fade)
    music?.pause()
  }
  function syncMusic() {
    if (!unlocked || !musicEnabled || document.hidden || disposed) {
      stopMusic()
      return
    }
    if (!music) {
      music = new Audio("/assets/whatajong/audio/music.mp3")
      music.preload = "metadata"
      const seek = () => {
        const [start, end] = TRACKS[scene]
        if (music && (music.currentTime < start || music.currentTime >= end))
          music.currentTime = start
      }
      music.addEventListener("loadedmetadata", seek)
      music.addEventListener("timeupdate", seek)
      music.addEventListener("ended", () => {
        seek()
        syncMusic()
      })
    }
    if (!music.paused) return
    music.volume = 0
    void music
      .play()
      .then(() => {
        if (disposed || !musicEnabled || document.hidden) {
          stopMusic()
          return
        }
        clearInterval(fade)
        fade = setInterval(() => {
          if (!music) return
          music.volume = Math.min(0.16, music.volume + 0.008)
          if (music.volume >= 0.16) clearInterval(fade)
        }, 50)
      })
      .catch(() => {
        /* Browsers may defer audio until another interaction. */
      })
  }
  function unlock() {
    unlocked = true
    syncMusic()
  }
  function visibility() {
    if (document.hidden) effects.forEach((audio) => audio.pause())
    syncMusic()
  }
  function gesture(event: Event) {
    if (event.target instanceof Element && event.target.closest("[data-audio-control]")) return
    unlock()
  }
  document.addEventListener("pointerdown", gesture)
  document.addEventListener("keydown", gesture)
  document.addEventListener("visibilitychange", visibility)
  return {
    musicEnabled: () => musicEnabled,
    effectsEnabled: () => effectsEnabled,
    setMusic(enabled: boolean) {
      musicEnabled = enabled
      save("music", enabled)
      unlock()
    },
    setEffects(enabled: boolean) {
      effectsEnabled = enabled
      save("effects", enabled)
      if (!enabled) effects.forEach((audio) => audio.pause())
      unlock()
    },
    setScene(next: Scene) {
      if (next === scene) return
      scene = next
      if (music) {
        stopMusic()
        music.currentTime = TRACKS[scene][0]
      }
      syncMusic()
    },
    play(sound: Sound) {
      if (!effectsEnabled || !unlocked || document.hidden || disposed) return
      let audio = effects.get(sound)
      if (!audio) {
        audio = new Audio(`/assets/whatajong/audio/${sound}.mp3`)
        audio.volume = sound === "won" || sound === "lost" || sound === "gong" ? 0.22 : 0.35
        effects.set(sound, audio)
      }
      audio.currentTime = 0
      void audio.play().catch(() => {})
    },
    dispose() {
      disposed = true
      stopMusic()
      effects.forEach((audio) => audio.pause())
      document.removeEventListener("pointerdown", gesture)
      document.removeEventListener("keydown", gesture)
      document.removeEventListener("visibilitychange", visibility)
    },
  }
}
