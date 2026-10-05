import {
  For,
  Show,
  createEffect,
  createMemo,
  createSignal,
  onCleanup,
  onMount,
  type JSX,
} from "solid-js"
import { OpponentMove, type DrawNotice, sourcePosition } from "./OpponentMove"
import { createGameAudio } from "./audio"
import { knownHand } from "./known-hand"
import { SpiritAvatar } from "./SpiritAvatar"
import { RiichiSticks, RiichiDeclared } from "./RiichiSticks"
import { cardLabel, compareCards } from "../game/cards"
import {
  canTakeLoan,
  CHIP_UNIT,
  LOAN_VALUE,
  LOAN_PENALTY,
  CHARLESTON_PASS_COUNT,
  revealCounts,
  streetCount,
} from "../game/rules"
import { scoreHand } from "../game/scoring"
import type {
  BettingAction,
  Card,
  CardSource,
  PublicGameState,
  PublicPlayerState,
} from "../game/types"
import {
  bettingAction,
  botStep,
  createGame,
  gameAction as sendGameAction,
  loadRoom,
  joinRoom,
  type SeatKind,
} from "./api"
import { cardAsset } from "./assets"
import { createTableMotion } from "./motion"
import { readSetup, saveSetup } from "./setup-preferences"
import { RulesContent } from "./RulesContent"
import { Button } from "./Button"
import { sortHand } from "./sort-hand"
import { handExamples } from "./hand-examples"

const BASIC_LADDER = [
  ["High Card", "One card"],
  ["Eyes", "Two identical cards"],
  ["Chow", "Three consecutive, one suit"],
  ["Two Eyes", "Two pairs"],
  ["Chow and Eyes", "A Chow + a pair"],
  ["Three Winds", "Three different Winds"],
  ["Pung", "Three identical cards"],
  ["Three Dragons", "One of each Dragon"],
  ["Four Winds", "One of each Wind"],
]
const ADVANCED_LADDER = [
  ...BASIC_LADDER.slice(0, 5),
  BASIC_LADDER[6]!,
  BASIC_LADDER[5]!,
  ["Pung and Eyes", "A Pung + a pair"],
  BASIC_LADDER[7]!,
  ["Twin Lotus", "Both Lotuses"],
  ["Long Chow", "Five consecutive cards of the same suit"],
  ["Three Dragons and Eyes", "Three Dragons + a pair"],
  BASIC_LADDER[8]!,
  ["Kong", "Four identical cards"],
]

const STREAMLINED_LADDER = [
  ["High Card", "One card"],
  ["Eyes", "Two identical cards"],
  ["Chow", "Three consecutive, one suit"],
  ["Two Eyes", "Two pairs"],
  ["Three Winds", "Three different Winds"],
  ["Pung", "Three identical cards"],
  ["Long Chow", "Four consecutive cards of one suit"],
  ["Three Dragons", "One of each Dragon"],
  ["Four Winds", "One of each Wind"],
  ["Kong", "Four identical cards"],
]

const format = (amount: number) =>
  new Intl.NumberFormat("en", { maximumFractionDigits: 2 }).format(amount)

