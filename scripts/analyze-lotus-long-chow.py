"""Paired four-arm analysis. Resample entire tournaments, never individual hands."""
import json
import random
from collections import Counter
from pathlib import Path

root = Path("docs/lotus-long-chow-2026-09-26")
arms = {}
manifests = {}
for name in ["control", "lotus", "long", "combined"]:
    arms[name] = sorted([json.loads(l) for l in (root / f"{name}.jsonl").read_text().splitlines()], key=lambda r: r["index"])
    manifests[name] = json.loads((root / f"{name}.jsonl.manifest.json").read_text())
    assert len(arms[name]) == manifests[name]["count"]
    assert manifests[name]["samples"] == 24
    assert [r["seed"] for r in arms[name]] == [r["seed"] for r in arms["control"]]
# Only the expected variant source files may differ.
for left, right in [("control", "long"), ("lotus", "combined")]:
    assert manifests[left]["sourceHashes"]["engine.ts"] == manifests[right]["sourceHashes"]["engine.ts"]
for file in ["melds.ts", "types.ts", "scoring.ts", "hand-progress.ts", "hand-ranks.ts"]:
    for left, right in [("control", "lotus"), ("long", "combined")]:
        assert manifests[left]["sourceHashes"][file] == manifests[right]["sourceHashes"][file]
for file in ["rules.ts", "simulation.ts"]:
    assert len({m["sourceHashes"][file] for m in manifests.values()}) == 1


def counters(row, game=None):
    hands = [h for h in row["handDiagnostics"] if game is None or h["game"] == game]
    observations = [o for o in row["lotusObservations"] if game is None or o["game"] == game]
    resources = [r for r in row["resources"] if game is None or r["game"] == game]
    players = [p for h in hands for p in h["players"]]
    single = [o for o in observations if o["lotuses"] == 1]
    bets = [o for o in single if o["action"]["type"] == "bet"]
    pure = [o for o in bets if not o["action"].get("useRiichiStick")]
    key = lambda o: (o["game"], o["hand"], o["player"])
    counts = Counter({
        "games": len(resources), "hands": len(hands), "playerSlots": len(players),
        "singleDecisions": len(single), "singleBets": len(bets), "singlePureBets": len(pure),
        "singleBetPlayerHands": len({key(o) for o in bets}),
        "pureBetPlayerHands": len({key(o) for o in pure}),
        "bonusWins": sum(h["lotusBluff"] is not None for h in hands),
        "bonusPaid": sum(h["lotusBluff"]["total"] for h in hands if h["lotusBluff"]),
        "openingLotusHolders": sum(p["openingLotuses"] > 0 for p in players),
        "finalSingle": sum(p["finalLotuses"] == 1 for p in players),
        "finalTwins": sum(p["finalLotuses"] == 2 for p in players),
        "twinWins": sum(p["won"] for p in players if p["finalLotuses"] == 2),
        "street4": sum(h["street4"] for h in hands),
        "allIns": sum(h["allIn"] for h in hands),
        "showdowns": sum(h["reason"] == "showdown" for h in hands),
        "loans": sum(r["loans"] for r in resources),
        "sticks": sum(r["spent"] for r in resources),
        "eliminated": sum(p["eliminated"] for r in resources for p in r["players"]),
    })
    current_game = 1
    flower = lambda value: isinstance(value, str) and value.startswith("flower-")
    for e in row["lotusEvents"]:
        payload = e["payload"]
        if e["type"] == "hand-started":
            current_game = payload["ante"] // 5
        if game is not None and current_game != game:
            continue
        if e["type"] == "draw-discard":
            drawn = flower(payload["drawnCardId"])
            discarded = flower(payload["discardedCardId"])
            counts["lotusDrawn"] += drawn
            counts["lotusKeptAfterDraw"] += drawn and not discarded
            counts["lotusDiscards"] += discarded
            counts["lotusLaneDraws"] += drawn and payload["source"] != "deck"
        if e["type"] == "blank-exchanged":
            counts["lotusBlankClaims"] += flower(payload["claimedCardId"])
    return counts


