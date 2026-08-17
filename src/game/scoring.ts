import { cardLabel, faceKey, familyOf, jokerCanRepresent } from "./cards";
import { SPECIAL_SCORES } from "./rules";
import { DRAGONS, SPECIAL_HANDS, SUITS, WINDS, type Card, type CardFace, type HandScore, type ScoredCombination, type SpecialHandId, type Suit } from "./types";

interface Candidate extends ScoredCombination {
  mask: number;
  wholeHand?: boolean;
}

const BASIC_SCORES = {
  eye: 2,
  chow: 3,
  pung: 6,
  "three-dragons": 10,
  "four-winds": 15,
  kong: 20,
} as const;

export function scoreHand(cards: readonly Card[], activeSpecialHands: readonly SpecialHandId[]): HandScore {
  if (cards.length < 8) throw new Error("A showdown needs at least 8 available cards");
  if (cards.length > 30) throw new Error("Scoring mask supports no more than 30 cards");

  const basic = generateBasicCandidates(cards);
  const specials = generateSpecialCandidates(cards, activeSpecialHands);
  const wholeHands = specials.filter((candidate) => candidate.wholeHand);
  const composable = [...basic, ...specials.filter((candidate) => !candidate.wholeHand)];

  let bestScore = 0;
  let bestMask = 0;
  let bestCombinations: Candidate[] = [];
  const byMask = new Map<number, { score: number; combinations: Candidate[] }>([
    [0, { score: 0, combinations: [] }],
  ]);

  for (const candidate of composable) {
    const snapshot = [...byMask.entries()];
    for (const [mask, result] of snapshot) {
      if ((mask & candidate.mask) !== 0) continue;
      if (isSpecialKind(candidate.kind) && result.combinations.some((existing) => existing.kind === candidate.kind)) continue;
      const combinedMask = mask | candidate.mask;
      if (popCount(combinedMask) > 8) continue;
      const score = result.score + candidate.score;
      const existing = byMask.get(combinedMask);
      if (!existing || score > existing.score) {
        byMask.set(combinedMask, { score, combinations: [...result.combinations, candidate] });
      }
    }
  }

  for (const [mask, result] of byMask) {
    if (result.score > bestScore || (result.score === bestScore && popCount(mask) > popCount(bestMask))) {
      bestScore = result.score;
      bestMask = mask;
      bestCombinations = result.combinations;
    }
  }

  for (const candidate of wholeHands) {
    if (candidate.score > bestScore) {
      bestScore = candidate.score;
      bestMask = candidate.mask;
      bestCombinations = [candidate];
    }
  }

  const selectedIndexes = indexesFromMask(bestMask);
  for (let index = 0; selectedIndexes.length < 8 && index < cards.length; index += 1) {
    if ((bestMask & (1 << index)) === 0) selectedIndexes.push(index);
  }

  return {
    total: bestScore,
    selectedCardIds: selectedIndexes.slice(0, 8).map((index) => cards[index]!.id),
    combinations: bestCombinations.map(({ mask: _mask, wholeHand: _wholeHand, ...combination }) => combination),
  };
}

function isSpecialKind(kind: Candidate["kind"]): kind is SpecialHandId {
  return SPECIAL_HANDS.some((special) => special === kind);
}

export function generateBasicCandidates(cards: readonly Card[]): Candidate[] {
  const candidates: Candidate[] = [];
  forEachSubset(cards.length, 2, (indexes, mask) => {
    const subset = indexes.map((index) => cards[index]!);
    if (isNaturalPair(subset)) candidates.push(candidate("eye", BASIC_SCORES.eye, subset, mask, "Eye"));
  });
  forEachSubset(cards.length, 3, (indexes, mask) => {
    const subset = indexes.map((index) => cards[index]!);
    if (matchesAnyChow(subset)) candidates.push(candidate("chow", BASIC_SCORES.chow, subset, mask, "Chow"));
    if (matchesAnyIdentical(subset)) candidates.push(candidate("pung", BASIC_SCORES.pung, subset, mask, "Pung"));
    if (matchesTargets(subset, DRAGONS.map((dragon) => ({ kind: "dragon", dragon })))) {
      candidates.push(candidate("three-dragons", BASIC_SCORES["three-dragons"], subset, mask, "Three Dragons"));
    }
  });
  forEachSubset(cards.length, 4, (indexes, mask) => {
    const subset = indexes.map((index) => cards[index]!);
    if (matchesTargets(subset, WINDS.map((wind) => ({ kind: "wind", wind })))) {
      candidates.push(candidate("four-winds", BASIC_SCORES["four-winds"], subset, mask, "Four Winds"));
    }
    if (matchesAnyIdentical(subset) && subset.some((card) => card.kind === "joker")) {
      candidates.push(candidate("kong", BASIC_SCORES.kong, subset, mask, "Kong"));
    }
  });
  return deduplicateCandidates(candidates);
}

