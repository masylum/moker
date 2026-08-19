import { For, Show, createEffect, createMemo, createSignal } from "solid-js"
import { cardLabel, compareCards, suitLabel } from "../game/cards"
import { MAX_LOANS } from "../game/rules"
import type {
  BettingAction,
  BlankExchange,
  Card,
  CardSource,
  DebugGameView,
  DrawDiscardRecord,
  HandResult,
  PokerMathAnalysis,
  PublicGameState,
  PublicPlayerState,
} from "../game/types"
import { FLOWERS } from "../game/types"
import {
  bettingAction,
  botStep,
  createGame,
  gameAction,
  getEvents,
  loadDebugGame,
  loadGame,
  runSimulations,
} from "./api"

const storedSession = localStorage.getItem("mahjong-poker-session") ?? ""

export function App() {
  const [sessionId, setSessionId] = createSignal(storedSession)
  const [seed, setSeed] = createSignal("jade-table-01")
  const [state, setState] = createSignal<PublicGameState>()
  const [busy, setBusy] = createSignal(false)
  const [error, setError] = createSignal("")
  const [notice, setNotice] = createSignal("Create a seeded table to begin.")
  const [drawChoice, setDrawChoice] = createSignal("deck")
  const [wager, setWager] = createSignal(10)
  const [riichi, setRiichi] = createSignal(false)
  const [debugEnabled, setDebugEnabled] = createSignal(false)
  const [debugView, setDebugView] = createSignal<DebugGameView>()
  const [events, setEvents] = createSignal<
    Array<{
      sequence: number
      handNumber: number
      type: string
      actorId?: string
      payload: unknown
    }>
  >([])
  const [simulationCount, setSimulationCount] = createSignal(4)
  const [simulationResults, setSimulationResults] = createSignal<
    Array<{ sessionId: string; seed: string; finalScores: Record<string, number> }>
  >([])

  const human = createMemo(() => state()?.players.find((player) => player.controller === "human"))
  const actor = createMemo(() => {
    const game = state()

    if (!game) {
      return undefined
    }

    const id = game.phase === "discarding" ? game.pendingDiscard?.playerId : game.actingPlayerId
    return game.players.find((player) => player.id === id)
  })
  const isHumanTurn = createMemo(() => actor()?.controller === "human")

  const refreshDebug = async () => {
    if (!debugEnabled() || !sessionId()) {
      return
    }

    try {
      setDebugView(await loadDebugGame(sessionId()))
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not refresh debug math")
    }
  }

  const perform = async (work: () => Promise<{ state: PublicGameState }>, success?: string) => {
    setBusy(true)
    setError("")
    try {
      const result = await work()
      setState(result.state)
      await refreshDebug()
      if (success) setNotice(success)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Something went wrong")
    } finally {
      setBusy(false)
    }
  }

  const start = async () => {
    setBusy(true)
    setError("")
    try {
      const result = await createGame(seed())
      setSessionId(result.sessionId)
      localStorage.setItem("mahjong-poker-session", result.sessionId)
      setState(result.state)
      setNotice(`Table created from seed “${seed()}”.`)
      setEvents([])
      setDebugView(undefined)
      await refreshDebug()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not create game")
    } finally {
      setBusy(false)
    }
  }

  const resume = () =>
    perform(async () => {
      const result = await loadGame(sessionId())
      return { state: result.state }
    }, "Saved table restored.")

  const act = (action: BettingAction) => {
    setRiichi(false)

    return perform(() => bettingAction(sessionId(), "p1", action))
  }
  const humanPlayer = () => human()
  const canHumanRiichi = () => {
    const game = state()

    return Boolean(
      game &&
      game.street < 4 &&
      !game.players.some((player) => player.riichi) &&
      humanPlayer()?.privateCards,
    )
  }
  const callAmount = () =>
    Math.max(0, (state()?.currentWager ?? 0) - (humanPlayer()?.roundCommitted ?? 0))
  const minimumWager = () => {
    const game = state()

    if (!game) {
      return 5
    }

    return game.currentWager === 0 ? 5 : game.currentWager + game.minimumRaise
  }
  const maximumWager = () => (human()?.roundCommitted ?? 0) + (human()?.chips ?? 0)
  const sortedCommunity = () => [...(state()?.community ?? [])].sort(compareCards)
  const debugPlayer = (playerId: string) =>
    debugView()?.state.players.find((player) => player.id === playerId)
  const debugAnalysis = (playerId: string) =>
    debugView()?.analyses.find((analysis) => analysis.playerId === playerId)
  const recentDraw = (playerId: string) =>
    debugView()
      ?.recentDrawDiscards.filter((record) => record.playerId === playerId)
      .at(-1)
  const drawAction = (type: "check" | "call"): BettingAction => {
    const [kind, blankCardId, pile, cardIndex] = drawChoice().split(":")

    if (kind === "blank" && blankCardId && (pile === "a" || pile === "b")) {
      const blankExchange: BlankExchange = {
        blankCardId,
        pile,
        cardIndex: Number(cardIndex),
      }

      return { type, drawSource: "deck", blankExchange }
    }

    const source: CardSource =
      kind && ["deck", "discard-a", "discard-b"].includes(kind) ? (kind as CardSource) : "deck"

    return { type, drawSource: source }
  }

  createEffect(() => {
    const minimum = minimumWager()

    if (state() && (wager() < minimum || wager() % 5 !== 0)) {
      setWager(minimum)
    }
  })

  const runBot = async () => {
    const controller = actor()?.controller

    if (controller !== "heuristic" && controller !== "llm") {
      return
    }

    setBusy(true)
    setError("")
    try {
      const result = await botStep(sessionId(), controller)
      setState(result.state)
      setNotice(result.rationale)
      await refreshDebug()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Bot turn failed")
    } finally {
      setBusy(false)
    }
  }

  const toggleDebug = async (enabled: boolean) => {
    setDebugEnabled(enabled)

    if (!enabled) {
      setDebugView(undefined)

      return
    }

    try {
      setDebugView(await loadDebugGame(sessionId()))
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load debug math")
    }
  }

  const refreshEvents = async () => {
    if (!sessionId()) {
      return
    }

    try {
      setEvents((await getEvents(sessionId())).events)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load events")
    }
  }

  const simulate = async () => {
    setBusy(true)
    setError("")
    try {
      const result = await runSimulations(seed(), simulationCount())
      setSimulationResults(result.results)
      setNotice(`${result.results.length} deterministic games simulated and persisted.`)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Simulation failed")
    } finally {
      setBusy(false)
    }
  }

  return (
    <main>
      <header class="masthead">
        <div>
          <p class="eyebrow">Deterministic playtest environment</p>
          <h1>
            Mahjong <i>Poker</i> Lab
          </h1>
        </div>
        <div class="session-chip">
          <span>Session</span>
          {sessionId() || "not started"}
        </div>
      </header>

      <Show when={!state()}>
        <section class="welcome panel">
          <div class="welcome-copy">
            <p class="kicker">Four seats. Twelve hands. One very expensive fold.</p>
            <h2>Test the table, not your patience.</h2>
            <p>
              Every shuffle and bot rollout is seeded. Replay a surprising hand exactly, inspect its
              event trail, then run a batch to see whether it was luck or a balance problem.
            </p>
          </div>
          <div class="launch-card">
            <label>
              Game seed
              <input value={seed()} onInput={(event) => setSeed(event.currentTarget.value)} />
            </label>
            <button class="primary" disabled={busy()} onClick={start}>
              Deal a new table
            </button>
            <Show when={sessionId()}>
              <button class="ghost" disabled={busy()} onClick={resume}>
                Resume saved session
              </button>
            </Show>
          </div>
        </section>
      </Show>

      <Show when={state()} keyed>
        {(game) => (
          <>
            <section class="status-strip">
              <div>
                <span>Hand</span>
                <strong>
                  {game.handNumber} / {game.maxHands}
                </strong>
              </div>
              <div>
                <span>Orbit</span>
                <strong>
                  {game.orbit} · {game.orbitValue}¢
                </strong>
              </div>
              <div>
                <span>Street</span>
                <strong>{game.street || "—"}</strong>
              </div>
              <div>
                <span>Pot</span>
                <strong>{game.pot}</strong>
              </div>
              <div>
                <span>Wager to match</span>
                <strong>{game.currentWager || "—"}</strong>
              </div>
              <div>
                <span>Blue center</span>
                <strong>{game.centerBlueSticks}</strong>
              </div>
              <div>
                <span>Phase</span>
                <strong>{game.phase.replace("-", " ")}</strong>
              </div>
            </section>

            <div class="debug-switch">
              <label class="check">
                <input
                  type="checkbox"
                  checked={debugEnabled()}
                  onChange={(event) => void toggleDebug(event.currentTarget.checked)}
                />
                Debug table: reveal hands and tournament math
              </label>
              <small>Monte Carlo estimates use only information visible to each player.</small>
            </div>

            <section class="table-shell">
              <div class={`felt ${debugEnabled() ? "debug-felt" : ""}`}>
                <div class="community">
                  <p>Community · {game.community.length} / 5</p>
                  <div class="tiles">
                    <For each={sortedCommunity()}>{(card) => <Tile card={card} />}</For>
                  </div>
                </div>
                <div class="discard discard-a">
                  <span>Discard A</span>
                  <div class="lane-tiles">
                    <For each={game.discardA}>{(card) => <Tile card={card} compact />}</For>
                  </div>
                </div>
                <div class="discard discard-b">
                  <span>Discard B</span>
                  <div class="lane-tiles">
                    <For each={game.discardB}>{(card) => <Tile card={card} compact />}</For>
                  </div>
                </div>
                <For each={game.players}>
                  {(player, index) => (
                    <Seat
                      player={player}
                      active={actor()?.id === player.id}
                      position={index()}
                      debugPlayer={debugEnabled() ? debugPlayer(player.id) : undefined}
                      analysis={debugEnabled() ? debugAnalysis(player.id) : undefined}
                      recentDraw={debugEnabled() ? recentDraw(player.id) : undefined}
                      recommendation={
                        debugEnabled() && debugView()?.actingDecision?.playerId === player.id
                          ? debugView()?.actingDecision?.action
                          : undefined
                      }
                    />
                  )}
                </For>
                <div class="pot-mark">
                  <span>POT</span>
                  <strong>{game.pot}</strong>
                  <span>BLUE {game.centerBlueSticks}</span>
                </div>
              </div>
            </section>

            <Show
              when={
                (game.phase === "between-hands" || game.phase === "finished") &&
                game.handResults.at(-1)
              }
            >
              {(result) => <HandSummary result={result()} />}
            </Show>

            <section class="hand-panel panel">
              <div class="hand-heading">
                <div>
                  <p class="eyebrow">Your private hand</p>
                  <h2>
                    {game.phase === "seeding"
                      ? "Choose one tile to seed the discards"
                      : human()?.riichi
                        ? "Locked in Riichi"
                        : "Three tiles, many futures"}
                  </h2>
                </div>
                <div class="wallet">
                  <span>{human()?.chips} chips</span>
                  <span class="blue">● {human()?.blueSticks}</span>
                  <span class="red">● {human()?.loans}</span>
                </div>
              </div>
              <div class="tiles private">
                <For each={privateCards(human())}>{(card) => <Tile card={card} />}</For>
              </div>

              <div class="controls">
                <Show when={isHumanTurn() && game.phase === "seeding"}>
                  <p class="instruction">
                    Discard one of your four private tiles face up. You will play the hand with the
                    remaining three.
                  </p>
                  <For each={privateCards(human())}>
                    {(card) => (
                      <div class="discard-choice">
                        <Tile card={card} compact />
                        <button
                          disabled={
                            busy() || (game.discardA.length > 0 && game.discardB.length === 0)
                          }
                          onClick={() =>
                            perform(() =>
                              gameAction(sessionId(), {
                                kind: "seed-discard",
                                playerId: "p1",
                                discardCardId: card.id,
                                discardPile: "a",
                              }),
                            )
                          }
                        >
                          to A
                        </button>
                        <button
                          disabled={
                            busy() || (game.discardB.length > 0 && game.discardA.length === 0)
                          }
                          onClick={() =>
                            perform(() =>
                              gameAction(sessionId(), {
                                kind: "seed-discard",
                                playerId: "p1",
                                discardCardId: card.id,
                                discardPile: "b",
                              }),
                            )
                          }
                        >
                          to B
                        </button>
                      </div>
                    )}
                  </For>
                </Show>

                <Show when={isHumanTurn() && game.phase === "betting"}>
                  <label>
                    Draw after check/call
                    <select
                      value={drawChoice()}
                      disabled={human()?.riichi}
                      onChange={(event) => setDrawChoice(event.currentTarget.value)}
                    >
                      <option value="deck">
                        {human()?.riichi ? "Riichi hand is locked" : "Deck (hidden)"}
                      </option>
                      <option value="discard-a" disabled={game.discardA.length === 0}>
                        Discard A
                      </option>
                      <option value="discard-b" disabled={game.discardB.length === 0}>
                        Discard B
                      </option>
                      <For
                        each={
                          human()?.riichi
                            ? []
                            : privateCards(human()).filter((card) => card.kind === "blank")
                        }
                      >
                        {(blank) => (
                          <>
                            <For each={game.discardA}>
                              {(card, index) => (
                                <option value={`blank:${blank.id}:a:${index()}`}>
                                  Blank swap · A{index() + 1} · {cardLabel(card)}
                                </option>
                              )}
                            </For>
                            <For each={game.discardB}>
                              {(card, index) => (
                                <option value={`blank:${blank.id}:b:${index()}`}>
                                  Blank swap · B{index() + 1} · {cardLabel(card)}
                                </option>
                              )}
                            </For>
                          </>
                        )}
                      </For>
                    </select>
                  </label>
                  <button
                    disabled={busy() || callAmount() > 0}
                    onClick={() => act(drawAction("check"))}
                  >
                    {human()?.riichi ? "Check" : "Check + Draw & Discard"}
                  </button>
                  <button
                    disabled={busy() || callAmount() === 0 || (human()?.chips ?? 0) < callAmount()}
                    onClick={() => act(drawAction("call"))}
                  >
                    Call {callAmount()}
                    {human()?.riichi ? "" : " + Draw & Discard"}
                  </button>
                  <label>
                    Wager
                    <input
                      type="number"
                      min={minimumWager()}
                      max={maximumWager()}
                      step="5"
                      value={wager()}
                      onInput={(event) => setWager(event.currentTarget.valueAsNumber)}
                    />
                  </label>
                  <label class="check">
                    <input
                      type="checkbox"
                      checked={riichi()}
                      disabled={!canHumanRiichi()}
                      onChange={(event) => setRiichi(event.currentTarget.checked)}
                    />{" "}
                    Riichi
                  </label>
                  <button
                    class="accent"
                    disabled={
                      busy() ||
                      wager() < minimumWager() ||
                      wager() > maximumWager() ||
                      wager() % 5 !== 0
                    }
                    onClick={() =>
                      act(
                        game.currentWager === 0
                          ? {
                              type: "bet",
                              amount: wager(),
                              riichi: riichi() && canHumanRiichi(),
                            }
                          : {
                              type: "raise",
                              amount: wager(),
                              riichi: riichi() && canHumanRiichi(),
                            },
                      )
                    }
                  >
                    {game.currentWager === 0 ? "Bet" : `Raise (min ${minimumWager()})`}
                  </button>
                  <button class="danger" disabled={busy()} onClick={() => act({ type: "fold" })}>
                    Fold + 2 blue sticks
                  </button>
                </Show>

                <Show when={isHumanTurn() && game.phase === "discarding"}>
                  <p class="instruction">
                    Choose one tile to discard. An empty pile must be filled first.
                  </p>
                  <For each={privateCards(human())}>
                    {(card) => (
                      <div class="discard-choice">
                        <span>{cardLabel(card)}</span>
                        <button
                          disabled={busy()}
                          onClick={() =>
                            perform(() =>
                              gameAction(sessionId(), {
                                kind: "discard",
                                playerId: "p1",
                                discardCardId: card.id,
                                discardPile: "a",
                              }),
                            )
                          }
                        >
                          to A
                        </button>
                        <button
                          disabled={busy()}
                          onClick={() =>
                            perform(() =>
                              gameAction(sessionId(), {
                                kind: "discard",
                                playerId: "p1",
                                discardCardId: card.id,
                                discardPile: "b",
                              }),
                            )
                          }
                        >
                          to B
                        </button>
                      </div>
                    )}
                  </For>
                </Show>

                <Show when={actor() && !isHumanTurn()}>
                  <p class="instruction">
                    {actor()?.name} is deciding with{" "}
                    {actor()?.controller === "llm"
                      ? "Grok via Cloudflare Think"
                      : "seeded statistical heuristics"}
                    .
                  </p>
                  <button class="primary" disabled={busy()} onClick={runBot}>
                    Run {actor()?.name}'s turn
                  </button>
                </Show>

                <Show when={game.phase === "between-hands"}>
                  <button
                    class="primary"
                    disabled={busy()}
                    onClick={() =>
                      perform(() => gameAction(sessionId(), { kind: "next-hand", viewerId: "p1" }))
                    }
                  >
                    Deal next hand
                  </button>
                </Show>
                <Show when={game.phase === "finished"}>
                  <p class="instruction">
                    Game complete. Final scores: {JSON.stringify(game.finalScores)}
                  </p>
                </Show>
                <button
                  class="ghost"
                  disabled={
                    busy() || Boolean(human()?.eliminated) || (human()?.loans ?? 0) >= MAX_LOANS
                  }
                  onClick={() =>
                    perform(() => gameAction(sessionId(), { kind: "take-loan", playerId: "p1" }))
                  }
                >
                  Take 200 loan
                </button>
                <button
                  class="ghost"
                  disabled={busy() || (human()?.loans ?? 0) === 0 || (human()?.chips ?? 0) < 200}
                  onClick={() =>
                    perform(() => gameAction(sessionId(), { kind: "repay-loan", playerId: "p1" }))
                  }
                >
                  Repay loan
                </button>
              </div>
            </section>

            <section class="analysis-grid">
              <article class="panel">
                <div class="section-title">
                  <div>
                    <p class="eyebrow">Replay ledger</p>
                    <h3>What actually happened</h3>
                  </div>
                  <button class="ghost" onClick={refreshEvents}>
                    Refresh
                  </button>
                </div>
                <div class="event-list">
                  <For
                    each={events()}
                    fallback={
                      <p class="muted">Load the ledger to inspect every persisted transition.</p>
                    }
                  >
                    {(event) => (
                      <div class="event">
                        <span>#{event.sequence}</span>
                        <strong>{event.type.replaceAll("-", " ")}</strong>
                        <small>
                          hand {event.handNumber}
                          {event.actorId ? ` · ${event.actorId}` : ""}
                        </small>
                      </div>
                    )}
                  </For>
                </div>
              </article>
              <article class="panel">
                <p class="eyebrow">Balance batch</p>
                <h3>Luck needs a larger sample</h3>
                <p class="muted">
                  Run complete heuristic games. Each result has its own durable replay session.
                </p>
                <label>
                  Games
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={simulationCount()}
                    onInput={(event) => setSimulationCount(event.currentTarget.valueAsNumber)}
                  />
                </label>
                <button class="primary" disabled={busy()} onClick={simulate}>
                  Simulate & persist
                </button>
                <div class="sim-results">
                  <For each={simulationResults()}>
                    {(result) => (
                      <button
                        class="result"
                        onClick={() => {
                          setSessionId(result.sessionId)
                          void resume()
                        }}
                      >
                        <span>{result.seed}</span>
                        <strong>
                          {Object.entries(result.finalScores)
                            .sort((a, b) => b[1] - a[1])[0]
                            ?.join(" · ")}
                        </strong>
                      </button>
                    )}
                  </For>
                </div>
              </article>
            </section>
          </>
        )}
      </Show>

      <footer>
        <p>{notice()}</p>
        <Show when={error()}>
          <p class="error">{error()}</p>
        </Show>
      </footer>
    </main>
  )
}