export function App() {
  const audio = createGameAudio()
  onCleanup(() => audio.dispose())
  const [musicOn, setMusicOn] = createSignal(audio.musicEnabled())
  const [effectsOn, setEffectsOn] = createSignal(audio.effectsEnabled())
  const [session, setSession] = createSignal(localStorage.getItem("moker-v9-session") ?? "")
  const [state, setState] = createSignal<PublicGameState>()
  const savedName = localStorage.getItem("moker-name")?.trim()
  const [name, setName] = createSignal(
    savedName && !/^Player(?: \d+)?$/.test(savedName) ? savedName : "Aki",
  )
  const [invite, setInvite] = createSignal(
    window.location.pathname.match(/^\/rooms\/([0-7][0-9A-HJKMNP-TV-Z]{25})$/)?.[1] ?? "",
  )
  const [roomPreview, setRoomPreview] = createSignal<PublicGameState>()
  const [loadingRoom, setLoadingRoom] = createSignal(Boolean(invite()))
  const [copied, setCopied] = createSignal(false)
  const room = () => state()?.room
  const waiting = () => (room()?.waitingPlayerIds.length ?? 0) > 0
  const showInvite = () => waiting() && !!viewer() && viewer() === room()?.hostId
  const canDeal = () => !room() || (!!viewer() && viewer() === room()?.hostId)
  const roomUrl = () => `${window.location.origin}/rooms/${session()}`
  function saveName() {
    const value = name().trim() || "Aki"
    setName(value)
    localStorage.setItem("moker-name", value)
    return value
  }
  function leaveTable() {
    setState(undefined)
    setViewer(undefined)
    setAuto(false)
    setInvite("")
    setRoomPreview(undefined)
    window.history.pushState(null, "", "/")
  }
  async function copyRoom() {
    try {
      await navigator.clipboard.writeText(roomUrl())
      setCopied(true)
    } catch {
      setError("Copy the room link shown above to invite your friends.")
    }
  }
  function gameAction(id: string, action: Record<string, unknown>) {
    return sendGameAction(id, action, room() ? state()!.version : undefined)
  }
  const [loanNotice, setLoanNotice] = createSignal<string[]>([])
  const [spentSticks, setSpentSticks] = createSignal<string[]>([])
  let spentTimer: ReturnType<typeof setTimeout> | undefined
  onCleanup(() => clearTimeout(spentTimer))
  const [drawNotice, setDrawNotice] = createSignal<DrawNotice>()
  let pendingMoves: DrawNotice[] = []
  const finishOpponentMove = () => setDrawNotice(pendingMoves.shift())
  let tableSurface: HTMLDivElement | undefined
  const motion = createTableMotion(() => tableSurface)
  onCleanup(() => motion.dispose())
  function updateState(next: PublicGameState) {
    const previous = state()
    if (previous?.room && next.room && next.version < previous.version) return
    if (
      !previous ||
      previous.gameNumber !== next.gameNumber ||
      previous.handNumber !== next.handNumber
    )
      setResultStage("round")
    pendingMoves = []
    setDrawNotice(undefined)
    if (previous && previous.handNumber === next.handNumber) {
      pendingMoves = (next.publicDrawDiscards ?? [])
        .slice(previous.publicDrawDiscards?.length ?? 0)
        .filter((record) => record.playerId !== viewer())
        .map((record) => ({
          ...record,
          origin: sourcePosition(record.source),
          name: next.players.find((p) => p.id === record.playerId)?.name ?? "Opponent",
        }))
    }
    const borrowers = next.players.filter(
      (p) =>
        p.loans >
        (previous?.gameNumber === next.gameNumber
          ? (previous.players.find((old) => old.id === p.id)?.loans ?? 0)
          : 0),
    )
    if (borrowers.length) setLoanNotice(borrowers.map((p) => p.name))
    const before = motion.capture()
    const deal = !state() || state()?.handNumber !== next.handNumber
    const spent = previous
      ? next.players
          .filter(
            (p) =>
              p.riichiSticks < (previous.players.find((old) => old.id === p.id)?.riichiSticks ?? 0),
          )
          .map((p) => p.id)
      : []
    if (spent.length) {
      clearTimeout(spentTimer)
      setSpentSticks(spent)
      spentTimer = setTimeout(() => setSpentSticks([]), 800)
    }
    setState(next)
    setDrawNotice(pendingMoves.shift())
    motion.play(before, deal)
    if (deal) audio.play("tiles")
    else if (next.pot > (previous?.pot ?? 0)) audio.play("coin2")
    else if (previous?.phase === "exposing" && next.phase !== "exposing") audio.play("clack")
    else if (
      (next.publicDrawDiscards?.length ?? 0) > (previous?.publicDrawDiscards?.length ?? 0) &&
      !drawNotice()
    )
      audio.play("clack")
    else if (previous?.phase === "betting" && next.phase === "discarding") audio.play("shake")
  }
  const setup = readSetup()
  const [mode, setMode] = createSignal<"basic" | "riichi" | "streamlined">(setup.mode)
  const [seats, setSeats] = createSignal<SeatKind[]>(setup.seats)
  const players = () => seats().filter((seat) => seat !== "none").length
  const humans = () => seats().filter((seat) => seat === "human").length
  const validSeats = () => players() >= 2 && humans() >= 1
  function cycleSeat(index: number) {
    const next: Record<SeatKind, SeatKind> = { human: "none", robot: "human", none: "robot" }
    setSeats((current) => current.map((seat, i) => (i === index ? next[seat] : seat)))
  }
  const [viewer, setViewer] = createSignal<string>()
  createEffect(() => audio.setScene(state() ? "game" : "home"))
  let soundedResult = ""
  createEffect(() => {
    const game = state()
    if (!game || drawNotice() || !["between-hands", "finished"].includes(game.phase)) return
    const result = game.handResults.at(-1)
    const key = `${session()}:${result?.handNumber}`
    if (!result || key === soundedResult) return
    soundedResult = key
    audio.play(result.winnerIds.includes(viewer() ?? "p1") ? "won" : "lost")
  })
  const [tournamentGames, setTournamentGames] = createSignal(setup.games)
  createEffect(() => saveSetup({ mode: mode(), seats: seats(), games: tournamentGames() }))
  const [seed] = createSignal(crypto.randomUUID().slice(0, 8))
  const [busy, setBusy] = createSignal(false)
  const [error, setError] = createSignal("")
  const [selection, setSelection] = createSignal<string[]>([])
  const [wager, setWager] = createSignal(10)
  const [auto, setAuto] = createSignal(true)
  const [acceptedCharleston, setAcceptedCharleston] = createSignal<string[]>([])
  const charlestonReceiptKey = () => `${session()}:${state()?.handNumber}:${viewer()}`
  const receivedCharleston = createMemo(() => {
    const game = state()
    if (
      !viewer() ||
      !game ||
      game.phase !== "betting" ||
      game.street !== 1 ||
      acceptedCharleston().includes(charlestonReceiptKey())
    )
      return []
    return game.charlestonReceivedCards ?? []
  })
  const acceptCharleston = () => setAcceptedCharleston((keys) => [...keys, charlestonReceiptKey()])
  const [rules, setRules] = createSignal(false)
  const [closedResult, setClosedResult] = createSignal("")
  const [resultStage, setResultStage] = createSignal<"round" | "game" | "tournament">("round")
  const [scoresOpen, setScoresOpen] = createSignal(false)
  const [ladderOpen, setLadderOpen] = createSignal(false)
  const [blankPick, setBlankPick] = createSignal<string>()
  const [pickingFish, setPickingFish] = createSignal(false)
  const [pickingStick, setPickingStick] = createSignal(false)
  let fishingTable: HTMLDivElement | undefined
  const [actionDialog, setActionDialog] = createSignal<"check" | "call" | "bet">()
  const human = createMemo(() => state()?.players.find((p) => p.id === viewer()))
  const actor = createMemo(() =>
    state()?.players.find(
      (p) => p.id === (state()?.pendingDiscard?.playerId ?? state()?.actingPlayerId),
    ),
  )
  const myTurn = () =>
    !drawNotice() &&
    !waiting() &&
    (state()?.phase === "charleston"
      ? !!viewer() && !!state()?.pendingPlayerIds.includes(viewer()!)
      : actor()?.controller === "human" && actor()?.id === viewer())
  const cards = () => [...privateCards(human())].sort(compareCards)
  const allIn = () => Boolean(state()?.allInPlayerIds.length)
  const callCost = () => Math.max(0, (state()?.currentWager ?? 0) - (human()?.roundCommitted ?? 0))
  const maximum = () => (human()?.chips ?? 0) + (human()?.roundCommitted ?? 0)
  const minimum = () =>
    Math.min(
      maximum(),
      Math.ceil(((state()?.currentWager ?? 0) + CHIP_UNIT) / CHIP_UNIT) * CHIP_UNIT,
    )
  const required = () =>
    state()?.phase === "charleston"
      ? CHARLESTON_PASS_COUNT
      : (revealCounts(state()?.config.mode ?? mode())[(state()?.street ?? 0) - 1] ?? 0)
  const choosing = () =>
    myTurn() && ["charleston", "exposing", "discarding"].includes(state()?.phase ?? "")
  const canFish = () => !allIn() && !human()?.riichi
  const canFishOnCall = () => !human()?.riichi
  const ladder = () =>
    (state()?.config.mode ?? mode()) === "streamlined"
      ? STREAMLINED_LADDER
      : (state()?.config.mode ?? mode()) === "riichi"
        ? ADVANCED_LADDER
        : BASIC_LADDER
  const currentHand = () =>
    scoreHand([...cards(), ...(human()?.publicCards ?? [])], state()?.config.mode ?? "basic")
  async function perform(work: () => Promise<{ state: PublicGameState }>) {
    if (busy()) return
    const previous = state()
    const previousViewer = viewer()
    setBusy(true)
    setError("")
    try {
      const result = await work()
      setViewer(
        result.state.room
          ? (result.state.room.viewerId ?? undefined)
          : result.state.players.find((p) => p.controller === "human")?.id,
      )
      updateState(result.state)
      setBlankPick(undefined)
      setPickingFish(false)
      const awaitingExchangeOrReveal =
        (previous?.phase === "exposing" || previous?.phase === "charleston") &&
        state()?.phase === previous.phase &&
        previous.handNumber === state()?.handNumber &&
        previous.street === state()?.street &&
        previousViewer === viewer()
      if (!awaitingExchangeOrReveal) setSelection([])
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Something went wrong. Try again.")
      setAuto(false)
    } finally {
      setBusy(false)
    }
  }
  async function enterRoom() {
    if (!invite()) return
    await perform(async () => {
      const id = invite()
      const result = await joinRoom(id, saveName())
      setSession(id)
      setInvite("")
      return result
    })
  }
  onMount(() => {
    const inviteId = invite()
    if (inviteId) {
      void loadRoom(inviteId)
        .then((result) => {
          if (invite() !== inviteId) return
          if (result.state.room?.viewerId) {
            setSession(inviteId)
            setViewer(result.state.room.viewerId)
            setName(
              result.state.players.find((p) => p.id === result.state.room?.viewerId)?.name ??
                name(),
            )
            updateState(result.state)
            setInvite("")
          } else setRoomPreview(result.state)
        })
        .catch((caught: unknown) => {
          setError(caught instanceof Error ? caught.message : "Could not open room")
        })
        .finally(() => setLoadingRoom(false))
    }
    let polling = false
    const timer = window.setInterval(() => {
      if (!room() || busy() || polling) return
      polling = true
      const id = session()
      const version = state()!.version
      void loadRoom(id)
        .then((result) => {
          if (
            session() === id &&
            room() &&
            !busy() &&
            result.state.version > (state()?.version ?? version)
          ) {
            updateState(result.state)
          }
          if (error() === "Connection interrupted. Reconnecting…") setError("")
        })
        .catch(() => {
          if (session() === id && room()) setError("Connection interrupted. Reconnecting…")
        })
        .finally(() => {
          polling = false
        })
    }, 1000)
    const navigate = () => window.location.reload()
    window.addEventListener("popstate", navigate)
    onCleanup(() => {
      window.clearInterval(timer)
      window.removeEventListener("popstate", navigate)
    })
  })
  async function start() {
    if (!validSeats()) return
    await perform(async () => {
      const result = await createGame(
        seed().trim() || crypto.randomUUID(),
        mode(),
        players(),
        tournamentGames() as 1 | 2 | 3 | 4,
        1,
        humans(),
        seats(),
        saveName(),
      )
      setViewer(undefined)
      setSession(result.sessionId)
      localStorage.setItem("moker-v9-session", result.sessionId)
      setAuto(true)
      setCopied(false)
      if (result.state.room) window.history.pushState(null, "", `/rooms/${result.sessionId}`)
      window.scrollTo({ top: 0 })
      return result
    })
  }
  const bot = () => perform(() => botStep(session()))
  createEffect(() => {
    const game = state()
    if (
      !game ||
      !!game.room ||
      busy() ||
      !auto() ||
      !!drawNotice() ||
      loanNotice().length > 0 ||
      receivedCharleston().length > 0 ||
      (game.phase === "charleston" &&
        game.players.some(
          (player) => player.controller === "human" && game.pendingPlayerIds.includes(player.id),
        )) ||
      !actor() ||
      actor()?.controller === "human" ||
      game.phase === "finished"
    )
      return
    const timer = window.setTimeout(() => void bot(), 1300)
    onCleanup(() => window.clearTimeout(timer))
  })
  createEffect(() => {
    if (state()) setWager(Math.min(maximum(), Math.max(10, minimum())))
  })
  const act = async (action: BettingAction) => {
    await perform(() =>
      bettingAction(session(), viewer()!, action, room() ? state()!.version : undefined),
    )
    if (!error()) setActionDialog(undefined)
  }
  const canSpendStick = () =>
    state()?.config.mode !== "basic" &&
    !human()?.riichi &&
    !state()?.stickSpentThisTurn &&
    (!allIn() || callCost() > 0 || state()?.stickWindow?.playerId === viewer()) &&
    (human()?.riichiSticks ?? 0) > 0 &&
    ((human()?.chips ?? 0) > 0 || state()?.stickWindow?.playerId === viewer()) &&
    !human()?.folded
  const cancelFishing = () => {
    setBlankPick(undefined)
    setPickingFish(false)
    setPickingStick(false)
  }
  const chooseStick = () => {
    setBlankPick(undefined)
    setPickingStick(true)
    setPickingFish(true)
  }
  const resolveStick = (drawSource?: CardSource) =>
    perform(() =>
      gameAction(session(), {
        kind: "riichi-stick",
        playerId: viewer()!,
        ...(drawSource ? { source: drawSource } : {}),
      }),
    )
  const fishFrom = (drawSource: CardSource) =>
    pickingStick()
      ? resolveStick(drawSource)
      : act({ type: callCost() ? "call" : "check", drawSource })
  const openAction = (kind: "check" | "call" | "bet") => {
    setPickingStick(false)
    setError("")
    setBlankPick(undefined)
    setPickingFish(false)
    if ((kind === "check" && canFish()) || (kind === "call" && canFishOnCall())) {
      setPickingFish(true)
      requestAnimationFrame(() =>
        fishingTable?.scrollIntoView({
          block: "center",
          behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
            ? "auto"
            : "smooth",
        }),
      )
    } else if (kind === "check" || kind === "call") {
      void act({ type: kind })
    } else setActionDialog(kind)
  }
  function toggleCard(id: string) {
    audio.play("click2")
    const count = state()?.phase === "discarding" ? 1 : required()
    setSelection((current) =>
      current.includes(id)
        ? current.filter((x) => x !== id)
        : count === 1
          ? [id]
          : current.length < count
            ? [...current, id]
            : current,
    )
  }
  const confirmSelection = () =>
    perform(() =>
      gameAction(session(), {
        kind: state()?.phase === "charleston" ? "charleston" : "expose",
        playerId: viewer()!,
        cardIds: selection(),
      }),
    )
  const discard = (pile: "a" | "b") =>
    perform(() =>
      gameAction(session(), {
        kind: "discard",
        playerId: viewer()!,
        discardCardId: selection()[0],
        discardPile: pile,
      }),
    )
  return (
    <main
      class={state() ? "game-page" : "home-page"}
      onClick={(event) => {
        const button = (event.target as Element).closest("button")
        if (button && !button.disabled && !button.matches(".card-choice, [data-audio-control]"))
          audio.play("click2")
      }}
    >
      <header class="masthead" classList={{ "has-room": showInvite() }}>
        <a
          class="brand"
          href="#"
          aria-label="Moker home"
          onClick={(e) => {
            e.preventDefault()
            if (!busy()) {
              leaveTable()
            }
          }}
        >
          <img src="/assets/logo-dark.svg" alt="Moker" />
        </a>

        <Show when={showInvite()}>
          <section class="room-bar" aria-label="Online room">
            <div role="status">
              Invite {room()!.waitingPlayerIds.length}{" "}
              {room()!.waitingPlayerIds.length === 1 ? "friend" : "friends"}
            </div>
            <div class="room-link">
              <input
                aria-label="Room link"
                readOnly
                value={roomUrl()}
                onFocus={(event) => event.currentTarget.select()}
              />
              <Button
                class="room-copy"
                onClick={copyRoom}
                aria-label={copied() ? "Invite link copied" : "Copy invite link"}
                title={copied() ? "Copied!" : "Copy invite link"}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.7"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  aria-hidden="true"
                >
                  <Show
                    when={copied()}
                    fallback={
                      <>
                        <rect x="8" y="3" width="8" height="4" rx="1" />
                        <path d="M8 5H5v16h14V5h-3" />
                      </>
                    }
                  >
                    <path d="m5 12 4 4L19 6" />
                  </Show>
                </svg>
              </Button>
            </div>
          </section>
        </Show>

        <nav aria-label="Main">
          <div class="audio-controls" aria-label="Audio controls">
            <Button
              data-audio-control
              class="audio-toggle"
              aria-label="Music"
              title={musicOn() ? "Mute music" : "Enable music"}
              aria-pressed={musicOn()}
              onClick={() => {
                const enabled = !musicOn()
                setMusicOn(enabled)
                audio.setMusic(enabled)
              }}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.8"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
              >
                <path d="M9 18V5l11-2v13M9 8l11-2" />
                <ellipse cx="6" cy="18" rx="3" ry="2.5" />
                <ellipse cx="17" cy="16" rx="3" ry="2.5" />
                <Show when={!musicOn()}>
                  <path d="M3 3l18 18" />
                </Show>
              </svg>
            </Button>
            <Button
              data-audio-control
              class="audio-toggle"
              aria-label="Sound effects"
              title={effectsOn() ? "Mute sound effects" : "Enable sound effects"}
              aria-pressed={effectsOn()}
              onClick={() => {
                const enabled = !effectsOn()
                setEffectsOn(enabled)
                audio.setEffects(enabled)
                if (enabled) audio.play("click2")
              }}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.8"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
              >
                <path d="M11 5L6 9H3v6h3l5 4z" />
                <Show when={effectsOn()} fallback={<path d="M16 9l6 6m0-6l-6 6" />}>
                  <path d="M15 8a6 6 0 010 8m3-11a10 10 0 010 14" />
                </Show>
              </svg>
            </Button>
          </div>
          <Button class="text-button" onClick={() => setRules(!rules())}>
            {rules() ? "Close rules" : "How to play"}
          </Button>
        </nav>
      </header>
      <Show when={invite() && !state()}>
        <section class="room-entry launch-card" aria-label="Join room">
          <div class="room-entry-heading">
            <Show when={roomPreview()}>
              <p class="room-inviter">
                {roomPreview()?.players.find((player) => player.id === roomPreview()?.room?.hostId)
                  ?.name ?? "Your friend"}{" "}
                invited you
              </p>
            </Show>
            <h1>Join the table</h1>
            <p>
              {loadingRoom()
                ? "Opening room…"
                : roomPreview()?.room?.waitingPlayerIds.length
                  ? "Take an open human seat and play with your friends."
                  : roomPreview()
                    ? "The table is full. Join as an observer."
                    : "This room could not be opened."}
            </p>
          </div>
          <label class="setup-field">
            <span class="setup-label">Your name</span>
            <input
              value={name()}
              maxLength={40}
              placeholder="Aki"
              autocomplete="nickname"
              onInput={(event) => setName(event.currentTarget.value)}
            />
          </label>
          <Button
            class="primary"
            disabled={busy() || loadingRoom() || !roomPreview()}
            onClick={enterRoom}
          >
            {busy()
              ? "Joining…"
              : roomPreview()?.room?.waitingPlayerIds.length
                ? "Join game"
                : "Watch game"}
          </Button>
        </section>
      </Show>
      <Show when={!state() && !invite()}>
        <section class="welcome">
          <div class="welcome-copy">
            <h1>
              <em>Build</em> hands like Mahjong.
              <br />
              <em>Bet</em> like Poker.
              <br />
              <em>Bluff</em> your friends.
            </h1>
          </div>
          <section class="launch-card" aria-label="Set up your game">
            <label class="setup-field">
              <span class="setup-label">Your name</span>
              <input
                value={name()}
                maxLength={40}
                placeholder="Aki"
                autocomplete="nickname"
                onInput={(event) => setName(event.currentTarget.value)}
              />
            </label>
            <div class="setup-mode">
              <div class="setup-label" id="game-mode-label">
                Game mode
              </div>
              <div class="playtest-note" id="streamlined-playtest">
                <span>new, currently playtesting</span>
                <svg viewBox="0 0 70 44" fill="none" aria-hidden="true">
                  <path
                    d="M3 8C33 1 57 15 57 39M46 30 57 40 65 27"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
              </div>
              <div
                class="mode-picker"
                style={{ "--mode-index": mode() === "basic" ? 0 : mode() === "riichi" ? 1 : 2 }}
                role="group"
                aria-labelledby="game-mode-label"
              >
                <Button
                  classList={{ selected: mode() === "basic" }}
                  aria-pressed={mode() === "basic"}
                  onClick={() => setMode("basic")}
                >
                  Basic
                </Button>
                <Button
                  classList={{ selected: mode() === "riichi" }}
                  aria-pressed={mode() === "riichi"}
                  onClick={() => setMode("riichi")}
                >
                  Riichi
                </Button>
                <Button
                  classList={{ selected: mode() === "streamlined" }}
                  aria-pressed={mode() === "streamlined"}
                  onClick={() => setMode("streamlined")}
                  aria-describedby="streamlined-playtest"
                >
                  Streamlined
                </Button>
              </div>
              <p class="mode-description">
                {mode() === "basic"
                  ? "7 cards · 4 streets · Nine hand ranks."
                  : mode() === "riichi"
                    ? "7 cards · 4 streets · Jokers, Lotuses and Riichi."
                    : "6 cards · 3 streets · Save your sticks."}
              </p>
            </div>
            <div class="setup-field seat-setup">
              <span>Players</span>
              <div class="seat-picker" role="group" aria-label="Player seats">
                <For each={[0, 1, 2, 3, 4, 5]}>
                  {(index) => (
                    <Button
                      class={`setup-seat ${seats()[index]}`}
                      onClick={() => cycleSeat(index)}
                      aria-label={`Seat ${index + 1}: ${seats()[index]}. Change to ${{ human: "none", robot: "human", none: "robot" }[seats()[index]!]}`}
                    >
                      <SeatIcon kind={seats()[index]!} />
                      <span>
                        {seats()[index] === "none"
                          ? "Empty"
                          : seats()[index] === "robot"
                            ? "Robot"
                            : "Human"}
                      </span>
                    </Button>
                  )}
                </For>
              </div>
              <small class="seat-validation" classList={{ "reserved-empty": validSeats() }}>
                Choose at least two players, including a human.
              </small>
            </div>
            <div class="setup-field">
              <span>Tournament games</span>
              <div class="player-picker" role="group" aria-label="Tournament games">
                <For each={[1, 2, 3, 4]}>
                  {(n) => (
                    <Button
                      aria-label={`${n} ${n === 1 ? "game" : "games"}`}
                      aria-pressed={tournamentGames() === n}
                      classList={{ selected: tournamentGames() === n }}
                      onClick={() => setTournamentGames(n)}
                    >
                      {n}
                    </Button>
                  )}
                </For>
              </div>
            </div>
            <Show when={humans() > 1}>
              <div class="playtest-note" id="streamlined-playtest">
                <span>new, currently playtesting</span>
                <svg viewBox="0 0 70 44" fill="none" aria-hidden="true">
                  <path
                    d="M3 36C33 43 57 29 57 5M46 14 57 4 65 17"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
              </div>
              <p class="mode-description">
                Create a room and share its link. Once every human seat is filled, other visitors
                can watch.
              </p>
            </Show>
            <Button class="primary start-button" disabled={busy() || !validSeats()} onClick={start}>
              {busy() ? "Starting…" : humans() > 1 ? "Create room" : "Start game"}
            </Button>
          </section>
          <FrontpageDecor />
          <FrontpageDecor special visible={mode() !== "basic"} />
        </section>
      </Show>
      <Show when={state()}>
        {(game) => (
          <>
            <section class="game-topline">
              <div class="game-stats">
                <div class="game-counter">
                  <CycleBars
                    label="Game"
                    current={game().gameNumber}
                    total={game().config.tournamentGames}
                    action={
                      <Show when={game().config.tournamentGames > 1}>
                        <Button class="text-button scores-link" onClick={() => setScoresOpen(true)}>
                          Scores
                        </Button>
                      </Show>
                    }
                  />
                </div>
                <CycleBars
                  label="Round"
                  current={Math.min(
                    game().players.length,
                    (game().dealerSteps % game().players.length) + 1,
                  )}
                  total={game().players.length}
                />
                <CycleBars
                  label="Street"
                  current={game().street}
                  total={streetCount(game().config.mode)}
                />
                <div class="ante-stat">
                  <span>Ante</span>
                  <span class="chip chip-5">{game().orbitValue}</span>
                </div>
              </div>
            </section>
            <Show when={scoresOpen()}>
              <Modal
                title="Tournament scores"
                class="scores-dialog"
                onClose={() => setScoresOpen(false)}
              >
                <TournamentScores game={game()} />
              </Modal>
            </Show>
            <Show when={allIn()}>
              <div class="all-in-notice" role="status">
                <strong>
                  All-in:{" "}
                  {game()
                    .players.filter((p) => game().allInPlayerIds.includes(p.id))
                    .map((p) => p.name)
                    .join(", ")}
                </strong>
                <span>Call or fold. Fishing follows a call.</span>
              </div>
            </Show>
            <div
              ref={(element) => {
                tableSurface = element
              }}
              class="play-layout"
            >
              <Show when={drawNotice()} keyed>
                {(notice) => (
                  <OpponentMove
                    notice={notice}
                    onDone={finishOpponentMove}
                    onSound={(sound) => audio.play(sound)}
                  />
                )}
              </Show>
              <div class="play-main">
                <section class="table" aria-label="Game table">
                  <div class="opponents">
                    <For each={game().players.filter((p) => p.id !== viewer())}>
                      {(p) => (
                        <PlayerSeat
                          player={p}
                          mode={game().config.mode}
                          drawNotice={drawNotice()?.playerId === p.id ? drawNotice() : undefined}
                          colorIndex={game().players.findIndex((player) => player.id === p.id)}
                          active={
                            !waiting() &&
                            game().phase !== "charleston" &&
                            (drawNotice()?.playerId ?? actor()?.id) === p.id
                          }
                          spentStick={spentSticks().includes(p.id)}
                          betting={
                            !waiting() &&
                            game().phase === "betting" &&
                            actor()?.id === p.id &&
                            !drawNotice()
                          }
                          readyToPass={
                            game().phase === "charleston" && !game().pendingPlayerIds.includes(p.id)
                          }
                          charlestonStatus={
                            room()?.waitingPlayerIds.includes(p.id)
                              ? "Waiting to join…"
                              : game().phase === "charleston"
                                ? game().pendingPlayerIds.includes(p.id)
                                  ? "Choosing cards…"
                                  : "Ready to pass"
                                : undefined
                          }
                          dealer={game().players[game().dealerIndex]?.id === p.id}
                        />
                      )}
                    </For>
                  </div>
                  <div
                    class="table-center"
                    ref={(element) => {
                      fishingTable = element
                    }}
                    classList={{ "choosing-fish": pickingFish() }}
                  >
                    <div class="deck-pile">
                      <div class="pot-summary">
                        <span>
                          <b class="pot-label">Pot</b>
                          <span class="pot-amount">
                            <strong data-motion-key="pot">{format(game().pot)}</strong> chips
                          </span>
                        </span>
                        <ChipStack
                          amount={Math.max(
                            0,
                            game().pot -
                              game().players.reduce((sum, p) => sum + p.roundCommitted, 0),
                          )}
                          contributions={
                            game().pot > 0
                              ? game().players.flatMap((p) => [
                                  Math.min(
                                    Math.max(0, p.potCommitted - p.roundCommitted),
                                    game().orbitValue,
                                  ),
                                  Math.max(
                                    0,
                                    p.potCommitted - p.roundCommitted - game().orbitValue,
                                  ),
                                ])
                              : []
                          }
                        />
                      </div>

                      <Button
                        class="deck"
                        aria-label={`Draw from deck, ${game().deck.count} cards`}
                        disabled={
                          !pickingFish() || !!blankPick() || busy() || game().deck.count === 0
                        }
                        onClick={() => fishFrom("deck")}
                      >
                        <img
                          data-motion-key="deck"
                          data-motion-value={game().deck.count}
                          src="/assets/cards/back.png"
                          alt="Moker card back"
                        />
                      </Button>
                    </div>
                    <Lane
                      discarding={myTurn() && game().phase === "discarding"}
                      discardAllowed={!game().discardB.length ? !game().discardA.length : true}
                      ready={selection().length === 1 && !busy()}
                      onDiscard={() => discard("a")}
                      title="Lane A"
                      cards={game().discardA}
                      concealed={
                        drawNotice()
                          ? [
                              drawNotice()!.discardedCard.id,
                              ...pendingMoves.map((m) => m.discardedCard.id),
                            ]
                          : []
                      }
                      enabled={pickingFish() && !busy()}
                      onPick={() => fishFrom("discard-a")}
                      onSwap={
                        blankPick()
                          ? (cardIndex) =>
                              act({
                                type: callCost() ? "call" : "check",
                                blankExchange: { blankCardId: blankPick()!, pile: "a", cardIndex },
                              })
                          : undefined
                      }
                    />
                    <Lane
                      discarding={myTurn() && game().phase === "discarding"}
                      discardAllowed={!game().discardA.length ? !game().discardB.length : true}
                      ready={selection().length === 1 && !busy()}
                      onDiscard={() => discard("b")}
                      title="Lane B"
                      cards={game().discardB}
                      concealed={
                        drawNotice()
                          ? [
                              drawNotice()!.discardedCard.id,
                              ...pendingMoves.map((m) => m.discardedCard.id),
                            ]
                          : []
                      }
                      enabled={pickingFish() && !busy()}
                      onPick={() => fishFrom("discard-b")}
                      onSwap={
                        blankPick()
                          ? (cardIndex) =>
                              act({
                                type: callCost() ? "call" : "check",
                                blankExchange: { blankCardId: blankPick()!, pile: "b", cardIndex },
                              })
                          : undefined
                      }
                    />
                  </div>
                </section>
                <Show when={human()}>
                  <section
                    class="hand-panel"
                    classList={{
                      folded: Boolean(human()?.folded),
                      betting: myTurn() && game().phase === "betting" && !drawNotice(),
                    }}
                    aria-label="Your hand"
                  >
                    <div class="hand-heading">
                      <div class="opponent-heading own-seat">
                        <SpiritAvatar
                          controller="human"
                          name={human()?.name ?? "You"}
                          colorIndex={Math.max(
                            0,
                            game().players.findIndex((p) => p.id === human()?.id),
                          )}
                        />
                        <div>
                          <b>
                            {human()?.name ?? "You"}{" "}
                            <Show when={game().players[game().dealerIndex]?.id === human()?.id}>
                              <span class="dealer-label" title="Dealer">
                                <span class="stick-tag">Dealer</span>
                              </span>
                            </Show>
                          </b>
                          <div class="own-chip-balance">
                            <small>
                              <strong data-motion-key="own-chips">
                                {format(human()?.chips ?? 0)}
                              </strong>{" "}
                              chips
                            </small>
                            <Show when={!waiting() && human() && canTakeLoan(game(), human()!)}>
                              <Button
                                class="take-loan"
                                title={`Borrow ${LOAN_VALUE} chips; −${LOAN_PENALTY} points at the end of this game`}
                                disabled={busy()}
                                onClick={() =>
                                  perform(() =>
                                    gameAction(session(), {
                                      kind: "take-loan",
                                      playerId: viewer()!,
                                    }),
                                  )
                                }
                              >
                                Take loan
                              </Button>
                            </Show>
                          </div>
                        </div>
                        <Show when={game().config.mode !== "basic"}>
                          <div class="player-sticks">
                            <RiichiSticks
                              compact
                              count={human()?.riichiSticks ?? 0}
                              spent={spentSticks().includes(viewer()!)}
                            />
                            <Show when={human()?.loans}>
                              <div class="loan-stick-count compact-sticks">
                                <span class="loan-stick-art">
                                  <img src="/assets/sticks/loan-decor.svg" alt="" />
                                </span>
                                <span class="stick-tag">{human()?.loans} Loan</span>
                              </div>
                            </Show>
                          </div>
                        </Show>
                      </div>
                      <div class="own-hand-status">
                        <div class="own-wager">
                          <BetIndicator
                            amount={human()?.roundCommitted ?? 0}
                            playerId={human()?.id ?? "you"}
                          />
                        </div>
                        <Show when={!human()?.folded}>
                          <aside class="ladder-panel">
                            <Button
                              class="ladder-toggle"
                              aria-expanded={ladderOpen()}
                              aria-controls="hand-ladder"
                              onClick={() => setLadderOpen(!ladderOpen())}
                            >
                              <span>
                                <small>Current hand</small>
                                <b>
                                  {`${currentHand().total} - ${currentHand().combinations[0]?.label ?? "High Card"}`}
                                </b>
                              </span>
                              <span>{ladderOpen() ? "−" : "+"}</span>
                            </Button>
                            <Show when={ladderOpen()}>
                              <Modal
                                title="Hand ranks"
                                class="drawer rank-drawer"
                                onClose={() => setLadderOpen(false)}
                              >
                                <div id="hand-ladder">
                                  <ol style={{ "--ladder-rows": Math.ceil(ladder().length / 2) }}>
                                    <For
                                      each={ladder().map((entry, i) => ({ entry, rank: i + 1 }))}
                                    >
                                      {(row) => (
                                        <li
                                          classList={{ made: currentHand().total === row.rank }}
                                          aria-current={
                                            currentHand().total === row.rank ? "true" : undefined
                                          }
                                        >
                                          <div class="rank-details">
                                            <b>
                                              {String(row.rank).padStart(2, "0")} {row.entry[0]}
                                            </b>
                                            <small>{row.entry[1]}</small>
                                            <div
                                              class="rank-examples"
                                              aria-label={`Example of ${row.entry[0]}`}
                                            >
                                              <For
                                                each={handExamples(
                                                  row.entry[0]!,
                                                  game().config.mode,
                                                )}
                                              >
                                                {(group, index) => (
                                                  <>
                                                    <Show when={index() > 0}>
                                                      <span
                                                        class="rank-example-plus"
                                                        aria-hidden="true"
                                                      >
                                                        +
                                                      </span>
                                                    </Show>
                                                    <div class="rank-example-group">
                                                      <For each={group}>
                                                        {(card) => (
                                                          <PlayingCard card={card} compact />
                                                        )}
                                                      </For>
                                                    </div>
                                                  </>
                                                )}
                                              </For>
                                            </div>
                                          </div>
                                        </li>
                                      )}
                                    </For>
                                  </ol>
                                </div>
                              </Modal>
                            </Show>
                          </aside>
                        </Show>
                      </div>
                    </div>
                    <div class="hand-cards">
                      <Show when={human()?.riichi}>
                        <RiichiDeclared />
                      </Show>
                      <For
                        each={sortHand(
                          [...cards(), ...(human()?.publicCards ?? [])],
                          human()?.publicCards ?? [],
                          game().config.mode,
                        ).sort(
                          (a, b) =>
                            Number(receivedCharleston().some((c) => c.id === b.id)) -
                            Number(receivedCharleston().some((c) => c.id === a.id)),
                        )}
                      >
                        {(card) => {
                          const drawn = () =>
                            game().phase === "discarding" &&
                            game().pendingDiscard?.playerId === human()?.id &&
                            game().pendingDiscard?.drawnCardId === card.id
                          const received = () => receivedCharleston().some((c) => c.id === card.id)
                          const revealed = () =>
                            Boolean(human()?.publicCards.some((c) => c.id === card.id))
                          return (
                            <Button
                              class="card-choice"
                              classList={{
                                picked: selection().includes(card.id) || blankPick() === card.id,
                                "is-public": revealed(),
                                "is-highlighted":
                                  drawn() ||
                                  received() ||
                                  (pickingFish() &&
                                    !pickingStick() &&
                                    card.kind === "blank" &&
                                    !revealed()),
                              }}
                              aria-label={`${cardLabel(card)}${received() ? ", received from Charleston" : ""}${drawn() ? ", just drawn" : ""}${revealed() ? ", revealed" : ""}${selection().includes(card.id) ? ", selected" : ""}`}
                              aria-describedby={
                                game().phase === "discarding" && myTurn()
                                  ? "discard-instruction"
                                  : undefined
                              }
                              aria-pressed={
                                selection().includes(card.id) || blankPick() === card.id
                              }
                              disabled={
                                revealed() ||
                                (!choosing() &&
                                  !(pickingFish() && !pickingStick() && card.kind === "blank")) ||
                                busy()
                              }
                              onClick={() =>
                                pickingFish() && card.kind === "blank"
                                  ? setBlankPick(blankPick() === card.id ? undefined : card.id)
                                  : toggleCard(card.id)
                              }
                            >
                              <span class="hand-card-surface">
                                <PlayingCard card={card} />
                                <Show
                                  when={
                                    drawn() ||
                                    revealed() ||
                                    selection().includes(card.id) ||
                                    received()
                                  }
                                >
                                  <span class="card-caption">
                                    {received()
                                      ? "Received"
                                      : drawn()
                                        ? selection().includes(card.id)
                                          ? "New · Selected ✓"
                                          : "Just drawn"
                                        : revealed()
                                          ? "Public"
                                          : game().phase === "charleston" && !myTurn()
                                            ? "Passing…"
                                            : "Selected ✓"}
                                  </span>
                                </Show>
                              </span>
                            </Button>
                          )
                        }}
                      </For>
                    </div>
                    <div class="action-area">
                      <Show when={pickingFish()}>
                        <div class="button-row main-actions">
                          <span>
                            {pickingStick()
                              ? "Spend a fishing stick: choose a card from the deck or a discard lane."
                              : blankPick()
                                ? "Choose any card in either discard lane to swap with your Blank."
                                : cards().some((card) => card.kind === "blank")
                                  ? "Choose a card from the deck or a discard lane, or select a Blank to swap."
                                  : "Choose a card from the deck or a discard lane."}
                          </span>
                          <Button disabled={busy()} onClick={cancelFishing}>
                            {pickingStick() ? "Cancel fishing stick" : "Cancel fishing"}
                          </Button>
                        </div>
                      </Show>
                      <Show when={receivedCharleston().length > 0}>
                        <div class="button-row main-actions">
                          <Button class="primary" onClick={acceptCharleston}>
                            Accept cards
                          </Button>
                        </div>
                      </Show>
                      <Show when={myTurn() && game().phase === "discarding"}>
                        <p id="discard-instruction" role="status">
                          {selection().length
                            ? "Choose a discard lane above to place your selected card."
                            : "Discard a card: select one from your hand, then choose a lane above."}
                        </p>
                      </Show>
                      <Show when={myTurn() && ["charleston", "exposing"].includes(game().phase)}>
                        <p class="sr-only" id="selection-instruction">
                          Select {required()} hidden cards. Everyone’s choices are revealed
                          together.
                        </p>
                        <div class="button-row main-actions">
                          <Show when={game().phase === "charleston"}>
                            <span>Charleston: select and</span>
                          </Show>
                          <Button
                            class="primary"
                            disabled={busy() || selection().length !== required()}
                            onClick={confirmSelection}
                            aria-describedby="selection-instruction"
                          >
                            {game().phase === "charleston" ? "Pass" : "Reveal"} {selection().length}
                            /{required()} cards
                          </Button>
                          <Show when={game().phase === "charleston"}>
                            <span>to your left.</span>
                          </Show>
                        </div>
                      </Show>
                      <Show
                        when={
                          myTurn() &&
                          game().stickWindow &&
                          !receivedCharleston().length &&
                          !pickingFish()
                        }
                      >
                        <div class="button-row main-actions">
                          <Button disabled={busy() || pickingFish()} onClick={chooseStick}>
                            Spend fishing stick
                          </Button>
                          <Button class="primary" disabled={busy()} onClick={() => resolveStick()}>
                            End turn
                          </Button>
                        </div>
                      </Show>
                      <Show
                        when={
                          myTurn() &&
                          game().phase === "betting" &&
                          !game().stickWindow &&
                          !receivedCharleston().length
                        }
                      >
                        <div
                          class="button-row main-actions"
                          classList={{ "fishing-active": pickingFish() }}
                        >
                          <Button
                            class="primary"
                            disabled={busy()}
                            onClick={() => openAction(callCost() ? "call" : "check")}
                          >
                            {callCost()
                              ? `Call ${format(Math.min(callCost(), human()?.chips ?? 0))}${canFishOnCall() ? " + Fish" : ""}`
                              : canFish()
                                ? "Check + Fish"
                                : "Check"}
                          </Button>
                          <Show when={canSpendStick()}>
                            <Button disabled={busy() || pickingFish()} onClick={chooseStick}>
                              Spend fishing stick
                            </Button>
                          </Show>
                          <Show when={!allIn() && maximum() > game().currentWager}>
                            <Button
                              class="bet-button"
                              disabled={busy()}
                              onClick={() => openAction("bet")}
                            >
                              Bet
                            </Button>
                          </Show>
                          <Button
                            class="fold-button"
                            disabled={busy()}
                            onClick={() => act({ type: "fold" })}
                          >
                            Fold
                          </Button>
                        </div>
                        <Show when={actionDialog()}>
                          <Modal
                            class="drawer bet-drawer"
                            title="Place your bet"
                            onClose={() => setActionDialog(undefined)}
                          >
                            <Show when={actionDialog() === "bet"}>
                              <section class="bet-editor">
                                <div class="bet-amount">
                                  <span>Your bet</span>
                                  <strong aria-live="polite">{format(wager())}</strong>
                                </div>
                                <div class="bet-chips">
                                  <For each={[5, 10, 20, 50]}>
                                    {(value) => (
                                      <Button
                                        class={`chip chip-${value}`}
                                        aria-label={`Add ${value} to bet`}
                                        disabled={busy() || wager() + value > maximum()}
                                        onClick={() => setWager(wager() + value)}
                                      >
                                        +{value}
                                      </Button>
                                    )}
                                  </For>
                                  <Button
                                    disabled={busy() || wager() === maximum()}
                                    onClick={() => setWager(maximum())}
                                  >
                                    All-in
                                  </Button>
                                  <Button
                                    class="bet-reset"
                                    disabled={
                                      busy() ||
                                      wager() === Math.min(maximum(), Math.max(10, minimum()))
                                    }
                                    onClick={() =>
                                      setWager(Math.min(maximum(), Math.max(10, minimum())))
                                    }
                                  >
                                    Reset
                                  </Button>
                                </div>
                              </section>
                            </Show>
                            <p role="alert" class="dialog-error">
                              {error()}
                            </p>
                            <div class="button-row dialog-actions">
                              <Show when={actionDialog() === "bet"}>
                                <Button
                                  class="primary"
                                  disabled={
                                    busy() ||
                                    (wager() % CHIP_UNIT !== 0 && wager() !== maximum()) ||
                                    wager() < minimum() ||
                                    wager() > maximum()
                                  }
                                  onClick={() =>
                                    act({
                                      type: "bet",
                                      amount: wager(),
                                    })
                                  }
                                >
                                  Bet {format(wager())}
                                </Button>
                                <Show
                                  when={
                                    game().config.mode === "riichi" &&
                                    !human()?.riichi &&
                                    game().street <= 3 &&
                                    !game().players.some((p) => p.riichi && !p.folded)
                                  }
                                >
                                  <Button
                                    disabled={
                                      busy() ||
                                      wager() < minimum() ||
                                      wager() > maximum() ||
                                      (wager() % CHIP_UNIT !== 0 && wager() !== maximum())
                                    }
                                    onClick={() =>
                                      act({ type: "bet", amount: wager(), riichi: true })
                                    }
                                  >
                                    Bet {format(wager())} + Declare Riichi
                                  </Button>
                                </Show>
                              </Show>
                            </div>
                          </Modal>
                        </Show>
                      </Show>
                      <Show
                        when={
                          game().phase !== "charleston" &&
                          actor() &&
                          actor()?.controller !== "human" &&
                          !receivedCharleston().length
                        }
                      >
                        <p>
                          {human()?.folded
                            ? "Watch the rest of the round."
                            : "Watch the table. Your next move is coming."}
                        </p>
                        <Show when={!room() && !auto()}>
                          <Button class="primary" disabled={busy()} onClick={bot}>
                            Play {actor()?.name}’s turn →
                          </Button>
                        </Show>
                      </Show>
                      <Show when={["between-hands", "finished"].includes(game().phase)}>
                        <Button
                          onClick={() => {
                            setResultStage("round")
                            setClosedResult("")
                          }}
                        >
                          View round result
                        </Button>
                      </Show>
                      <Show when={game().phase === "between-hands" && canDeal()}>
                        <Button
                          class="primary"
                          disabled={busy()}
                          onClick={() =>
                            perform(() =>
                              gameAction(session(), {
                                kind: "next-hand",
                                viewerId: viewer() ?? "",
                              }),
                            )
                          }
                        >
                          {game().dealerSteps >= game().players.length * (game().config.orbits ?? 1)
                            ? "Start next tournament game"
                            : "Deal next round"}{" "}
                          →
                        </Button>
                      </Show>
                      <Show when={game().phase === "finished"}>
                        <div class="standings">
                          <For
                            each={[...game().players].sort(
                              (a, b) =>
                                (game().finalScores?.[b.id] ?? 0) -
                                (game().finalScores?.[a.id] ?? 0),
                            )}
                          >
                            {(p) => (
                              <span>
                                <b>{p.name}</b> {format(game().finalScores?.[p.id] ?? 0)} points
                              </span>
                            )}
                          </For>
                        </div>
                        <Button
                          class="primary"
                          onClick={() => {
                            leaveTable()
                          }}
                        >
                          Set up another game →
                        </Button>
                      </Show>
                    </div>
                  </section>
                </Show>
                <Show
                  when={
                    !drawNotice() &&
                    ["between-hands", "finished"].includes(game().phase) &&
                    closedResult() !==
                      `${session()}:${game().gameNumber}:${game().handResults.at(-1)?.handNumber}` &&
                    game().handResults.at(-1)
                  }
                >
                  {(result) => (
                    <Modal
                      title={
                        resultStage() === "round"
                          ? "Round result"
                          : resultStage() === "game"
                            ? `Game ${game().gameNumber} complete`
                            : "Tournament complete"
                      }
                      hideTitle={resultStage() === "round"}
                      class="result-dialog"
                      onClose={() =>
                        setClosedResult(`${session()}:${game().gameNumber}:${result().handNumber}`)
                      }
                    >
                      <Show when={resultStage() === "game"}>
                        <section class="game-completion">
                          <ScoreWinners game={game()} singleGame />
                          <TournamentScores game={game()} singleGame />
                          <Show when={game().phase !== "finished"}>
                            <p>
                              Next is game {game().gameNumber + 1} of{" "}
                              {game().config.tournamentGames}. Everyone returns with{" "}
                              {format(100 + (game().gameNumber + 1) * 100)} chips, including
                              eliminated players. The ante is {(game().gameNumber + 1) * 5}.
                            </p>
                            <Show when={game().config.mode !== "basic"}>
                              <p>
                                {game().config.mode === "streamlined"
                                  ? "Loans are cleared. Keep your saved sticks and receive 4 more at the start of each round."
                                  : "Loans are cleared. Keep your unused Riichi sticks and receive 2 more for the next game."}
                              </p>
                            </Show>
                          </Show>
                          <div class="result-actions">
                            <Show
                              when={game().phase !== "finished"}
                              fallback={
                                <Show
                                  when={game().config.tournamentGames > 1}
                                  fallback={
                                    <Button
                                      class="primary"
                                      onClick={() => {
                                        leaveTable()
                                      }}
                                    >
                                      Set up another game
                                    </Button>
                                  }
                                >
                                  <Button
                                    class="primary"
                                    onClick={() => setResultStage("tournament")}
                                  >
                                    See tournament result
                                  </Button>
                                </Show>
                              }
                            >
                              <Button
                                class="primary"
                                disabled={busy() || !canDeal()}
                                onClick={() =>
                                  perform(() =>
                                    gameAction(session(), {
                                      kind: "next-hand",
                                      viewerId: viewer() ?? "",
                                    }),
                                  )
                                }
                              >
                                Start next tournament game
                              </Button>
                            </Show>
                          </div>
                        </section>
                      </Show>
                      <Show when={resultStage() === "tournament"}>
                        <ScoreWinners game={game()} />
                        <TournamentScores game={game()} />
                        <Button
                          class="primary"
                          onClick={() => {
                            leaveTable()
                          }}
                        >
                          Set up another game
                        </Button>
                      </Show>
                      <Show when={resultStage() === "round"}>
                        <section class="round-result">
                          <p class="eyebrow">
                            {result().reason === "showdown" ? "SHOWDOWN" : "EVERYONE ELSE FOLDED"}
                          </p>
                          <h2>
                            {result()
                              .winnerIds.map((id) => game().players.find((p) => p.id === id)?.name)
                              .join(" & ")}{" "}
                            {result().winnerIds.length === 1 ? "wins." : "win."}
                          </h2>
                          <div class="result-hands">
                            <For each={result().players.filter((p) => !p.eliminated)}>
                              {(p) => (
                                <article
                                  classList={{ winner: result().winnerIds.includes(p.playerId) }}
                                >
                                  <div class="result-player-summary">
                                    <b>
                                      {p.name}
                                      <Show when={result().winnerIds.includes(p.playerId)}>
                                        <span class="winner-trophy" role="img" aria-label="Winner">
                                          🏆
                                        </span>
                                      </Show>
                                    </b>
                                    <span>
                                      {p.folded
                                        ? "Folded"
                                        : p.score.total === 0
                                          ? "Hand kept hidden"
                                          : `${p.score.total} - ${p.score.combinations[0]?.label ?? "High Card"}`}
                                    </span>
                                    <small class="result-committed">
                                      <strong>
                                        {(p.netChips ?? p.payout - p.committed) > 0 ? "+" : ""}
                                        {format(p.netChips ?? p.payout - p.committed)}
                                      </strong>{" "}
                                      chips{" "}
                                      {(p.netChips ?? p.payout - p.committed) > 0
                                        ? "won"
                                        : (p.netChips ?? p.payout - p.committed) < 0
                                          ? "lost"
                                          : "net"}
                                    </small>
                                  </div>
                                  <div class="mini-hand">
                                    <For
                                      each={sortHand(p.cards, p.publicCards, game().config.mode)}
                                    >
                                      {(c) => <PlayingCard card={c} compact />}
                                    </For>
                                  </div>
                                </article>
                              )}
                            </For>
                          </div>
                          <p role="alert" class="dialog-error">
                            {error()}
                          </p>
                          <div class="result-actions">
                            <Show
                              when={game().gameScores.length >= game().gameNumber}
                              fallback={
                                <Button
                                  class="primary"
                                  disabled={busy() || !canDeal()}
                                  onClick={() =>
                                    perform(() =>
                                      gameAction(session(), {
                                        kind: "next-hand",
                                        viewerId: viewer() ?? "",
                                      }),
                                    )
                                  }
                                >
                                  Deal next round
                                </Button>
                              }
                            >
                              <Button class="primary" onClick={() => setResultStage("game")}>
                                See this game result
                              </Button>
                            </Show>
                          </div>
                        </section>
                      </Show>
                    </Modal>
                  )}
                </Show>
              </div>
            </div>
          </>
        )}
      </Show>
      <Show when={loanNotice().length > 0}>
        <Modal title="Loan taken" class="loan-dialog" onClose={() => setLoanNotice([])}>
          <img
            class="loan-description-stick"
            src="/assets/sticks/loan-decor.svg"
            alt="Loan stick"
          />
          <p>
            {loanNotice().join(" & ")} received a loan of <strong>{LOAN_VALUE}</strong> chips to
            stay in the game.
          </p>
          <p>
            The ante is paid from those chips. At the end of this game,{" "}
            <strong>{LOAN_PENALTY}</strong> points are deducted for the loan, even if the score
            becomes negative. That score counts toward the tournament total.
          </p>
          <p>
            Only one loan is available per game. If the ante becomes unaffordable again, the player
            is out until the next game. Loans reset at the start of the next tournament game.
          </p>
          <Button class="primary" onClick={() => setLoanNotice([])}>
            Got it
          </Button>
        </Modal>
      </Show>
      <Show when={rules()}>
        <Modal
          title="How to play"
          hideTitle
          class="drawer rules-drawer"
          onClose={() => setRules(false)}
        >
          <RulesContent mode={state()?.config.mode ?? mode()} />
        </Modal>
      </Show>
      <Show when={error()}>
        <div class="error-toast" role="alert">
          <span>{error()}</span>
          <Button aria-label="Dismiss error" onClick={() => setError("")}>
            ×
          </Button>
        </div>
      </Show>
    </main>
  )
}

