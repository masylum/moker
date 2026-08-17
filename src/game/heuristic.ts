import { createDeck } from "./cards";
import { SeededRandom } from "./random";
import { ORBIT_VALUES } from "./rules";
import type {
  BettingAction,
  Card,
  CardSource,
  DecisionEvaluation,
  DiscardPile,
  GameState,
  HeuristicDecision,
  PlayerState,
} from "./types";

export interface DiscardChoice {
  discardCardId: string;
  discardPile: DiscardPile;
  expectedScore: number;
  rationale: string;
}

export interface BlankChoice {
  claim: boolean;
  improvement: number;
  rationale: string;
}

export function chooseHeuristicAction(state: GameState, playerId: string, samples = state.config.heuristicSamples): HeuristicDecision {
  if (state.phase !== "betting" || state.actingPlayerId !== playerId) throw new Error("Heuristic player is not acting");
  const player = getPlayer(state, playerId);
  const random = new SeededRandom(`${state.config.seed}:h${state.handNumber}:s${state.street}:v${state.version}:${playerId}`);
  const drawSource = chooseDrawSource(state, player, random.fork("draw"), samples);
  const baseline = analyzePrivateFuture(state, player.privateCards, random.fork("baseline"), samples);
  const toCall = state.currentWager - player.roundCommitted;
  const evaluations: DecisionEvaluation[] = [];
  const opponents = state.players.filter((candidate) => !candidate.folded && candidate.id !== playerId).length;
  const liability = futureBlueLiability(state, player.blueSticks);

  const makeEvaluation = (action: BettingAction, chipCost: number, aggression = 0): DecisionEvaluation => {
    const foldPressure = aggression === 0 ? 0 : Math.min(0.55, aggression / Math.max(20, state.pot + aggression) * 0.45);
    const winRate = approximateWinRate(baseline.expectedScore, opponents);
    const expectedPot = state.pot + chipCost + aggression * Math.max(0, opponents - 1) * 0.35;
    const expectedChipDelta = (winRate + foldPressure * (1 - winRate)) * expectedPot - chipCost;
    const blueBenefit = action.type === "bet" || action.type === "raise" ? nextChargesValue(state) * Math.min(1, player.blueSticks) : 0;
    const riichiBonus = "riichi" in action && action.riichi ? winRate * nextChargesValue(state) * player.blueSticks * 0.6 : 0;
    const risk = aggression * (1 - winRate) * 0.35;
    const utility = expectedChipDelta + blueBenefit + riichiBonus + baseline.expectedScore * 0.18 - risk - liability * 0.05;
    return {
      action,
      expectedScore: baseline.expectedScore,
      estimatedWinRate: winRate,
      expectedChipDelta,
      utility,
      samples,
      rationale: `${Math.round(winRate * 100)}% estimated showdown equity; ${baseline.improveRate.toFixed(0)}% of rollouts improve the hand`,
    };
  };

  const foldUtility = -liability * 0.12 - Math.min(12, player.handCommitted * 0.08);
  evaluations.push({
    action: { type: "fold" },
    expectedScore: 0,
    estimatedWinRate: 0,
    expectedChipDelta: 0,
    utility: foldUtility,
    samples,
    rationale: `Preserves chips but adds a blue stick worth about ${liability} in future charges`,
  });

  if (toCall === 0) {
    evaluations.push(makeEvaluation({ type: "check", drawSource }, 0));
    for (const amount of sensibleWagers(state, player, 1)) {
      const riichi = shouldDeclareRiichi(state, player, baseline.expectedScore, approximateWinRate(baseline.expectedScore, opponents));
      evaluations.push(makeEvaluation({ type: "bet", amount, ...(riichi ? { riichi: true } : {}) }, amount - player.roundCommitted, amount));
    }
  } else if (player.chips >= toCall) {
    evaluations.push(makeEvaluation({ type: "call", drawSource }, toCall));
    if (player.chips > toCall) {
      for (const amount of sensibleWagers(state, player, state.currentWager + 1)) {
        const riichi = shouldDeclareRiichi(state, player, baseline.expectedScore, approximateWinRate(baseline.expectedScore, opponents));
        evaluations.push(makeEvaluation({ type: "raise", amount, ...(riichi ? { riichi: true } : {}) }, amount - player.roundCommitted, amount));
      }
    }
  }

  evaluations.sort((left, right) => right.utility - left.utility || actionOrder(left.action) - actionOrder(right.action));
  const best = evaluations[0];
  if (!best) throw new Error("No heuristic action available");
  return {
    playerId,
    action: best.action,
    evaluations,
    rationale: `Selected ${best.action.type} at utility ${best.utility.toFixed(1)}. ${best.rationale}.`,
  };
}

