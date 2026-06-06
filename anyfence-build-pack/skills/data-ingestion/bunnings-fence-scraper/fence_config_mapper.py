"""
fence_config_mapper.py

Takes a list of parsed BunningsProduct dicts and produces a
fence_system_config.json that matches the Anyfence calculator engine schema.

Schema reference (from strategy doc, section 03):
{
  "system_id": "colorbond_classic",
  "display_name": "Colorbond Classic Fence",
  "manufacturer": "BlueScope",
  "heights_mm": [...],
  "colours": [{ "code", "name", "hex", "swatch_url", "surcharge_pct" }],
  "post_spacing_mm": 2400,
  "post_mounting_options": [...],
  "components": [...],
  "gate_options": [...],
  "compliance": [...],
  "labour_rules": {...},
  "visual_assets": {...},
  "metadata": {...}
}

Usage:
    from fence_config_mapper import build_fence_system_config
    config = build_fence_system_config(products, system_id="colorbond_classic", ...)
"""

from __future__ import annotations

import json
import re
import sys
from datetime import datetime, timezone
from typing import Optional


# Colour hex codes for Colorbond (from BlueScope's official palette)
# These are approximate digital equivalents — for the final UI use BlueScope's
# official swatch PNGs from colorbond.com.
COLORBOND_HEX = {
    "Ironstone":        "#444a4f",
    "Galvanised":       "#9a9a98",
    "Monument":         "#373a36",
    "Woodland Grey":    "#4b4f48",
    "Domain":           "#605c50",
    "Wilderness":       "#5d6543",
    "Pale Eucalypt":    "#788366",
    "Evening Haze":     "#cbc2af",
    "Night Sky":        "#171c22",
    "Surfmist":         "#e2dccd",
    "Riversand":        "#9a8674",
    "Paperbark":        "#cdc4b3",
    "Manor Red":        "#67292c",
    "Cottage Green":    "#26352d",
    "Jasper":           "#62574f",
    "Basalt":           "#52524e",
    "Dover White":      "#ede4d2",
    "Shale Grey":       "#969994",
    "Windspray":        "#5e6a71",
    "Bushland":         "#79755b",
    "Mangrove":         "#3d4036",
    "Eucalypt":         "#3e503b",
    "Headland":         "#a4988c",
    "Deep Ocean":       "#2c3942",
    "Rivergum":         "#3e503b",
    "Black":            "#000000",
    "White":            "#ffffff",
}

# Quantity-break defaults — Bunnings doesn't publish these, but for trade
# pricing we can apply a generic schedule and let the SaaS tenant override.
DEFAULT_QTY_BREAKS = [
    {"min": 20, "discount_pct": 5},
    {"min": 50, "discount_pct": 10},
    {"min": 100, "discount_pct": 15},
]

# Default Australian fence labour rates (representative — will be overridden
# per-contractor in the SaaS tenant config)
DEFAULT_LABOUR_RULES = {
    "per_metre_aud": 65,
    "per_gate_aud": 180,
    "slope_5_to_10_pct_uplift": 0.15,
    "slope_10_plus_pct_uplift": 0.30,
    "rocky_soil_uplift": 0.20,
    "verification_date": None,  # populated at build time
}


def _normalise_colour_code(name: str) -> str:
    """
    Convert a colour name to its industry-standard 2-letter code.
    Falls back to acronym/first-2-letters for unknown colours.
    Codes align with The Glass Outlet's existing convention (Monument -> MN).
    """
    industry_codes = {
        "Monument":      "MN",
        "Woodland Grey": "WG",
        "Domain":        "DM",
        "Wilderness":    "WI",
        "Pale Eucalypt": "PE",
        "Evening Haze":  "EH",
        "Night Sky":     "NS",
        "Surfmist":      "SM",
        "Riversand":     "RS",
        "Paperbark":     "PB",
        "Manor Red":     "MR",
        "Cottage Green": "CG",
        "Jasper":        "JP",
        "Basalt":        "BS",
        "Dover White":   "DW",
        "Shale Grey":    "SG",
        "Windspray":     "WS",
        "Bushland":      "BL",
        "Mangrove":      "MG",
        "Eucalypt":      "EU",
        "Headland":      "HD",
        "Deep Ocean":    "DO",
        "Rivergum":      "RG",
        "Ironstone":     "IR",
        "Galvanised":    "GV",
        "Black":         "BK",
        "White":         "WH",
    }
    if name in industry_codes:
        return industry_codes[name]
    # Fallback: acronym for multi-word, first-2-letters otherwise
    words = re.findall(r"\w+", name)
    if len(words) >= 2:
        return "".join(w[0] for w in words).upper()
    return name[:2].upper()


def _build_colours(products: list[dict]) -> list[dict]:
    """Extract unique colours seen across products."""
    seen = set()
    colours = []
    for p in products:
        c = p.get("colour")
        if not c or c in seen:
            continue
        seen.add(c)
        colours.append({
            "code": _normalise_colour_code(c),
            "name": c,
            "hex": COLORBOND_HEX.get(c, "#888888"),
            "swatch_url": None,  # to be sourced from BlueScope CDN later
            "surcharge_pct": 0,
        })
    return colours


