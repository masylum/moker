import { simulateMany } from "../src/game/simulation";

const count = Number.parseInt(process.argv[2] ?? "10", 10);
const seedPrefix = process.argv[3] ?? "balance";
const results = simulateMany(count, { seedPrefix, playerCount: 4, heuristicSamples: 12 });
const wins: Record<string, number> = {};
for (const result of results) {
  const entries = Object.entries(result.state.finalScores ?? {}).sort((left, right) => right[1] - left[1]);
  const winner = entries[0]?.[0] ?? "unknown";
  wins[winner] = (wins[winner] ?? 0) + 1;
}
console.log(JSON.stringify({ games: count, seedPrefix, wins }, null, 2));