function ScoreWinners(props: { game: PublicGameState; singleGame?: boolean }) {
  const scores = () =>
    props.singleGame
      ? (props.game.gameScores[props.game.gameNumber - 1] ?? {})
      : (props.game.finalScores ?? {})
  const best = () => Math.max(...Object.values(scores()))
  const winners = () => props.game.players.filter((p) => scores()[p.id] === best())
  return (
    <h2>
      {winners()
        .map((p) => p.name)
        .join(" & ")}{" "}
      {winners().length === 1 ? (winners()[0]?.name === "You" ? "win" : "wins") : "share the win"}{" "}
      with {format(best())} points.
    </h2>
  )
}

function TournamentScores(props: { game: PublicGameState; singleGame?: boolean }) {
  const recorded = () =>
    props.singleGame
      ? props.game.gameScores.slice(props.game.gameNumber - 1, props.game.gameNumber)
      : props.game.gameScores
  const total = (id: string) => recorded().reduce((sum, scores) => sum + (scores[id] ?? 0), 0)
  const inProgress = () => props.game.gameScores.length < props.game.gameNumber
  return (
    <div class="tournament-scores">
      <p hidden={props.singleGame || !inProgress()}>
        Totals include completed games only.{" "}
        <Show when={inProgress()}>
          Current chips are still in play and exclude chips committed to the pot.
        </Show>
      </p>
      <div class="scores-scroll">
        <table>
          <thead>
            <tr>
              <th scope="col">Player</th>
              <Show when={props.singleGame && props.game.config.mode !== "basic"}>
                <th scope="col">Loan deduction</th>
              </Show>
              <For each={recorded()}>
                {(_, index) => (
                  <th scope="col">Game {props.singleGame ? props.game.gameNumber : index() + 1}</th>
                )}
              </For>
              <Show when={!props.singleGame}>
                <th scope="col">Total</th>
              </Show>
              <Show when={inProgress()}>
                <th scope="col">Current chips</th>
              </Show>
            </tr>
          </thead>
          <tbody>
            <For each={[...props.game.players].sort((a, b) => total(b.id) - total(a.id))}>
              {(player) => (
                <tr>
                  <th scope="row">
                    <span class="score-player">
                      <SpiritAvatar
                        name={player.name}
                        controller={player.controller}
                        colorIndex={props.game.players.findIndex((p) => p.id === player.id)}
                      />
                      {player.name}
                      <Show
                        when={
                          !inProgress() &&
                          total(player.id) ===
                            Math.max(...props.game.players.map((p) => total(p.id)))
                        }
                      >
                        <span class="winner-trophy" role="img" aria-label="Winner">
                          🏆
                        </span>
                      </Show>
                    </span>
                  </th>
                  <Show when={props.singleGame && props.game.config.mode !== "basic"}>
                    <td>{player.loans ? `−${format(player.loans * LOAN_PENALTY)}` : "—"}</td>
                  </Show>
                  <For each={recorded()}>
                    {(scores) => <td>{format(scores[player.id] ?? 0)}</td>}
                  </For>
                  <Show when={!props.singleGame}>
                    <td>
                      <strong>{format(total(player.id))}</strong>
                    </td>
                  </Show>
                  <Show when={inProgress()}>
                    <td>{format(player.chips)}</td>
                  </Show>
                </tr>
              )}
            </For>
          </tbody>
        </table>
      </div>
    </div>
  )
}