def metrics(c):
    ratio = lambda num, den: c[num] / c[den] if c[den] else 0
    return {
        "bonus_wins_per_game": ratio("bonusWins", "games"),
        "bonus_chips_per_game": ratio("bonusPaid", "games"),
        "bonus_chips_per_win": ratio("bonusPaid", "bonusWins"),
        "single_lotus_bet_pct": 100 * ratio("singleBets", "singleDecisions"),
        "single_lotus_pure_bet_pct": 100 * ratio("singlePureBets", "singleDecisions"),
        "single_betting_player_hands_per_game": ratio("singleBetPlayerHands", "games"),
        "lotus_lane_draws_per_game": ratio("lotusLaneDraws", "games"),
        "lotus_blank_claims_per_game": ratio("lotusBlankClaims", "games"),
        "lotus_discards_per_game": ratio("lotusDiscards", "games"),
        "drawn_lotus_retention_pct": 100 * ratio("lotusKeptAfterDraw", "lotusDrawn"),
        "final_single_per_game": ratio("finalSingle", "games"),
        "twin_wins_per_game": ratio("twinWins", "games"),
        "street4_pct": 100 * ratio("street4", "hands"),
        "all_in_pct": 100 * ratio("allIns", "hands"),
        "showdown_pct": 100 * ratio("showdowns", "hands"),
        "loans_per_game": ratio("loans", "games"),
        "sticks_spent_per_game": ratio("sticks", "games"),
    }


def add(rows):
    result = Counter()
    for row in rows:
        result.update(row)
    return result


cache = {name: [counters(row) for row in rows] for name, rows in arms.items()}
output = {"design": {"runs_per_arm": len(arms["control"]), "samples": 24, "bootstrap_replicates": 4000}, "arms": {}, "paired_changes": {}}
for name, rows in arms.items():
    total = add(cache[name])
    counts = {kind: {k: sum(row["all"]["rows"][kind][k] for row in rows) for k in ["opening", "contains", "newBuilt", "show", "showWins"]} for kind in rows[0]["all"]["rows"]}
    output["arms"][name] = {"totals": dict(total), "dealt_player_hands": sum(r["all"]["deals"] for r in rows), "metrics": metrics(total), "ladder": counts, "by_game": {}}
    for game in range(1, 5):
        c = add(counters(row, game) for row in rows)
        output["arms"][name]["by_game"][game] = {"totals": dict(c), "metrics": metrics(c)}
# Reward scaling is identical in game 1: assert exact gameplay diagnostics, not just mean values.
for left, right in [("control", "lotus"), ("long", "combined")]:
    assert all([h for h in a["handDiagnostics"] if h["game"] == 1] == [h for h in b["handDiagnostics"] if h["game"] == 1] for a, b in zip(arms[left], arms[right]))

rng = random.Random(20260926)
for baseline, variant in [("control", "lotus"), ("control", "long"), ("control", "combined"), ("long", "combined")]:
    a = output["arms"][baseline]["metrics"]
    b = output["arms"][variant]["metrics"]
    draws = {k: [] for k in a}
    for _ in range(4000):
        indices = rng.choices(range(len(cache[baseline])), k=len(cache[baseline]))
        low = metrics(add(cache[baseline][i] for i in indices))
        high = metrics(add(cache[variant][i] for i in indices))
        for k in draws:
            draws[k].append(high[k] - low[k])
    output["paired_changes"][f"{variant}-minus-{baseline}"] = {}
    for k, values in draws.items():
        values.sort()
        output["paired_changes"][f"{variant}-minus-{baseline}"][k] = {"delta": b[k] - a[k], "low": values[100], "high": values[3899]}
# Whole-tournament uncertainty in the proposed Long Chow ordering.
output["long_chow_rarity"] = {}
for name in ["long", "combined"]:
    rows = arms[name]
    result = {}
    for low, high in [("three-dragons", "long-chow"), ("long-chow", "three-dragons-eye")]:
        differences = []
        for _ in range(4000):
            selected = rng.choices(rows, k=len(rows))
            differences.append(100 * sum(r["all"]["rows"][low]["contains"] - r["all"]["rows"][high]["contains"] for r in selected) / sum(r["all"]["deals"] for r in selected))
        differences.sort()
        result[f"{low}-minus-{high}"] = {"delta_pct": 100 * sum(r["all"]["rows"][low]["contains"] - r["all"]["rows"][high]["contains"] for r in rows) / sum(r["all"]["deals"] for r in rows), "low": differences[100], "high": differences[3899]}
    output["long_chow_rarity"][name] = result
(root / "analysis.json").write_text(json.dumps(output, indent=2) + "\n")
print(json.dumps(output, indent=2))