function Seat(props: {
  player: PublicPlayerState
  active: boolean
  position: number
  debugPlayer?: PublicPlayerState
  analysis?: PokerMathAnalysis
  recentDraw?: DrawDiscardRecord
  recommendation?: BettingAction
}) {
  return (
    <div
      class={`seat seat-${props.position} ${props.active ? "active" : ""} ${props.player.folded ? "folded" : ""} ${props.debugPlayer ? "debug-seat" : ""}`}
    >
      <div class="avatar">{props.player.name.slice(0, 1)}</div>
      <div class="seat-content">
        <strong>{props.player.name}</strong>
        <small>
          {props.player.controller} · {props.player.chips} chips
        </small>
        <small>
          <b class="blue">● {props.player.blueSticks}</b> <b class="red">● {props.player.loans}</b>
          {props.player.riichi ? " · RIICHI" : ""}
          {props.player.eliminated ? " · ELIMINATED" : ""}
        </small>
        <small class="seat-bet">
          Street {props.player.roundCommitted} · total {props.player.handCommitted}
        </small>
        <Show when={!props.debugPlayer && !Array.isArray(props.player.privateCards)}>
          <div class="tiles">
            <For each={props.player.knownPrivateCards}>
              {(card) => <Tile card={card} compact />}
            </For>
            <For
              each={Array.from({
                length: Math.max(
                  0,
                  ("count" in props.player.privateCards ? props.player.privateCards.count : 0) -
                    props.player.knownPrivateCards.length,
                ),
              })}
            >
              {() => <span class="hidden-tile">🀫</span>}
            </For>
          </div>
        </Show>
        <Show when={props.debugPlayer}>
          {(player) => (
            <div class="seat-debug">
              <div class="tiles">
                <For each={privateCards(player())}>{(card) => <Tile card={card} compact />}</For>
              </div>
              <Show when={props.analysis}>
                {(analysis) => (
                  <>
                    <div class="seat-math">
                      <span>
                        Equity <b>{formatPercent(analysis().showdownEquity)}</b>
                      </span>
                      <span>
                        Pot odds <b>{formatPercent(analysis().potOdds)}</b>
                      </span>
                      <span>
                        Edge{" "}
                        <b class={analysis().equityEdge >= 0 ? "positive" : "negative"}>
                          {formatSignedPercent(analysis().equityEdge)}
                        </b>
                      </span>
                      <span>
                        To call <b>{analysis().toCall}</b>
                      </span>
                      <span>
                        Avg rank <b>{analysis().expectedScore.toFixed(1)}</b>
                      </span>
                      <span>
                        Public range <b>{analysis().knownOpponentTiles} tiles</b>
                      </span>
                      <span>
                        Opponent action <b>{analysis().opponentAggressiveActions} aggressive</b>
                      </span>
                      <span>
                        Improves <b>{analysis().improveRate.toFixed(0)}%</b>
                      </span>
                      <span>
                        Call EV{" "}
                        <b class={analysis().callExpectedValue >= 0 ? "positive" : "negative"}>
                          {formatSignedNumber(analysis().callExpectedValue)}
                        </b>
                      </span>
                    </div>
                    <div class="seat-progress">
                      <span>
                        Best · <b>{analysis().currentBest.label}</b> (rank{" "}
                        {analysis().currentBest.rank})
                      </span>
                      <span>
                        Next ·{" "}
                        <b>
                          {analysis().nextClosest
                            ? `${analysis().nextClosest!.label}, ${analysis().nextClosest!.missing} away`
                            : "top of ladder"}
                        </b>
                      </span>
                    </div>
                  </>
                )}
              </Show>
              <Show when={props.recommendation}>
                {(action) => (
                  <small class="recommendation">Baseline · {formatAction(action())}</small>
                )}
              </Show>
              <Show when={props.recentDraw}>
                {(record) => (
                  <small class="draw-debug">
                    {record().source === "blank-exchange" ? "Swapped for" : "Drew"}{" "}
                    {cardLabel(record().drawnCard)} · left {cardLabel(record().discardedCard)} in{" "}
                    {record().discardPile.toUpperCase()}
                  </small>
                )}
              </Show>
            </div>
          )}
        </Show>
      </div>
    </div>
  )
}