def _build_components(products: list[dict]) -> list[dict]:
    """Convert parsed Bunnings products into calculator-engine component records."""
    components = []
    for p in products:
        if not p.get("in_number") or p.get("price_aud") is None:
            continue

        dims = p.get("dimensions") or {}
        cat = p.get("category_hint", "other")

        # For panels the "stock length" is the panel width (run-direction).
        # For rails / posts / sheets it's the long dimension as parsed.
        if cat == "panel":
            stock_length_mm = dims.get("width_mm") or dims.get("length_mm")
        else:
            stock_length_mm = dims.get("length_mm") or dims.get("width_mm")

        # cuts_per_run_fn — a string expression the engine will eval per-run
        # to derive component quantity from the run geometry.
        # Keep these as documented strings, NOT live Python — the calculator
        # engine will interpret them safely.
        if cat == "panel":
            cuts_fn = "ceil(run_length_mm / panel_width_mm)"
        elif cat == "post":
            cuts_fn = "ceil(run_length_mm / post_spacing_mm) + 1"
        elif cat == "rail":
            cuts_fn = "panel_count * 2  # top + bottom rail"
        elif cat == "infill":
            cuts_fn = "panel_count * 3  # 3 sheets per panel"
        elif cat == "cap":
            cuts_fn = "post_count"
        elif cat in {"hinge", "latch", "screw"}:
            cuts_fn = None  # gate-hardware logic, handled separately
        else:
            cuts_fn = None

        components.append({
            "sku": f"BUN-{p['in_number']}",   # Anyfence-internal SKU prefix
            "external_sku": p["in_number"],   # Bunnings I/N
            "name": p.get("name"),
            "brand": p.get("brand"),
            "colour": p.get("colour"),
            "category": cat,
            "unit": _unit_for_category(cat),
            "stock_length_mm": stock_length_mm,
            "dimensions": dims,
            "base_price_aud": p["price_aud"],
            "qty_breaks": DEFAULT_QTY_BREAKS,
            "cuts_per_run_fn": cuts_fn,
            "image_url": p.get("image_url"),
            "source_url": p.get("url"),
            "availability": p.get("availability"),
            "rating": p.get("rating"),
            "review_count": p.get("review_count"),
        })
    return components


def _unit_for_category(cat: str) -> str:
    return {
        "panel":    "panel",
        "post":     "each",
        "rail":     "length",
        "infill":   "sheet",
        "cap":      "each",
        "extension":"each",
        "lattice":  "each",
        "gate":     "each",
        "hinge":    "each",
        "latch":    "each",
        "screw":    "pack",
        "concrete": "bag",
    }.get(cat, "each")


def _build_heights_mm(products: list[dict]) -> list[int]:
    """Infer common standard heights from product dimensions."""
    heights = set()
    for p in products:
        dims = p.get("dimensions") or {}
        if dims.get("height_mm"):
            heights.add(dims["height_mm"])
    # Sensible Aus standard heights — fall back if no signal
    if not heights:
        return [1500, 1800, 2100]
    return sorted(heights)


def build_fence_system_config(
    products: list[dict],
    *,
    system_id: str,
    display_name: str,
    manufacturer: str = "BlueScope",
    post_spacing_mm: int = 2400,
    post_mounting_options: Optional[list[str]] = None,
    compliance: Optional[list[dict]] = None,
    labour_rules: Optional[dict] = None,
    gate_options: Optional[list[dict]] = None,
    visual_assets: Optional[dict] = None,
) -> dict:
    """
    Assemble a complete fence_system_config.json from a list of parsed products.

    Args:
        products: List of parsed BunningsProduct dicts
        system_id: Engine identifier (e.g. "colorbond_classic")
        display_name: Human-readable label
        manufacturer: Top-level manufacturer name
        post_spacing_mm: Max distance between posts
        post_mounting_options: e.g. ["in_ground", "core_drill"]
        compliance: List of regulatory rules
        labour_rules: Override default labour rates
        gate_options: List of gate kits available for this system
        visual_assets: Elevation SVG, hero image, etc.
    """
    now = datetime.now(timezone.utc).isoformat(timespec="seconds")
    labour = dict(DEFAULT_LABOUR_RULES)
    if labour_rules:
        labour.update(labour_rules)
    labour["verification_date"] = now

    config = {
        "system_id": system_id,
        "display_name": display_name,
        "manufacturer": manufacturer,
        "heights_mm": _build_heights_mm(products),
        "colours": _build_colours(products),
        "post_spacing_mm": post_spacing_mm,
        "post_mounting_options": post_mounting_options or ["in_ground"],
        "components": _build_components(products),
        "gate_options": gate_options or [],
        "compliance": compliance or [],
        "labour_rules": labour,
        "visual_assets": visual_assets or {},
        "metadata": {
            "source": "bunnings.com.au",
            "scraped_at": now,
            "schema_version": "0.1",
            "product_count": len(products),
            "components_with_pricing": len([p for p in products if p.get("price_aud")]),
        },
    }
    return config


# ---------------------------------------------------------------------------
# CLI entrypoint
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(
        description="Build fence_system_config.json from parsed Bunnings products."
    )
    parser.add_argument("--products", required=True,
                        help="Path to JSON file of parsed BunningsProduct dicts")
    parser.add_argument("--system-id", required=True)
    parser.add_argument("--display-name", required=True)
    parser.add_argument("--manufacturer", default="BlueScope")
    parser.add_argument("--post-spacing-mm", type=int, default=2400)
    parser.add_argument("--output", default="-",
                        help="Output path or '-' for stdout")
    args = parser.parse_args()

    with open(args.products) as f:
        products = json.load(f)

    config = build_fence_system_config(
        products,
        system_id=args.system_id,
        display_name=args.display_name,
        manufacturer=args.manufacturer,
        post_spacing_mm=args.post_spacing_mm,
    )

    out = json.dumps(config, indent=2)
    if args.output == "-":
        print(out)
    else:
        with open(args.output, "w") as f:
            f.write(out)
        print(f"Wrote {args.output} ({len(config['components'])} components)",
              file=sys.stderr)
