"""Paired tournament bootstrap for ladder-experiment's stick-resource records."""
import json
import random
import sys
from pathlib import Path


def metrics(rows):
    resources = [g for row in rows for g in row["resources"]]
    games = len(resources)
    hands = sum(row["all"]["hands"] for row in rows)
    fish = [f for row in rows for f in row["fishing"]]
    result = {
        "hands_per_game": hands / games,
        "declarations_per_game": sum(r["declarations"] for r in rows) / games,
        "free_fish_per_hand": sum(f["reason"] == "call" for f in fish) / hands,
        "paid_fish_per_hand": sum(f["reason"] == "riichi-stick" for f in fish) / hands,
        "loans_per_game": sum(r["loans"] for r in rows) / games,
        "eliminated_player_pct": 100 * sum(r["eliminated"] for r in rows) / (games * 4),
        "unused_player_pct": 100 * sum(g["unusedPlayers"] for g in resources) / (games * 4),
    }
    for field in ["initial", "earned", "spent", "remaining"]:
        result[field + "_per_game"] = sum(g[field] for g in resources) / games
    for field in ["allIns", "street4", "showdowns"]:
        result[field + "_pct"] = 100 * sum(r["all"][field] for r in rows) / hands
    return result


def compact(row):
    """Cache additive statistics so resampling does not rescan every fishing event."""
    m = metrics([row])
    games = len(row["resources"])
    hands = row["all"]["hands"]
    result = {}
    for key, value in m.items():
        per_hand = key in ["allIns_pct", "street4_pct", "showdowns_pct"] or key.endswith("_per_hand")
        denominator = hands if per_hand else games
        result[key] = (value * denominator, denominator)
    return result



def aggregate(rows, key):
    return sum(r[key][0] for r in rows) / sum(r[key][1] for r in rows)


directory = Path(sys.argv[1])
output = {"bootstrap": {"replicates": 4000, "seed": 20260925, "unit": "matched whole tournament", "interval": "95% percentile"}, "formats": {}}
rng = random.Random(20260925)
for format_name in ["continuous", "reset"]:
    arms = {}
    for sticks in [3, 2]:
        rows = sorted([json.loads(line) for line in (directory / f"{format_name}-{sticks}.jsonl").read_text().splitlines()], key=lambda r: r["index"])
        manifest = json.loads((directory / f"{format_name}-{sticks}.jsonl.manifest.json").read_text())
        assert len(rows) == manifest["count"]
        assert manifest["samples"] == 24 and manifest["startingSticks"] == sticks
        assert all(sum(g["spent"] for g in r["resources"]) == r["sticks"] for r in rows)
        arms[sticks] = rows
    assert [r["seed"] for r in arms[3]] == [r["seed"] for r in arms[2]]
    point = {str(s): metrics(rows) for s, rows in arms.items()}
    cached = {s: [compact(r) for r in rows] for s, rows in arms.items()}
    draws = {key: [] for key in point["2"]}
    for _ in range(4000):
        indices = rng.choices(range(len(arms[3])), k=len(arms[3]))
        sampled = {s: [cached[s][i] for i in indices] for s in [3, 2]}
        for key in draws:
            draws[key].append(aggregate(sampled[2], key) - aggregate(sampled[3], key))
    intervals = {}
    for key, values in draws.items():
        values.sort()
        intervals[key] = {"delta": point["2"][key] - point["3"][key], "low": values[100], "high": values[3899]}
    by_game = {}
    for sticks, rows in arms.items():
        by_game[str(sticks)] = []
        for game in sorted({g["game"] for r in rows for g in r["resources"]}):
            selected = [g for r in rows for g in r["resources"] if g["game"] == game]
            by_game[str(sticks)].append({"game": game, **{key: sum(g[key] for g in selected) / len(selected) for key in ["initial", "earned", "spent", "remaining", "loans"]}})
    output["formats"][format_name] = {"runs_per_arm": len(arms[3]), "games_per_arm": sum(len(r["resources"]) for r in arms[3]), "hands": {str(s): sum(r["all"]["hands"] for r in rows) for s, rows in arms.items()}, "metrics": point, "paired_changes": intervals, "by_game": by_game}
(directory / "analysis.json").write_text(json.dumps(output, indent=2) + "\n")
print(json.dumps(output, indent=2))