function CycleBars(props: { label: string; current: number; total: number; action?: JSX.Element }) {
  return (
    <div class="cycle-bars">
      <span class="counter-label">
        {props.label}{" "}
        <strong>
          {props.current}/{props.total}
        </strong>
        {props.action}
      </span>
      <div
        class="progress-segments"
        role="progressbar"
        aria-label={props.label}
        aria-valuemin={0}
        aria-valuemax={props.total}
        aria-valuenow={props.current}
      >
        <For each={Array.from({ length: props.total })}>
          {(_, i) => (
            <i
              classList={{ complete: i() < props.current - 1, current: i() === props.current - 1 }}
            />
          )}
        </For>
      </div>
    </div>
  )
}
function privateCards(player?: PublicPlayerState): Card[] {
  return player && Array.isArray(player.privateCards) ? player.privateCards : []
}
function PlayingCard(props: { card: Card; compact?: boolean }) {
  return (
    <img
      class={`playing-card ${props.compact ? "compact" : ""}`}
      data-motion-key={`card-${props.card.id}`}
      src={cardAsset(props.card)}
      alt={cardLabel(props.card)}
      title={cardLabel(props.card)}
      width={825}
      height={1125}
      draggable={false}
    />
  )
}
function Lane(props: {
  title: string
  cards: Card[]
  concealed?: string[]
  enabled: boolean
  onPick: () => void
  onSwap?: (index: number) => void
  discarding: boolean
  discardAllowed: boolean
  ready: boolean
  onDiscard: () => void
}) {
  return (
    <div
      class="lane"
      data-lane={props.title === "Lane A" ? "a" : "b"}
      style={{ "--lane-count": Math.max(1, props.cards.length + 1) }}
    >
      <Show
        when={props.discarding}
        fallback={
          <div class="lane-cards">
            <Show when={props.cards.length} fallback={<span class="empty-lane">Empty lane</span>}>
              <For each={props.cards}>
                {(card, index) => (
                  <Show
                    when={!!props.onSwap || index() === props.cards.length - 1}
                    fallback={
                      <span
                        style={{
                          visibility: props.concealed?.includes(card.id) ? "hidden" : "visible",
                        }}
                      >
                        <PlayingCard card={card} compact />
                      </span>
                    }
                  >
                    <Button
                      class="fish-card"
                      style={{
                        visibility: props.concealed?.includes(card.id) ? "hidden" : "visible",
                      }}
                      disabled={!props.enabled}
                      aria-label={`Fish ${cardLabel(card)} from ${props.title}`}
                      onClick={() => (props.onSwap ? props.onSwap(index()) : props.onPick())}
                    >
                      <PlayingCard card={card} compact />
                    </Button>
                  </Show>
                )}
              </For>
            </Show>
          </div>
        }
      >
        <Button
          class="lane-cards discard-zone"
          classList={{
            available: props.discardAllowed,
            ready: props.discardAllowed && props.ready,
          }}
          disabled={!props.discardAllowed || !props.ready}
          aria-label={`Discard selected card to ${props.title}`}
          onClick={props.onDiscard}
        >
          <For each={props.cards}>{(card) => <PlayingCard card={card} compact />}</For>
          <Show when={props.discardAllowed}>
            <span class="discard-slot" aria-hidden="true">
              +
            </span>
          </Show>
        </Button>
      </Show>
    </div>
  )
}
function PlayerSeat(props: {
  readyToPass: boolean
  charlestonStatus?: string
  spentStick: boolean
  betting: boolean
  drawNotice?: DrawNotice
  mode: "basic" | "riichi" | "streamlined"
  player: PublicPlayerState
  active: boolean
  dealer: boolean
  colorIndex: number
}) {
  const known = createMemo(() => knownHand(props.player, props.mode))
  const hidden = () =>
    Array.isArray(props.player.privateCards)
      ? props.player.privateCards.length
      : props.player.privateCards.count
  return (
    <article
      class="opponent"
      data-player-id={props.player.id}
      classList={{
        robot: props.player.controller === "heuristic",
        active: props.active,
        betting: props.betting,
        folded: props.player.folded || props.player.eliminated,
      }}
    >
      <div
        class="opponent-heading"
        data-motion-key={`seat-${props.player.id}`}
        data-motion-value={`${props.active}-${props.player.chips}-${props.player.folded}`}
      >
        <SpiritAvatar
          controller={props.player.controller}
          name={props.player.name}
          colorIndex={props.colorIndex}
        />
        <div>
          <b>
            {props.player.name}{" "}
            <Show when={props.dealer}>
              <span class="dealer-label" title="Dealer">
                <span class="stick-tag">Dealer</span>
              </span>
            </Show>
          </b>
          <small>
            <strong>{format(props.player.chips)}</strong> chips
          </small>
        </div>
      </div>
      <div class="opponent-cards">
        <Show when={props.player.riichi}>
          <RiichiDeclared />
        </Show>
        <For each={[...props.player.publicCards].sort(compareCards)}>
          {(c) => <PlayingCard card={c} compact />}
        </For>
        <Show when={hidden() > 0}>
          <div class="opponent-private" style={{ "--hidden-count": hidden() }}>
            <For each={Array.from({ length: hidden() })}>
              {(_, index) => (
                <img
                  class="card-back"
                  classList={{ "ready-to-pass": props.readyToPass && index() >= hidden() - 2 }}
                  data-motion-key={`back-${props.player.id}-${index()}`}
                  src="/assets/cards/back.png"
                  alt="Hidden card"
                />
              )}
            </For>
          </div>
        </Show>
      </div>
      <div class="opponent-known-hand">
        <Show when={props.mode !== "basic"}>
          <RiichiSticks count={props.player.riichiSticks} spent={props.spentStick} compact />
        </Show>
        <Show when={!props.player.folded && !props.player.eliminated && known().label}>
          <b>
            <Show when={known().rank}>{known().rank} - </Show>
            {known().label}
          </b>
        </Show>
      </div>
      <div class="seat-summary" role="status">
        <span class="opponent-status">
          {props.player.eliminated
            ? "Out"
            : props.player.folded
              ? "Folded"
              : props.charlestonStatus
                ? props.charlestonStatus
                : props.active
                  ? props.drawNotice
                    ? "Fishing…"
                    : props.betting
                      ? "Betting…"
                      : "Choosing cards…"
                  : props.player.roundCommitted > 0
                    ? ""
                    : "In the round"}
        </span>
        <BetIndicator amount={props.player.roundCommitted} playerId={props.player.id} />
      </div>
    </article>
  )
}

