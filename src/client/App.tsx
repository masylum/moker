import { For, Show, createMemo, createSignal } from "solid-js";
import { cardLabel } from "../game/cards";
import type { BettingAction, Card, CardSource, PublicGameState, PublicPlayerState } from "../game/types";
import { bettingAction, botStep, createGame, gameAction, getEvents, loadGame, runSimulations } from "./api";

const storedSession = localStorage.getItem("mahjong-poker-session") ?? "";

export function App() {
  const [sessionId, setSessionId] = createSignal(storedSession);
  const [seed, setSeed] = createSignal("jade-table-01");
  const [state, setState] = createSignal<PublicGameState>();
  const [busy, setBusy] = createSignal(false);
  const [error, setError] = createSignal("");
  const [notice, setNotice] = createSignal("Create a seeded table to begin.");
  const [drawSource, setDrawSource] = createSignal<CardSource>("deck");
  const [wager, setWager] = createSignal(10);
  const [riichi, setRiichi] = createSignal(false);
  const [events, setEvents] = createSignal<Array<{ sequence: number; handNumber: number; type: string; actorId?: string; payload: unknown }>>([]);
  const [simulationCount, setSimulationCount] = createSignal(4);
  const [simulationResults, setSimulationResults] = createSignal<Array<{ sessionId: string; seed: string; finalScores: Record<string, number> }>>([]);

  const human = createMemo(() => state()?.players.find((player) => player.controller === "human"));
  const actor = createMemo(() => {
    const game = state();
    if (!game) return undefined;
    const id = game.phase === "discarding" ? game.pendingDiscard?.playerId : game.phase === "blank-window" ? game.blankWindow?.eligiblePlayerIds[0] : game.actingPlayerId;
    return game.players.find((player) => player.id === id);
  });
  const isHumanTurn = createMemo(() => actor()?.controller === "human");

  const perform = async (work: () => Promise<{ state: PublicGameState }>, success?: string) => {
    setBusy(true);
    setError("");
    try {
      const result = await work();
      setState(result.state);
      if (success) setNotice(success);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  const start = async () => {
    setBusy(true);
    setError("");
    try {
      const result = await createGame(seed());
      setSessionId(result.sessionId);
      localStorage.setItem("mahjong-poker-session", result.sessionId);
      setState(result.state);
      setNotice(`Table created from seed “${seed()}”.`);
      setEvents([]);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not create game");
    } finally { setBusy(false); }
  };

  const resume = () => perform(async () => {
    const result = await loadGame(sessionId());
    return { state: result.state };
  }, "Saved table restored.");

  const act = (action: BettingAction) => perform(() => bettingAction(sessionId(), "p1", action));
  const humanPlayer = () => human();
  const callAmount = () => Math.max(0, (state()?.currentWager ?? 0) - (humanPlayer()?.roundCommitted ?? 0));

  const runBot = async () => {
    const controller = actor()?.controller;
    if (controller !== "heuristic" && controller !== "llm") return;
    setBusy(true);
    setError("");
    try {
      const result = await botStep(sessionId(), controller);
      setState(result.state);
      setNotice(result.rationale);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Bot turn failed");
    } finally { setBusy(false); }
  };

  const refreshEvents = async () => {
    if (!sessionId()) return;
    try { setEvents((await getEvents(sessionId())).events); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Could not load events"); }
  };

  const simulate = async () => {
    setBusy(true);
    setError("");
    try {
      const result = await runSimulations(seed(), simulationCount());
      setSimulationResults(result.results);
      setNotice(`${result.results.length} deterministic games simulated and persisted.`);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Simulation failed"); }
    finally { setBusy(false); }
  };

  return (
    <main>
      <header class="masthead">
        <div>
          <p class="eyebrow">Deterministic playtest environment</p>
          <h1>Mahjong <i>Poker</i> Lab</h1>
        </div>
        <div class="session-chip"><span>Session</span>{sessionId() || "not started"}</div>
      </header>

      <Show when={!state()}>
        <section class="welcome panel">
          <div class="welcome-copy">
            <p class="kicker">Four seats. Twelve hands. One very expensive fold.</p>
            <h2>Test the table, not your patience.</h2>
            <p>Every shuffle and bot rollout is seeded. Replay a surprising hand exactly, inspect its event trail, then run a batch to see whether it was luck or a balance problem.</p>
          </div>
          <div class="launch-card">
            <label>Game seed<input value={seed()} onInput={(event) => setSeed(event.currentTarget.value)} /></label>
            <button class="primary" disabled={busy()} onClick={start}>Deal a new table</button>
            <Show when={sessionId()}><button class="ghost" disabled={busy()} onClick={resume}>Resume saved session</button></Show>
          </div>
        </section>
      </Show>

      <Show when={state()} keyed>{(game) => <>
        <section class="status-strip">
          <div><span>Hand</span><strong>{game.handNumber} / {game.maxHands}</strong></div>
          <div><span>Orbit</span><strong>{game.orbit} · {game.orbitValue}¢</strong></div>
          <div><span>Street</span><strong>{game.street || "—"}</strong></div>
          <div><span>Pot</span><strong>{game.pot}</strong></div>
          <div><span>Blue center</span><strong>{game.centerBlueSticks}</strong></div>
          <div><span>Phase</span><strong>{game.phase.replace("-", " ")}</strong></div>
        </section>

        <section class="table-shell">
          <div class="felt">
            <div class="community">
              <p>Community · {game.community.length} / 8</p>
              <div class="tiles"><For each={game.community}>{(card) => <Tile card={card} />}</For></div>
            </div>
            <div class="discard discard-a"><span>Discard A</span><Show when={game.discardA.at(-1)}>{(card) => <Tile card={card()} compact />}</Show></div>
            <div class="discard discard-b"><span>Discard B</span><Show when={game.discardB.at(-1)}>{(card) => <Tile card={card()} compact />}</Show></div>
            <For each={game.players}>{(player, index) => <Seat player={player} active={actor()?.id === player.id} position={index()} />}</For>
            <div class="pot-mark"><span>POT</span>{game.pot}</div>
          </div>
        </section>

        <section class="hand-panel panel">
          <div class="hand-heading">
            <div><p class="eyebrow">Your private hand</p><h2>{human()?.riichi ? "Locked in Riichi" : "Four tiles, many futures"}</h2></div>
            <div class="wallet"><span>{human()?.chips} chips</span><span class="blue">● {human()?.blueSticks}</span><span class="red">● {human()?.loans}</span></div>
          </div>
          <div class="tiles private"><For each={privateCards(human())}>{(card) => <Tile card={card} />}</For></div>

          <div class="controls">
            <Show when={isHumanTurn() && game.phase === "betting"}>
              <label>Draw after check/call<select value={drawSource()} onChange={(event) => setDrawSource(event.currentTarget.value as CardSource)}>
                <option value="deck">Deck (hidden)</option>
                <option value="discard-a" disabled={game.discardA.length === 0}>Discard A</option>
                <option value="discard-b" disabled={game.discardB.length === 0}>Discard B</option>
              </select></label>
              <button disabled={busy() || callAmount() > 0} onClick={() => act({ type: "check", drawSource: drawSource() })}>Check + draw</button>
              <button disabled={busy() || callAmount() === 0 || (human()?.chips ?? 0) < callAmount()} onClick={() => act({ type: "call", drawSource: drawSource() })}>Call {callAmount()} + draw</button>
              <label>Wager<input type="number" min={Math.max(1, game.currentWager + 1)} value={wager()} onInput={(event) => setWager(event.currentTarget.valueAsNumber)} /></label>
              <label class="check"><input type="checkbox" checked={riichi()} onChange={(event) => setRiichi(event.currentTarget.checked)} /> Riichi</label>
              <button class="accent" disabled={busy()} onClick={() => act(game.currentWager === 0 ? { type: "bet", amount: wager(), riichi: riichi() } : { type: "raise", amount: wager(), riichi: riichi() })}>{game.currentWager === 0 ? "Bet" : "Raise"}</button>
              <button class="danger" disabled={busy()} onClick={() => act({ type: "fold" })}>Fold + blue stick</button>
            </Show>

            <Show when={isHumanTurn() && game.phase === "discarding"}>
              <p class="instruction">Choose one tile to discard. An empty pile must be filled first.</p>
              <For each={privateCards(human())}>{(card) => <div class="discard-choice"><span>{cardLabel(card)}</span><button disabled={busy()} onClick={() => perform(() => gameAction(sessionId(), { kind: "discard", playerId: "p1", discardCardId: card.id, discardPile: "a" }))}>to A</button><button disabled={busy()} onClick={() => perform(() => gameAction(sessionId(), { kind: "discard", playerId: "p1", discardCardId: card.id, discardPile: "b" }))}>to B</button></div>}</For>
            </Show>

            <Show when={isHumanTurn() && game.phase === "blank-window"}>
              <p class="instruction">Use a Blank to claim {game.blankWindow?.cardId}?</p>
              <button class="accent" disabled={busy()} onClick={() => perform(() => gameAction(sessionId(), { kind: "blank", playerId: "p1", claim: true }))}>Claim discard</button>
              <button disabled={busy()} onClick={() => perform(() => gameAction(sessionId(), { kind: "blank", playerId: "p1", claim: false }))}>Pass</button>
            </Show>

            <Show when={actor() && !isHumanTurn()}>
              <p class="instruction">{actor()?.name} is deciding with {actor()?.controller === "llm" ? "Grok via Cloudflare Think" : "seeded statistical heuristics"}.</p>
              <button class="primary" disabled={busy()} onClick={runBot}>Run {actor()?.name}'s turn</button>
            </Show>

            <Show when={game.phase === "between-hands"}>
              <button class="primary" disabled={busy()} onClick={() => perform(() => gameAction(sessionId(), { kind: "next-hand", viewerId: "p1" }))}>Deal next hand</button>
            </Show>
            <Show when={game.phase === "finished"}><p class="instruction">Game complete. Final scores: {JSON.stringify(game.finalScores)}</p></Show>
            <button class="ghost" disabled={busy() || (human()?.loans ?? 0) >= 2} onClick={() => perform(() => gameAction(sessionId(), { kind: "take-loan", playerId: "p1" }))}>Take 200 loan</button>
            <button class="ghost" disabled={busy() || (human()?.loans ?? 0) === 0 || (human()?.chips ?? 0) < 200} onClick={() => perform(() => gameAction(sessionId(), { kind: "repay-loan", playerId: "p1" }))}>Repay loan</button>
          </div>
        </section>

        <section class="analysis-grid">
          <article class="panel">
            <div class="section-title"><div><p class="eyebrow">Replay ledger</p><h3>What actually happened</h3></div><button class="ghost" onClick={refreshEvents}>Refresh</button></div>
            <div class="event-list"><For each={events()} fallback={<p class="muted">Load the ledger to inspect every persisted transition.</p>}>{(event) => <div class="event"><span>#{event.sequence}</span><strong>{event.type.replaceAll("-", " ")}</strong><small>hand {event.handNumber}{event.actorId ? ` · ${event.actorId}` : ""}</small></div>}</For></div>
          </article>
          <article class="panel">
            <p class="eyebrow">Balance batch</p><h3>Luck needs a larger sample</h3>
            <p class="muted">Run complete heuristic games. Each result has its own durable replay session.</p>
            <label>Games<input type="number" min="1" max="20" value={simulationCount()} onInput={(event) => setSimulationCount(event.currentTarget.valueAsNumber)} /></label>
            <button class="primary" disabled={busy()} onClick={simulate}>Simulate & persist</button>
            <div class="sim-results"><For each={simulationResults()}>{(result) => <button class="result" onClick={() => { setSessionId(result.sessionId); void resume(); }}><span>{result.seed}</span><strong>{Object.entries(result.finalScores).sort((a, b) => b[1] - a[1])[0]?.join(" · ")}</strong></button>}</For></div>
          </article>
        </section>
      </>}</Show>

      <footer><p>{notice()}</p><Show when={error()}><p class="error">{error()}</p></Show></footer>
    </main>
  );
}

function Seat(props: { player: PublicPlayerState; active: boolean; position: number }) {
  return <div class={`seat seat-${props.position} ${props.active ? "active" : ""} ${props.player.folded ? "folded" : ""}`}>
    <div class="avatar">{props.player.name.slice(0, 1)}</div>
    <div><strong>{props.player.name}</strong><small>{props.player.controller} · {props.player.chips} chips</small><small><b class="blue">● {props.player.blueSticks}</b> <b class="red">● {props.player.loans}</b>{props.player.riichi ? " · RIICHI" : ""}</small></div>
  </div>;
}

function Tile(props: { card: Card; compact?: boolean }) {
  const short = () => props.card.kind === "numbered" ? `${props.card.rank}${props.card.suit[0]!.toUpperCase()}` : props.card.kind === "dragon" ? `${props.card.dragon[0]!.toUpperCase()}D` : props.card.kind === "wind" ? `${props.card.wind[0]!.toUpperCase()}W` : props.card.kind === "joker" ? "★" : "□";
  return <div class={`tile ${props.card.kind} ${props.compact ? "compact" : ""}`} title={cardLabel(props.card)}><span>{short()}</span><small>{props.card.kind === "numbered" ? props.card.suit : props.card.kind === "joker" ? props.card.color : props.card.kind}</small></div>;
}

function privateCards(player?: PublicPlayerState): Card[] {
  return player && Array.isArray(player.privateCards) ? player.privateCards : [];
}