export function chooseHeuristicDiscard(state: GameState, playerId: string, samples = state.config.heuristicSamples): DiscardChoice {
  if (state.phase !== "discarding" || state.pendingDiscard?.playerId !== playerId) throw new Error("Player is not discarding");
  const player = getPlayer(state, playerId);
  const random = new SeededRandom(`${state.config.seed}:discard:${state.version}:${playerId}`);
  const evaluations = player.privateCards.map((card, index) => {
    const hand = player.privateCards.filter((_, candidateIndex) => candidateIndex !== index);
    return { card, ...analyzePrivateFuture(state, hand, random.fork(card.id), samples) };
  });
  evaluations.sort((left, right) => right.expectedScore - left.expectedScore || left.card.id.localeCompare(right.card.id));
  const best = evaluations[0]!;
  const pile = chooseDiscardPile(state, best.card);
  return {
    discardCardId: best.card.id,
    discardPile: pile,
    expectedScore: best.expectedScore,
    rationale: `Discarding ${best.card.id} leaves an expected final hand score of ${best.expectedScore.toFixed(1)} across ${samples} rollouts`,
  };
}

export function chooseBlankClaim(state: GameState, playerId: string, samples = state.config.heuristicSamples): BlankChoice {
  const window = state.blankWindow;
  if (state.phase !== "blank-window" || !window || window.eligiblePlayerIds[0] !== playerId) throw new Error("Player does not have Blank priority");
  const player = getPlayer(state, playerId);
  const pile = window.pile === "a" ? state.discardA : state.discardB;
  const offered = pile.at(-1);
  if (!offered) return { claim: false, improvement: 0, rationale: "The discard is no longer available" };
  const blankIndex = player.privateCards.findIndex((card) => card.kind === "blank");
  if (blankIndex < 0) return { claim: false, improvement: 0, rationale: "No private Blank" };
  const random = new SeededRandom(`${state.config.seed}:blank:${state.version}:${playerId}`);
  const current = analyzePrivateFuture(state, player.privateCards, random.fork("keep"), samples).expectedScore;
  const replaced = [...player.privateCards];
  replaced.splice(blankIndex, 1, offered);
  const next = analyzePrivateFuture(state, replaced, random.fork("claim"), samples).expectedScore;
  const improvement = next - current;
  return {
    claim: improvement >= 1.5,
    improvement,
    rationale: improvement >= 1.5 ? `Claim improves expected score by ${improvement.toFixed(1)}` : `Claim improves expected score by only ${improvement.toFixed(1)}`,
  };
}

function chooseDrawSource(state: GameState, player: PlayerState, random: SeededRandom, samples: number): CardSource {
  const sources: CardSource[] = ["deck"];
  if (state.discardA.length > 0) sources.push("discard-a");
  if (state.discardB.length > 0) sources.push("discard-b");
  const unknown = unknownCards(state, player.privateCards);
  const sourceValue = (source: CardSource): number => {
    const visible = source === "discard-a" ? state.discardA.at(-1) : source === "discard-b" ? state.discardB.at(-1) : undefined;
    let total = 0;
    const count = source === "deck" ? Math.max(1, samples) : 1;
    for (let index = 0; index < count; index += 1) {
      const drawn = visible ?? random.pick(unknown);
      total += bestImmediatePrivateScore([...player.privateCards, drawn], state);
    }
    return total / count;
  };
  return sources.map((source) => ({ source, value: sourceValue(source) })).sort((left, right) => right.value - left.value || left.source.localeCompare(right.source))[0]!.source;
}