function BetIndicator(props: { amount: number; playerId: string }) {
  return (
    <Show when={props.amount > 0}>
      <div
        class="seat-bet"
        data-motion-key={`wager-${props.playerId}`}
        data-motion-value={props.amount}
      >
        <span>Bet {format(props.amount)}</span>
        <span class="seat-bet-chips" aria-hidden="true">
          <ChipStack amount={props.amount} />
        </span>
      </div>
    </Show>
  )
}

function ChipStack(props: { amount: number; contributions?: number[] }) {
  const stacks = () => {
    const counts = new Map<number, number>()
    const contributions =
      props.contributions?.reduce((sum, n) => sum + n, 0) === props.amount
        ? props.contributions
        : [props.amount]
    for (const amount of contributions ?? [props.amount]) {
      let remaining = Math.max(0, amount)
      for (const value of [50, 20, 10, 5]) {
        const count = Math.floor((remaining + 1e-8) / value)
        remaining -= count * value
        counts.set(value, (counts.get(value) ?? 0) + count)
      }
    }
    return [...counts].map(([value, count]) => ({ value, count })).filter((stack) => stack.count)
  }
  return (
    <div class="chip-stacks" aria-label={`${format(props.amount)} chips`}>
      <For each={stacks()}>
        {(stack) => (
          <div
            class="denomination-stack"
            title={`${stack.count} × ${stack.value} = ${stack.count * stack.value} chips`}
          >
            <div
              class="stack-discs"
              style={{ height: `${44 + Math.min(stack.count - 1, 7) * 4}px` }}
            >
              <For each={Array.from({ length: Math.min(stack.count, 8) })}>
                {(_, index) => (
                  <span
                    aria-hidden="true"
                    class={`chip chip-${stack.value}`}
                    style={{ bottom: `${index() * 4}px` }}
                  >
                    {stack.value}
                  </span>
                )}
              </For>
            </div>
          </div>
        )}
      </For>
      <Show when={props.amount === 0}>
        <small>No chips</small>
      </Show>
    </div>
  )
}
function SeatIcon(props: { kind: SeatKind }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="28"
      height="28"
      fill="none"
      stroke="currentColor"
      stroke-width="1.6"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <Show when={props.kind === "human"}>
        <circle cx="12" cy="7" r="3" />
        <path d="M5 21v-3a7 7 0 0 1 14 0v3" />
      </Show>
      <Show when={props.kind === "robot"}>
        <rect x="4" y="6" width="16" height="15" rx="4" />
        <path d="M12 3v3M1 12v4M23 12v4M9 16h6" />
        <circle cx="8.5" cy="11" r=".75" />
        <circle cx="15.5" cy="11" r=".75" />
      </Show>
      <Show when={props.kind === "none"}>
        <circle cx="12" cy="12" r="9" />
        <path d="m6 18 12-12" />
      </Show>
    </svg>
  )
}