function generateSpecialCandidates(cards: readonly Card[], active: readonly SpecialHandId[]): Candidate[] {
  const candidates: Candidate[] = [];
  const enabled = new Set(active);

  const addSixCardPatterns = (id: SpecialHandId, patterns: CardFace[][], label: string) => {
    if (!enabled.has(id)) return;
    for (const targets of patterns) {
      for (const mask of masksMatchingTargets(cards, targets)) {
        const subset = indexesFromMask(mask).map((index) => cards[index]!);
        candidates.push(candidate(id, SPECIAL_SCORES[id], subset, mask, label));
      }
    }
  };

  addSixCardPatterns("sisters", sistersPatterns(), "Sisters");
  addSixCardPatterns("staircase", staircasePatterns(), "Staircase");
  addSixCardPatterns("twin-gates", twinGatesPatterns(), "Twin Gates");
  addSixCardPatterns("mirror-chows", mirrorChowPatterns(), "Mirror Chows");
  addSixCardPatterns("brothers", brothersPatterns(), "Brothers");
  addSixCardPatterns("raging-winds", ragingWindsPatterns(), "Raging Winds");

  if (enabled.has("rainbow-eyes")) {
    forEachSubset(cards.length, 6, (indexes, mask) => {
      const subset = indexes.map((index) => cards[index]!);
      for (let rank = 1; rank <= 9; rank += 1) {
        const targets = SUITS.flatMap((suit) => [numbered(suit, rank), numbered(suit, rank)]);
        if (matchesTargets(subset, targets, false)) {
          candidates.push(candidate("rainbow-eyes", SPECIAL_SCORES["rainbow-eyes"], subset, mask, "Rainbow Eyes"));
          break;
        }
      }
    });
  }

  if (enabled.has("crossing-winds")) {
    const pairs = [["north", "south"], ["east", "west"]] as const;
    forEachSubset(cards.length, 4, (indexes, mask) => {
      const subset = indexes.map((index) => cards[index]!);
      for (const [first, second] of pairs) {
        const targets: CardFace[] = [wind(first), wind(first), wind(second), wind(second)];
        if (matchesTargets(subset, targets, false)) {
          candidates.push(candidate("crossing-winds", SPECIAL_SCORES["crossing-winds"], subset, mask, "Crossing Winds"));
        }
      }
    });
  }

  if (enabled.has("dragon-dance")) {
    forEachSubset(cards.length, 8, (indexes, mask) => {
      const subset = indexes.map((index) => cards[index]!);
      if (isDragonDance(subset)) candidates.push(candidate("dragon-dance", SPECIAL_SCORES["dragon-dance"], subset, mask, "Dragon Dance"));
    });
  }

  if (enabled.has("four-eyes")) {
    addWholeEight(cards, candidates, "four-eyes", "Four Eyes", (subset) => {
      const counts = naturalCounts(subset);
      return subset.every((card) => card.kind !== "joker" && card.kind !== "blank") && counts.size === 4 && [...counts.values()].every((count) => count === 2);
    });
  }
  if (enabled.has("terminals-honors")) {
    addWholeEight(cards, candidates, "terminals-honors", "Terminals & Honors", (subset) => subset.every(isNaturalTerminalOrHonor));
  }
  if (enabled.has("eight-blessings")) {
    addWholeEight(cards, candidates, "eight-blessings", "Eight Blessings", (subset) => subset.every((card) => card.kind === "numbered" && card.rank % 2 === 0));
  }
  if (enabled.has("four-treasures")) {
    addWholeEight(cards, candidates, "four-treasures", "Four Treasures", (subset) => {
      const family = familyOf(subset[0]!);
      return family !== null && subset.every((card) => familyOf(card) === family) && jokersParticipate(subset);
    });
  }
  if (enabled.has("heavenly-honors")) {
    addWholeEight(cards, candidates, "heavenly-honors", "Heavenly Honors", (subset) =>
      subset.every((card) => card.kind === "wind" || card.kind === "dragon" || card.kind === "joker") && jokersParticipate(subset),
    );
  }
  if (enabled.has("four-winds-at-peace")) {
    addWholeEight(cards, candidates, "four-winds-at-peace", "Four Winds at Peace", (subset) => {
      const targets = WINDS.flatMap((value) => [wind(value), wind(value)]);
      return matchesTargets(subset, targets, false);
    });
  }

  return deduplicateCandidates(candidates);
}

function addWholeEight(
  cards: readonly Card[],
  candidates: Candidate[],
  id: SpecialHandId,
  label: string,
  predicate: (cards: Card[]) => boolean,
) {
  forEachSubset(cards.length, 8, (indexes, mask) => {
    const subset = indexes.map((index) => cards[index]!);
    if (predicate(subset)) candidates.push({ ...candidate(id, SPECIAL_SCORES[id], subset, mask, label), wholeHand: true });
  });
}