function bestImmediatePrivateScore(fiveCards: Card[], state: GameState): number {
  let best = 0;
  for (let discardIndex = 0; discardIndex < fiveCards.length; discardIndex += 1) {
    const privateCards = fiveCards.filter((_, index) => index !== discardIndex);
    const available = [...privateCards, ...state.community];
    best = Math.max(best, partialSynergy(privateCards, state.community));
  }
  return best;
}

function analyzePrivateFuture(state: GameState, privateCards: Card[], random: SeededRandom, samples: number) {
  const neededCommunity = 8 - state.community.length;
  const unknown = unknownCards(state, privateCards);
  const current = state.community.length >= 4 ? partialSynergy(privateCards, state.community) : 0;
  let total = 0;
  let improvements = 0;
  const trials = Math.max(1, samples);
  for (let sample = 0; sample < trials; sample += 1) {
    const completion = random.shuffle(unknown).slice(0, neededCommunity);
    const completed = [...privateCards, ...state.community, ...completion];
    const score = fastBasicStrength(completed) + specialPotential(completed, state);
    total += score;
    if (score > current) improvements += 1;
  }
  return { expectedScore: total / trials, improveRate: (improvements / trials) * 100 };
}

function unknownCards(state: GameState, privateCards: Card[]): Card[] {
  const known = new Set([
    ...privateCards,
    ...state.community,
    ...state.discardA,
    ...state.discardB,
  ].map((card) => card.id));
  return createDeck().filter((card) => !known.has(card.id));
}

function partialSynergy(privateCards: Card[], community: Card[]): number {
  const cards = [...privateCards, ...community];
  let value = 0;
  for (let left = 0; left < cards.length; left += 1) {
    for (let right = left + 1; right < cards.length; right += 1) {
      const a = cards[left]!;
      const b = cards[right]!;
      if (a.kind !== "joker" && a.kind !== "blank" && b.kind === a.kind && JSON.stringify(a, ["kind", "suit", "rank", "wind", "dragon"]) === JSON.stringify(b, ["kind", "suit", "rank", "wind", "dragon"])) value += 2;
      if (a.kind === "numbered" && b.kind === "numbered" && a.suit === b.suit && Math.abs(a.rank - b.rank) <= 2) value += 1;
    }
  }
  return value;
}

function fastBasicStrength(cards: Card[]): number {
  const naturals = cards.filter((card) => card.kind !== "joker" && card.kind !== "blank");
  const counts = new Map<string, number>();
  for (const card of naturals) {
    const key = card.kind === "numbered" ? `${card.suit}-${card.rank}` : card.kind === "wind" ? `w-${card.wind}` : `d-${card.dragon}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  let score = 0;
  for (const count of counts.values()) {
    if (count >= 3) score += 6;
    else if (count >= 2) score += 2;
  }
  for (const suit of ["bamboo", "dots", "characters"] as const) {
    const ranks = new Set(naturals.filter((card) => card.kind === "numbered" && card.suit === suit).map((card) => card.kind === "numbered" ? card.rank : 0));
    for (let start = 1; start <= 7; start += 1) if (ranks.has(start as 1) && ranks.has((start + 1) as 1) && ranks.has((start + 2) as 1)) score += 3;
  }
  const dragonKinds = new Set(naturals.filter((card) => card.kind === "dragon").map((card) => card.kind === "dragon" ? card.dragon : ""));
  if (dragonKinds.size === 3) score += 10;
  const windKinds = new Set(naturals.filter((card) => card.kind === "wind").map((card) => card.kind === "wind" ? card.wind : ""));
  if (windKinds.size === 4) score += 15;
  score += cards.filter((card) => card.kind === "joker").length * 2.5;
  return score;
}

function specialPotential(cards: Card[], state: GameState): number {
  let best = 0;
  const enabled = new Set(state.config.activeSpecialHands);
  const naturals = cards.filter((card) => card.kind !== "joker" && card.kind !== "blank");
  if (enabled.has("terminals-honors")) {
    const count = naturals.filter((card) => card.kind === "wind" || card.kind === "dragon" || (card.kind === "numbered" && (card.rank === 1 || card.rank === 9))).length;
    if (count >= 8) best = Math.max(best, 16);
    else best = Math.max(best, count * 0.8);
  }
  if (enabled.has("eight-blessings")) {
    const count = naturals.filter((card) => card.kind === "numbered" && card.rank % 2 === 0).length;
    if (count >= 8) best = Math.max(best, 18);
    else best = Math.max(best, count * 0.8);
  }
  if (enabled.has("four-treasures")) {
    const families = ["green", "blue", "red", "black"] as const;
    const count = Math.max(...families.map((family) => cards.filter((card) => {
      if (card.kind === "joker") return card.color === family;
      if (family === "black") return card.kind === "wind";
      if (card.kind === "numbered") return (family === "green" && card.suit === "bamboo") || (family === "blue" && card.suit === "dots") || (family === "red" && card.suit === "characters");
      return card.kind === "dragon" && ((family === "green" && card.dragon === "green") || (family === "blue" && card.dragon === "white") || (family === "red" && card.dragon === "red"));
    }).length));
    if (count >= 8) best = Math.max(best, 18);
    else best = Math.max(best, count * 0.7);
  }
  if (enabled.has("four-eyes")) {
    const counts = new Map<string, number>();
    for (const card of naturals) {
      const key = card.kind === "numbered" ? `${card.suit}-${card.rank}` : card.kind === "wind" ? `w-${card.wind}` : `d-${card.dragon}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    const pairs = [...counts.values()].filter((count) => count >= 2).length;
    if (pairs >= 4) best = Math.max(best, 20);
    else best = Math.max(best, pairs * 2);
  }
  return best;
}