function FrontpageDecor(props: { special?: boolean; visible?: boolean } = {}) {
  // Sample once per visit, so choosing settings never rearranges the decoration.
  const pool = [
    "bamd.png",
    "crakd.svg",
    "dotd.svg",
    ...["bam", "dot", "crak"].flatMap((suit) =>
      Array.from({ length: 8 }, (_, i) => `${suit}${i + 2}.svg`),
    ),
  ]
  const cards = Array.from({ length: props.special ? 7 : 14 }, (_, index) => {
    const backRow = props.special ? index < 3 : index < 7
    const position = props.special ? [1, 3, 5, 0, 2, 4, 6][index]! : index % 7
    const direction = props.special ? -1 : 1
    return {
      image: props.special
        ? ["blank.svg", "windj.svg", "dotj.svg", "crakj.svg", "windj.svg", "bamj.png", "dotj.svg"][
            index
          ]!
        : pool.splice(Math.floor(Math.random() * pool.length), 1)[0]!,
      // Shared geometry; only horizontal positions and angles are mirrored.
      offset: `${direction * ((position - 3) * 13 + (backRow ? 6 : 0))}%`,
      lift: `${(backRow ? -80 : 0) + [0, 8, -6, 10, -8, 4, 0][position]!}px`,
      angle: `${direction * ((position - 3) * 9 + [0, -3, 2, 0, -2, 3, 0][position]!)}deg`,
      zIndex: (index + 1) * 2,
    }
  })
  return (
    <div
      class="frontpage-decor"
      classList={{ "expansion-decor": props.special, visible: props.visible }}
      aria-hidden="true"
    >
      <div class="decor-fan">
        <For each={cards}>
          {(card) => (
            <div
              class="decor-layer"
              style={{
                "--card-offset": card.offset,
                "--card-lift": card.lift,
                "--card-angle": card.angle,
                "z-index": card.zIndex,
              }}
            >
              <img
                src={`/assets/cards/${card.image}`}
                alt=""
                width="825"
                height="1125"
                draggable={false}
              />
            </div>
          )}
        </For>
        <Show when={props.special}>
          <For
            each={[
              // Compensate for each drawing's native angle, then follow the card fan.
              { kind: "riichi-decor", x: 10, y: -5, angle: -30, width: 130, layer: 15 },
              { kind: "dealer-decor", x: 180, y: 185, angle: 5, width: 74, layer: 11 },
            ]}
          >
            {(stick) => (
              <img
                class="decor-stick"
                src={`/assets/sticks/${stick.kind}.svg`}
                alt=""
                draggable={false}
                style={{
                  "--stick-x": `${stick.x}px`,
                  "--stick-y": `${stick.y}px`,
                  "--stick-angle": `${stick.angle}deg`,
                  width: `${stick.width}px`,
                  "z-index": stick.layer,
                }}
              />
            )}
          </For>
        </Show>
      </div>
    </div>
  )
}

