#!/usr/bin/env python3
"""
Golden-fixture generator for the Anyfence treated-pine paling calculator.

Runs the REAL reference engine (skills/calculator-engine/treated-pine-paling-fence-calculator/
calculator.py) against a set of representative inputs and writes input/expected pairs.

These fixtures are the contract Antigravity codes against: re-implement the engine in
the target stack, feed each *.input.json, and assert the output equals *.expected.json.
Regenerate by re-running this script if the reference engine changes (then bump the
canonical-name contract version if any canonical_name string changed).
"""
import json
import importlib.util
import pathlib

HERE = pathlib.Path(__file__).resolve().parent
ENGINE = HERE.parent / "skills" / "calculator-engine" / \
    "treated-pine-paling-fence-calculator" / "calculator.py"

spec = importlib.util.spec_from_file_location("calculator", ENGINE)
calc = importlib.util.module_from_spec(spec)
spec.loader.exec_module(calc)

CASES = [
    ("butted-treatedpine-20m-1800", "Standard butted treated pine, 20m × 1800mm (3 rails).", {
        "fence_length_m": 20, "fence_height_mm": 1800, "timber_type": "treated_pine",
        "paling_style": "butted"}),
    ("butted-treatedpine-12m-1200", "Butted treated pine, 12m × 1200mm (2 rails — low boundary).", {
        "fence_length_m": 12, "fence_height_mm": 1200, "timber_type": "treated_pine",
        "paling_style": "butted"}),
    ("lappedcapped-treatedpine-20m-1800", "Lapped & capped treated pine, 20m × 1800mm (8-line BOM with capping rail).", {
        "fence_length_m": 20, "fence_height_mm": 1800, "timber_type": "treated_pine",
        "paling_style": "lapped_capped"}),
    ("butted-hardwood-30m-1500", "Butted hardwood, 30m × 1500mm (smooth-shank nails, 3 rails).", {
        "fence_length_m": 30, "fence_height_mm": 1500, "timber_type": "hardwood",
        "paling_style": "butted"}),
    ("lappedcapped-hardwood-25m-2100", "Lapped & capped hardwood, 25m × 2100mm.", {
        "fence_length_m": 25, "fence_height_mm": 2100, "timber_type": "hardwood",
        "paling_style": "lapped_capped"}),
    ("warning-nonstandard-height-1650", "Non-standard height 1650mm — should emit a warning and interpolate 3 rails.", {
        "fence_length_m": 18, "fence_height_mm": 1650, "timber_type": "treated_pine",
        "paling_style": "butted"}),
    ("error-postspacing-over-cap", "Validation error — post_spacing_mm exceeds the 2400 cap. Engine returns ok:false with errors.", {
        "fence_length_m": 20, "fence_height_mm": 1800, "post_spacing_mm": 3000,
        "timber_type": "treated_pine", "paling_style": "butted"}),
]

manifest = []
for name, desc, inp in CASES:
    result = calc.calculate_bom(inp)
    (HERE / f"{name}.input.json").write_text(json.dumps(inp, indent=2) + "\n")
    (HERE / f"{name}.expected.json").write_text(json.dumps(result, indent=2) + "\n")
    entry = {
        "name": name,
        "description": desc,
        "ok": result.get("ok"),
        "bom_lines": len(result.get("bom", [])) if result.get("ok") else 0,
        "warnings": len(result.get("warnings", [])),
    }
    if result.get("ok"):
        d = result["derived"]
        entry["key_derived"] = {
            "post_count": d["post_count"], "bay_count": d["bay_count"],
            "rail_count": d["rail_count"], "rail_stock_lengths": d["rail_stock_lengths"],
            "paling_count": d["paling_count"], "palings_with_wastage": d["palings_with_wastage"],
            "concrete_bags": d["concrete_bags"],
        }
    manifest.append(entry)

(HERE / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
print(json.dumps(manifest, indent=2))