function HandSummary(props: { result: HandResult }) {
  const winnerNames = () =>
    props.result.players
      .filter((player) => props.result.winnerIds.includes(player.playerId))
      .map((player) => `${player.name} (+${player.payout})`)
      .join(", ")

  return (
    <section class="result-panel panel">
      <div class="section-title">
        <div>
          <p class="eyebrow">Hand {props.result.handNumber} result</p>
          <h3>
            {winnerNames()} won the {props.result.pot}-chip pot
          </h3>
        </div>
        <span class="result-reason">
          {props.result.reason === "uncontested" ? "Won by folds" : "Showdown"}
        </span>
      </div>
      <div class="result-community">
        <span>Board</span>
        <div class="tiles">
          <For each={[...props.result.community].sort(compareCards)}>
            {(card) => <Tile card={card} compact />}
          </For>
        </div>
      </div>
      <Show when={props.result.boardResets > 0}>
        <p class="instruction">
          Flowers reset the board {props.result.boardResets} time
          {props.result.boardResets === 1 ? "" : "s"} this hand.
        </p>
      </Show>
      <Show when={props.result.flowerBonus}>
        {(bonus) => (
          <p class="instruction">
            Flower bluff bonus: +{bonus().total} ({bonus().perOpponent} from every opponent).
          </p>
        )}
      </Show>
      <Show when={props.result.riichiSettlement}>
        {(settlement) => (
          <p class="instruction">
            Riichi settled: {settlement().returnedToCenter} returned to the center;{" "}
            {settlement().recipientIds.length} opponent
            {settlement().recipientIds.length === 1 ? "" : "s"} received a blue stick.
          </p>
        )}
      </Show>
      <div class="revealed-hands">
        <For each={props.result.players}>
          {(player) => (
            <article class={props.result.winnerIds.includes(player.playerId) ? "winner" : ""}>
              <div>
                <strong>{player.name}</strong>
                <small>
                  {player.folded
                    ? "Folded"
                    : player.flowerDisqualified
                      ? "Single Flower · ineligible"
                      : "Showed"}{" "}
                  · committed {player.committed} · payout +{player.payout}
                </small>
              </div>
              <div class="tiles">
                <For each={player.cards}>{(card) => <Tile card={card} compact />}</For>
              </div>
              <p>
                <b>Rank {player.score.total}</b> · {scoreLabel(player.score)}
              </p>
            </article>
          )}
        </For>
      </div>
    </section>
  )
}