function Modal(props: {
  title: string
  hideTitle?: boolean
  onClose: () => void
  children: JSX.Element
  dismissible?: boolean
  class?: string
}) {
  let element!: HTMLDialogElement
  const previousOverflow = document.body.style.overflow
  onMount(() => {
    document.body.style.overflow = "hidden"
    element.showModal()
  })
  onCleanup(() => {
    element.close()
    document.body.style.overflow = previousOverflow
  })
  return (
    <dialog
      ref={(node) => {
        element = node
      }}
      class={`game-dialog ${props.class ?? ""}`}
      aria-label={props.title}
      onCancel={(event) => {
        event.preventDefault()
        if (props.dismissible !== false) props.onClose()
      }}
      onClick={(event) => {
        if (event.target === element) {
          const rect = element.getBoundingClientRect()
          if (
            event.clientX < rect.left ||
            event.clientX > rect.right ||
            event.clientY < rect.top ||
            event.clientY > rect.bottom
          )
            if (props.dismissible !== false) props.onClose()
        }
      }}
    >
      <header class="dialog-heading">
        <Show when={!props.hideTitle}>
          <h2>{props.title}</h2>
        </Show>
        <Show when={props.dismissible !== false}>
          <Button aria-label={`Close ${props.title}`} onClick={props.onClose}>
            ×
          </Button>
        </Show>
      </header>
      {props.children}
    </dialog>
  )
}