function isDragonDance(cards: Card[]): boolean {
  for (const [suit, dragon] of [["bamboo", "green"], ["dots", "white"], ["characters", "red"]] as const) {
    const dragonCards = cards.filter((card) => card.kind === "dragon" && card.dragon === dragon);
    if (dragonCards.length !== 2) continue;
    const remaining = cards.filter((card) => !dragonCards.includes(card));
    const patterns = [
      [...chowTargets(suit, 1), ...chowTargets(suit, 4)],
      [...chowTargets(suit, 4), ...chowTargets(suit, 7)],
    ];
    if (patterns.some((targets) => matchesTargets(remaining, targets))) return true;
  }
  return false;
}

function sistersPatterns(): CardFace[][] {
  const patterns: CardFace[][] = [];
  for (let start = 1; start <= 7; start += 1) {
    for (let first = 0; first < SUITS.length; first += 1) {
      for (let second = first + 1; second < SUITS.length; second += 1) {
        patterns.push([...chowTargets(SUITS[first]!, start), ...chowTargets(SUITS[second]!, start)]);
      }
    }
  }
  return patterns;
}

function staircasePatterns(): CardFace[][] {
  return SUITS.flatMap((suit) => [1, 2, 3, 4].map((start) => [...chowTargets(suit, start), ...chowTargets(suit, start + 3)]));
}

function twinGatesPatterns(): CardFace[][] {
  return SUITS.map((suit) => [...chowTargets(suit, 1), ...chowTargets(suit, 7)]);
}

function mirrorChowPatterns(): CardFace[][] {
  return SUITS.flatMap((suit) => Array.from({ length: 7 }, (_, index) => [...chowTargets(suit, index + 1), ...chowTargets(suit, index + 1)]));
}

function brothersPatterns(): CardFace[][] {
  const patterns: CardFace[][] = [];
  for (let rank = 1; rank <= 9; rank += 1) {
    for (let first = 0; first < SUITS.length; first += 1) {
      for (let second = first + 1; second < SUITS.length; second += 1) {
        patterns.push([
          ...Array.from({ length: 3 }, () => numbered(SUITS[first]!, rank)),
          ...Array.from({ length: 3 }, () => numbered(SUITS[second]!, rank)),
        ]);
      }
    }
  }
  return patterns;
}

function ragingWindsPatterns(): CardFace[][] {
  return [["north", "south"], ["east", "west"]].map(([first, second]) => [
    ...Array.from({ length: 3 }, () => wind(first as (typeof WINDS)[number])),
    ...Array.from({ length: 3 }, () => wind(second as (typeof WINDS)[number])),
  ]);
}

function matchesAnyChow(cards: Card[]): boolean {
  return SUITS.some((suit) => Array.from({ length: 7 }, (_, index) => index + 1).some((start) => matchesTargets(cards, chowTargets(suit, start))));
}

function matchesAnyIdentical(cards: Card[]): boolean {
  const natural = cards.find((card) => card.kind !== "joker" && card.kind !== "blank");
  if (!natural) return false;
  return matchesTargets(cards, Array.from({ length: cards.length }, () => stripId(natural)));
}

function isNaturalPair(cards: Card[]): boolean {
  return cards.length === 2 && cards.every((card) => card.kind !== "joker" && card.kind !== "blank") && faceKey(cards[0]!) === faceKey(cards[1]!);
}

function matchesTargets(cards: readonly Card[], targets: readonly CardFace[], allowJokers = true): boolean {
  if (cards.length !== targets.length || cards.some((card) => card.kind === "blank")) return false;
  const usedTargets = new Set<number>();
  const jokers: Card[] = [];
  for (const card of cards) {
    if (card.kind === "joker") {
      if (!allowJokers) return false;
      jokers.push(card);
      continue;
    }
    const targetIndex = targets.findIndex((target, index) => !usedTargets.has(index) && faceKey(target) === faceKey(card));
    if (targetIndex < 0) return false;
    usedTargets.add(targetIndex);
  }
  return assignJokers(jokers, targets, usedTargets, 0);
}

function masksMatchingTargets(cards: readonly Card[], targets: readonly CardFace[], allowJokers = true): number[] {
  const masks = new Set<number>();
  const orderedTargets = targets
    .map((target, index) => ({ target, index }))
    .sort((left, right) => candidateCount(cards, left.target, allowJokers) - candidateCount(cards, right.target, allowJokers));
  const visit = (targetIndex: number, usedMask: number) => {
    if (targetIndex === orderedTargets.length) {
      masks.add(usedMask);
      return;
    }
    const target = orderedTargets[targetIndex]!.target;
    for (let cardIndex = 0; cardIndex < cards.length; cardIndex += 1) {
      if ((usedMask & (1 << cardIndex)) !== 0) continue;
      const card = cards[cardIndex]!;
      const matches = card.kind !== "blank" && (
        (card.kind !== "joker" && faceKey(card) === faceKey(target)) ||
        (allowJokers && card.kind === "joker" && jokerCanRepresent(card, target))
      );
      if (matches) visit(targetIndex + 1, usedMask | (1 << cardIndex));
    }
  };
  visit(0, 0);
  return [...masks];
}