function Tile(props: { card: Card; compact?: boolean }) {
  const short = () =>
    props.card.kind === "numbered"
      ? `${props.card.rank}${props.card.suit[0]!.toUpperCase()}`
      : props.card.kind === "dragon"
        ? `${props.card.dragon[0]!.toUpperCase()}D`
        : props.card.kind === "wind"
          ? `${props.card.wind[0]!.toUpperCase()}W`
          : props.card.kind === "flower"
            ? String.fromCodePoint(0x1f022 + FLOWERS.indexOf(props.card.flower))
            : props.card.kind === "joker"
              ? "★"
              : "□"
  return (
    <div
      class={`tile ${props.card.kind} color-${props.card.color ?? "none"} ${props.compact ? "compact" : ""}`}
      title={cardLabel(props.card)}
    >
      <span>{short()}</span>
      <small>
        {props.card.kind === "numbered"
          ? suitLabel(props.card.suit)
          : props.card.kind === "joker"
            ? props.card.color
            : props.card.kind}
      </small>
    </div>
  )
}

function privateCards(player?: PublicPlayerState): Card[] {
  return player && Array.isArray(player.privateCards) ? player.privateCards : []
}

function scoreLabel(score: HandResult["players"][number]["score"]): string {
  const combination = score.combinations[0]

  return combination?.description ?? combination?.label ?? "High Card"
}

function formatAction(action: BettingAction): string {
  if (action.type === "bet" || action.type === "raise") {
    return `${action.type} ${action.amount}${action.riichi ? " + Riichi" : ""}`
  }

  if (action.type === "check" || action.type === "call") {
    return `${action.type}${action.blankExchange ? " + Blank exchange" : " + Draw & Discard"}`
  }

  return action.type
}

function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`
}

function formatSignedPercent(value: number): string {
  return `${value >= 0 ? "+" : ""}${Math.round(value * 100)}%`
}

function formatSignedNumber(value: number): string {
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}`
}
