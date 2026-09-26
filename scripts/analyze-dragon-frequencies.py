"""Independent combinatorics and existing played-game Dragon/Pung counts; no simulations."""
import json
from math import comb
from pathlib import Path


def multiply(left, right):
    product = [0] * 8
    for i, x in enumerate(left):
        for j, y in enumerate(right):
            if i + j < 8:
                product[i + j] += x * y
    return product


def power(poly, count):
    result = [1]
    for _ in range(count):
        result = multiply(result, poly)
    return result


output = {}
for mode, size, dragon_options in [("basic", 102, 3), ("riichi", 112, 4)]:
    total = comb(size, 7)
    # Inclusion-exclusion: at least one card from each of three disjoint color groups.
    dragons = sum((-1) ** k * comb(3, k) * comb(size - dragon_options * k, 7) for k in range(4))
    if mode == "basic":
        # Avoid a Pung: take at most two of the three copies of each of 34 faces.
        no_pung = power([1, 3, 3], 34)[7]
    else:
        polynomial = power([1, 1], 6)  # Four Blanks and two Lotuses.
        for faces in [10, 10, 10, 4]:  # Green, red, blue, black families.
            without_joker = power([1, 3, 3], faces)
            # With this family's Joker, two natural copies would already form a Pung.
            with_joker = [0] + power([1, 3], faces)[:7]
            polynomial = multiply(polynomial, [a + b for a, b in zip(without_joker, with_joker)])
        no_pung = polynomial[7]
    label = "baseline" if mode == "basic" else "selected"
    path = Path(f"docs/ladder-convergence-2026-09-25/validation-{mode}-{label}.jsonl")
    rows = [json.loads(line) for line in path.read_text().splitlines()]
    counts = {}
    for kind in ["three-dragons", "three-dragons-eye", "pung", "pung-eye", "kong"]:
        if kind in rows[0]["all"]["rows"]:
            counts[kind] = {key: sum(r["all"]["rows"][kind][key] for r in rows)
                            for key in ["opening", "contains", "show", "showContains", "newBuilt"]}
    output[mode] = {
        "exact_opening": {"cards": 7, "deck": size, "total_hands": total,
                          "dragon_hands": dragons, "pung_hands": total - no_pung,
                          "dragon_pct": 100 * dragons / total,
                          "pung_pct": 100 * (total - no_pung) / total},
        "held_out": {"runs": len(rows), "hands": sum(r["all"]["hands"] for r in rows),
                     "player_hands": sum(r["all"]["deals"] for r in rows), "counts": counts},
    }
out = Path("docs/dragons-audit-2026-09-25")
out.mkdir(exist_ok=True)
(out / "frequencies.json").write_text(json.dumps(output, indent=2) + "\n")
print(json.dumps(output, indent=2))