function candidateCount(cards: readonly Card[], target: CardFace, allowJokers: boolean): number {
  return cards.filter((card) => card.kind !== "blank" && (
    (card.kind !== "joker" && faceKey(card) === faceKey(target)) ||
    (allowJokers && card.kind === "joker" && jokerCanRepresent(card, target))
  )).length;
}

function assignJokers(jokers: Card[], targets: readonly CardFace[], used: Set<number>, jokerIndex: number): boolean {
  if (jokerIndex === jokers.length) return used.size === targets.length;
  const joker = jokers[jokerIndex]!;
  for (let targetIndex = 0; targetIndex < targets.length; targetIndex += 1) {
    if (used.has(targetIndex) || !jokerCanRepresent(joker, targets[targetIndex]!)) continue;
    used.add(targetIndex);
    if (assignJokers(jokers, targets, used, jokerIndex + 1)) return true;
    used.delete(targetIndex);
  }
  return false;
}

function jokersParticipate(cards: Card[]): boolean {
  const jokerMask = cards.reduce((mask, card, index) => mask | (card.kind === "joker" ? 1 << index : 0), 0);
  if (jokerMask === 0) return true;
  const candidates = generateBasicCandidates(cards).filter((value) => (value.mask & jokerMask) !== 0);
  const visit = (index: number, usedMask: number, covered: number): boolean => {
    if ((covered & jokerMask) === jokerMask) return true;
    for (let cursor = index; cursor < candidates.length; cursor += 1) {
      const next = candidates[cursor]!;
      if ((usedMask & next.mask) === 0 && visit(cursor + 1, usedMask | next.mask, covered | (next.mask & jokerMask))) return true;
    }
    return false;
  };
  return visit(0, 0, 0);
}

function naturalCounts(cards: Card[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const card of cards) counts.set(faceKey(card), (counts.get(faceKey(card)) ?? 0) + 1);
  return counts;
}

function isNaturalTerminalOrHonor(card: Card): boolean {
  return card.kind === "wind" || card.kind === "dragon" || (card.kind === "numbered" && (card.rank === 1 || card.rank === 9));
}

function candidate(kind: Candidate["kind"], score: number, cards: Card[], mask: number, label: string): Candidate {
  return { kind, score, cardIds: cards.map((card) => card.id), mask, label };
}

function chowTargets(suit: Suit, start: number): CardFace[] {
  return [numbered(suit, start), numbered(suit, start + 1), numbered(suit, start + 2)];
}

function numbered(suit: Suit, rank: number): CardFace {
  return { kind: "numbered", suit, rank: rank as 1 };
}

function wind(value: (typeof WINDS)[number]): CardFace {
  return { kind: "wind", wind: value };
}

function stripId(card: Card): CardFace {
  const { id: _id, ...face } = card;
  return face;
}

function forEachSubset(length: number, size: number, visit: (indexes: number[], mask: number) => void) {
  const indexes: number[] = [];
  const choose = (start: number) => {
    if (indexes.length === size) {
      visit([...indexes], indexes.reduce((mask, index) => mask | (1 << index), 0));
      return;
    }
    for (let index = start; index <= length - (size - indexes.length); index += 1) {
      indexes.push(index);
      choose(index + 1);
      indexes.pop();
    }
  };
  choose(0);
}

function popCount(value: number): number {
  let count = 0;
  for (let current = value >>> 0; current !== 0; current &= current - 1) count += 1;
  return count;
}

function indexesFromMask(mask: number): number[] {
  const indexes: number[] = [];
  for (let index = 0; index < 30; index += 1) if ((mask & (1 << index)) !== 0) indexes.push(index);
  return indexes;
}

function deduplicateCandidates(candidates: Candidate[]): Candidate[] {
  const seen = new Set<string>();
  return candidates.filter((value) => {
    const key = `${value.kind}:${value.mask}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function describeScore(score: HandScore, cards: readonly Card[]): string {
  const byId = new Map(cards.map((card) => [card.id, card]));
  if (score.combinations.length === 0) return "No scoring combination";
  return score.combinations
    .map((combination) => `${combination.label} (${combination.score}): ${combination.cardIds.map((id) => cardLabel(byId.get(id)!)).join(", ")}`)
    .join("; ");
}