function chooseDiscardPile(state: GameState, discarded: Card): DiscardPile {
  if (state.discardA.length === 0) return "a";
  if (state.discardB.length === 0) return "b";
  const a = state.discardA.at(-1)!;
  const b = state.discardB.at(-1)!;
  const danger = (card: Card) => card.kind === "joker" ? 8 : card.kind === "blank" ? 0 : card.kind === "wind" || card.kind === "dragon" ? 3 : card.rank >= 3 && card.rank <= 7 ? 4 : 2;
  return danger(a) >= danger(b) || danger(discarded) > 5 ? "a" : "b";
}

function sensibleWagers(state: GameState, player: PlayerState, minimum: number): number[] {
  const reserve = Math.min(player.chips, nextChargesValue(state) + 20);
  const maximum = player.roundCommitted + Math.max(0, player.chips - reserve);
  if (maximum < minimum) return [];
  const targets = [minimum, Math.max(minimum, state.currentWager + Math.max(5, Math.floor(state.pot * 0.35)))];
  return [...new Set(targets.map((amount) => Math.min(maximum, amount)).filter((amount) => amount >= minimum))];
}

function shouldDeclareRiichi(state: GameState, player: PlayerState, expectedScore: number, winRate: number): boolean {
  return state.street < 3 && !player.riichi && player.blueSticks > 0 && expectedScore >= 13 && winRate >= 0.42;
}

function approximateWinRate(expectedScore: number, opponents: number): number {
  const headsUp = 1 / (1 + Math.exp(-(expectedScore - 12) / 7));
  return Math.max(0.03, Math.min(0.94, headsUp ** Math.max(1, opponents)));
}

function futureBlueLiability(state: GameState, blueSticks: number): number {
  return blueSticks * nextChargesValue(state);
}

function nextChargesValue(state: GameState): number {
  let total = 15;
  for (let hand = state.handNumber + 1; hand <= state.maxHands; hand += 1) {
    const handsPerOrbit = state.config.playerCount === 2 ? 4 : state.config.playerCount;
    const orbit = Math.min(3, Math.floor((hand - 1) / handsPerOrbit));
    total += ORBIT_VALUES[orbit]!;
  }
  return total;
}

function getPlayer(state: GameState, playerId: string): PlayerState {
  const player = state.players.find((candidate) => candidate.id === playerId);
  if (!player) throw new Error(`Unknown player ${playerId}`);
  return player;
}

function actionOrder(action: BettingAction): number {
  return ["check", "call", "bet", "raise", "fold"].indexOf(action.type);
}
